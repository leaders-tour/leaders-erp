import type { Browser, BrowserContext, Frame, Page } from 'playwright';
import { chromium } from 'playwright';
import { buildLeadArtifactDir, writeTextArtifact } from '../lib/artifacts';
import { resolveFromRoot } from '../lib/env';
import { normalizeWhitespace, stripHtml } from '../lib/html';
import { withRetry } from '../lib/retry';
import { randomBetween, sleep } from '../lib/sleep';
import { extractArticleBodyHtml, extractArticleBodyText, extractArticleTitleFromHtml } from './article-parser';
import { extractArticleIdFromCandidates } from './article-id';

export interface BoardArticleSummary {
  articleId: string;
  articleUrl: string;
  title: string;
  authorNickname: string | null;
  postedAtRaw: string | null;
  views: number | null;
  commentCount: number | null;
}

export interface ArticleDetailResult {
  title: string;
  rawHtml: string;
  rawText: string;
  htmlArtifactPath: string;
  screenshotPath: string;
}

const TITLE_SELECTORS = ['.ArticleTitle .title_text', '.article_subject', 'h3', 'h2'];
const BODY_SELECTORS = ['.se-main-container', '.ContentRenderer', '.article_viewer', '.article_container'];

async function resolveCafeFrame(page: Page): Promise<Frame> {
  for (const selector of ['iframe#cafe_main', 'iframe[name="cafe_main"]']) {
    const frameHandle = await page.locator(selector).first().elementHandle();
    const frame = await frameHandle?.contentFrame();
    if (frame) {
      return frame;
    }
  }

  return page.mainFrame();
}

async function pickFirstVisibleText(frame: Frame, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    const locator = frame.locator(selector).first();
    if ((await locator.count()) === 0) {
      continue;
    }

    const text = normalizeWhitespace(await locator.innerText().catch(() => ''));
    if (text) {
      return text;
    }
  }

  return null;
}

async function pickFirstOuterHtml(frame: Frame, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    const locator = frame.locator(selector).first();
    if ((await locator.count()) === 0) {
      continue;
    }

    const html = await locator.evaluate((node) => (node as HTMLElement).outerHTML).catch(() => null);
    if (html) {
      return html;
    }
  }

  return null;
}

function parseInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const digits = value.replace(/[^\d]/g, '');
  if (!digits) {
    return null;
  }

  return Number(digits);
}

export async function createCafeBrowser(storageStatePath: string): Promise<{ browser: Browser; context: BrowserContext }> {
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  });

  const context = await browser.newContext({
    storageState: resolveFromRoot(storageStatePath),
  });

  return { browser, context };
}

export async function fetchBoardArticles(boardUrl: string): Promise<BoardArticleSummary[]> {
  const { browser, context } = await createCafeBrowser(resolveFromRoot(process.env.NAVER_AUTH_STATE_PATH ?? 'secrets/naver-auth.json'));
  const page = await context.newPage();

  try {
    await page.goto(boardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    const frame = await resolveCafeFrame(page);

    const anchors = await frame.locator('a').evaluateAll((nodes) =>
      nodes.map((node) => {
        const anchor = node as HTMLAnchorElement;
        const container = anchor.closest('tr, li, div, td');
        return {
          href: anchor.getAttribute('href'),
          onclick: anchor.getAttribute('onclick'),
          text: anchor.textContent,
          authorNickname:
            container?.querySelector('.nickname, .p-nick, .td_name, .writer, .name')?.textContent?.trim() ?? null,
          postedAtRaw:
            container?.querySelector('.td_date, .date, .time, .td_day, .wdate')?.textContent?.trim() ?? null,
          views: container?.querySelector('.td_view, .view, .count')?.textContent?.trim() ?? null,
          commentCount:
            anchor.querySelector('.comment, .num, .reply')?.textContent?.trim() ??
            container?.querySelector('.comment, .num, .reply')?.textContent?.trim() ??
            null,
        };
      }),
    );

    const seen = new Set<string>();
    const rows: BoardArticleSummary[] = [];
    for (const anchor of anchors) {
      const articleId = extractArticleIdFromCandidates([anchor.href, anchor.onclick]);
      const title = normalizeWhitespace(anchor.text ?? '');
      if (!articleId || !title || seen.has(articleId)) {
        continue;
      }

      const articleUrl =
        anchor.href && !anchor.href.startsWith('javascript:')
          ? new URL(anchor.href, boardUrl).toString()
          : `https://cafe.naver.com/ArticleRead.nhn?clubid=${process.env.NAVER_CAFE_ID}&articleid=${articleId}&menuid=${process.env.NAVER_CAFE_MENU_ID}`;

      seen.add(articleId);
      rows.push({
        articleId,
        articleUrl,
        title,
        authorNickname: anchor.authorNickname ? normalizeWhitespace(anchor.authorNickname) : null,
        postedAtRaw: anchor.postedAtRaw ? normalizeWhitespace(anchor.postedAtRaw) : null,
        views: parseInteger(anchor.views),
        commentCount: parseInteger(anchor.commentCount),
      });
    }

    return rows;
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function fetchArticleDetail(options: {
  articleId: string;
  articleUrl: string;
  artifactBasePath: string;
  runId: string;
  logger: { warn: (bindings: Record<string, unknown>, message: string) => void };
}): Promise<ArticleDetailResult> {
  const { browser, context } = await createCafeBrowser(resolveFromRoot(process.env.NAVER_AUTH_STATE_PATH ?? 'secrets/naver-auth.json'));
  const page = await context.newPage();
  const artifactDir = buildLeadArtifactDir(options.artifactBasePath, options.articleId, options.runId);

  try {
    return await withRetry(
      async () => {
        await sleep(randomBetween(400, 1200));
        await page.goto(options.articleUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => undefined);
        const frame = await resolveCafeFrame(page);
        const frameHtml = await frame.content();
        const title = (await pickFirstVisibleText(frame, TITLE_SELECTORS)) ?? extractArticleTitleFromHtml(frameHtml) ?? '제목 미확인';
        const rawHtml = (await pickFirstOuterHtml(frame, BODY_SELECTORS)) ?? extractArticleBodyHtml(frameHtml) ?? frameHtml;
        const rawText = normalizeWhitespace(stripHtml(rawHtml)) || extractArticleBodyText(frameHtml);

        const htmlArtifactPath = writeTextArtifact(artifactDir, 'article.html', rawHtml);
        const screenshotPath = `${artifactDir}/article.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });

        return {
          title,
          rawHtml,
          rawText,
          htmlArtifactPath,
          screenshotPath,
        };
      },
      {
        retries: 3,
        delayMs: 1_000,
        onRetry: (error, attempt) => {
          options.logger.warn({ articleId: options.articleId, attempt, error: String(error) }, 'Retrying article fetch');
        },
      },
    );
  } catch (error) {
    const screenshotPath = `${artifactDir}/failure.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}
