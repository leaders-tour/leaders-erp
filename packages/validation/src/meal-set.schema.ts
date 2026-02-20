import { MealOption } from '@tour/domain';
import { z } from 'zod';

const nullableMeal = z.nativeEnum(MealOption).nullable().optional();

export const mealSetCreateSchema = z.object({
  locationId: z.string().min(1),
  setName: z.string().min(1).max(100),
  breakfast: nullableMeal,
  lunch: nullableMeal,
  dinner: nullableMeal,
});

export const mealSetUpdateSchema = mealSetCreateSchema.partial();

export type MealSetCreateInput = z.infer<typeof mealSetCreateSchema>;
export type MealSetUpdateInput = z.infer<typeof mealSetUpdateSchema>;
