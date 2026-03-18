import type { Prisma } from '@prisma/client';

export const planTemplateInclude = {
  region: true,
  planStops: {
    include: {
      segment: true,
      segmentVersion: true,
      locationVersion: true,
      overnightStay: {
        include: {
          days: { orderBy: { dayOrder: 'asc' } },
        },
      },
      overnightStayConnection: true,
      overnightStayConnectionVersion: true,
      multiDayBlock: {
        include: {
          days: { orderBy: { dayOrder: 'asc' } },
        },
      },
      multiDayBlockConnection: true,
      multiDayBlockConnectionVersion: true,
    },
    orderBy: { dayIndex: 'asc' },
  },
} satisfies Prisma.PlanTemplateInclude;
