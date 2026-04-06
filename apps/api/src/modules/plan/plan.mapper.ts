import type { Prisma } from '@prisma/client';
import { regionSetGraphInclude } from '../region-set/region-set.mapper';

export const planVersionInclude = {
  regionSet: { include: regionSetGraphInclude },
  parentVersion: true,
  childVersions: {
    orderBy: { versionNumber: 'asc' },
  },
  meta: {
    include: {
      transportGroups: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  },
  pricing: {
    include: {
      securityDepositEvent: true,
      lines: {
        orderBy: { createdAt: 'asc' },
      },
    },
  },
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
    orderBy: { createdAt: 'asc' },
  },
  planVersionEvents: {
    include: {
      event: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
  overrides: true,
} satisfies Prisma.PlanVersionInclude;

export const planInclude = {
  user: {
    include: {
      ownerEmployee: true,
    },
  },
  regionSet: { include: regionSetGraphInclude },
  currentVersion: {
    include: planVersionInclude,
  },
  versions: {
    include: planVersionInclude,
    orderBy: { versionNumber: 'desc' },
  },
} satisfies Prisma.PlanInclude;
