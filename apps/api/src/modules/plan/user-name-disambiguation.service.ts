import { indexToNameDisambiguator, normalizeUserNameKey } from '@tour/domain';
import type { Prisma, PrismaClient } from '@prisma/client';
import { userNameDisambiguatorSchema } from '@tour/validation';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export type PrismaLikeForUserNameDisambiguation = PrismaLike;

export async function reconcileUserNameDisambiguatorsForName(
  prisma: PrismaLike,
  name: string,
): Promise<void> {
  const nameKey = normalizeUserNameKey(name);
  if (!nameKey) {
    return;
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, createdAt: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  const group = users.filter((user) => normalizeUserNameKey(user.name) === nameKey);
  if (group.length === 0) {
    return;
  }

  if (group.length === 1) {
    await prisma.user.update({
      where: { id: group[0]!.id },
      data: { nameDisambiguator: null },
    });
    return;
  }

  await Promise.all(
    group.map((user, index) => {
      const nameDisambiguator = userNameDisambiguatorSchema.parse(indexToNameDisambiguator(index));
      return prisma.user.update({
        where: { id: user.id },
        data: { nameDisambiguator },
      });
    }),
  );
}

export async function reconcileUserNameDisambiguatorsForNames(
  prisma: PrismaLike,
  names: Array<string | null | undefined>,
): Promise<void> {
  const uniqueKeys = new Set<string>();
  for (const name of names) {
    if (!name) {
      continue;
    }
    const key = normalizeUserNameKey(name);
    if (key) {
      uniqueKeys.add(key);
    }
  }

  for (const nameKey of uniqueKeys) {
    await reconcileUserNameDisambiguatorsForName(prisma, nameKey);
  }
}
