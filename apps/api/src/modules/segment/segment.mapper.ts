import type { Prisma } from '@prisma/client';

export const segmentInclude = {
  region: true,
  fromLocation: true,
  toLocation: true,
} satisfies Prisma.SegmentInclude;
