import type { Prisma } from '@prisma/client';

export const lodgingInclude = {
  location: true,
} satisfies Prisma.LodgingInclude;
