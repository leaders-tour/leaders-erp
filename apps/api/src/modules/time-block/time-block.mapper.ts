import type { Prisma } from '@prisma/client';

export const timeBlockInclude = {
  location: true,
  activities: {
    orderBy: { orderIndex: 'asc' },
  },
} satisfies Prisma.TimeBlockInclude;
