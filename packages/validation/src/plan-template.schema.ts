import { z } from 'zod';

export const planTemplateStopInputSchema = z
  .object({
    dayIndex: z.number().int().min(1).max(13),
    segmentId: z.string().min(1).optional(),
    segmentVersionId: z.string().min(1).optional(),
    overnightStayId: z.string().min(1).optional(),
    overnightStayDayOrder: z.number().int().min(1).max(3).optional(),
    multiDayBlockId: z.string().min(1).optional(),
    multiDayBlockDayOrder: z.number().int().min(1).max(3).optional(),
    multiDayBlockConnectionId: z.string().min(1).optional(),
    multiDayBlockConnectionVersionId: z.string().min(1).optional(),
    locationId: z.string().min(1).optional(),
    locationVersionId: z.string().min(1).optional(),
    dateCellText: z.string(),
    destinationCellText: z.string(),
    timeCellText: z.string(),
    scheduleCellText: z.string(),
    lodgingCellText: z.string(),
    mealCellText: z.string(),
  })
  .transform((raw) => ({
    ...raw,
    multiDayBlockId: raw.multiDayBlockId,
    multiDayBlockDayOrder: raw.multiDayBlockDayOrder,
    multiDayBlockConnectionId: raw.multiDayBlockConnectionId,
    multiDayBlockConnectionVersionId: raw.multiDayBlockConnectionVersionId,
  }));

const planTemplateBaseSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(5000).optional(),
  regionSetId: z.string().min(1),
  totalDays: z.number().int().min(2).max(13),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
});

export const planTemplateCreateSchema = planTemplateBaseSchema
  .extend({
    planStops: z.array(planTemplateStopInputSchema).min(1),
  })
  .superRefine((value, ctx) => {
    if (value.planStops.length !== value.totalDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'totalDays must match planStops length',
        path: ['planStops'],
      });
    }

    const seen = new Set<number>();
    value.planStops.forEach((stop, index) => {
      if (stop.dayIndex > value.totalDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'dayIndex must be within totalDays',
          path: ['planStops', index, 'dayIndex'],
        });
      }
      if (seen.has(stop.dayIndex)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'planStops must have unique dayIndex values',
          path: ['planStops', index, 'dayIndex'],
        });
      }
      seen.add(stop.dayIndex);
    });
  });

export const planTemplateUpdateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(5000).optional(),
    regionSetId: z.string().min(1).optional(),
    totalDays: z.number().int().min(2).max(13).optional(),
    sortOrder: z.number().int().min(0).max(100_000).optional(),
    isActive: z.boolean().optional(),
    planStops: z.array(planTemplateStopInputSchema).min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.planStops) {
      return;
    }

    const seen = new Set<number>();
    value.planStops.forEach((stop, index) => {
      const totalDays = value.totalDays ?? 13;
      if (stop.dayIndex > totalDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'dayIndex must be within totalDays',
          path: ['planStops', index, 'dayIndex'],
        });
      }
      if (seen.has(stop.dayIndex)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'planStops must have unique dayIndex values',
          path: ['planStops', index, 'dayIndex'],
        });
      }
      seen.add(stop.dayIndex);
    });
  });

export type PlanTemplateStopInput = z.infer<typeof planTemplateStopInputSchema>;
export type PlanTemplateCreateInput = z.infer<typeof planTemplateCreateSchema>;
export type PlanTemplateUpdateInput = z.infer<typeof planTemplateUpdateSchema>;
