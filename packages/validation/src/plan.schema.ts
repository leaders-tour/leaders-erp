import { VariantType } from '@tour/domain';
import { z } from 'zod';

export const planStopNestedSchema = z.object({
  dateCellText: z.string(),
  destinationCellText: z.string(),
  timeCellText: z.string(),
  scheduleCellText: z.string(),
  lodgingCellText: z.string(),
  mealCellText: z.string(),
});

const planVersionSeedSchema = z.object({
  variantType: z.nativeEnum(VariantType),
  totalDays: z.number().int().min(2).max(10),
  planStops: z.array(planStopNestedSchema).min(1),
  changeNote: z.string().max(1000).optional(),
});

export const planCreateSchema = z.object({
  userId: z.string().min(1),
  regionId: z.string().min(1),
  title: z.string().min(1).max(200),
  initialVersion: planVersionSeedSchema,
});

export const planUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  currentVersionId: z.string().min(1).optional(),
});

export const planVersionCreateSchema = z.object({
  planId: z.string().min(1),
  parentVersionId: z.string().min(1).optional(),
  variantType: z.nativeEnum(VariantType),
  totalDays: z.number().int().min(2).max(10),
  planStops: z.array(planStopNestedSchema).min(1),
  changeNote: z.string().max(1000).optional(),
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
export type PlanVersionCreateInput = z.infer<typeof planVersionCreateSchema>;
export type PlanStopNestedInput = z.infer<typeof planStopNestedSchema>;
