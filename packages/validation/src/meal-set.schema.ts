import { MealOption } from '@tour/domain';
import { z } from 'zod';

const nullableMeal = z.nativeEnum(MealOption).nullable().optional();

const mealSetBaseSchema = z.object({
  locationId: z.string().min(1).optional(),
  locationVersionId: z.string().min(1).optional(),
  setName: z.string().min(1).max(100),
  breakfast: nullableMeal,
  lunch: nullableMeal,
  dinner: nullableMeal,
});

export const mealSetCreateSchema = mealSetBaseSchema.superRefine((value, ctx) => {
  if (!value.locationId && !value.locationVersionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'locationId or locationVersionId is required',
      path: ['locationVersionId'],
    });
  }
});

export const mealSetUpdateSchema = mealSetBaseSchema.partial();

export type MealSetCreateInput = z.infer<typeof mealSetCreateSchema>;
export type MealSetUpdateInput = z.infer<typeof mealSetUpdateSchema>;
