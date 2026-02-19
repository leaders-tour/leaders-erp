import type { Prisma } from '@prisma/client';

export const lodgingInclude = {
  location: true,
  dayPlans: true,
} satisfies Prisma.LodgingInclude;
