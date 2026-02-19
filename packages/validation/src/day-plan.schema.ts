import { z } from 'zod';

export const dayPlanCreateSchema = z.object({
  planId: z.string().min(1),
  dayIndex: z.number().int().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  lodgingId: z.string().min(1).nullable().optional(),
  mealSetId: z.string().min(1).nullable().optional(),
  distanceText: z.string().min(1).max(100),
  lodgingText: z.string().min(1).max(100),
  mealsText: z.string().min(1).max(100),
});

export const dayPlanUpdateSchema = dayPlanCreateSchema.partial();

export type DayPlanCreateInput = z.infer<typeof dayPlanCreateSchema>;
export type DayPlanUpdateInput = z.infer<typeof dayPlanUpdateSchema>;
