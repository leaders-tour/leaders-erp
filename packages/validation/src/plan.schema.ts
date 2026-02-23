import { VariantType } from '@tour/domain';
import { z } from 'zod';

const vehicleTypes = ['스타렉스', '푸르공', '벨파이어', '하이에이스'] as const;
const eventCodes = ['A', 'B', 'C'] as const;
const dateTimeInputSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime(),
);

export const planStopNestedSchema = z.object({
  locationId: z.string().min(1).optional(),
  locationVersionId: z.string().min(1).optional(),
  dateCellText: z.string(),
  destinationCellText: z.string(),
  timeCellText: z.string(),
  scheduleCellText: z.string(),
  lodgingCellText: z.string(),
  mealCellText: z.string(),
});

export const planVersionMetaInputSchema = z
  .object({
    leaderName: z.string().min(1).max(100),
    travelStartDate: dateTimeInputSchema,
    travelEndDate: dateTimeInputSchema,
    headcountTotal: z.number().int().min(1).max(100),
    headcountMale: z.number().int().min(0).max(100),
    headcountFemale: z.number().int().min(0).max(100),
    vehicleType: z.enum(vehicleTypes),
    flightInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    flightOutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    pickupDropNote: z.string().max(1000).optional(),
    externalPickupDropNote: z.string().max(1000).optional(),
    rentalItemsText: z.string().min(1).max(10000),
    eventCodes: z.array(z.enum(eventCodes)).default([]),
    remark: z.string().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    const start = new Date(value.travelStartDate);
    const end = new Date(value.travelEndDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'travelStartDate/travelEndDate must be valid ISO datetime',
      });
      return;
    }

    if (start.getTime() > end.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'travelStartDate must be before or equal to travelEndDate',
      });
    }

    if (value.headcountMale + value.headcountFemale !== value.headcountTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'headcountMale + headcountFemale must equal headcountTotal',
      });
    }
  });

const planVersionSeedSchema = z.object({
  variantType: z.nativeEnum(VariantType),
  totalDays: z.number().int().min(2).max(10),
  planStops: z.array(planStopNestedSchema).min(1),
  changeNote: z.string().max(1000).optional(),
  meta: planVersionMetaInputSchema,
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
  meta: planVersionMetaInputSchema,
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
export type PlanVersionCreateInput = z.infer<typeof planVersionCreateSchema>;
export type PlanStopNestedInput = z.infer<typeof planStopNestedSchema>;
export type PlanVersionMetaInput = z.infer<typeof planVersionMetaInputSchema>;
