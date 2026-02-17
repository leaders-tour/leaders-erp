import type { Prisma } from '@prisma/client';

export const activityInclude = {
  timeBlock: true,
} satisfies Prisma.ActivityInclude;
