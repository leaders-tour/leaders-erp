import type { Prisma } from '@prisma/client';

export const regionInclude = {
  locations: true,
  segments: true,
  plans: true,
} satisfies Prisma.RegionInclude;
