import type { Prisma } from '@prisma/client';

export const eventInclude = {
  _count: {
    select: {
      planVersionEvents: true,
    },
  },
} satisfies Prisma.EventInclude;
