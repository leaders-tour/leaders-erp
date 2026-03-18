import { VariantType } from '@tour/domain';
import { z } from 'zod';

const vehicleTypes = ['스타렉스', '푸르공', '벨파이어', '하이에이스'] as const;
const placeTypes = ['AIRPORT', 'OZ_HOUSE', 'ULAANBAATAR', 'CUSTOM'] as const;
const lodgingSelectionLevels = ['LV1', 'LV2', 'LV3', 'LV4', 'CUSTOM'] as const;
const dateTimeInputSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime(),
);

export const planStopNestedSchema = z
  .object({
    segmentId: z.string().min(1).optional(),
    segmentVersionId: z.string().min(1).optional(),
    overnightStayId: z.string().min(1).optional(),
    overnightStayDayOrder: z.number().int().min(1).max(3).optional(),
    overnightStayConnectionId: z.string().min(1).optional(),
    overnightStayConnectionVersionId: z.string().min(1).optional(),
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

export const extraLodgingInputSchema = z.object({
  dayIndex: z.number().int().min(1).max(13),
  lodgingCount: z.number().int().min(0).max(10),
});

export const manualAdjustmentInputSchema = z.object({
  description: z.string().min(1).max(200),
  amountKrw: z.number().int().min(-1_000_000_000).max(1_000_000_000),
});

export const lodgingSelectionInputSchema = z
  .object({
    dayIndex: z.number().int().min(1).max(13),
    level: z.enum(lodgingSelectionLevels),
    customLodgingId: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.level === 'CUSTOM') {
      if (value.customLodgingId?.trim()) {
        return;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'customLodgingId is required when level is CUSTOM',
        path: ['customLodgingId'],
      });
      return;
    }

    if (!value.customLodgingId) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'customLodgingId is only allowed when level is CUSTOM',
      path: ['customLodgingId'],
    });
  });

const manualDepositInputSchema = z.number().int().min(0).max(1_000_000_000);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const externalTransferDirections = ['PICKUP', 'DROP'] as const;
const externalTransferPresetCodes = [
  'DROP_ULAANBAATAR_AIRPORT',
  'DROP_TERELJ_AIRPORT',
  'PICKUP_AIRPORT_OZHOUSE',
  'CUSTOM',
] as const;

export const externalTransferInputSchema = z
  .object({
    direction: z.enum(externalTransferDirections),
    presetCode: z.enum(externalTransferPresetCodes),
    travelDate: dateTimeInputSchema,
    departureTime: timeSchema,
    arrivalTime: timeSchema,
    departurePlace: z.string().min(1).max(100),
    arrivalPlace: z.string().min(1).max(100),
    selectedTeamOrderIndexes: z.array(z.number().int().min(0)).min(1),
    unitPriceKrw: z.number().int().min(0).max(1_000_000_000),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<number>();
    value.selectedTeamOrderIndexes.forEach((orderIndex, index) => {
      if (seen.has(orderIndex)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'selectedTeamOrderIndexes must not contain duplicates',
          path: ['selectedTeamOrderIndexes', index],
        });
        return;
      }
      seen.add(orderIndex);
    });
  });

