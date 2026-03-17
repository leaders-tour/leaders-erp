import type { Prisma } from '@prisma/client';

export const segmentInclude = {
  region: true,
  fromLocation: true,
  toLocation: true,
  defaultVersion: true,
  scheduleTimeBlocks: {
    include: {
      activities: {
        orderBy: { orderIndex: 'asc' },
      },
    },
    orderBy: { orderIndex: 'asc' },
  },
  versions: {
    include: {
      scheduleTimeBlocks: {
        include: {
          activities: {
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.SegmentInclude;
