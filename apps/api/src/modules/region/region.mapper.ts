import type { Prisma } from '@prisma/client';

export const regionInclude = {
  locations: true,
  segments: true,
  defaultRegionSet: {
    include: {
      items: {
        orderBy: { sortOrder: 'asc' as const },
        include: { region: { select: { id: true, name: true } } },
      },
    },
  },
} satisfies Prisma.RegionInclude;