export const planVersionTransportGroupInputSchema = z
  .object({
    teamName: z.string().min(1).max(100),
    headcount: z.number().int().min(1).max(100),
    flightInDate: dateTimeInputSchema,
    flightInTime: timeSchema,
    flightOutDate: dateTimeInputSchema,
    flightOutTime: timeSchema,
    pickupDate: dateTimeInputSchema.optional(),
    pickupTime: timeSchema.optional(),
    pickupPlaceType: z.enum(placeTypes).optional(),
    pickupPlaceCustomText: z.string().max(100).optional(),
    dropDate: dateTimeInputSchema.optional(),
    dropTime: timeSchema.optional(),
    dropPlaceType: z.enum(placeTypes).optional(),
    dropPlaceCustomText: z.string().max(100).optional(),
  })
  .superRefine((value, ctx) => {
    const customPlaceFields = [
      ['pickupPlaceType', 'pickupPlaceCustomText'],
      ['dropPlaceType', 'dropPlaceCustomText'],
    ] as const;

    customPlaceFields.forEach(([typeKey, textKey]) => {
      if (value[typeKey] !== 'CUSTOM') {
        return;
      }

      const text = value[textKey]?.trim() ?? '';
      if (text.length > 0) {
        return;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${textKey} is required when ${typeKey} is CUSTOM`,
        path: [textKey],
      });
    });
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
    flightInTime: timeSchema,
    flightOutTime: timeSchema,
    pickupDate: dateTimeInputSchema.optional(),
    pickupTime: timeSchema.optional(),
    dropDate: dateTimeInputSchema.optional(),
    dropTime: timeSchema.optional(),
    pickupDropNote: z.string().max(1000).optional(),
    pickupPlaceType: z.enum(placeTypes).optional(),
    pickupPlaceCustomText: z.string().max(100).optional(),
    dropPlaceType: z.enum(placeTypes).optional(),
    dropPlaceCustomText: z.string().max(100).optional(),
    externalPickupDate: dateTimeInputSchema.optional(),
    externalPickupTime: timeSchema.optional(),
    externalPickupPlaceType: z.enum(placeTypes).optional(),
    externalPickupPlaceCustomText: z.string().max(100).optional(),
    externalDropDate: dateTimeInputSchema.optional(),
    externalDropTime: timeSchema.optional(),
    externalDropPlaceType: z.enum(placeTypes).optional(),
    externalDropPlaceCustomText: z.string().max(100).optional(),
    externalPickupDropNote: z.string().max(1000).optional(),
    externalTransfers: z.array(externalTransferInputSchema).default([]),
    specialNote: z.string().max(2000).optional(),
    includeRentalItems: z.boolean().default(true),
    rentalItemsText: z.string().max(10000),
    eventIds: z.array(z.string().min(1)).default([]),
    extraLodgings: z.array(extraLodgingInputSchema).default([]),
    lodgingSelections: z.array(lodgingSelectionInputSchema).default([]),
    transportGroups: z.array(planVersionTransportGroupInputSchema).min(1),
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

    const transportHeadcountTotal = value.transportGroups.reduce((sum, item) => sum + item.headcount, 0);
    if (transportHeadcountTotal !== value.headcountTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'transportGroups headcount must equal headcountTotal',
        path: ['transportGroups'],
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

    const seenLodgingSelectionDays = new Set<number>();
    value.lodgingSelections.forEach((item, index) => {
      if (seenLodgingSelectionDays.has(item.dayIndex)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'lodgingSelections must have unique dayIndex values',
          path: ['lodgingSelections', index, 'dayIndex'],
        });
      }
      seenLodgingSelectionDays.add(item.dayIndex);
    });

    const validTransportIndexes = new Set(value.transportGroups.map((_group, index) => index));
    value.externalTransfers.forEach((item, index) => {
      item.selectedTeamOrderIndexes.forEach((teamOrderIndex, teamIndex) => {
        if (validTransportIndexes.has(teamOrderIndex)) {
          return;
        }

        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'selectedTeamOrderIndexes must refer to an existing transport group',
          path: ['externalTransfers', index, 'selectedTeamOrderIndexes', teamIndex],
        });
      });
    });

    const customPlaceFields = [
      ['pickupPlaceType', 'pickupPlaceCustomText'],
      ['dropPlaceType', 'dropPlaceCustomText'],
      ['externalPickupPlaceType', 'externalPickupPlaceCustomText'],
      ['externalDropPlaceType', 'externalDropPlaceCustomText'],
    ] as const;

    customPlaceFields.forEach(([typeKey, textKey]) => {
      if (value[typeKey] !== 'CUSTOM') {
        return;
      }

      const text = value[textKey]?.trim() ?? '';
      if (text.length > 0) {
        return;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${textKey} is required when ${typeKey} is CUSTOM`,
        path: [textKey],
      });
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

    value.meta.lodgingSelections.forEach((item, index) => {
      if (item.dayIndex > value.totalDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'lodgingSelections dayIndex must be within totalDays',
          path: ['meta', 'lodgingSelections', index, 'dayIndex'],
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

    value.meta.lodgingSelections.forEach((item, index) => {
      if (item.dayIndex > value.totalDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'lodgingSelections dayIndex must be within totalDays',
          path: ['meta', 'lodgingSelections', index, 'dayIndex'],
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
    transportGroupCount: z.number().int().min(1).max(100),
    vehicleType: z.enum(vehicleTypes),
    includeRentalItems: z.boolean().default(true),
    eventIds: z.array(z.string().min(1)).default([]),
    extraLodgings: z.array(extraLodgingInputSchema).default([]),
    lodgingSelections: z.array(lodgingSelectionInputSchema).default([]),
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

    const seenLodgingSelectionDays = new Set<number>();
    value.lodgingSelections.forEach((item, index) => {
      if (item.dayIndex > value.totalDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'lodgingSelections dayIndex must be within totalDays',
          path: ['lodgingSelections', index, 'dayIndex'],
        });
      }
      if (seenLodgingSelectionDays.has(item.dayIndex)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'lodgingSelections must have unique dayIndex values',
          path: ['lodgingSelections', index, 'dayIndex'],
        });
      }
      seenLodgingSelectionDays.add(item.dayIndex);
    });
  });

export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
export type PlanVersionCreateInput = z.infer<typeof planVersionCreateSchema>;
export type PlanStopNestedInput = z.infer<typeof planStopNestedSchema>;
export type PlanVersionMetaInput = z.infer<typeof planVersionMetaInputSchema>;
export type PlanVersionTransportGroupInput = z.infer<typeof planVersionTransportGroupInputSchema>;
export type ExtraLodgingInput = z.infer<typeof extraLodgingInputSchema>;
export type ExternalTransferInput = z.infer<typeof externalTransferInputSchema>;
export type ManualAdjustmentInput = z.infer<typeof manualAdjustmentInputSchema>;
export type LodgingSelectionInput = z.infer<typeof lodgingSelectionInputSchema>;
export type PlanPricingPreviewInput = z.infer<typeof planPricingPreviewSchema>;
