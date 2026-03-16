import type { Prisma } from '@prisma/client';

export const regionLodgingInclude = {
  region: true,
} satisfies Prisma.RegionLodgingInclude;
