import { CafeLeadStatus, CafeSourceType, Prisma } from '@prisma/client';
import { getWorkerEnv } from '../lib/env';
import { prisma } from '../lib/prisma';
import { createRunContext } from '../lib/run-context';
import { sleep } from '../lib/sleep';
import { fetchArticleDetail, fetchBoardArticles } from './naver-cafe-client';

function parsePostedAt(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const isoCandidate = new Date(value);
  if (!Number.isNaN(isoCandidate.getTime())) {
    return isoCandidate;
  }

  const matched = value.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!matched) {
    return null;
  }

  const [, year, month, day] = matched;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function upsertCafeSource() {
  const env = getWorkerEnv();
  return prisma.cafeSource.upsert({
    where: {
      sourceType_cafeId_menuId: {
        sourceType: CafeSourceType.NAVER_CAFE_BOARD,
        cafeId: env.naverCafeId,
        menuId: env.naverCafeMenuId,
      },
    },
    create: {
      sourceType: CafeSourceType.NAVER_CAFE_BOARD,
      cafeId: env.naverCafeId,
      menuId: env.naverCafeMenuId,
      boardName: 'Naver Cafe Board',
      boardUrl: env.naverCafeBoardUrl,
      isActive: true,
    },
    update: {
      boardUrl: env.naverCafeBoardUrl,
      isActive: true,
    },
  });
}

async function processOnce(runId: string, logger: ReturnType<typeof createRunContext>['logger']) {
  const env = getWorkerEnv();
  const source = await upsertCafeSource();
  logger.info({ sourceId: source.id, boardUrl: env.naverCafeBoardUrl }, 'Polling board');

  const summaries = await fetchBoardArticles(env.naverCafeBoardUrl);
  const existing = await prisma.cafeLead.findMany({
    where: {
      articleId: {
        in: summaries.map((summary) => summary.articleId),
      },
    },
    select: {
      id: true,
      articleId: true,
      status: true,
    },
  });

  const existingByArticleId = new Map(existing.map((item) => [item.articleId, item]));

  for (const summary of summaries) {
    const metadata = {
      sourceSnapshot: {
        boardName: source.boardName,
        boardUrl: source.boardUrl,
      },
    } satisfies Prisma.InputJsonValue;

    const existingLead = existingByArticleId.get(summary.articleId);
    if (existingLead) {
      await prisma.cafeLead.update({
        where: { id: existingLead.id },
        data: {
          title: summary.title,
          authorNickname: summary.authorNickname,
          postedAtRaw: summary.postedAtRaw,
          postedAt: parsePostedAt(summary.postedAtRaw),
          views: summary.views,
          commentCount: summary.commentCount,
          articleUrl: summary.articleUrl,
          lastSeenAt: new Date(),
        },
      });
      continue;
    }

    const created = await prisma.cafeLead.create({
      data: {
        cafeSourceId: source.id,
        articleId: summary.articleId,
        articleUrl: summary.articleUrl,
        title: summary.title,
        authorNickname: summary.authorNickname,
        postedAtRaw: summary.postedAtRaw,
        postedAt: parsePostedAt(summary.postedAtRaw),
        views: summary.views,
        commentCount: summary.commentCount,
        rawMetadataJson: metadata,
        status: CafeLeadStatus.DISCOVERED,
      },
    });

    try {
      const detail = await fetchArticleDetail({
        articleId: summary.articleId,
        articleUrl: summary.articleUrl,
        artifactBasePath: env.artifactBasePath,
        runId,
        logger,
      });

      await prisma.cafeLead.update({
        where: { id: created.id },
        data: {
          title: detail.title || summary.title,
          rawHtml: detail.rawHtml,
          rawText: detail.rawText,
          rawMetadataJson: {
            ...metadata,
            artifacts: {
              htmlPath: detail.htmlArtifactPath,
              screenshotPath: detail.screenshotPath,
            },
          },
          status: CafeLeadStatus.FETCHED,
          failReason: null,
          lastSeenAt: new Date(),
        },
      });

      logger.info({ articleId: summary.articleId }, 'Lead fetched');
    } catch (error) {
      await prisma.cafeLead.update({
        where: { id: created.id },
        data: {
          status: CafeLeadStatus.FAILED,
          failReason: String(error),
        },
      });
      logger.error({ articleId: summary.articleId, error: String(error) }, 'Failed to fetch article detail');
    }
  }
}

async function main() {
  const env = getWorkerEnv();
  const startupContext = createRunContext('worker-cafe');
  startupContext.logger.info({ intervalMs: env.cafePollIntervalMs }, 'worker-cafe started');

  while (true) {
    const cycleContext = createRunContext('worker-cafe');
    try {
      await processOnce(cycleContext.runId, cycleContext.logger);
    } catch (error) {
      cycleContext.logger.error({ error: String(error) }, 'worker-cafe cycle failed');
    }

    await sleep(env.cafePollIntervalMs);
  }
}

main()
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
