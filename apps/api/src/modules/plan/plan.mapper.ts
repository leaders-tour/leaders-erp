import type { Prisma } from '@prisma/client';

export const planVersionInclude = {
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
  region: true,
  currentVersion: {
    include: planVersionInclude,
  },
  versions: {
    include: planVersionInclude,
    orderBy: { versionNumber: 'desc' },
  },
} satisfies Prisma.PlanInclude;
