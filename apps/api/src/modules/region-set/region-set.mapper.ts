import type { Prisma } from '@prisma/client';

export const regionSetListInclude = {
  items: {
    orderBy: { sortOrder: 'asc' as const },
    include: { region: { select: { id: true, name: true } } },
  },
} satisfies Prisma.RegionSetInclude;

/** Full region rows for GraphQL nested under Plan / PlanTemplate. */
export const regionSetGraphInclude = {
  items: {
    orderBy: { sortOrder: 'asc' as const },
    include: { region: true },
  },
} satisfies Prisma.RegionSetInclude;
