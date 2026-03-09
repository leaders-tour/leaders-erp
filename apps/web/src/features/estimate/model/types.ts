export type EstimateSourceMode = 'version' | 'draft';

export type EstimateSecurityDepositMode = 'NONE' | 'PER_PERSON' | 'PER_TEAM';

export type EstimateSecurityDepositScope = '-' | '인당' | '팀당';

export interface EstimatePlanStopRow {
  locationId?: string | null;
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
}

export interface EstimateGuideBlock {
  locationId: string;
  locationName: string;
  title: string;
  description: string;
  imageUrls: string[];
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
  pickupDate: string;
  pickupTime: string;
  dropDate: string;
  dropTime: string;
  pickupDropNote: string;
  externalPickupDropNote: string;
  specialNote: string;
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
  page3Title: string;
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
  pickupDate: string | null;
  pickupTime: string | null;
  dropDate: string | null;
  dropTime: string | null;
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
  page3Blocks: EstimateGuideBlock[];
}

export type EstimatePage1EditableField =
  | 'headcount'
  | 'eventIds'
  | 'travelPeriod'
  | 'vehicleType'
  | 'flightInTime'
  | 'flightOutTime'
  | 'pickupDate'
  | 'dropDate'
  | 'externalPickupDropText'
  | 'specialNoteText'
  | 'rentalItemsText'
  | 'remarkText';

export interface EstimatePage1EventOption {
  id: string;
  name: string;
}

export interface EstimatePage1Editor {
  headcountTotal: number;
  headcountMale: number;
  travelStartDate: string;
  travelEndDate: string;
  vehicleType: string;
  vehicleOptions: readonly string[];
  flightInTime: string;
  flightOutTime: string;
  pickupDate: string;
  pickupTime: string;
  dropDate: string;
  dropTime: string;
  eventIds: string[];
  eventOptions: EstimatePage1EventOption[];
  externalPickupDropText: string;
  specialNoteText: string;
  rentalItemsText: string;
  remarkText: string;
  onHeadcountTotalChange: (value: number) => void;
  onHeadcountMaleChange: (value: number) => void;
  onTravelStartDateChange: (value: string) => void;
  onTravelEndDateChange: (value: string) => void;
  onVehicleTypeChange: (value: string) => void;
  onFlightInTimeChange: (value: string) => void;
  onFlightOutTimeChange: (value: string) => void;
  onPickupDateChange: (value: string) => void;
  onPickupTimeChange: (value: string) => void;
  onDropDateChange: (value: string) => void;
  onDropTimeChange: (value: string) => void;
  onToggleEventId: (value: string) => void;
  onExternalPickupDropTextChange: (value: string) => void;
  onSpecialNoteTextChange: (value: string) => void;
  onRentalItemsTextChange: (value: string) => void;
  onRemarkTextChange: (value: string) => void;
}
