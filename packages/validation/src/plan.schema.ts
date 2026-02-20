import { VariantType } from '@tour/domain';
import { z } from 'zod';

const planStopNestedSchema = z.object({
  dayIndex: z.number().int().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  lodgingId: z.string().min(1).nullable().optional(),
  mealSetId: z.string().min(1).nullable().optional(),
  distanceText: z.string().min(1).max(100),
  lodgingText: z.string().min(1).max(100),
  mealsText: z.string().min(1).max(100),
});

export const planCreateSchema = z.object({
  regionId: z.string().min(1),
  variantType: z.nativeEnum(VariantType),
  totalDays: z.number().int().min(2).max(10),
  planStops: z.array(planStopNestedSchema).min(1),
});

export const planUpdateSchema = z.object({
  variantType: z.nativeEnum(VariantType).optional(),
  totalDays: z.number().int().min(2).max(10).optional(),
  planStops: z.array(planStopNestedSchema).min(1).optional(),
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
