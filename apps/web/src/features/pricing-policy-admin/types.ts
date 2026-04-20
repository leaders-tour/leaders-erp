export type PricingPolicyStatus = 'ACTIVE' | 'INACTIVE';
export type PricingRuleType = 'BASE' | 'PERCENT_UPLIFT' | 'CONDITIONAL_ADDON' | 'LONG_DISTANCE' | 'AUTO_EXCEPTION' | 'MANUAL';
export type PricingPriceItemPreset =
  | 'BASE'
  | 'BASE_PERCENT'
  | 'LONG_DISTANCE'
  | 'NIGHT_TRAIN'
  | 'EXTRA_LODGING'
  | 'LODGING_SELECTION'
  | 'PICKUP_DROP'
  | 'CONDITIONAL'
  | 'MANUAL_PRESET';
export type PricingPriceItemGroup = 'BASE' | 'AUTO' | 'CONDITION' | 'MANUAL';
export type PricingPriceItemOptionKey =
  | 'BASE'
  | 'BASE_PERCENT'
  | 'LONG_DISTANCE'
  | 'PICKUP_DROP'
  | 'LODGING_SELECTION'
  | 'EXTRA_LODGING'
  | 'NIGHT_TRAIN'
  | 'CONDITIONAL_EARLY'
  | 'CONDITIONAL_EXTEND'
  | 'CONDITIONAL_HIACE_SHORT'
  | 'CONDITIONAL_HIACE_LONG'
  | 'CONDITIONAL_CUSTOM'
  | 'MANUAL_PRESET';
export type PricingQuantitySource =
  | 'ONE'
  | 'HEADCOUNT'
  | 'TOTAL_DAYS'
  | 'LONG_DISTANCE_SEGMENT_COUNT'
  | 'NIGHT_TRAIN_BLOCK_COUNT'
  | 'SUM_EXTRA_LODGING_COUNTS';
export type PricingChargeScope = 'TEAM' | 'PER_PERSON';
export type PricingPersonMode = 'SINGLE' | 'PER_DAY' | 'PER_NIGHT';
export type PricingLodgingSelectionLevel = 'LV1' | 'LV2' | 'LV4';
export type RuleFormStep = 'BASICS' | 'CONDITIONS' | 'DISPLAY';
export type ConditionCategoryKey =
  | 'headcountDays'
  | 'travelDate'
  | 'vehicle'
  | 'variant'
  | 'flight'
  | 'pickupDrop'
  | 'externalTransfer'
  | 'lodgingSelection';
export type VariantTypeOption = 'basic' | 'early' | 'extend' | 'earlyExtend';
export type PricingTimeBand = 'DAWN' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
export type PricingExternalTransferMode = 'ANY' | 'PICKUP_ONLY' | 'DROP_ONLY' | 'BOTH';
export type PlaceType = 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';
export type ExternalTransferPresetCodeOption =
  | 'DROP_ULAANBAATAR_AIRPORT'
  | 'DROP_TERELJ_AIRPORT'
  | 'DROP_OZHOUSE_AIRPORT'
  | 'PICKUP_AIRPORT_OZHOUSE'
  | 'PICKUP_AIRPORT_ULAANBAATAR'
  | 'PICKUP_AIRPORT_TERELJ'
  | 'CUSTOM';

export interface PricingRuleRow {
  id: string;
  policyId: string;
  priceItemPreset: PricingPriceItemPreset;
  ruleType: PricingRuleType;
  title: string;
  lineCode: string;
  calcType: 'AMOUNT' | 'PERCENT_OF_LINE';
  targetLineCode?: string | null;
  amountKrw?: number | null;
  percentBps?: number | null;
  quantitySource: PricingQuantitySource;
  lodgingSelectionLevel?: PricingLodgingSelectionLevel | null;
  headcountMin?: number | null;
  headcountMax?: number | null;
  dayMin?: number | null;
  dayMax?: number | null;
  travelDateFrom?: string | null;
  travelDateTo?: string | null;
  vehicleType?: string | null;
  variantTypes: VariantTypeOption[];
  flightInTimeBand?: PricingTimeBand | null;
  flightOutTimeBand?: PricingTimeBand | null;
  pickupPlaceType?: PlaceType | null;
  dropPlaceType?: PlaceType | null;
  externalTransferMode?: PricingExternalTransferMode | null;
  externalTransferMinCount?: number | null;
  externalTransferPresetCodes: ExternalTransferPresetCodeOption[];
  chargeScope?: PricingChargeScope | null;
  personMode?: PricingPersonMode | null;
  customDisplayText?: string | null;
  isEnabled: boolean;
  sortOrder: number;
}

/** 정책 목록용: 규칙은 id만 조회해 개수 표시 */
export interface PricingPolicyListRow {
  id: string;
  name: string;
  status: PricingPolicyStatus;
  effectiveFrom: string;
  effectiveTo?: string | null;
  rules: Array<{ id: string }>;
}

export interface PricingPolicyDetailRow extends Omit<PricingPolicyListRow, 'rules'> {
  rules: PricingRuleRow[];
}

export interface PolicyFormState {
  name: string;
  status: PricingPolicyStatus;
  effectiveFrom: string;
  effectiveTo: string;
}

export interface RuleFormState {
  priceItemPreset: PricingPriceItemPreset;
  ruleType: PricingRuleType;
  title: string;
  amountKrw: string;
  percentText: string;
  quantitySource: PricingQuantitySource;
  lodgingSelectionLevel: '' | PricingLodgingSelectionLevel;
  headcountMin: string;
  headcountMax: string;
  dayMin: string;
  dayMax: string;
  travelDateFrom: string;
  travelDateTo: string;
  vehicleType: string;
  variantTypes: VariantTypeOption[];
  flightInTimeBand: '' | PricingTimeBand;
  flightOutTimeBand: '' | PricingTimeBand;
  pickupPlaceType: '' | PlaceType;
  dropPlaceType: '' | PlaceType;
  externalTransferMode: '' | PricingExternalTransferMode;
  externalTransferMinCount: string;
  externalTransferPresetCodes: ExternalTransferPresetCodeOption[];
  chargeScope: '' | PricingChargeScope;
  personMode: '' | PricingPersonMode;
  customDisplayText: string;
  isEnabled: boolean;
  sortOrder: string;
}

export interface RuleFormStepOption {
  value: RuleFormStep;
  label: string;
  description: string;
}

export interface PriceItemGroupOption {
  value: PricingPriceItemGroup;
  label: string;
  description: string;
}

export interface PriceItemOption {
  value: PricingPriceItemOptionKey;
  group: PricingPriceItemGroup;
  preset: PricingPriceItemPreset;
  label: string;
  description: string;
}

export interface ConditionCategoryOption {
  value: ConditionCategoryKey;
  label: string;
  description: string;
}

export interface DerivedRuleConstraints {
  effectiveRuleType: PricingRuleType;
  effectiveQuantitySource: PricingQuantitySource;
  quantitySourceLocked: boolean;
  quantitySourceReason: string | null;
  effectiveChargeScope: '' | PricingChargeScope;
  chargeScopeLocked: boolean;
  effectivePersonMode: '' | PricingPersonMode;
  personModeLocked: boolean;
  displayLockedMessage: string | null;
  allowedConditionCategories: ConditionCategoryKey[];
}
