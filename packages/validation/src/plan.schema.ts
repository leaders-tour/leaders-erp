import { VariantType } from '@tour/domain';
import { z } from 'zod';

const vehicleTypes = ['스타렉스', '푸르공', '벨파이어', '하이에이스'] as const;
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

export const extraLodgingInputSchema = z.object({
  dayIndex: z.number().int().min(1).max(13),
  lodgingCount: z.number().int().min(0).max(10),
});

export const manualAdjustmentInputSchema = z.object({
  description: z.string().min(1).max(200),
  amountKrw: z.number().int().min(-1_000_000_000).max(1_000_000_000),
});

const manualDepositInputSchema = z.number().int().min(0).max(1_000_000_000);

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
    pickupDate: dateTimeInputSchema.optional(),
    pickupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    dropDate: dateTimeInputSchema.optional(),
    dropTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    pickupDropNote: z.string().max(1000).optional(),
    externalPickupDropNote: z.string().max(1000).optional(),
    specialNote: z.string().max(2000).optional(),
    includeRentalItems: z.boolean().default(true),
    rentalItemsText: z.string().max(10000),
    eventIds: z.array(z.string().min(1)).default([]),
    extraLodgings: z.array(extraLodgingInputSchema).default([]),
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

    if (value.includeRentalItems && value.rentalItemsText.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'rentalItemsText is required when includeRentalItems is true',
        path: ['rentalItemsText'],
      });
    }

    const seenDayIndexes = new Set<number>();
    value.extraLodgings.forEach((item, index) => {
      if (seenDayIndexes.has(item.dayIndex)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'extraLodgings must have unique dayIndex values',
          path: ['extraLodgings', index, 'dayIndex'],
        });
      }
      seenDayIndexes.add(item.dayIndex);
    });
  });

const planVersionSeedSchema = z
  .object({
    variantType: z.nativeEnum(VariantType),
    totalDays: z.number().int().min(2).max(13),
    planStops: z.array(planStopNestedSchema).min(1),
    changeNote: z.string().max(1000).optional(),
    meta: planVersionMetaInputSchema,
    manualAdjustments: z.array(manualAdjustmentInputSchema).default([]),
    manualDepositAmountKrw: manualDepositInputSchema.optional(),
  })
  .superRefine((value, ctx) => {
    value.meta.extraLodgings.forEach((item, index) => {
      if (item.dayIndex > value.totalDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'extraLodgings dayIndex must be within totalDays',
          path: ['meta', 'extraLodgings', index, 'dayIndex'],
        });
      }
    });
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

export const planVersionCreateSchema = z
  .object({
    planId: z.string().min(1),
    parentVersionId: z.string().min(1).optional(),
    variantType: z.nativeEnum(VariantType),
    totalDays: z.number().int().min(2).max(13),
    planStops: z.array(planStopNestedSchema).min(1),
    changeNote: z.string().max(1000).optional(),
    meta: planVersionMetaInputSchema,
    manualAdjustments: z.array(manualAdjustmentInputSchema).default([]),
    manualDepositAmountKrw: manualDepositInputSchema.optional(),
  })
  .superRefine((value, ctx) => {
    value.meta.extraLodgings.forEach((item, index) => {
      if (item.dayIndex > value.totalDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'extraLodgings dayIndex must be within totalDays',
          path: ['meta', 'extraLodgings', index, 'dayIndex'],
        });
      }
    });
  });

export const planPricingPreviewSchema = z
  .object({
    regionId: z.string().min(1),
    variantType: z.nativeEnum(VariantType),
    totalDays: z.number().int().min(2).max(13),
    planStops: z.array(planStopNestedSchema),
    travelStartDate: dateTimeInputSchema,
    headcountTotal: z.number().int().min(1).max(100),
    vehicleType: z.enum(vehicleTypes),
    includeRentalItems: z.boolean().default(true),
    eventIds: z.array(z.string().min(1)).default([]),
    extraLodgings: z.array(extraLodgingInputSchema).default([]),
    manualAdjustments: z.array(manualAdjustmentInputSchema).default([]),
    manualDepositAmountKrw: manualDepositInputSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const uniqueEventIds = new Set(value.eventIds);
    if (uniqueEventIds.size !== value.eventIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'eventIds must not contain duplicates',
        path: ['eventIds'],
      });
    }

    const seenDayIndexes = new Set<number>();
    value.extraLodgings.forEach((item, index) => {
      if (item.dayIndex > value.totalDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'extraLodgings dayIndex must be within totalDays',
          path: ['extraLodgings', index, 'dayIndex'],
        });
      }
      if (seenDayIndexes.has(item.dayIndex)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'extraLodgings must have unique dayIndex values',
          path: ['extraLodgings', index, 'dayIndex'],
        });
      }
      seenDayIndexes.add(item.dayIndex);
    });
  });

export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
export type PlanVersionCreateInput = z.infer<typeof planVersionCreateSchema>;
export type PlanStopNestedInput = z.infer<typeof planStopNestedSchema>;
export type PlanVersionMetaInput = z.infer<typeof planVersionMetaInputSchema>;
export type ExtraLodgingInput = z.infer<typeof extraLodgingInputSchema>;
export type ManualAdjustmentInput = z.infer<typeof manualAdjustmentInputSchema>;
export type PlanPricingPreviewInput = z.infer<typeof planPricingPreviewSchema>;
