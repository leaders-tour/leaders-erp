import type { Prisma } from '@prisma/client';

export const segmentInclude = {
  region: true,
  fromLocation: true,
  toLocation: true,
  scheduleTimeBlocks: {
    include: {
      activities: {
        orderBy: { orderIndex: 'asc' },
      },
    },
    orderBy: { orderIndex: 'asc' },
  },
} satisfies Prisma.SegmentInclude;
