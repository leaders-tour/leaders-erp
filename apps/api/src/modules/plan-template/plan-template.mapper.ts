import type { Prisma } from '@prisma/client';
import { locationInclude, locationVersionInclude } from '../location/location.mapper';
import { regionSetGraphInclude } from '../region-set/region-set.mapper';

export const planTemplateInclude = {
  regionSet: { include: regionSetGraphInclude },
  planStops: {
    include: {
      segment: true,
      segmentVersion: true,
      location: { include: locationInclude },
      locationVersion: { include: locationVersionInclude },
      multiDayBlock: {
        include: {
          days: { orderBy: { dayOrder: 'asc' } },
        },
      },
    },
    orderBy: { dayIndex: 'asc' },
  },
} satisfies Prisma.PlanTemplateInclude;
