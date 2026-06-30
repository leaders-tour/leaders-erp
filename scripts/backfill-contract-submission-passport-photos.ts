import { PrismaClient } from '@prisma/client';
import { backfillContractSubmissionPassportPhotos } from '../apps/api/src/modules/contract/contract-passport-photo-sync';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : undefined;
  const sourceId = args.find((arg, index) => arg !== '--limit' && index !== limitIndex + 1) ?? undefined;
  const result = await backfillContractSubmissionPassportPhotos(
    prisma,
    {
      ...(sourceId ? { sourceId } : {}),
      ...(Number.isFinite(limit) ? { limit } : {}),
    },
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
