import type { Prisma } from '@prisma/client';

export const dayPlanInclude = {
  plan: true,
  timeBlocks: {
    include: {
      activities: true,
    },
    orderBy: { orderIndex: 'asc' },
  },
} satisfies Prisma.DayPlanInclude;
