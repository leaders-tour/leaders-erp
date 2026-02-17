import type { Prisma } from '@prisma/client';

export const overrideInclude = {
  plan: true,
} satisfies Prisma.OverrideInclude;
