import type { Prisma } from '@prisma/client';

const locationVersionTimeBlocksInclude = {
  include: {
    activities: {
      orderBy: { orderIndex: 'asc' },
    },
  },
  orderBy: { orderIndex: 'asc' },
} satisfies Prisma.TimeBlockFindManyArgs;

export const locationVersionInclude = {
  location: true,
  lodgings: true,
  mealSets: true,
  safetyNoticeLinks: {
    include: {
      safetyNotice: true,
    },
  },
  timeBlocks: locationVersionTimeBlocksInclude,
} satisfies Prisma.LocationVersionInclude;

export const locationInclude = {
  region: true,
  guide: true,
  currentVersion: {
    include: locationVersionInclude,
  },
  versions: {
    include: locationVersionInclude,
    orderBy: { versionNumber: 'desc' },
  },
  lodgings: true,
  mealSets: true,
  timeBlocks: locationVersionTimeBlocksInclude,
} satisfies Prisma.LocationInclude;
