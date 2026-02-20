import type { Prisma } from '@prisma/client';

export const mealSetInclude = {
  location: true,
} satisfies Prisma.MealSetInclude;
