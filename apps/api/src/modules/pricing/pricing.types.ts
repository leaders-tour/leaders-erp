import type { PricingLineCode, PricingLineSourceType } from '@prisma/client';
import type { VariantType as DomainVariantType } from '@tour/domain';

export interface ExtraLodgingInputDto {
  dayIndex: number;
  lodgingCount: number;
}

export interface ManualAdjustmentInputDto {
  description: string;
  amountKrw: number;
}

export interface PricingPlanStopDto {
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
  extraLodgings: ExtraLodgingInputDto[];
  manualAdjustments: ManualAdjustmentInputDto[];
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
  longDistanceSegmentCount: number;
  extraLodgingCount: number;
  lines: PricingComputedLine[];
  inputSnapshot: Record<string, unknown>;
}
