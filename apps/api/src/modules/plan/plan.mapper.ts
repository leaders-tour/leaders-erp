import type { Prisma } from '@prisma/client';

export const planInclude = {
  region: true,
  overrides: true,
  planStops: {
    include: {
      fromLocation: true,
      toLocation: true,
      lodging: true,
      mealSet: true,
    },
    orderBy: { dayIndex: 'asc' },
  },
} satisfies Prisma.PlanInclude;
