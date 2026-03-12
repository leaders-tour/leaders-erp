import type { PickupDropPlaceType } from '../../plan/pickup-drop';

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
  pickupPlaceType: PickupDropPlaceType;
  pickupPlaceCustomText: string;
  dropPlaceType: PickupDropPlaceType;
  dropPlaceCustomText: string;
  externalPickupDate: string;
  externalPickupTime: string;
  externalPickupPlaceType: PickupDropPlaceType;
  externalPickupPlaceCustomText: string;
  externalDropDate: string;
  externalDropTime: string;
  externalDropPlaceType: PickupDropPlaceType;
  externalDropPlaceCustomText: string;
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
  pickupPlaceType: PickupDropPlaceType | null;
  pickupPlaceCustomText: string | null;
  dropPlaceType: PickupDropPlaceType | null;
  dropPlaceCustomText: string | null;
  externalPickupDate: string | null;
  externalPickupTime: string | null;
  externalPickupPlaceType: PickupDropPlaceType | null;
  externalPickupPlaceCustomText: string | null;
  externalDropDate: string | null;
  externalDropTime: string | null;
  externalDropPlaceType: PickupDropPlaceType | null;
  externalDropPlaceCustomText: string | null;
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
  | 'externalPickupDate'
  | 'externalDropDate'
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
  pickupPlaceType: PickupDropPlaceType;
  pickupPlaceCustomText: string;
  dropDate: string;
  dropTime: string;
  dropPlaceType: PickupDropPlaceType;
  dropPlaceCustomText: string;
  externalPickupDate: string;
  externalPickupTime: string;
  externalPickupPlaceType: PickupDropPlaceType;
  externalPickupPlaceCustomText: string;
  externalDropDate: string;
  externalDropTime: string;
  externalDropPlaceType: PickupDropPlaceType;
  externalDropPlaceCustomText: string;
  eventIds: string[];
  eventOptions: EstimatePage1EventOption[];
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
  onPickupPlaceTypeChange: (value: PickupDropPlaceType) => void;
  onPickupPlaceCustomTextChange: (value: string) => void;
  onDropDateChange: (value: string) => void;
  onDropTimeChange: (value: string) => void;
  onDropPlaceTypeChange: (value: PickupDropPlaceType) => void;
  onDropPlaceCustomTextChange: (value: string) => void;
  onExternalPickupDateChange: (value: string) => void;
  onExternalPickupTimeChange: (value: string) => void;
  onExternalPickupPlaceTypeChange: (value: PickupDropPlaceType) => void;
  onExternalPickupPlaceCustomTextChange: (value: string) => void;
  onExternalDropDateChange: (value: string) => void;
  onExternalDropTimeChange: (value: string) => void;
  onExternalDropPlaceTypeChange: (value: PickupDropPlaceType) => void;
  onExternalDropPlaceCustomTextChange: (value: string) => void;
  onToggleEventId: (value: string) => void;
  onSpecialNoteTextChange: (value: string) => void;
  onRentalItemsTextChange: (value: string) => void;
  onRemarkTextChange: (value: string) => void;
}
