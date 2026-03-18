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
          days: {
            orderBy: { dayOrder: 'asc' },
          },
        },
      },
      overnightStayConnection: true,
      overnightStayConnectionVersion: true,
    },
    orderBy: { dayIndex: 'asc' },
  },
} satisfies Prisma.PlanTemplateInclude;
