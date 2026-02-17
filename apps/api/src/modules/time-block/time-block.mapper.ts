import type { Prisma } from '@prisma/client';

export const timeBlockInclude = {
  dayPlan: true,
  activities: {
    orderBy: { orderIndex: 'asc' },
  },
} satisfies Prisma.TimeBlockInclude;
