import { assertGoogleServiceAccountCredentials, runContractFormSync } from '../lib/contract-sync';
import { getWorkerEnv } from '../lib/env';
import { prisma } from '../lib/prisma';
import { createRunContext } from '../lib/run-context';

async function main() {
  const env = getWorkerEnv();
  assertGoogleServiceAccountCredentials(env);

  const { logger } = createRunContext('worker-contract-form-sync');
  await runContractFormSync(env, logger, env.contractSyncStaleRunningMs);
}

main()
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
