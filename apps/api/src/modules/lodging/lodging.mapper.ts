import type { Prisma } from '@prisma/client';

export const lodgingInclude = {
  location: true,
  planStops: true,
} satisfies Prisma.LodgingInclude;
