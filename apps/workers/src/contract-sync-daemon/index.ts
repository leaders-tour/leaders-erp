import { assertGoogleServiceAccountCredentials, runContractSyncCycle } from '../lib/contract-sync';
import { getWorkerEnv } from '../lib/env';
import { prisma } from '../lib/prisma';
import { createRunContext } from '../lib/run-context';
import { sleep } from '../lib/sleep';

async function main() {
  const env = getWorkerEnv();
  assertGoogleServiceAccountCredentials(env);

  const startupContext = createRunContext('worker-contract-sync-daemon');
  startupContext.logger.info(
    {
      intervalMs: env.contractSyncIntervalMs,
      staleRunningMs: env.contractSyncStaleRunningMs,
    },
    'worker-contract-sync-daemon started',
  );

  while (true) {
    const cycleContext = createRunContext('worker-contract-sync-daemon');
    try {
      await runContractSyncCycle(env, cycleContext.logger, env.contractSyncStaleRunningMs);
    } catch (error) {
      cycleContext.logger.error({ error: String(error) }, 'worker-contract-sync-daemon cycle failed');
    }

    await sleep(env.contractSyncIntervalMs);
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
