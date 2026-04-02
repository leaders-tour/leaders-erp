import { VariantType } from '@tour/domain';
import { z } from 'zod';

const pricingQuantitySources = ['ONE', 'HEADCOUNT', 'TOTAL_DAYS', 'LONG_DISTANCE_SEGMENT_COUNT', 'SUM_EXTRA_LODGING_COUNTS'] as const;
const pricingPolicyStatuses = ['ACTIVE', 'INACTIVE'] as const;
const pricingChargeScopes = ['TEAM', 'PER_PERSON'] as const;
const pricingPersonModes = ['SINGLE', 'PER_DAY', 'PER_NIGHT'] as const;
const pricingRuleTypes = ['BASE', 'PERCENT_UPLIFT', 'CONDITIONAL_ADDON', 'AUTO_EXCEPTION', 'MANUAL'] as const;
const pricingTimeBands = ['DAWN', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'] as const;
const pricingExternalTransferModes = ['ANY', 'PICKUP_ONLY', 'DROP_ONLY', 'BOTH'] as const;
const pricingPlaceTypes = ['AIRPORT', 'OZ_HOUSE', 'ULAANBAATAR', 'CUSTOM'] as const;
const externalTransferPresetCodes = [
  'DROP_ULAANBAATAR_AIRPORT',
  'DROP_TERELJ_AIRPORT',
  'DROP_OZHOUSE_AIRPORT',
  'PICKUP_AIRPORT_OZHOUSE',
  'PICKUP_AIRPORT_ULAANBAATAR',
  'PICKUP_AIRPORT_TERELJ',
  'CUSTOM',
] as const;
const externalTransferPresetDirections: Record<
  (typeof externalTransferPresetCodes)[number],
  'PICKUP' | 'DROP' | 'ANY'
> = {
  DROP_ULAANBAATAR_AIRPORT: 'DROP',
  DROP_TERELJ_AIRPORT: 'DROP',
  DROP_OZHOUSE_AIRPORT: 'DROP',
  PICKUP_AIRPORT_OZHOUSE: 'PICKUP',
  PICKUP_AIRPORT_ULAANBAATAR: 'PICKUP',
  PICKUP_AIRPORT_TERELJ: 'PICKUP',
  CUSTOM: 'ANY',
};

const dateTimeInputSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime(),
);

