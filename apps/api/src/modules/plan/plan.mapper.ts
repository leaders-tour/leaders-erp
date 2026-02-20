import type { Prisma } from '@prisma/client';

export const planInclude = {
  region: true,
  overrides: true,
  planStops: {
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.PlanInclude;
