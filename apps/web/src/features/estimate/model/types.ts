import type { ExternalTransfer } from '../../plan/external-transfer';
import type { MealSlot } from '../../plan/special-meals';
import type { PlanStopRowType } from '../../plan/plan-stop-row';
import type { PickupDropPlaceType } from '../../plan/pickup-drop';
import type { VehicleAssignment } from '@tour/validation';
import type { MovementIntensityColorSetting, MovementIntensityValue } from './movement-intensity';

export type EstimateSourceMode = 'version' | 'draft';

export type EstimateSecurityDepositMode = 'NONE' | 'PER_PERSON' | 'PER_TEAM';

export type EstimateSecurityDepositScope = '-' | '인당' | '팀당';

/** 견적서 3페이지 이후 여행지 안내 템플릿 이미지 배치 밀도 */
export type EstimateGuideImagesPerPage = 1 | 2 | 3;

export interface EstimatePlanStopRow {
  rowType?: PlanStopRowType | null;
  locationId?: string | null;
  dateCellText: string;
  destinationCellText: string;
  movementIntensity?: MovementIntensityValue | null;
  movementIntensityColorOverride?: string | null;
  destinationMovementIntensityColorOverride?: string | null;
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
  /** 빌더 「팀 분리해서 보기」 — 동일 금액이어도 팀별 요약 행 표시 */
  expandTeamPricingSummaryRows?: boolean;
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
  vehicleDisplayNote?: string | null;
  vehicleAssignments: VehicleAssignment[];
  transportGroups: EstimateTransportGroup[];
  externalTransfers: ExternalTransfer[];
  specialNote: string;
  includeRentalItems: boolean;
  rentalItemsText: string;
  eventNames: string[];
  remark: string;
  validUntilDate: string;
  movementIntensity?: MovementIntensityValue | null;
  /** 견적서 일정표 상단 전체 이동강도 칩 색상 오버라이드 */
  overallMovementIntensityColorOverride?: string | null;
  planStops: EstimatePlanStopRow[];
  pricing: EstimatePricingSnapshot | null;
  /** 빌더에서 선택한 안내 이미지 페이지당 개수 (플랜 저장 시 메타로 반영) */
  estimateGuideImagesPerPage?: EstimateGuideImagesPerPage;
  /** 페이지별 장수 직접 지정(예 [3,2,2]). 있으면 균등(estimateGuideImagesPerPage)보다 우선 */
  estimateGuidePageSplits?: number[] | null;
}

export interface EstimateAdjustmentLine {
  teamName?: string | null;
  label: string;
  leadAmountKrw: number;
  formula: string;
  strikethrough?: boolean;
}

export interface EstimateTeamPricing {
  teamOrderIndex: number;
  teamName: string;
  baseAmountKrw: number;
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
  vehicleDisplayNote: string | null;
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
  /** 동일 금액일 때 팀별 요약 행 펼침 */
  expandTeamPricingSummaryRows?: boolean;
  totalPricePerPersonKrw: number | null;
  depositPricePerPersonKrw: number | null;
  balancePricePerPersonKrw: number | null;
  securityDepositTotalKrw: number | null;
  securityDepositUnitKrw: number | null;
  securityDepositScope: EstimateSecurityDepositScope;
  validUntilDate: string | null;
  movementIntensity?: MovementIntensityValue | null;
  /** 견적서 일정표 상단 전체 이동강도 칩 색상 오버라이드 */
  overallMovementIntensityColorOverride?: string | null;
  planStops: EstimatePlanStopRow[];
  /** 여행지 안내 템플릿 이미지를 한 페이지에 몇 장까지 넣을지 (저장된 플랜 메타 또는 빌더 선택) */
  estimateGuideImagesPerPage: EstimateGuideImagesPerPage;
  /** null·빈 배열이 아니면 균등 분배 대신 이 순서로 페이지당 장수 적용 */
  estimateGuidePageSplits: number[] | null;
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
  vehicleDisplayNote: string;
  vehicleAssignments?: VehicleAssignment[];
  vehicleOptions?: readonly string[];
  transportGroups: EstimateTransportGroup[];
  flightInTimeOptions?: readonly string[];
  flightOutTimeOptions?: readonly string[];
  eventIds: string[];
  eventOptions: EstimatePage1EventOption[];
  specialNoteText: string;
  rentalItemsText: string;
  remarkText: string;
  onHeadcountTotalChange: (value: number) => void;
  onHeadcountMaleChange: (value: number) => void;
  onTravelStartDateChange: (value: string) => void;
  onTravelEndDateChange: (value: string) => void;
  onVehicleDisplayNoteChange?: (value: string) => void;
  onVehicleTypeChange?: (value: string) => void;
  onVehicleAssignmentsChange?: (assignments: VehicleAssignment[]) => void;
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

export interface EstimatePage2Editor {
  onMovementIntensityColorOverrideChange: (mainRowIndex: number, color: string | null) => void;
  onOverallMovementIntensityColorOverrideChange: (color: string | null) => void;
  onTimeCellTextChange?: (mainRowIndex: number, value: string) => void;
  onScheduleCellTextChange?: (mainRowIndex: number, value: string) => void;
  onMealCellFieldChange?: (mainRowIndex: number, slot: MealSlot, value: string) => void;
  onMealCellTextChange?: (mainRowIndex: number, value: string) => void;
  onOpenLodgingSelection?: (mainRowIndex: number) => void;
}
