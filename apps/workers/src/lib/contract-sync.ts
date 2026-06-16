import type { Logger } from 'pino';
import { ContractPaymentSyncService, ContractSyncService } from '../../../api/src/modules/contract/contract-sync.service';
import type { getWorkerEnv } from './env';
import { prisma } from './prisma';

type WorkerEnv = ReturnType<typeof getWorkerEnv>;

const DEFAULT_STALE_RUNNING_MS = 30 * 60 * 1000;

export function assertGoogleServiceAccountCredentials(env: WorkerEnv): void {
  if (!env.googleServiceAccountEmail || !env.googleServiceAccountPrivateKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY are required for contract sync workers');
  }
}

export async function resolveContractFormSourceId(env: WorkerEnv): Promise<string> {
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

export async function resolveContractPaymentSourceId(env: WorkerEnv): Promise<string> {
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

async function markStaleRunningFormSyncRuns(
  sourceId: string,
  staleRunningMs: number,
  logger: Logger,
): Promise<void> {
  const staleBefore = new Date(Date.now() - staleRunningMs);
  const staleMessage = 'Stale RUNNING sync run marked failed by contract-sync-daemon';
  const result = await prisma.contractSyncRun.updateMany({
    where: {
      sourceId,
      status: 'RUNNING',
      startedAt: { lt: staleBefore },
    },
    data: {
      status: 'FAILED',
      finishedAt: new Date(),
      errorMessage: staleMessage,
    },
  });

  if (result.count > 0) {
    logger.warn(
      { sourceId, staleFormRuns: result.count, staleRunningMs },
      'Marked stale RUNNING contract form sync runs as FAILED',
    );
  }
}

async function markStaleRunningPaymentSyncRuns(
  sourceId: string,
  staleRunningMs: number,
  logger: Logger,
): Promise<void> {
  const staleBefore = new Date(Date.now() - staleRunningMs);
  const staleMessage = 'Stale RUNNING sync run marked failed by contract-sync-daemon';
  const result = await prisma.contractPaymentSyncRun.updateMany({
    where: {
      sourceId,
      status: 'RUNNING',
      startedAt: { lt: staleBefore },
    },
    data: {
      status: 'FAILED',
      finishedAt: new Date(),
      errorMessage: staleMessage,
    },
  });

  if (result.count > 0) {
    logger.warn(
      { sourceId, stalePaymentRuns: result.count, staleRunningMs },
      'Marked stale RUNNING contract payment sync runs as FAILED',
    );
  }
}

async function hasActiveRunningSyncRun(
  sourceId: string,
  kind: 'form' | 'payment',
  staleRunningMs: number,
): Promise<boolean> {
  const staleBefore = new Date(Date.now() - staleRunningMs);
  const where = {
    sourceId,
    status: 'RUNNING' as const,
    startedAt: { gte: staleBefore },
  };

  if (kind === 'form') {
    const count = await prisma.contractSyncRun.count({ where });
    return count > 0;
  }

  const count = await prisma.contractPaymentSyncRun.count({ where });
  return count > 0;
}

export async function runContractFormSync(
  env: WorkerEnv,
  logger: Logger,
  staleRunningMs = DEFAULT_STALE_RUNNING_MS,
): Promise<{ skipped: boolean; sourceId: string }> {
  const sourceId = await resolveContractFormSourceId(env);
  await markStaleRunningFormSyncRuns(sourceId, staleRunningMs, logger);

  if (await hasActiveRunningSyncRun(sourceId, 'form', staleRunningMs)) {
    logger.warn({ sourceId }, 'Contract form sync skipped because a RUNNING sync is in progress');
    return { skipped: true, sourceId };
  }

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
  return { skipped: false, sourceId };
}

export async function runContractPaymentSync(
  env: WorkerEnv,
  logger: Logger,
  staleRunningMs = DEFAULT_STALE_RUNNING_MS,
): Promise<{ skipped: boolean; sourceId: string }> {
  const sourceId = await resolveContractPaymentSourceId(env);
  await markStaleRunningPaymentSyncRuns(sourceId, staleRunningMs, logger);

  if (await hasActiveRunningSyncRun(sourceId, 'payment', staleRunningMs)) {
    logger.warn({ sourceId }, 'Contract payment sync skipped because a RUNNING sync is in progress');
    return { skipped: true, sourceId };
  }

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
  return { skipped: false, sourceId };
}

export async function runContractSyncCycle(
  env: WorkerEnv,
  logger: Logger,
  staleRunningMs = DEFAULT_STALE_RUNNING_MS,
): Promise<void> {
  const formResult = await runContractFormSync(env, logger, staleRunningMs);
  if (formResult.skipped) {
    logger.warn('Contract payment sync skipped because contract form sync was skipped');
    return;
  }

  await runContractPaymentSync(env, logger, staleRunningMs);
}
