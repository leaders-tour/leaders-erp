import { assertGoogleServiceAccountCredentials, runContractSyncCycle } from '../lib/contract-sync';
import { getWorkerEnv } from '../lib/env';
import { resolveHealthServerPort, startHealthServer, type HealthServerStatus } from '../lib/health-server';
import { prisma } from '../lib/prisma';
import { createRunContext } from '../lib/run-context';
import { sleep } from '../lib/sleep';

async function shutdown(server: ReturnType<typeof startHealthServer>, signal: string): Promise<void> {
  process.stderr.write(`worker-contract-sync-daemon received ${signal}, shutting down\n`);
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  await prisma.$disconnect();
  process.exit(0);
}

async function main() {
  const env = getWorkerEnv();
  const port = resolveHealthServerPort();
  const status: HealthServerStatus = {
    worker: 'contract-sync-daemon',
    syncing: false,
    lastSyncAt: null,
    lastSyncError: null,
  };

  const startupContext = createRunContext('worker-contract-sync-daemon');
  const server = startHealthServer(port, () => status, () => {
    startupContext.logger.info({ port }, 'worker-contract-sync-daemon health server listening');
  });

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      void shutdown(server, signal).catch((error) => {
        process.stderr.write(`${String(error)}\n`);
        process.exit(1);
      });
    });
  }

  assertGoogleServiceAccountCredentials(env);
  startupContext.logger.info(
    {
      port,
      intervalMs: env.contractSyncIntervalMs,
      staleRunningMs: env.contractSyncStaleRunningMs,
    },
    'worker-contract-sync-daemon started',
  );

  while (true) {
    const cycleContext = createRunContext('worker-contract-sync-daemon');
    status.syncing = true;
    try {
      await runContractSyncCycle(env, cycleContext.logger, env.contractSyncStaleRunningMs);
      status.lastSyncAt = new Date().toISOString();
      status.lastSyncError = null;
    } catch (error) {
      status.lastSyncError = String(error);
      cycleContext.logger.error({ error: status.lastSyncError }, 'worker-contract-sync-daemon cycle failed');
    } finally {
      status.syncing = false;
    }

    await sleep(env.contractSyncIntervalMs);
  }
}

main().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exit(1);
});
