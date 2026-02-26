export type EstimateSourceMode = 'version' | 'draft';

export type EstimateSecurityDepositMode = 'NONE' | 'PER_PERSON' | 'PER_TEAM';

export type EstimateSecurityDepositScope = '-' | '인당' | '팀당';

export interface EstimatePlanStopRow {
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
}

export interface EstimatePricingLineSnapshot {
  lineCode: string;
  sourceType: string;
  description: string | null;
  unitPriceKrw: number | null;
  quantity: number;
  amountKrw: number;
}

export interface EstimatePricingSnapshot {
  baseAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositTotalKrw: number;
  securityDepositUnitKrw: number;
  securityDepositMode: EstimateSecurityDepositMode;
  lines: EstimatePricingLineSnapshot[];
}

export interface EstimateBuilderDraftSnapshot {
  planTitle: string;
  leaderName: string;
  regionName: string;
  headcountTotal: number;
  headcountMale: number;
  headcountFemale: number;
  travelStartDate: string;
  travelEndDate: string;
  vehicleType: string;
  flightInTime: string;
  flightOutTime: string;
  pickupDropNote: string;
  externalPickupDropNote: string;
  includeRentalItems: boolean;
  rentalItemsText: string;
  eventNames: string[];
  remark: string;
  planStops: EstimatePlanStopRow[];
  pricing: EstimatePricingSnapshot | null;
}

export interface EstimateAdjustmentLine {
  label: string;
  amountKrw: number;
  formula: string;
}

export interface EstimateDocumentData {
  mode: EstimateSourceMode;
  isDraft: boolean;
  planTitle: string;
  page2Title: string;
  leaderName: string;
  documentNumber: string | null;
  destinationName: string;
  headcountTotal: number | null;
  headcountMale: number | null;
  headcountFemale: number | null;
  travelStartDate: string | null;
  travelEndDate: string | null;
  vehicleType: string;
  flightInDate: string | null;
  flightInTime: string | null;
  flightOutDate: string | null;
  flightOutTime: string | null;
  pickupText: string;
  dropText: string;
  externalPickupDropText: string;
  specialNoteText: string;
  rentalItemsText: string;
  eventText: string;
  remarkText: string;
  basePricePerPersonKrw: number | null;
  adjustmentLines: EstimateAdjustmentLine[];
  totalPricePerPersonKrw: number | null;
  depositPricePerPersonKrw: number | null;
  balancePricePerPersonKrw: number | null;
  securityDepositTotalKrw: number | null;
  securityDepositUnitKrw: number | null;
  securityDepositScope: EstimateSecurityDepositScope;
  validUntilDate: string | null;
  planStops: EstimatePlanStopRow[];
}
