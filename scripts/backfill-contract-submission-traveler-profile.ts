import { PrismaClient } from '@prisma/client';
import { ContractSyncService } from '../apps/api/src/modules/contract/contract-sync.service';

const prisma = new PrismaClient();

async function main() {
  const sourceId = process.argv[2];
  const service = new ContractSyncService(prisma);
  const result = await service.backfillContractSubmissionTravelerProfiles(
    sourceId ? { sourceId } : undefined,
  );
  console.log(
    JSON.stringify(
      {
        scope: sourceId ?? 'all',
        scanned: result.scanned,
        updated: result.updated,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
