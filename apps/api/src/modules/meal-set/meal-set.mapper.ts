import type { Prisma } from '@prisma/client';

export const mealSetInclude = {
  location: true,
  planStops: true,
} satisfies Prisma.MealSetInclude;
