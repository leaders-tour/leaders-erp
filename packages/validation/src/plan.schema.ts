import { VariantType } from '@tour/domain';
import { z } from 'zod';

const activityNestedSchema = z.object({
  description: z.string().min(1).max(500),
  orderIndex: z.number().int().min(0),
  isOptional: z.boolean().optional().default(false),
  conditionNote: z.string().max(500).nullable().optional(),
});

const timeBlockNestedSchema = z.object({
  startTime: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/),
  label: z.string().min(1).max(100),
  orderIndex: z.number().int().min(0),
  activities: z.array(activityNestedSchema).min(1),
});

const dayPlanNestedSchema = z.object({
  dayIndex: z.number().int().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  distanceText: z.string().min(1).max(100),
  lodgingText: z.string().min(1).max(100),
  mealsText: z.string().min(1).max(100),
  timeBlocks: z.array(timeBlockNestedSchema).min(1),
});

export const planCreateSchema = z.object({
  regionId: z.string().min(1),
  variantType: z.nativeEnum(VariantType),
  totalDays: z.number().int().min(2).max(10),
  dayPlans: z.array(dayPlanNestedSchema).min(1),
});

export const planUpdateSchema = z.object({
  variantType: z.nativeEnum(VariantType).optional(),
  totalDays: z.number().int().min(2).max(10).optional(),
  dayPlans: z.array(dayPlanNestedSchema).min(1).optional(),
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
