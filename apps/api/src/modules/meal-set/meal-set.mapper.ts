import type { Prisma } from '@prisma/client';

export const mealSetInclude = {
  location: true,
  dayPlans: true,
} satisfies Prisma.MealSetInclude;
