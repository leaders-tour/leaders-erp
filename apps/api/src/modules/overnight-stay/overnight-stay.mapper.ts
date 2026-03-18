import type { Prisma } from '@prisma/client';

export const overnightStayInclude = {
  region: true,
  location: true,
  startLocation: true,
  endLocation: true,
  days: {
    orderBy: { dayOrder: 'asc' },
    include: { displayLocation: true },
  },
} satisfies Prisma.OvernightStayInclude;

export const overnightStayConnectionInclude = {
  region: true,
  fromOvernightStay: {
    include: overnightStayInclude,
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
