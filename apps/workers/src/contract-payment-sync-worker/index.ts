import { ContractPaymentSyncService } from '../../../api/src/modules/contract/contract-sync.service';
import { getWorkerEnv } from '../lib/env';
import { prisma } from '../lib/prisma';
import { createRunContext } from '../lib/run-context';

async function resolveSourceId(env: ReturnType<typeof getWorkerEnv>): Promise<string> {
  if (env.contractPaymentSourceId) {
    return env.contractPaymentSourceId;
  }

  if (env.contractPaymentSheetId) {
    const source = await prisma.contractPaymentSource.upsert({
      where: {
        id: 'contract-payment-sheet-default',
      },
      create: {
        id: 'contract-payment-sheet-default',
        type: 'GOOGLE_SHEET',
        name: '계약 입금 시트',
        sheetId: env.contractPaymentSheetId,
        sheetGid: env.contractPaymentSheetGid,
        headerRow: 1,
        isActive: true,
      },
      update: {
        sheetId: env.contractPaymentSheetId,
        sheetGid: env.contractPaymentSheetGid,
        isActive: true,
      },
    });
    return source.id;
  }

  const source = await prisma.contractPaymentSource.findFirst({
    where: { type: 'GOOGLE_SHEET', isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!source) {
    throw new Error('No active GOOGLE_SHEET contract payment source found');
  }
  return source.id;
}

async function main() {
  const env = getWorkerEnv();
  if (!env.googleServiceAccountEmail || !env.googleServiceAccountPrivateKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY are required for worker-contract-payment-sync');
  }

  const { logger } = createRunContext('worker-contract-payment-sync');
  const sourceId = await resolveSourceId(env);
  logger.info({ sourceId }, 'Contract payment sync started');
  const run = await new ContractPaymentSyncService(prisma).syncGoogleSheetSource(sourceId);
  logger.info(
    {
      runId: run.id,
      status: run.status,
      fetchedRows: run.fetchedRows,
      upsertedRows: run.upsertedRows,
      skippedRows: run.skippedRows,
      matchedRows: run.matchedRows,
      reviewRows: run.reviewRows,
    },
    'Contract payment sync finished',
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
