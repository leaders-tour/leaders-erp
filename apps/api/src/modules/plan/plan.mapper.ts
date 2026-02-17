import type { Prisma } from '@prisma/client';

export const planInclude = {
  region: true,
  overrides: true,
  dayPlans: {
    include: {
      timeBlocks: {
        include: {
          activities: true,
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
    orderBy: { dayIndex: 'asc' },
  },
} satisfies Prisma.PlanInclude;
