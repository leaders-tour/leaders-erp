import type { Prisma } from '@prisma/client';

export const locationInclude = {
  region: true,
  lodgings: true,
  mealSets: true,
  timeBlocks: {
    include: {
      activities: {
        orderBy: { orderIndex: 'asc' },
      },
    },
    orderBy: { orderIndex: 'asc' },
  },
} satisfies Prisma.LocationInclude;
