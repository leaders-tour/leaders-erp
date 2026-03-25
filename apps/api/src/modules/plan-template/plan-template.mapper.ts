import type { Prisma } from '@prisma/client';
import { regionSetGraphInclude } from '../region-set/region-set.mapper';

export const planTemplateInclude = {
  regionSet: { include: regionSetGraphInclude },
  planStops: {
    include: {
      segment: true,
      segmentVersion: true,
      locationVersion: true,
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
