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
    },
    orderBy: { dayIndex: 'asc' },
  },
} satisfies Prisma.PlanTemplateInclude;
