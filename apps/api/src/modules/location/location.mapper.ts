import type { Prisma } from '@prisma/client';

export const locationInclude = {
  region: true,
} satisfies Prisma.LocationInclude;
