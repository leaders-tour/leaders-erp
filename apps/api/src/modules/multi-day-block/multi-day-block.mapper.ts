import type { Prisma } from '@prisma/client';

export const multiDayBlockInclude = {
  region: true,
  location: true,
  startLocation: true,
  endLocation: true,
  days: {
    orderBy: { dayOrder: 'asc' },
    include: { displayLocation: true },
  },
} satisfies Prisma.OvernightStayInclude;

export const multiDayBlockConnectionInclude = {
  region: true,
  fromOvernightStay: {
    include: multiDayBlockInclude,
  },
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
} satisfies Prisma.OvernightStayConnectionInclude;
