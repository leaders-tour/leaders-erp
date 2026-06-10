import { ContractSyncService } from '../../../api/src/modules/contract/contract-sync.service';
import { getWorkerEnv } from '../lib/env';
import { prisma } from '../lib/prisma';
import { createRunContext } from '../lib/run-context';

async function resolveSourceId(env: ReturnType<typeof getWorkerEnv>): Promise<string> {
  if (env.contractFormSourceId) {
    return env.contractFormSourceId;
  }

  if (env.contractFormSheetId) {
    const source = await prisma.contractSubmissionSource.upsert({
      where: {
        id: 'contract-google-form-default',
      },
      create: {
        id: 'contract-google-form-default',
        type: 'GOOGLE_SHEET',
        name: '계약서 구글폼 응답',
        sheetId: env.contractFormSheetId,
        sheetGid: env.contractFormSheetGid,
        headerRow: 1,
        isActive: true,
      },
      update: {
        sheetId: env.contractFormSheetId,
        sheetGid: env.contractFormSheetGid,
        isActive: true,
      },
    });
    return source.id;
  }

  const source = await prisma.contractSubmissionSource.findFirst({
    where: { type: 'GOOGLE_SHEET', isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!source) {
    throw new Error('No active GOOGLE_SHEET contract submission source found');
  }
  return source.id;
}

async function main() {
  const env = getWorkerEnv();
  if (!env.googleServiceAccountEmail || !env.googleServiceAccountPrivateKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY are required for worker-contract-form-sync');
  }

  const { logger } = createRunContext('worker-contract-form-sync');
  const sourceId = await resolveSourceId(env);
  logger.info({ sourceId }, 'Contract form sync started');
  const run = await new ContractSyncService(prisma).syncGoogleSheetSource(sourceId);
  logger.info(
    {
      runId: run.id,
      status: run.status,
      fetchedRows: run.fetchedRows,
      upsertedRows: run.upsertedRows,
      skippedRows: run.skippedRows,
    },
    'Contract form sync finished',
  );
}

main()
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
