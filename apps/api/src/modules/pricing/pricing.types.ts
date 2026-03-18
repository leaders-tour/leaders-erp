import type { PricingLineCode, PricingLineSourceType, SecurityDepositMode } from '@prisma/client';
import type { VariantType as DomainVariantType } from '@tour/domain';

export interface ExtraLodgingInputDto {
  dayIndex: number;
  lodgingCount: number;
}

export interface ManualAdjustmentInputDto {
  description: string;
  amountKrw: number;
}

export interface LodgingSelectionPricingInputDto {
  dayIndex: number;
  level: 'LV1' | 'LV2' | 'LV3' | 'LV4' | 'CUSTOM';
  customLodgingId?: string | null;
  customLodgingNameSnapshot?: string | null;
  pricingModeSnapshot?: 'PER_PERSON' | 'PER_TEAM' | 'FLAT' | null;
  priceSnapshotKrw?: number | null;
}

export interface PricingPlanStopDto {
  overnightStayId?: string;
  overnightStayDayOrder?: number;
  overnightStayConnectionId?: string;
  multiDayBlockId?: string;
  multiDayBlockDayOrder?: number;
  multiDayBlockConnectionId?: string;
  /** When this stop is the last day of a block, segment from this to next uses this as fromLocationId for long-distance count */
  blockEndLocationId?: string;
  locationId?: string;
}

export interface PricingComputeInput {
  regionId: string;
  variantType: DomainVariantType;
  totalDays: number;
  planStops: PricingPlanStopDto[];
  travelStartDate: string;
  headcountTotal: number;
  vehicleType: string;
  transportGroupCount: number;
  includeRentalItems: boolean;
  eventIds: string[];
  extraLodgings: ExtraLodgingInputDto[];
  lodgingSelections: LodgingSelectionPricingInputDto[];
  manualAdjustments: ManualAdjustmentInputDto[];
  manualDepositAmountKrw?: number;
}

export interface PricingComputedLine {
  lineCode: PricingLineCode;
  sourceType: PricingLineSourceType;
  ruleId: string | null;
  description: string | null;
  unitPriceKrw: number | null;
  quantity: number;
  amountKrw: number;
  meta: Record<string, unknown> | null;
}

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
