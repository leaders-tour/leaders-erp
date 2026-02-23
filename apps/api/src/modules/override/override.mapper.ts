import type { Prisma } from '@prisma/client';

export const overrideInclude = {
  planVersion: true,
} satisfies Prisma.OverrideInclude;