export const pricingRuleBaseSchema = z.object({
  ruleType: z.enum(pricingRuleTypes),
  title: z.string().min(1).max(191),
  amountKrw: z.number().int().min(-1_000_000_000).max(1_000_000_000).nullable().optional(),
  percentBps: z.number().int().min(-100_000).max(100_000).nullable().optional(),
  quantitySource: z.enum(pricingQuantitySources),
  headcountMin: z.number().int().min(0).max(100).nullable().optional(),
  headcountMax: z.number().int().min(0).max(100).nullable().optional(),
  dayMin: z.number().int().min(1).max(30).nullable().optional(),
  dayMax: z.number().int().min(1).max(30).nullable().optional(),
  travelDateFrom: dateTimeInputSchema.nullable().optional(),
  travelDateTo: dateTimeInputSchema.nullable().optional(),
  vehicleType: z.string().min(1).max(50).nullable().optional(),
  variantTypes: z.array(z.nativeEnum(VariantType)).default([]),
  flightInTimeBand: z.enum(pricingTimeBands).nullable().optional(),
  flightOutTimeBand: z.enum(pricingTimeBands).nullable().optional(),
  pickupPlaceType: z.enum(pricingPlaceTypes).nullable().optional(),
  dropPlaceType: z.enum(pricingPlaceTypes).nullable().optional(),
  externalTransferMode: z.enum(pricingExternalTransferModes).nullable().optional(),
  externalTransferMinCount: z.number().int().min(1).max(100).nullable().optional(),
  externalTransferPresetCodes: z.array(z.enum(externalTransferPresetCodes)).default([]),
  chargeScope: z.enum(pricingChargeScopes).nullable().optional(),
  personMode: z.enum(pricingPersonModes).nullable().optional(),
  customDisplayText: z.string().min(1).max(500).nullable().optional(),
  isEnabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

function validateRuleInput(
  value: Partial<z.infer<typeof pricingRuleBaseSchema>>,
  ctx: z.RefinementCtx,
): void {
  const ruleType = value.ruleType ?? null;
  const chargeScope = value.chargeScope ?? null;
  const personMode = value.personMode ?? null;
  const amountKrw = value.amountKrw ?? null;
  const percentBps = value.percentBps ?? null;
  const usesAmount = ruleType === 'BASE' || ruleType === 'CONDITIONAL_ADDON' || ruleType === 'MANUAL' || ruleType === 'AUTO_EXCEPTION';
  const usesPercent = ruleType === 'PERCENT_UPLIFT';

  if (ruleType === 'AUTO_EXCEPTION' || ruleType === 'MANUAL') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${ruleType} rules are not editable in pricing policy admin`,
      path: ['ruleType'],
    });
  }

  if (usesAmount && amountKrw == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'amountKrw is required for amount-based rule types',
      path: ['amountKrw'],
    });
  }

  if (usesAmount && percentBps != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'percentBps must be empty for amount-based rule types',
      path: ['percentBps'],
    });
  }

  if (usesPercent && percentBps == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'percentBps is required for PERCENT_UPLIFT',
      path: ['percentBps'],
    });
  }

  if (usesPercent && amountKrw != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'amountKrw must be empty for PERCENT_UPLIFT',
      path: ['amountKrw'],
    });
  }

  if (usesPercent && (chargeScope != null || personMode != null || value.customDisplayText != null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'display inputs for PERCENT_UPLIFT are fixed',
      path: ['chargeScope'],
    });
  }

  if (chargeScope === 'TEAM' && personMode != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'personMode must be empty when chargeScope is TEAM',
      path: ['personMode'],
    });
  }

  if (chargeScope === 'PER_PERSON' && usesAmount && personMode == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'personMode is required when chargeScope is PER_PERSON',
      path: ['personMode'],
    });
  }

  if (chargeScope == null && personMode != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'chargeScope is required when personMode is set',
      path: ['chargeScope'],
    });
  }

  if (value.headcountMin != null && value.headcountMax != null && value.headcountMin > value.headcountMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'headcountMin must be less than or equal to headcountMax',
      path: ['headcountMin'],
    });
  }

  if (value.dayMin != null && value.dayMax != null && value.dayMin > value.dayMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'dayMin must be less than or equal to dayMax',
      path: ['dayMin'],
    });
  }

  if (value.travelDateFrom != null && value.travelDateTo != null && value.travelDateFrom > value.travelDateTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'travelDateFrom must be less than or equal to travelDateTo',
      path: ['travelDateFrom'],
    });
  }

  if (value.externalTransferMinCount != null && value.externalTransferMode == null) {
    const presetCodes = value.externalTransferPresetCodes ?? [];
    if (presetCodes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'externalTransferMode or externalTransferPresetCodes is required when externalTransferMinCount is set',
        path: ['externalTransferMode'],
      });
    }
  }

  const presetCodes = value.externalTransferPresetCodes ?? [];
  if (presetCodes.length > 0 && value.externalTransferMode != null) {
    const hasPickupPreset = presetCodes.some((code) => externalTransferPresetDirections[code] === 'PICKUP');
    const hasDropPreset = presetCodes.some((code) => externalTransferPresetDirections[code] === 'DROP');
    if (value.externalTransferMode === 'PICKUP_ONLY' && hasDropPreset) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DROP preset codes cannot be combined with PICKUP_ONLY',
        path: ['externalTransferPresetCodes'],
      });
    }
    if (value.externalTransferMode === 'DROP_ONLY' && hasPickupPreset) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PICKUP preset codes cannot be combined with DROP_ONLY',
        path: ['externalTransferPresetCodes'],
      });
    }
    if (value.externalTransferMode === 'BOTH' && !presetCodes.includes('CUSTOM') && (!hasPickupPreset || !hasDropPreset)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'BOTH mode preset filters must include both PICKUP and DROP presets',
        path: ['externalTransferPresetCodes'],
      });
    }
  }
}

export const pricingRuleWithPolicySchema = pricingRuleBaseSchema.extend({
  policyId: z.string().min(1),
});

export const pricingRuleCreateSchema = pricingRuleWithPolicySchema.superRefine(validateRuleInput);

export const pricingRuleUpdateSchema = pricingRuleBaseSchema.partial().superRefine(validateRuleInput);

export const pricingPolicyCreateSchema = z.object({
  name: z.string().min(1).max(100),
  status: z.enum(pricingPolicyStatuses).default('ACTIVE'),
  effectiveFrom: dateTimeInputSchema,
  effectiveTo: dateTimeInputSchema.nullable().optional(),
});

export const pricingPolicyUpdateSchema = pricingPolicyCreateSchema.partial();

export const pricingPolicyDuplicateSchema = z.object({
  name: z.string().min(1).max(100),
  effectiveFrom: dateTimeInputSchema.optional(),
  effectiveTo: dateTimeInputSchema.nullable().optional(),
  status: z.enum(pricingPolicyStatuses).optional(),
});

export type PricingRuleCreateInput = z.infer<typeof pricingRuleCreateSchema>;
export type PricingRuleUpdateInput = z.infer<typeof pricingRuleUpdateSchema>;
export type PricingPolicyCreateInput = z.infer<typeof pricingPolicyCreateSchema>;
export type PricingPolicyUpdateInput = z.infer<typeof pricingPolicyUpdateSchema>;
export type PricingPolicyDuplicateInput = z.infer<typeof pricingPolicyDuplicateSchema>;
