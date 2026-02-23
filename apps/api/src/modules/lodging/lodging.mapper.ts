import type { Prisma } from '@prisma/client';

export const lodgingInclude = {
  location: true,
  locationVersion: true,
} satisfies Prisma.LodgingInclude;
