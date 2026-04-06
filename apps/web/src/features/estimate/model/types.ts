import type { ExternalTransfer } from '../../plan/external-transfer';
import type { PlanStopRowType } from '../../plan/plan-stop-row';
import type { PickupDropPlaceType } from '../../plan/pickup-drop';
import type { MovementIntensityValue } from './movement-intensity';

export type EstimateSourceMode = 'version' | 'draft';

export type EstimateSecurityDepositMode = 'NONE' | 'PER_PERSON' | 'PER_TEAM';

export type EstimateSecurityDepositScope = '-' | '인당' | '팀당';

export interface EstimatePlanStopRow {
  rowType: PlanStopRowType;
  locationId?: string | null;
  dateCellText: string;
  destinationCellText: string;
  movementIntensity?: MovementIntensityValue | null;
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
  ruleType?: string | null;
  lineCode: string;
  sourceType: string;
  description: string | null;
  unitPriceKrw: number | null;
  quantity: number;
  amountKrw: number;
  displayBasis?: string | null;
  displayLabel?: string | null;
  displayUnitAmountKrw?: number | null;
  displayCount?: number | null;
  displayDivisorPerson?: number | null;
  displayText?: string | null;
}

export interface EstimatePricingSnapshot {
  baseAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositTotalKrw: number;
  securityDepositUnitKrw: number;
  securityDepositMode: EstimateSecurityDepositMode;
  adjustmentLines?: EstimateAdjustmentLine[];
  teamPricings?: EstimateTeamPricing[];
  lines: EstimatePricingLineSnapshot[];
}

export interface EstimateTransportGroup {
  teamName: string;
  headcount: number;
  flightInDate: string;
  flightInTime: string;
  flightOutDate: string;
  flightOutTime: string;
  pickupDate: string;
  pickupTime: string;
  pickupPlaceType: PickupDropPlaceType;
  pickupPlaceCustomText: string;
  dropDate: string;
  dropTime: string;
  dropPlaceType: PickupDropPlaceType;
  dropPlaceCustomText: string;
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
  transportGroups: EstimateTransportGroup[];
  externalTransfers: ExternalTransfer[];
  specialNote: string;
  includeRentalItems: boolean;
  rentalItemsText: string;
  eventNames: string[];
  remark: string;
  movementIntensity?: MovementIntensityValue | null;
  planStops: EstimatePlanStopRow[];
  pricing: EstimatePricingSnapshot | null;
}

export interface EstimateAdjustmentLine {
  teamName?: string | null;
  label: string;
  leadAmountKrw: number;
  formula: string;
}

export interface EstimateTeamPricing {
  teamOrderIndex: number;
  teamName: string;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitKrw: number;
  securityDepositScope: EstimateSecurityDepositScope;
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
  transportGroups: EstimateTransportGroup[];
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
  externalTransfers: ExternalTransfer[];
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
  externalPickupText: string;
  externalDropText: string;
  externalPickupDropText: string;
  specialNoteText: string;
  rentalItemsText: string;
  eventText: string;
  remarkText: string;
  basePricePerPersonKrw: number | null;
  adjustmentLines: EstimateAdjustmentLine[];
  teamPricings: EstimateTeamPricing[];
  totalPricePerPersonKrw: number | null;
  depositPricePerPersonKrw: number | null;
  balancePricePerPersonKrw: number | null;
  securityDepositTotalKrw: number | null;
  securityDepositUnitKrw: number | null;
  securityDepositScope: EstimateSecurityDepositScope;
  validUntilDate: string | null;
  movementIntensity?: MovementIntensityValue | null;
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
  transportGroups: EstimateTransportGroup[];
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
  onTransportGroupFieldChange: <K extends keyof EstimateTransportGroup>(
    index: number,
    field: K,
    value: EstimateTransportGroup[K],
  ) => void;
  onAddTransportGroup: () => void;
  onRemoveTransportGroup: (index: number) => void;
  onToggleEventId: (value: string) => void;
  onSpecialNoteTextChange: (value: string) => void;
  onRentalItemsTextChange: (value: string) => void;
  onRemarkTextChange: (value: string) => void;
}
