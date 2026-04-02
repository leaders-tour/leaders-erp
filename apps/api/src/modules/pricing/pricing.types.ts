import type { PricingLineCode, PricingLineSourceType, SecurityDepositMode } from '@prisma/client';
import type { VariantType as DomainVariantType } from '@tour/domain';

export interface ExtraLodgingInputDto {
  dayIndex: number;
  lodgingCount: number;
}

export interface ManualAdjustmentInputDto {
  kind: 'ADD' | 'DISCOUNT';
  title: string;
  chargeScope: 'TEAM' | 'PER_PERSON';
  personMode?: 'SINGLE' | 'PER_DAY' | 'PER_NIGHT' | null;
  countValue?: number | null;
  amountKrw: number;
  customDisplayText?: string | null;
}

export interface LodgingSelectionPricingInputDto {
  dayIndex: number;
  level: 'LV1' | 'LV2' | 'LV3' | 'LV4' | 'CUSTOM';
  customLodgingId?: string | null;
  customLodgingNameSnapshot?: string | null;
  pricingModeSnapshot?: 'PER_PERSON' | 'PER_TEAM' | 'FLAT' | null;
  priceSnapshotKrw?: number | null;
}

export interface TransportGroupPricingInputDto {
  teamName: string;
  headcount: number;
  flightInDate: string;
  flightInTime: string;
  flightOutDate: string;
  flightOutTime: string;
  pickupDate?: string | null;
  pickupTime?: string | null;
  pickupPlaceType?: string | null;
  pickupPlaceCustomText?: string | null;
  dropDate?: string | null;
  dropTime?: string | null;
  dropPlaceType?: string | null;
  dropPlaceCustomText?: string | null;
}

export interface ExternalTransferPricingInputDto {
  direction: 'PICKUP' | 'DROP';
  presetCode: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  departurePlace: string;
  arrivalPlace: string;
  selectedTeamOrderIndexes: number[];
}

export interface PricingPlanStopDto {
  rowType?: 'MAIN' | 'EXTERNAL_TRANSFER' | null;
  multiDayBlockId?: string;
  multiDayBlockDayOrder?: number;
  multiDayBlockConnectionId?: string;
  multiDayBlockConnectionVersionId?: string;
  /** When this stop is the last day of a block, segment from this to next uses this as fromLocationId for long-distance count */
  blockEndLocationId?: string;
  locationId?: string;
  /** 특식 할인 판정용 (샤브샤브 누락 감지) */
  mealCellText?: string;
}

export interface PricingComputeInput {
  /** Optional, stored on pricing snapshot for traceability. */
  regionSetId?: string;
  /** All region ids included in the active region set (for segment / connection lookups). */
  regionIds: string[];
  variantType: DomainVariantType;
  totalDays: number;
  planStops: PricingPlanStopDto[];
  travelStartDate: string;
  headcountTotal: number;
  vehicleType: string;
  transportGroupCount: number;
  transportGroups: TransportGroupPricingInputDto[];
  externalTransfers: ExternalTransferPricingInputDto[];
  includeRentalItems: boolean;
  eventIds: string[];
  extraLodgings: ExtraLodgingInputDto[];
  lodgingSelections: LodgingSelectionPricingInputDto[];
  manualAdjustments: ManualAdjustmentInputDto[];
  manualDepositAmountKrw?: number;
}

export type PricingDisplayBasis =
  | 'TEAM_DIV_PERSON'
  | 'PER_NIGHT'
  | 'PER_DAY'
  | 'PER_PERSON_SINGLE'
  | 'PERCENT'
  | 'CUSTOM';

export type PricingRuleTypeValue = 'BASE' | 'PERCENT_UPLIFT' | 'CONDITIONAL_ADDON' | 'AUTO_EXCEPTION' | 'MANUAL';

/** 표시 전용: 계산 필드와 분리된 견적/빌더 오른쪽 산식 기준 */
export interface PricingLineDisplay {
  basis: PricingDisplayBasis;
  label: string | null;
  unitAmountKrw: number | null;
  count: number | null;
  divisorPerson: number | null;
  text: string | null;
}

export interface PricingComputedLine {
  ruleType: PricingRuleTypeValue;
  lineCode: PricingLineCode;
  sourceType: PricingLineSourceType;
  ruleId: string | null;
  description: string | null;
  unitPriceKrw: number | null;
  quantity: number;
  amountKrw: number;
  meta: Record<string, unknown> | null;
  display: PricingLineDisplay;
}

/** display 부착 전 계산 단계 */
export type PricingComputedLineDraft = Omit<PricingComputedLine, 'display'>;

export interface PricingComputationResult {
  policyId: string;
  currencyCode: string;
  baseAmountKrw: number;
  addonAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
  securityDepositQuantity: number;
  securityDepositMode: SecurityDepositMode;
  securityDepositEventId: string | null;
  securityDepositEvent: {
    id: string;
    name: string;
    securityDepositKrw: number;
    isActive: boolean;
    sortOrder: number;
  } | null;
  longDistanceSegmentCount: number;
  extraLodgingCount: number;
  lines: PricingComputedLine[];
  inputSnapshot: Record<string, unknown>;
}
