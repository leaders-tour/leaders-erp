import type { Prisma } from '@prisma/client';

export const mealSetInclude = {
  location: true,
  locationVersion: true,
} satisfies Prisma.MealSetInclude;
