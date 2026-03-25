import type { Prisma, PrismaClient } from '@prisma/client';
import { DomainError } from './errors';

type Db = PrismaClient | Prisma.TransactionClient;

export async function resolveRegionSetRegionIds(prisma: Db, regionSetId: string): Promise<string[]> {
  const set = await prisma.regionSet.findUnique({
    where: { id: regionSetId },
    select: {
      items: {
        orderBy: { sortOrder: 'asc' },
        select: { regionId: true },
      },
    },
  });

  if (!set || set.items.length === 0) {
    throw new DomainError('NOT_FOUND', 'Region set not found or has no regions');
  }

  return set.items.map((item) => item.regionId);
}
