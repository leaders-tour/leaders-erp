import type { Prisma } from '@prisma/client';

export const planVersionInclude = {
  parentVersion: true,
  childVersions: {
    orderBy: { versionNumber: 'asc' },
  },
  planStops: {
    orderBy: { createdAt: 'asc' },
  },
  overrides: true,
} satisfies Prisma.PlanVersionInclude;

export const planInclude = {
  user: true,
  region: true,
  currentVersion: {
    include: planVersionInclude,
  },
  versions: {
    include: planVersionInclude,
    orderBy: { versionNumber: 'desc' },
  },
} satisfies Prisma.PlanInclude;
