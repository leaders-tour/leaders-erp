import type { Prisma } from '@prisma/client';

export const planTemplateInclude = {
  region: true,
  planStops: {
    orderBy: { dayIndex: 'asc' },
  },
} satisfies Prisma.PlanTemplateInclude;
