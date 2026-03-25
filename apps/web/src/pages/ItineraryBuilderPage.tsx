import { gql, useMutation, useQuery } from '@apollo/client';
import { pickDefaultLocationMealSet } from '@tour/domain';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DatePickerModal } from '../components/date-picker/DatePickerModal';
import {
  formatDateTriggerLabel,
  getCurrentLocalYear,
} from '../components/date-picker/date-picker-utils';
import { TimePickerModal } from '../components/date-picker/TimePickerModal';
import { formatTimeTriggerLabel } from '../components/date-picker/time-picker-utils';
import { EstimateDocument } from '../features/estimate/components/EstimateDocument';
import { useBuilderEstimatePreview } from '../features/estimate/hooks/use-builder-estimate-preview';
import { averageMovementIntensity } from '../features/estimate/model/movement-intensity';
import type {
  EstimateBuilderDraftSnapshot,
  EstimatePage1Editor,
  EstimateTransportGroup,
} from '../features/estimate/model/types';
import { useAuth } from '../features/auth/context';
import {
  formatLocationNameInline,
  formatLocationNameMultiline,
  toFacilityLabel,
  toMealLabel,
} from '../features/location/display';
import { LodgingUpgradeModal } from '../features/lodging-selection/components/LodgingUpgradeModal';
import { RegionLodgingSelectModal } from '../features/lodging-selection/components/RegionLodgingSelectModal';
import { ExtraLodgingsModal } from '../features/pricing/components/ExtraLodgingsModal';
import {
  buildLodgingCellText,
  getBaseLodgingText,
  type LodgingSelectionLevel,
  type RegionLodgingOption,
} from '../features/lodging-selection/model';
import { ConsultationPasteModal } from '../features/plan/components/ConsultationPasteModal';
import { ExternalTransferModal } from '../features/plan/components/ExternalTransferModal';
import { ExternalTransfersManagerModal } from '../features/plan/components/ExternalTransfersManagerModal';
import { SpecialMealsModal } from '../features/plan/components/SpecialMealsModal';
import { getAssignmentsFromPlanRows } from '../features/plan/special-meals';
import {
  buildDerivedExternalTransferManualAdjustments,
  buildExternalTransferDirectionText,
  buildEmptyExternalTransfer,
  isExternalTransferComplete,
  syncExternalTransferWithSelectedTeams,
  type ExternalTransfer,
} from '../features/plan/external-transfer';
import { useBuilderValidation } from '../features/plan/builder-validation';
import { buildMergedPlanStops } from '../features/plan/merge-plan-stops';
import {
  isMainPlanStopRow,
  type PlanStopRowBase,
  type PlanStopRowType,
} from '../features/plan/plan-stop-row';
import {
  DEFAULT_PICKUP_DROP_PLACE_TYPE,
  PICKUP_DROP_PLACE_OPTIONS,
  getRecommendedDropSchedule,
  getRecommendedPickupTime,
  parseTimeToMinutes,
  resolveAutoVariantType,
  normalizePickupDropCustomText,
  type PickupDropPlaceType,
} from '../features/plan/pickup-drop';
import {
  buildAutoRowsFromRoute,
  buildMultiDayBlockOptions,
  buildSelectedRouteFromStops,
  buildFirstDayOptions,
  buildNextOptions,
  findSegment,
  findMultiDayBlockConnection,
  formatMultiDayBlockConnectionVersionLabel,
  formatSegmentVersionLabel,
  getConsumedRouteDayCount,
  getDefaultMultiDayBlockConnectionVersionId,
  getDefaultVersionId,
  getMultiDayBlockConnectionVersions,
  getRouteDateForDayIndex,
  getRouteStopEndDayIndex,
  getRouteStopStartDayIndex,
  getSegmentVersions,
  type LocationVersionOption,
  type LocationOption,
  type MultiDayBlockConnectionOption,
  type MultiDayBlockOption,
  type RouteSelection,
  trimRouteSelectionsToTotalDays,
  resolveMultiDayBlockConnectionVersion,
  resolveSegmentVersionForDate,
  type SegmentOption,
} from '../features/plan-template/route-autofill';
import {
  ManualAdjustmentsModal,
  type ManualAdjustmentDraftRow,
} from '../features/pricing/components/ManualAdjustmentsModal';
import { mergeLodgingSelectionDisplayLines } from '../features/pricing/merge-lodging-selection-display';
import { buildPricingViewBuckets, getPricingLineLabel } from '../features/pricing/view-model';
import { MealOption, VariantType } from '../generated/graphql';
import type { ConsultationDraft } from '../generated/graphql';

interface RegionRow {
  id: string;
  name: string;
}

type LocationRow = LocationOption;
type LocationVersionRow = LocationOption['variations'][number];
type SegmentRow = SegmentOption;

interface PlanContextRow {
  id: string;
  userId: string;
  regionId: string;
  title: string;
  currentVersionId: string | null;
}

interface UserRow {
  id: string;
  name: string;
}

interface EventOptionRow {
  id: string;
  name: string;
}

interface PlanRow extends PlanStopRowBase {
  segmentId?: string;
  segmentVersionId?: string;
  overnightStayId?: string;
  overnightStayDayOrder?: number;
  overnightStayConnectionId?: string;
  overnightStayConnectionVersionId?: string;
  lodgingSelectionLevel: LodgingSelectionLevel;
  customLodgingId?: string;
  customLodgingNameSnapshot?: string | null;
}

interface ExtraLodgingRow {
  dayIndex: number;
  lodgingCount: number;
}

type ManualAdjustmentRow = ManualAdjustmentDraftRow;

interface PricingLineRow {
  lineCode: string;
  sourceType: 'RULE' | 'MANUAL';
  description: string | null;
  ruleId: string | null;
  unitPriceKrw: number | null;
  quantity: number;
  amountKrw: number;
  quantityDisplaySuffix?: '박';
}

interface PricingPreviewRow {
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
  securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
  securityDepositEvent: {
    id: string;
    name: string;
  } | null;
  longDistanceSegmentCount: number;
  extraLodgingCount: number;
  lines: PricingLineRow[];
}

interface PlanTemplateStopRow {
  id: string;
  dayIndex: number;
  segmentId: string | null;
  segmentVersionId: string | null;
  overnightStayId: string | null;
  overnightStayDayOrder: number | null;
  overnightStayConnectionId: string | null;
  overnightStayConnectionVersionId: string | null;
  locationId: string | null;
  locationVersionId: string | null;
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5' | null;
  lodgingSelectionLevel?: LodgingSelectionLevel | null;
  customLodgingId?: string | null;
  customLodgingNameSnapshot?: string | null;
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
}

interface PlanTemplateRow {
  id: string;
  name: string;
  description: string | null;
  regionId: string;
  totalDays: number;
  sortOrder: number;
  isActive: boolean;
  planStops: PlanTemplateStopRow[];
}

interface PlaceFieldProps {
  label: string;
  placeType: PickupDropPlaceType;
  customText: string;
  onPlaceTypeChange: (value: PickupDropPlaceType) => void;
  onCustomTextChange: (value: string) => void;
}

type DatePickerTarget =
  | { kind: 'travelStartDate'; anchorEl: HTMLButtonElement }
  | { kind: 'travelEndDate'; anchorEl: HTMLButtonElement }
  | { kind: 'flightInDate'; index: number; anchorEl: HTMLButtonElement }
  | { kind: 'flightOutDate'; index: number; anchorEl: HTMLButtonElement }
  | { kind: 'pickupDate'; index: number; anchorEl: HTMLButtonElement }
  | { kind: 'dropDate'; index: number; anchorEl: HTMLButtonElement };

type TimePickerTarget =
  | { kind: 'flightInTime'; index: number; anchorEl: HTMLButtonElement }
  | { kind: 'flightOutTime'; index: number; anchorEl: HTMLButtonElement }
  | { kind: 'pickupTime'; index: number; anchorEl: HTMLButtonElement }
  | { kind: 'dropTime'; index: number; anchorEl: HTMLButtonElement };

interface ExternalTransferModalState {
  open: boolean;
  editingIndex: number | null;
}

interface ExternalTransfersManagerModalState {
  open: boolean;
}

interface LodgingSelectionModalState {
  open: boolean;
  rowIndex: number | null;
}

interface LodgingUpgradeModalState {
  open: boolean;
}

interface SpecialMealsModalState {
  open: boolean;
}

interface ManualAdjustmentsModalState {
  open: boolean;
}

interface ExtraLodgingsModalState {
  open: boolean;
}

interface DateInputTriggerProps {
  value: string;
  placeholder?: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

interface TimeInputTriggerProps {
  value: string;
  placeholder?: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

function arePlanRowsEqual(left: PlanRow[], right: PlanRow[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((row, index) => {
    const other = right[index];
    if (!other) {
      return false;
    }

    return (
      row.segmentId === other.segmentId &&
      row.segmentVersionId === other.segmentVersionId &&
      row.overnightStayId === other.overnightStayId &&
      row.overnightStayDayOrder === other.overnightStayDayOrder &&
      row.overnightStayConnectionId === other.overnightStayConnectionId &&
      row.overnightStayConnectionVersionId === other.overnightStayConnectionVersionId &&
      row.rowType === other.rowType &&
      row.locationId === other.locationId &&
      row.locationVersionId === other.locationVersionId &&
      row.movementIntensity === other.movementIntensity &&
      row.lodgingSelectionLevel === other.lodgingSelectionLevel &&
      row.customLodgingId === other.customLodgingId &&
      row.customLodgingNameSnapshot === other.customLodgingNameSnapshot &&
      row.dateCellText === other.dateCellText &&
      row.destinationCellText === other.destinationCellText &&
      row.timeCellText === other.timeCellText &&
      row.scheduleCellText === other.scheduleCellText &&
      row.lodgingCellText === other.lodgingCellText &&
      row.mealCellText === other.mealCellText
    );
  });
}

const PRESERVED_PLAN_ROW_FIELDS: Array<keyof PlanRow> = [
  'dateCellText',
  'destinationCellText',
  'timeCellText',
  'scheduleCellText',
  'mealCellText',
  'lodgingSelectionLevel',
  'customLodgingId',
  'customLodgingNameSnapshot',
  'lodgingCellText',
];

function getDirtyPlanRowFieldKey(rowIndex: number, field: keyof PlanRow): string {
  return `${rowIndex}:${field}`;
}

function isSamePlanRowSource(left: PlanRow | undefined, right: PlanRow | undefined): boolean {
  if (!left || !right) {
    return false;
  }

  return (
    left.segmentId === right.segmentId &&
    left.segmentVersionId === right.segmentVersionId &&
    left.overnightStayId === right.overnightStayId &&
    left.overnightStayDayOrder === right.overnightStayDayOrder &&
    left.overnightStayConnectionId === right.overnightStayConnectionId &&
    left.overnightStayConnectionVersionId === right.overnightStayConnectionVersionId &&
    left.rowType === right.rowType &&
    left.locationId === right.locationId &&
    left.locationVersionId === right.locationVersionId &&
    left.movementIntensity === right.movementIntensity
  );
}

function mergeAutoRowsWithDirtyValues(
  current: PlanRow[],
  autoRows: PlanRow[],
  dirtyFieldKeys: Set<string>,
): PlanRow[] {
  return autoRows.map((autoRow, rowIndex) => {
    const currentRow = current[rowIndex];
    if (!currentRow || !isSamePlanRowSource(currentRow, autoRow)) {
      return autoRow;
    }

    const mergedRow = { ...autoRow };
    for (const field of PRESERVED_PLAN_ROW_FIELDS) {
      if (dirtyFieldKeys.has(getDirtyPlanRowFieldKey(rowIndex, field))) {
        (mergedRow as Record<string, unknown>)[field] = currentRow[field];
      }
    }
    return mergedRow;
  });
}

const REGIONS_QUERY = gql`
  query ItineraryRegions {
    regions {
      id
      name
    }
  }
`;

const PLAN_CONTEXT_QUERY = gql`
  query BuilderPlanContext($id: ID!) {
    plan(id: $id) {
      id
      userId
      regionId
      title
      currentVersionId
    }
  }
`;

const USER_QUERY = gql`
  query BuilderUser($id: ID!) {
    user(id: $id) {
      id
      name
    }
  }
`;

const EVENTS_QUERY = gql`
  query BuilderEvents($activeOnly: Boolean) {
    events(activeOnly: $activeOnly) {
      id
      name
    }
  }
`;

const REGION_LODGINGS_QUERY = gql`
  query BuilderRegionLodgings($regionId: ID, $activeOnly: Boolean) {
    regionLodgings(regionId: $regionId, activeOnly: $activeOnly) {
      id
      regionId
      name
      priceKrw
      pricePerPersonKrw
      pricePerTeamKrw
      isActive
      sortOrder
    }
  }
`;

const LOCATIONS_QUERY = gql`
  query ItineraryLocations {
    locations {
      id
      regionId
      name
      isFirstDayEligible
      isLastDayEligible
      defaultVersionId
      defaultVersion {
        id
        versionNumber
        label
      }
      variations {
        id
        versionNumber
        label
        firstDayAverageDistanceKm
        firstDayAverageTravelHours
        firstDayMovementIntensity
        lodgings {
          id
          name
          hasElectricity
          hasShower
          hasInternet
        }
        mealSets {
          id
          setName
          breakfast
          lunch
          dinner
        }
        firstDayTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        firstDayEarlyTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
      }
    }
  }
`;

const SEGMENTS_QUERY = gql`
  query ItinerarySegments {
    segments {
      id
      regionId
      fromLocationId
      toLocationId
      defaultVersionId
      averageDistanceKm
      averageTravelHours
      movementIntensity
      isLongDistance
      scheduleTimeBlocks {
        id
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      earlyScheduleTimeBlocks {
        id
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      extendScheduleTimeBlocks {
        id
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      earlyExtendScheduleTimeBlocks {
        id
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      versions {
        id
        segmentId
        name
        averageDistanceKm
        averageTravelHours
        movementIntensity
        isLongDistance
        startDate
        endDate
        sortOrder
        isDefault
        scheduleTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        earlyScheduleTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        extendScheduleTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        earlyExtendScheduleTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
      }
    }
  }
`;

const OVERNIGHT_STAYS_QUERY = gql`
  query ItineraryMultiDayBlocks {
    multiDayBlocks {
      id
      regionId
      locationId
      blockType
      startLocationId
      endLocationId
      name
      title
      isActive
      sortOrder
      days {
        id
        dayOrder
        displayLocationId
        averageDistanceKm
        averageTravelHours
        movementIntensity
        timeCellText
        scheduleCellText
        lodgingCellText
        mealCellText
      }
    }
  }
`;

const OVERNIGHT_STAY_CONNECTIONS_QUERY = gql`
  query ItineraryMultiDayBlockConnections {
    multiDayBlockConnections {
      id
      regionId
      fromMultiDayBlockId
      toLocationId
      defaultVersionId
      averageDistanceKm
      averageTravelHours
      movementIntensity
      isLongDistance
      scheduleTimeBlocks {
        id
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      earlyScheduleTimeBlocks {
        id
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      extendScheduleTimeBlocks {
        id
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      earlyExtendScheduleTimeBlocks {
        id
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      versions {
        id
        multiDayBlockConnectionId
        name
        averageDistanceKm
        averageTravelHours
        movementIntensity
        isLongDistance
        sortOrder
        isDefault
        scheduleTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        earlyScheduleTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        extendScheduleTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        earlyExtendScheduleTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
      }
    }
  }
`;

const PLAN_TEMPLATES_QUERY = gql`
  query ItineraryBuilderTemplates($regionId: ID, $totalDays: Int, $activeOnly: Boolean) {
    planTemplates(regionId: $regionId, totalDays: $totalDays, activeOnly: $activeOnly) {
      id
      name
      description
      regionId
      totalDays
      sortOrder
      isActive
      planStops {
        id
        dayIndex
        segmentId
        segmentVersionId
        overnightStayId: multiDayBlockId
        overnightStayDayOrder: multiDayBlockDayOrder
        overnightStayConnectionId: multiDayBlockConnectionId
        overnightStayConnectionVersionId: multiDayBlockConnectionVersionId
        multiDayBlockId
        multiDayBlockDayOrder
        multiDayBlockConnectionId
        multiDayBlockConnectionVersionId
        locationId
        locationVersionId
        dateCellText
        destinationCellText
        movementIntensity
        timeCellText
        scheduleCellText
        lodgingCellText
        mealCellText
      }
    }
  }
`;

const PLAN_TEMPLATE_QUERY = gql`
  query ItineraryBuilderTemplate($id: ID!) {
    planTemplate(id: $id) {
      id
      name
      description
      regionId
      totalDays
      sortOrder
      isActive
      planStops {
        id
        dayIndex
        segmentId
        segmentVersionId
        overnightStayId: multiDayBlockId
        overnightStayDayOrder: multiDayBlockDayOrder
        overnightStayConnectionId: multiDayBlockConnectionId
        overnightStayConnectionVersionId: multiDayBlockConnectionVersionId
        multiDayBlockId
        multiDayBlockDayOrder
        multiDayBlockConnectionId
        multiDayBlockConnectionVersionId
        locationId
        locationVersionId
        dateCellText
        destinationCellText
        movementIntensity
        timeCellText
        scheduleCellText
        lodgingCellText
        mealCellText
      }
    }
  }
`;

const CREATE_PLAN_MUTATION = gql`
  mutation CreatePlanFromBuilder($input: PlanCreateInput!) {
    createPlan(input: $input) {
      id
    }
  }
`;

const CREATE_PLAN_VERSION_MUTATION = gql`
  mutation CreatePlanVersionFromBuilder($input: PlanVersionCreateInput!) {
    createPlanVersion(input: $input) {
      id
      versionNumber
    }
  }
`;

const CREATE_USER_MUTATION = gql`
  mutation CreateUserFromBuilder($input: UserCreateInput!) {
    createUser(input: $input) {
      id
      name
    }
  }
`;

const PLAN_PRICING_PREVIEW_QUERY = gql`
  query PlanPricingPreviewFromBuilder($input: PlanPricingPreviewInput!) {
    planPricingPreview(input: $input) {
      policyId
      currencyCode
      baseAmountKrw
      addonAmountKrw
      totalAmountKrw
      depositAmountKrw
      balanceAmountKrw
      securityDepositAmountKrw
      securityDepositUnitPriceKrw
      securityDepositQuantity
      securityDepositMode
      securityDepositEvent {
        id
        name
      }
      longDistanceSegmentCount
      extraLodgingCount
      lines {
        lineCode
        sourceType
        description
        ruleId
        unitPriceKrw
        quantity
        amountKrw
      }
    }
  }
`;

const VARIANTS = [
  { id: VariantType.Basic, label: '기본' },
  { id: VariantType.Afternoon, label: '오후' },
  { id: VariantType.Extend, label: '연장' },
  { id: VariantType.Early, label: '얼리' },
  { id: VariantType.EarlyExtend, label: '얼리+연장' },
];

const VEHICLES = ['스타렉스', '푸르공', '벨파이어', '하이에이스'] as const;
const FLIGHT_IN_TIME_OPTIONS = [
  '00:05',
  '00:30',
  '00:50',
  '02:45',
  '04:30',
  '13:20',
  '17:00',
  '23:05',
  '23:30',
] as const;
const FLIGHT_OUT_TIME_OPTIONS = [
  '00:25',
  '00:50',
  '01:30',
  '01:50',
  '02:05',
  '08:40',
  '13:00',
  '18:15',
  '20:30',
] as const;
const PICKUP_DROP_TIME_OPTIONS = [
  '04:00',
  '05:00',
  '08:00',
  '15:30',
  '19:00',
  '21:00',
  '23:00',
] as const;
const HALF_HOUR_MINUTE_OPTIONS = [0, 30] as const;

function toIsoDateTime(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function toAutoTravelEndDate(startDate: string, totalDays: number): string {
  if (!startDate) {
    return '';
  }

  const [yearText, monthText, dayText] = startDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return '';
  }

  const daysToAdd = Math.max(totalDays - 1, 0);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + daysToAdd);

  const yyyy = utcDate.getUTCFullYear();
  const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildDefaultRentalItems(total: number): string {
  const safeTotal = Math.max(1, total);
  const matCount = Math.ceil(safeTotal / 3);
  const multiTapCount = Math.ceil(safeTotal / 3);
  return [
    `판초 ${safeTotal}개`,
    `모기장 ${safeTotal}개`,
    `썰매 ${safeTotal}개`,
    `돗자리 ${matCount}개`,
    '별레이저 1개',
    '랜턴 1개',
    `멀티탭 ${multiTapCount}개`,
    '드라이기 1개',
    '보드게임 1종',
    '버너/냄비/팬 set',
  ].join(', ');
}

function buildDefaultPlanTitle(leaderName: string): string {
  const trimmedLeaderName = leaderName.trim();
  return trimmedLeaderName ? `${trimmedLeaderName} - 여행일정` : '고객명 - 여행일정';
}

function buildDefaultMaleHeadcount(total: number): number {
  return Math.ceil(Math.max(1, total) / 2);
}

function formatKrw(value: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}

function formatPricingLineUnitDisplay(line: PricingLineRow, headcountTotal: number): string {
  if (line.lineCode === 'MANUAL_ADJUSTMENT' && headcountTotal > 0) {
    return `${formatKrw(line.unitPriceKrw ?? line.amountKrw)}/${headcountTotal}인`;
  }
  return line.unitPriceKrw !== null ? formatKrw(line.unitPriceKrw) : '-';
}

function formatPricingLineQuantityDisplay(line: PricingLineRow, headcountTotal: number): string {
  if (line.lineCode === 'MANUAL_ADJUSTMENT' && headcountTotal > 0) {
    return `${headcountTotal}인`;
  }
  if (line.quantityDisplaySuffix === '박') {
    return `${line.quantity}박`;
  }
  return String(line.quantity);
}

function cloneExternalTransfer(transfer: ExternalTransfer): ExternalTransfer {
  return {
    ...transfer,
    selectedTeamOrderIndexes: [...transfer.selectedTeamOrderIndexes],
  };
}

function formatSecurityDepositScope(mode: 'NONE' | 'PER_PERSON' | 'PER_TEAM'): string {
  if (mode === 'PER_TEAM') {
    return '팀당';
  }
  if (mode === 'PER_PERSON') {
    return '인당';
  }
  return '-';
}

function createEstimateDraftSnapshot(input: {
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
  planStops: PlanStopRowBase[];
  pricingPreview: PricingPreviewRow | null;
}): EstimateBuilderDraftSnapshot {
  return {
    planTitle: input.planTitle,
    leaderName: input.leaderName,
    regionName: input.regionName,
    headcountTotal: input.headcountTotal,
    headcountMale: input.headcountMale,
    headcountFemale: input.headcountFemale,
    travelStartDate: input.travelStartDate,
    travelEndDate: input.travelEndDate,
    vehicleType: input.vehicleType,
    transportGroups: input.transportGroups,
    externalTransfers: input.externalTransfers,
    specialNote: input.specialNote,
    includeRentalItems: input.includeRentalItems,
    rentalItemsText: input.rentalItemsText,
    eventNames: input.eventNames,
    remark: input.remark,
    movementIntensity: averageMovementIntensity(
      input.planStops.filter((row) => isMainPlanStopRow(row)).map((row) => row.movementIntensity),
    ),
    planStops: input.planStops.map((row) => ({
      rowType: row.rowType,
      locationId: row.locationId,
      dateCellText: row.dateCellText,
      destinationCellText: row.destinationCellText,
      movementIntensity: row.movementIntensity ?? null,
      timeCellText: row.timeCellText,
      scheduleCellText: row.scheduleCellText,
      lodgingCellText: row.lodgingCellText,
      mealCellText: row.mealCellText,
    })),
    pricing: input.pricingPreview
      ? {
          baseAmountKrw: input.pricingPreview.baseAmountKrw,
          totalAmountKrw: input.pricingPreview.totalAmountKrw,
          depositAmountKrw: input.pricingPreview.depositAmountKrw,
          balanceAmountKrw: input.pricingPreview.balanceAmountKrw,
          securityDepositTotalKrw: input.pricingPreview.securityDepositAmountKrw,
          securityDepositUnitKrw: input.pricingPreview.securityDepositUnitPriceKrw,
          securityDepositMode: input.pricingPreview.securityDepositMode,
          lines: input.pricingPreview.lines.map((line) => ({
            lineCode: line.lineCode,
            sourceType: line.sourceType,
            description: line.description,
            unitPriceKrw: line.unitPriceKrw,
            quantity: line.quantity,
            amountKrw: line.amountKrw,
          })),
        }
      : null,
  };
}

interface TransportGroupDraft extends EstimateTransportGroup {
  hasEditedPickup: boolean;
  hasEditedDrop: boolean;
}

function getTransportGroupTeamName(index: number): string {
  const normalizedIndex = Math.max(0, index);
  const alphabet = String.fromCharCode(65 + (normalizedIndex % 26));
  const suffix = normalizedIndex >= 26 ? String(Math.floor(normalizedIndex / 26) + 1) : '';
  return `${alphabet}팀${suffix}`;
}

function toEstimateTransportGroup(group: TransportGroupDraft): EstimateTransportGroup {
  return {
    teamName: group.teamName,
    headcount: group.headcount,
    flightInDate: group.flightInDate,
    flightInTime: group.flightInTime,
    flightOutDate: group.flightOutDate,
    flightOutTime: group.flightOutTime,
    pickupDate: group.pickupDate,
    pickupTime: group.pickupTime,
    pickupPlaceType: group.pickupPlaceType,
    pickupPlaceCustomText: group.pickupPlaceCustomText,
    dropDate: group.dropDate,
    dropTime: group.dropTime,
    dropPlaceType: group.dropPlaceType,
    dropPlaceCustomText: group.dropPlaceCustomText,
  };
}

function createTransportGroupDraft(input: {
  index: number;
  headcount: number;
  travelStartDate: string;
  travelEndDate: string;
  flightInTime: string;
  flightOutTime: string;
}): TransportGroupDraft {
  const pickupDate = input.travelStartDate;
  const recommendedDrop = getRecommendedDropSchedule(input.travelEndDate, input.flightOutTime);

  return {
    teamName: getTransportGroupTeamName(input.index),
    headcount: Math.max(1, input.headcount),
    flightInDate: input.travelStartDate,
    flightInTime: input.flightInTime,
    flightOutDate: input.travelEndDate,
    flightOutTime: input.flightOutTime,
    pickupDate,
    pickupTime: pickupDate ? getRecommendedPickupTime(input.flightInTime) : '',
    pickupPlaceType: DEFAULT_PICKUP_DROP_PLACE_TYPE,
    pickupPlaceCustomText: '',
    dropDate: recommendedDrop.date,
    dropTime: recommendedDrop.time,
    dropPlaceType: DEFAULT_PICKUP_DROP_PLACE_TYPE,
    dropPlaceCustomText: '',
    hasEditedPickup: false,
    hasEditedDrop: false,
  };
}

/** 팀당 최소 1명을 유지하면서 total을 teamCount팀에 나눕니다. 합은 항상 total과 같습니다. total < teamCount이면 null. */
function distributeHeadcountTotalAcrossTeams(total: number, teamCount: number): number[] | null {
  if (teamCount < 1) {
    return [];
  }
  if (total < teamCount) {
    return null;
  }
  const afterMin = total - teamCount;
  const base = Math.floor(afterMin / teamCount);
  const rem = afterMin % teamCount;
  return Array.from({ length: teamCount }, (_, i) => 1 + base + (i < rem ? 1 : 0));
}

function buildTransportGroupsAfterAddTeam(
  current: TransportGroupDraft[],
  headcountTotal: number,
  travelStartDate: string,
  travelEndDate: string,
): TransportGroupDraft[] | null {
  const newLen = current.length + 1;
  if (headcountTotal < newLen) {
    return null;
  }

  const usedHeadcount = current.reduce((sum, group) => sum + group.headcount, 0);
  const remainingHeadcount = Math.max(headcountTotal - usedHeadcount, 0);

  if (remainingHeadcount > 0) {
    return [
      ...current,
      createTransportGroupDraft({
        index: current.length,
        headcount: remainingHeadcount,
        travelStartDate,
        travelEndDate,
        flightInTime: '02:45',
        flightOutTime: '18:15',
      }),
    ];
  }

  const counts = distributeHeadcountTotalAcrossTeams(headcountTotal, newLen);
  if (!counts) {
    return null;
  }

  return [
    ...current.map((group, index) => ({ ...group, headcount: counts[index]! })),
    createTransportGroupDraft({
      index: current.length,
      headcount: counts[current.length]!,
      travelStartDate,
      travelEndDate,
      flightInTime: '02:45',
      flightOutTime: '18:15',
    }),
  ];
}

/** 다팀일 때 한 팀 인원을 바꾸면, 나머지 팀에 (전체 − 해당 팀)을 균등 분배해 합이 headcountTotal과 맞춘다. */
function applyPartitionHeadcountOnTeamEdit(
  groups: TransportGroupDraft[],
  editIndex: number,
  requestedHeadcount: number,
  headcountTotal: number,
): TransportGroupDraft[] {
  const n = groups.length;
  if (n <= 1) {
    return groups.map((g, i) =>
      i === editIndex ? { ...g, headcount: Math.max(1, requestedHeadcount) } : g,
    );
  }

  const maxForEdited = headcountTotal - (n - 1);
  const safeRequested = Math.max(1, requestedHeadcount);

  if (maxForEdited < 1) {
    const all = distributeHeadcountTotalAcrossTeams(headcountTotal, n);
    if (!all) {
      return groups;
    }
    return groups.map((g, i) => ({ ...g, headcount: all[i]! }));
  }

  const clamped = Math.min(maxForEdited, safeRequested);

  const remaining = headcountTotal - clamped;
  const subCounts = distributeHeadcountTotalAcrossTeams(remaining, n - 1);
  if (!subCounts) {
    const all = distributeHeadcountTotalAcrossTeams(headcountTotal, n);
    if (!all) {
      return groups;
    }
    return groups.map((g, i) => ({ ...g, headcount: all[i]! }));
  }

  let subIdx = 0;
  return groups.map((g, i) => {
    if (i === editIndex) {
      return { ...g, headcount: clamped };
    }
    return { ...g, headcount: subCounts[subIdx++]! };
  });
}

function toSegmentTimeCell(
  segmentVersion:
    | {
        scheduleTimeBlocks: Array<{
          startTime: string;
          orderIndex: number;
          activities: Array<{
            description: string;
            orderIndex: number;
          }>;
        }>;
      }
    | undefined,
): string {
  if (!segmentVersion || segmentVersion.scheduleTimeBlocks.length === 0) {
    return '';
  }

  const orderedTimeBlocks = segmentVersion.scheduleTimeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return orderedTimeBlocks
    .flatMap((timeBlock) => {
      const orderedActivities = timeBlock.activities
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const startTime = timeBlock.startTime;
      if (orderedActivities.length <= 1) {
        return [startTime];
      }
      return [startTime, ...orderedActivities.slice(1).map(() => '-')];
    })
    .join('\n');
}

function toSegmentScheduleCell(
  segmentVersion:
    | {
        scheduleTimeBlocks: Array<{
          startTime: string;
          orderIndex: number;
          activities: Array<{
            description: string;
            orderIndex: number;
          }>;
        }>;
      }
    | undefined,
): string {
  if (!segmentVersion || segmentVersion.scheduleTimeBlocks.length === 0) {
    return '';
  }

  return segmentVersion.scheduleTimeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((timeBlock) => {
      const orderedActivities = timeBlock.activities
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex);
      if (orderedActivities.length === 0) {
        return ['(일정 없음)'];
      }
      return orderedActivities.map((activity) => activity.description);
    })
    .join('\n');
}

function toLodgingCell(version: LocationVersionRow | undefined): string {
  return getBaseLodgingText(version, toFacilityLabel);
}

function toMealCell(version: LocationVersionRow | undefined): string {
  const mealSet = pickDefaultLocationMealSet(version?.mealSets ?? []);
  return [
    `아침 ${toMealLabel((mealSet?.breakfast ?? null) as MealOption | null)}`,
    `점심 ${toMealLabel((mealSet?.lunch ?? null) as MealOption | null)}`,
    `저녁 ${toMealLabel((mealSet?.dinner ?? null) as MealOption | null)}`,
  ].join('\n');
}

interface MealCellFields {
  breakfast: string;
  lunch: string;
  dinner: string;
}

function parseMealCellText(value: string | null | undefined): MealCellFields {
  const result: MealCellFields = {
    breakfast: '',
    lunch: '',
    dinner: '',
  };
  const text = value?.trim() ?? '';
  if (!text || text === '-') {
    return result;
  }

  const unlabeled: string[] = [];
  text.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    const breakfastMatch = /^아침\s*(.*)$/.exec(trimmed);
    if (breakfastMatch) {
      result.breakfast = breakfastMatch[1]?.trim() ?? '';
      return;
    }
    const lunchMatch = /^점심\s*(.*)$/.exec(trimmed);
    if (lunchMatch) {
      result.lunch = lunchMatch[1]?.trim() ?? '';
      return;
    }
    const dinnerMatch = /^저녁\s*(.*)$/.exec(trimmed);
    if (dinnerMatch) {
      result.dinner = dinnerMatch[1]?.trim() ?? '';
      return;
    }
    unlabeled.push(trimmed);
  });

  if (!result.breakfast && unlabeled[0]) {
    result.breakfast = unlabeled[0];
  }
  if (!result.lunch && unlabeled[1]) {
    result.lunch = unlabeled[1];
  }
  if (!result.dinner && unlabeled[2]) {
    result.dinner = unlabeled[2];
  }

  return result;
}

function toMealCellText(fields: MealCellFields): string {
  return [
    fields.breakfast ? `아침 ${fields.breakfast}` : '',
    fields.lunch ? `점심 ${fields.lunch}` : '',
    fields.dinner ? `저녁 ${fields.dinner}` : '',
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}

function adjustLastDayMealCellText(
  value: string,
  input: {
    travelEndDate: string;
    dropDate: string;
    dropTime: string;
  },
): string {
  const { travelEndDate, dropDate, dropTime } = input;
  const fields = parseMealCellText(value);
  const minutes = parseTimeToMinutes(dropTime);
  if (minutes === null) {
    return value;
  }

  if (!travelEndDate || !dropDate) {
    if (minutes < 11 * 60) {
      return toMealCellText({ breakfast: 'X', lunch: 'X', dinner: 'X' });
    }
    if (minutes < 14 * 60) {
      return toMealCellText({ ...fields, lunch: 'X', dinner: 'X' });
    }
    if (minutes < 19 * 60) {
      return toMealCellText({ ...fields, dinner: 'X' });
    }
    return value;
  }

  if (dropDate > travelEndDate) {
    return value;
  }

  if (minutes < 11 * 60) {
    return toMealCellText({ breakfast: 'X', lunch: 'X', dinner: 'X' });
  }
  if (minutes < 14 * 60) {
    return toMealCellText({ ...fields, lunch: 'X', dinner: 'X' });
  }
  if (minutes < 19 * 60) {
    return toMealCellText({ ...fields, dinner: 'X' });
  }

  return value;
}

function autoResizeTextarea(element: HTMLTextAreaElement): void {
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

function sortTemplateStops(stops: PlanTemplateStopRow[]): PlanTemplateStopRow[] {
  return stops.slice().sort((a, b) => a.dayIndex - b.dayIndex);
}

function normalizeCellText(value: string | null | undefined): string {
  return (value ?? '').replace(/\r\n/g, '\n').trim();
}

function templateUsesEarlyFirstDay(input: {
  template: PlanTemplateRow;
  locationById: Map<string, LocationOption>;
  locationVersionById: Map<string, LocationVersionOption>;
}): boolean {
  const orderedStops = sortTemplateStops(input.template.planStops);
  const firstStop = orderedStops[0];
  const startLocationId = firstStop?.locationId ?? '';
  const startLocationVersionId = firstStop?.locationVersionId ?? '';
  if (!startLocationId || !startLocationVersionId) {
    return false;
  }

  const baseRows = buildAutoRowsFromRoute({
    startLocationId,
    startLocationVersionId,
    selectedRoute: [],
    filteredSegments: [],
    filteredMultiDayBlocks: [],
    filteredMultiDayBlockConnections: [],
    locationById: input.locationById,
    locationVersionById: input.locationVersionById,
    totalDays: Math.max(2, input.template.totalDays),
    variantType: VariantType.Basic,
  });
  const earlyRows = buildAutoRowsFromRoute({
    startLocationId,
    startLocationVersionId,
    selectedRoute: [],
    filteredSegments: [],
    filteredMultiDayBlocks: [],
    filteredMultiDayBlockConnections: [],
    locationById: input.locationById,
    locationVersionById: input.locationVersionById,
    totalDays: Math.max(2, input.template.totalDays),
    variantType: VariantType.Early,
  });

  const templateTime = normalizeCellText(firstStop?.timeCellText);
  const templateSchedule = normalizeCellText(firstStop?.scheduleCellText);
  const basicTime = normalizeCellText(baseRows[0]?.timeCellText);
  const basicSchedule = normalizeCellText(baseRows[0]?.scheduleCellText);
  const earlyTime = normalizeCellText(earlyRows[0]?.timeCellText);
  const earlySchedule = normalizeCellText(earlyRows[0]?.scheduleCellText);

  const matchesEarly = templateTime === earlyTime && templateSchedule === earlySchedule;
  const matchesBasic = templateTime === basicTime && templateSchedule === basicSchedule;
  return matchesEarly && !matchesBasic;
}

function buildDefaultLodgingRow(input: {
  rowType?: PlanStopRowType;
  segmentId?: string;
  segmentVersionId?: string;
  overnightStayId?: string;
  overnightStayDayOrder?: number;
  overnightStayConnectionId?: string;
  overnightStayConnectionVersionId?: string;
  locationId?: string;
  locationVersionId?: string;
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5' | null;
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  mealCellText: string;
  baseLodgingName: string;
  lodgingCellText?: string;
}): PlanRow {
  return {
    rowType: input.rowType ?? 'MAIN',
    segmentId: input.segmentId,
    segmentVersionId: input.segmentVersionId,
    overnightStayId: input.overnightStayId,
    overnightStayDayOrder: input.overnightStayDayOrder,
    overnightStayConnectionId: input.overnightStayConnectionId,
    overnightStayConnectionVersionId: input.overnightStayConnectionVersionId,
    locationId: input.locationId,
    locationVersionId: input.locationVersionId,
    movementIntensity: input.movementIntensity ?? null,
    lodgingSelectionLevel: 'LV3',
    customLodgingId: undefined,
    customLodgingNameSnapshot: null,
    dateCellText: input.dateCellText,
    destinationCellText: input.destinationCellText,
    timeCellText: input.timeCellText,
    scheduleCellText: input.scheduleCellText,
    lodgingCellText:
      input.lodgingCellText ??
      buildLodgingCellText({ level: 'LV3', baseLodgingName: input.baseLodgingName }),
    mealCellText: input.mealCellText,
  };
}

function PlaceField({
  label,
  placeType,
  customText,
  onPlaceTypeChange,
  onCustomTextChange,
}: PlaceFieldProps): JSX.Element {
  return (
    <div className="grid gap-2 text-sm">
      <span className="text-xs text-slate-600">{label}</span>
      <div className="flex flex-wrap gap-2">
        {PICKUP_DROP_PLACE_OPTIONS.map((option) => (
          <button
            key={`${label}-${option.value}`}
            type="button"
            onClick={() => onPlaceTypeChange(option.value)}
            className={`rounded-xl border px-3 py-1.5 text-sm transition ${
              placeType === option.value
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {placeType === 'CUSTOM' ? (
        <input
          value={customText}
          onChange={(event) => onCustomTextChange(event.target.value)}
          placeholder="장소 직접 입력"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      ) : null}
    </div>
  );
}

function DateInputTrigger({
  value,
  placeholder = '날짜를 선택하세요',
  onClick,
}: DateInputTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:bg-slate-50"
      aria-haspopup="dialog"
    >
      <span className={value ? 'text-slate-900' : 'text-slate-400'}>
        {formatDateTriggerLabel(value) || placeholder}
      </span>
      <span className="text-xs text-slate-500">열기</span>
    </button>
  );
}

function TimeInputTrigger({
  value,
  placeholder = '시간을 선택하세요',
  onClick,
}: TimeInputTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:bg-slate-50"
      aria-haspopup="dialog"
    >
      <span className={value ? 'text-slate-900' : 'text-slate-400'}>
        {formatTimeTriggerLabel(value) || placeholder}
      </span>
      <span className="text-xs text-slate-500">열기</span>
    </button>
  );
}

export function ItineraryBuilderPage(): JSX.Element {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const userId = searchParams.get('userId') ?? '';
  const planId = searchParams.get('planId') ?? '';
  const parentVersionId = searchParams.get('parentVersionId') ?? '';
  const initialChangeNote = searchParams.get('changeNote') ?? '';
  const initialTemplateId = searchParams.get('templateId') ?? '';

  const isVersionMode = Boolean(planId);
  const hasPlanContext = Boolean(userId) && (!isVersionMode || Boolean(parentVersionId));
  const isTemplateOnlyMode = !hasPlanContext && Boolean(initialTemplateId);
  const hasValidContext = hasPlanContext || isTemplateOnlyMode;

  const [variantType, setVariantType] = useState<VariantType>(VariantType.Basic);
  const [totalDays, setTotalDays] = useState<number>(6);
  const [regionId, setRegionId] = useState<string>('');
  const [planTitle, setPlanTitle] = useState<string>(() => buildDefaultPlanTitle(''));
  const [changeNote, setChangeNote] = useState<string>(initialChangeNote);
  const [leaderName, setLeaderName] = useState<string>('');
  const [travelStartDate, setTravelStartDate] = useState<string>('');
  const [travelEndDate, setTravelEndDate] = useState<string>('');
  const [headcountTotal, setHeadcountTotal] = useState<number>(6);
  const [headcountMale, setHeadcountMale] = useState<number>(() => buildDefaultMaleHeadcount(6));
  const [vehicleType, setVehicleType] = useState<(typeof VEHICLES)[number]>('스타렉스');
  const [transportGroups, setTransportGroups] = useState<TransportGroupDraft[]>([
    createTransportGroupDraft({
      index: 0,
      headcount: 6,
      travelStartDate: '',
      travelEndDate: '',
      flightInTime: '02:45',
      flightOutTime: '18:15',
    }),
  ]);
  const [externalTransfers, setExternalTransfers] = useState<ExternalTransfer[]>([]);
  const [externalTransfersDraft, setExternalTransfersDraft] = useState<ExternalTransfer[]>([]);
  const [specialNote, setSpecialNote] = useState<string>('');
  const [includeRentalItems, setIncludeRentalItems] = useState<boolean>(true);
  const [rentalItemsText, setRentalItemsText] = useState<string>(buildDefaultRentalItems(6));
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [remark, setRemark] = useState<string>('');
  const [startLocationId, setStartLocationId] = useState<string>('');
  const [startLocationVersionId, setStartLocationVersionId] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<RouteSelection[]>([]);
  const [isMultiDayBlockSectionOpen, setIsMultiDayBlockSectionOpen] = useState<boolean>(false);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [extraLodgingCounts, setExtraLodgingCounts] = useState<number[]>(
    Array.from({ length: 6 }, () => 0),
  );
  const [extraLodgingsModalState, setExtraLodgingsModalState] = useState<ExtraLodgingsModalState>({
    open: false,
  });
  const [manualAdjustments, setManualAdjustments] = useState<ManualAdjustmentRow[]>([]);
  const [manualAdjustmentsModalState, setManualAdjustmentsModalState] =
    useState<ManualAdjustmentsModalState>({
      open: false,
    });
  const [externalTransfersManagerModalState, setExternalTransfersManagerModalState] =
    useState<ExternalTransfersManagerModalState>({
      open: false,
    });
  const [manualDepositInput, setManualDepositInput] = useState<string>('');
  const [hasEditedManualDeposit, setHasEditedManualDeposit] = useState<boolean>(false);
  const [createdId, setCreatedId] = useState<string>('');
  const [isValidationOpen, setIsValidationOpen] = useState<boolean>(false);
  const [isPayloadPreviewOpen, setIsPayloadPreviewOpen] = useState<boolean>(false);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState<boolean>(true);
  const [activePane, setActivePane] = useState<'builder' | 'preview'>('builder');
  const [hasAppliedInitialTemplate, setHasAppliedInitialTemplate] = useState<boolean>(false);
  const [skipNextAutoRowsSync, setSkipNextAutoRowsSync] = useState<boolean>(false);
  const [routePresetTemplateId, setRoutePresetTemplateId] = useState<string>('');
  const [homeSelectedUserId, setHomeSelectedUserId] = useState<string>('');
  const [homeSelectedUserName, setHomeSelectedUserName] = useState<string>('');
  const [homeSelectedTemplateId, setHomeSelectedTemplateId] = useState<string>('');
  const [homeTemplateRegionId, setHomeTemplateRegionId] = useState<string>('');
  const [homeTemplateTotalDays, setHomeTemplateTotalDays] = useState<number>(0);
  const [homeEntryMode, setHomeEntryMode] = useState<'new' | 'existing' | null>(null);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState<boolean>(false);
  const [datePickerTarget, setDatePickerTarget] = useState<DatePickerTarget | null>(null);
  const [timePickerTarget, setTimePickerTarget] = useState<TimePickerTarget | null>(null);
  const [isConsultationPasteModalOpen, setIsConsultationPasteModalOpen] = useState<boolean>(false);
  const [externalTransferModalState, setExternalTransferModalState] =
    useState<ExternalTransferModalState>({
      open: false,
      editingIndex: null,
    });
  const [lodgingUpgradeModalState, setLodgingUpgradeModalState] =
    useState<LodgingUpgradeModalState>({
      open: false,
    });
  const [specialMealsModalState, setSpecialMealsModalState] = useState<SpecialMealsModalState>({
    open: false,
  });
  const [lodgingSelectionModalState, setLodgingSelectionModalState] =
    useState<LodgingSelectionModalState>({
      open: false,
      rowIndex: null,
    });
  const [homeNewUserName, setHomeNewUserName] = useState<string>('');
  const [homeCreateUserError, setHomeCreateUserError] = useState<string>('');
  const dirtyPlanRowFieldKeysRef = useRef<Set<string>>(new Set());
  const pendingConsultationTemplateApplyIdRef = useRef<string | null>(null);
  const lastAutoPlanTitleRef = useRef<string>(buildDefaultPlanTitle(''));
  const hasEditedHeadcountMaleRef = useRef<boolean>(false);

  const { data: planContextData } = useQuery<{ plan: PlanContextRow | null }>(PLAN_CONTEXT_QUERY, {
    variables: { id: planId },
    skip: !isVersionMode,
  });
  const { data: userData } = useQuery<{ user: UserRow | null }>(USER_QUERY, {
    variables: { id: userId },
    skip: !userId,
  });
  const { data: eventData } = useQuery<{ events: EventOptionRow[] }>(EVENTS_QUERY, {
    variables: { activeOnly: true },
  });
  const { data: regionLodgingData } = useQuery<{ regionLodgings: RegionLodgingOption[] }>(
    REGION_LODGINGS_QUERY,
    {
      variables: {
        regionId: regionId || undefined,
        activeOnly: true,
      },
      skip: !regionId,
    },
  );
  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const { data: segmentData } = useQuery<{ segments: SegmentRow[] }>(SEGMENTS_QUERY);
  const { data: overnightStayData } = useQuery<{ multiDayBlocks: MultiDayBlockOption[] }>(
    OVERNIGHT_STAYS_QUERY,
  );
  const { data: overnightStayConnectionData } = useQuery<{
    multiDayBlockConnections: MultiDayBlockConnectionOption[];
  }>(OVERNIGHT_STAY_CONNECTIONS_QUERY);
  const { data: templateListData } = useQuery<{ planTemplates: PlanTemplateRow[] }>(
    PLAN_TEMPLATES_QUERY,
    {
      variables: {
        regionId: hasValidContext ? regionId || undefined : undefined,
        totalDays: hasValidContext ? totalDays : undefined,
        activeOnly: true,
      },
      skip: hasValidContext ? !regionId : false,
    },
  );
  const { data: templateByIdData } = useQuery<{ planTemplate: PlanTemplateRow | null }>(
    PLAN_TEMPLATE_QUERY,
    {
      variables: { id: initialTemplateId },
      skip: !initialTemplateId,
    },
  );

  const [createPlan, { loading: creatingPlan }] = useMutation<{ createPlan: { id: string } }>(
    CREATE_PLAN_MUTATION,
  );
  const [createPlanVersion, { loading: creatingVersion }] = useMutation<{
    createPlanVersion: { id: string; versionNumber: number };
  }>(CREATE_PLAN_VERSION_MUTATION);
  const [createUser, { loading: creatingUser }] = useMutation<{ createUser: UserRow }>(
    CREATE_USER_MUTATION,
  );

  const creating = creatingPlan || creatingVersion;

  const regions = regionData?.regions ?? [];
  const locations = locationData?.locations ?? [];
  const segments = segmentData?.segments ?? [];
  const overnightStays = overnightStayData?.multiDayBlocks ?? [];
  const overnightStayConnections = overnightStayConnectionData?.multiDayBlockConnections ?? [];
  const planContext = planContextData?.plan ?? null;
  const selectedUserName = userData?.user?.name ?? '';
  const eventOptions = eventData?.events ?? [];
  const regionLodgings = regionLodgingData?.regionLodgings ?? [];
  const activeTemplateRows = templateListData?.planTemplates ?? [];
  const templateById = templateByIdData?.planTemplate ?? null;

  const templateOptions = useMemo(() => {
    const deduped = new Map<string, PlanTemplateRow>();
    activeTemplateRows.forEach((template) => {
      deduped.set(template.id, template);
    });
    if (templateById) {
      deduped.set(templateById.id, templateById);
    }
    return Array.from(deduped.values()).sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name, 'ko-KR');
    });
  }, [activeTemplateRows, templateById]);

  const homeTemplateOptions = useMemo(() => {
    return templateOptions.filter((template) => {
      if (!template.isActive) {
        return false;
      }
      if (homeTemplateRegionId && template.regionId !== homeTemplateRegionId) {
        return false;
      }
      if (homeTemplateTotalDays > 0 && template.totalDays !== homeTemplateTotalDays) {
        return false;
      }
      return true;
    });
  }, [homeTemplateRegionId, homeTemplateTotalDays, templateOptions]);

  const routePresetOptions = useMemo(
    () =>
      templateOptions.filter(
        (template) =>
          template.isActive && template.regionId === regionId && template.totalDays === totalDays,
      ),
    [regionId, templateOptions, totalDays],
  );

  const routePresetSelected = useMemo(
    () => routePresetOptions.find((template) => template.id === routePresetTemplateId) ?? null,
    [routePresetOptions, routePresetTemplateId],
  );

  useEffect(() => {
    if (!isVersionMode || !planContext) {
      return;
    }

    setRegionId(planContext.regionId);
  }, [isVersionMode, planContext]);

  useEffect(() => {
    const trimmedName = selectedUserName.trim();
    if (!trimmedName || leaderName === trimmedName) {
      return;
    }
    setLeaderName(trimmedName);
  }, [leaderName, selectedUserName]);

  useEffect(() => {
    if (isVersionMode) {
      return;
    }

    const nextAutoPlanTitle = buildDefaultPlanTitle(leaderName);
    if (!planTitle.trim() || planTitle === lastAutoPlanTitleRef.current) {
      setPlanTitle(nextAutoPlanTitle);
    }
    lastAutoPlanTitleRef.current = nextAutoPlanTitle;
  }, [isVersionMode, leaderName, planTitle]);

  useEffect(() => {
    if (!routePresetTemplateId) {
      return;
    }
    if (!routePresetOptions.some((template) => template.id === routePresetTemplateId)) {
      setRoutePresetTemplateId('');
    }
  }, [routePresetOptions, routePresetTemplateId]);

  useEffect(() => {
    if (!homeSelectedTemplateId) {
      return;
    }
    if (!homeTemplateOptions.some((template) => template.id === homeSelectedTemplateId)) {
      setHomeSelectedTemplateId('');
    }
  }, [homeSelectedTemplateId, homeTemplateOptions]);

  useEffect(() => {
    setExternalTransfers((current) =>
      current.map((transfer) =>
        syncExternalTransferWithSelectedTeams(
          {
            ...transfer,
            selectedTeamOrderIndexes: transfer.selectedTeamOrderIndexes.filter(
              (teamOrderIndex) => teamOrderIndex >= 0 && teamOrderIndex < transportGroups.length,
            ),
          },
          transportGroups,
        ),
      ),
    );
  }, [transportGroups]);

  const filteredLocations = useMemo(
    () => (regionId ? locations.filter((location) => location.regionId === regionId) : []),
    [locations, regionId],
  );
  const filteredOvernightStays = useMemo(
    () =>
      regionId ? overnightStays.filter((overnightStay) => overnightStay.regionId === regionId) : [],
    [overnightStays, regionId],
  );
  const filteredOvernightStayConnections = useMemo(
    () =>
      regionId
        ? overnightStayConnections.filter((connection) => connection.regionId === regionId)
        : [],
    [overnightStayConnections, regionId],
  );
  const activeDatePickerAnchorEl = datePickerTarget?.anchorEl ?? null;
  const activeDatePickerValue = useMemo(() => {
    if (!datePickerTarget) {
      return '';
    }

    switch (datePickerTarget.kind) {
      case 'travelStartDate':
        return travelStartDate;
      case 'travelEndDate':
        return travelEndDate;
      case 'flightInDate':
        return transportGroups[datePickerTarget.index]?.flightInDate ?? '';
      case 'flightOutDate':
        return transportGroups[datePickerTarget.index]?.flightOutDate ?? '';
      case 'pickupDate':
        return transportGroups[datePickerTarget.index]?.pickupDate ?? '';
      case 'dropDate':
        return transportGroups[datePickerTarget.index]?.dropDate ?? '';
    }
  }, [datePickerTarget, travelEndDate, travelStartDate, transportGroups]);
  const activeDatePickerTitle = useMemo(() => {
    if (!datePickerTarget) {
      return '날짜 선택';
    }

    switch (datePickerTarget.kind) {
      case 'travelStartDate':
        return '여행 시작일 선택';
      case 'travelEndDate':
        return '여행 종료일 선택';
      case 'flightInDate':
        return '항공권 IN 날짜 선택';
      case 'flightOutDate':
        return '항공권 OUT 날짜 선택';
      case 'pickupDate':
        return '픽업 날짜 선택';
      case 'dropDate':
        return '드랍 날짜 선택';
    }
  }, [datePickerTarget]);
  const activeTimePickerAnchorEl = timePickerTarget?.anchorEl ?? null;
  const activeTimePickerValue = useMemo(() => {
    if (!timePickerTarget) {
      return '';
    }

    switch (timePickerTarget.kind) {
      case 'flightInTime':
        return transportGroups[timePickerTarget.index]?.flightInTime ?? '';
      case 'flightOutTime':
        return transportGroups[timePickerTarget.index]?.flightOutTime ?? '';
      case 'pickupTime':
        return transportGroups[timePickerTarget.index]?.pickupTime ?? '';
      case 'dropTime':
        return transportGroups[timePickerTarget.index]?.dropTime ?? '';
    }
  }, [timePickerTarget, transportGroups]);
  const activeTimePickerTitle = useMemo(() => {
    if (!timePickerTarget) {
      return '시간 선택';
    }

    switch (timePickerTarget.kind) {
      case 'flightInTime':
        return '항공권 IN 시간 선택';
      case 'flightOutTime':
        return '항공권 OUT 시간 선택';
      case 'pickupTime':
        return '픽업 시간 선택';
      case 'dropTime':
        return '드랍 시간 선택';
    }
  }, [timePickerTarget]);
  const activeTimePickerAllowedMinutes = useMemo(() => {
    if (!timePickerTarget) {
      return undefined;
    }

    switch (timePickerTarget.kind) {
      case 'flightInTime':
      case 'flightOutTime':
        return undefined;
      case 'pickupTime':
      case 'dropTime':
        return HALF_HOUR_MINUTE_OPTIONS;
    }
  }, [timePickerTarget]);

  const filteredSegments = useMemo(
    () => (regionId ? segments.filter((segment) => segment.regionId === regionId) : []),
    [segments, regionId],
  );

  const allLocationById = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations],
  );
  const allLocationVersionById = useMemo(
    () =>
      new Map(
        locations.flatMap((location) =>
          location.variations.map((version) => [version.id, version] as const),
        ),
      ),
    [locations],
  );
  const locationById = useMemo(
    () => new Map(filteredLocations.map((location) => [location.id, location])),
    [filteredLocations],
  );
  const locationVersionById = useMemo(
    () =>
      new Map(
        filteredLocations.flatMap((location) =>
          location.variations.map((version) => [version.id, version] as const),
        ),
      ),
    [filteredLocations],
  );

  const firstDayOptions = useMemo(
    () => buildFirstDayOptions(filteredLocations),
    [filteredLocations],
  );

  const nextRouteDayIndex = 2 + getConsumedRouteDayCount(selectedRoute);
  const nextRouteDate = useMemo(
    () =>
      travelStartDate ? getRouteDateForDayIndex(travelStartDate, nextRouteDayIndex) : undefined,
    [nextRouteDayIndex, travelStartDate],
  );

  const nextOptions = useMemo(
    () =>
      buildNextOptions({
        filteredLocations,
        filteredSegments,
        filteredMultiDayBlockConnections: filteredOvernightStayConnections,
        startLocationId,
        selectedRoute,
        totalDays,
        variantType,
        targetDate: nextRouteDate,
      }),
    [
      filteredLocations,
      filteredOvernightStayConnections,
      filteredSegments,
      nextRouteDate,
      selectedRoute,
      startLocationId,
      totalDays,
      variantType,
    ],
  );

  const overnightStayOptions = useMemo(
    () =>
      buildMultiDayBlockOptions({
        filteredMultiDayBlocks: filteredOvernightStays,
        filteredSegments,
        startLocationId,
        selectedRoute,
        totalDays,
      }),
    [filteredOvernightStays, filteredSegments, selectedRoute, startLocationId, totalDays],
  );

  const autoRows = useMemo((): PlanRow[] => {
    if (!startLocationId || !startLocationVersionId) {
      return [];
    }

    const firstPickupTime = transportGroups[0]?.pickupTime?.trim() ?? '';
    const dropDate = transportGroups[0]?.dropDate?.trim() ?? '';
    const dropTime = transportGroups[0]?.dropTime?.trim() ?? '';
    const firstDayTimeOverride =
      (variantType === VariantType.Early || variantType === VariantType.EarlyExtend) &&
      firstPickupTime
        ? firstPickupTime
        : undefined;

    return buildAutoRowsFromRoute({
      startLocationId,
      startLocationVersionId,
      selectedRoute,
      filteredSegments,
      filteredMultiDayBlocks: filteredOvernightStays,
      filteredMultiDayBlockConnections: filteredOvernightStayConnections,
      locationById,
      locationVersionById,
      totalDays,
      variantType,
      travelStartDate,
      firstDayTimeOverride,
    }).map((row, index, rows) => ({
      ...row,
      lodgingSelectionLevel: 'LV3',
      customLodgingId: undefined,
      customLodgingNameSnapshot: null,
      lodgingCellText: index === rows.length - 1 ? '숙소미포함' : row.lodgingCellText,
      mealCellText:
        index === rows.length - 1
          ? adjustLastDayMealCellText(row.mealCellText, {
              travelEndDate,
              dropDate,
              dropTime,
            })
          : row.mealCellText,
    }));
  }, [
    filteredOvernightStayConnections,
    filteredOvernightStays,
    filteredSegments,
    locationById,
    locationVersionById,
    selectedRoute,
    startLocationId,
    startLocationVersionId,
    totalDays,
    transportGroups,
    travelStartDate,
    variantType,
  ]);

  useEffect(() => {
    if (skipNextAutoRowsSync) {
      setSkipNextAutoRowsSync(false);
      return;
    }
    setPlanRows((current) => {
      const nextRows = mergeAutoRowsWithDirtyValues(
        current,
        autoRows,
        dirtyPlanRowFieldKeysRef.current,
      );
      return arePlanRowsEqual(current, nextRows) ? current : nextRows;
    });
  }, [autoRows, skipNextAutoRowsSync]);

  useEffect(() => {
    setExtraLodgingCounts((prev) =>
      Array.from({ length: totalDays }, (_, index) => prev[index] ?? 0),
    );
  }, [totalDays]);

  useEffect(() => {
    if (!travelStartDate) {
      setTravelEndDate('');
      return;
    }
    setTravelEndDate(toAutoTravelEndDate(travelStartDate, totalDays));
  }, [totalDays, travelStartDate]);

  const updateTransportGroup = <K extends keyof TransportGroupDraft>(
    index: number,
    field: K,
    value: TransportGroupDraft[K],
  ): void => {
    if (field === 'headcount') {
      setTransportGroups((current) => {
        const raw = typeof value === 'number' && Number.isFinite(value) ? value : 1;
        return applyPartitionHeadcountOnTeamEdit(current, index, raw, headcountTotal);
      });
      return;
    }

    setTransportGroups((current) =>
      current.map((group, groupIndex) => {
        if (groupIndex !== index) {
          return group;
        }

        const nextGroup = { ...group, [field]: value } as TransportGroupDraft;

        if (field === 'flightInDate') {
          if (!group.hasEditedPickup) {
            const nextFlightInDate = typeof value === 'string' ? value : group.flightInDate;
            nextGroup.pickupDate = nextFlightInDate;
            if (!nextGroup.pickupTime.trim()) {
              nextGroup.pickupTime = getRecommendedPickupTime(nextGroup.flightInTime);
            }
          }
        }

        if (field === 'flightInTime') {
          if (!group.hasEditedPickup) {
            if (!nextGroup.pickupDate.trim() && nextGroup.flightInDate.trim()) {
              nextGroup.pickupDate = nextGroup.flightInDate;
            }
            nextGroup.pickupTime = getRecommendedPickupTime(
              typeof value === 'string' ? value : group.flightInTime,
            );
          }
        }

        if (field === 'flightOutDate') {
          if (!group.hasEditedDrop) {
            const recommendedDrop = getRecommendedDropSchedule(
              typeof value === 'string' ? value : group.flightOutDate,
              nextGroup.flightOutTime,
            );
            nextGroup.dropDate = recommendedDrop.date;
            nextGroup.dropTime = recommendedDrop.time;
          }
        }

        if (field === 'flightOutTime') {
          if (!group.hasEditedDrop) {
            const recommendedDrop = getRecommendedDropSchedule(
              nextGroup.flightOutDate,
              typeof value === 'string' ? value : group.flightOutTime,
            );
            nextGroup.dropDate = recommendedDrop.date;
            nextGroup.dropTime = recommendedDrop.time;
          }
        }

        if (field === 'pickupDate' || field === 'pickupTime') {
          nextGroup.hasEditedPickup = true;
        }

        if (field === 'dropDate' || field === 'dropTime') {
          nextGroup.hasEditedDrop = true;
        }

        if (field === 'pickupPlaceType' && value !== 'CUSTOM') {
          nextGroup.pickupPlaceCustomText = '';
        }

        if (field === 'dropPlaceType' && value !== 'CUSTOM') {
          nextGroup.dropPlaceCustomText = '';
        }

        return nextGroup;
      }),
    );
  };

  const handleDatePickerChange = (nextIsoDate: string): void => {
    if (!datePickerTarget) {
      return;
    }

    switch (datePickerTarget.kind) {
      case 'travelStartDate':
        setTravelStartDate(nextIsoDate);
        return;
      case 'travelEndDate':
        setTravelEndDate(nextIsoDate);
        return;
      case 'flightInDate':
        updateTransportGroup(datePickerTarget.index, 'flightInDate', nextIsoDate);
        return;
      case 'flightOutDate':
        updateTransportGroup(datePickerTarget.index, 'flightOutDate', nextIsoDate);
        return;
      case 'pickupDate':
        updateTransportGroup(datePickerTarget.index, 'pickupDate', nextIsoDate);
        return;
      case 'dropDate':
        updateTransportGroup(datePickerTarget.index, 'dropDate', nextIsoDate);
        return;
    }
  };

  const handleTimePickerChange = (nextTime: string): void => {
    if (!timePickerTarget) {
      return;
    }

    switch (timePickerTarget.kind) {
      case 'flightInTime':
        updateTransportGroup(timePickerTarget.index, 'flightInTime', nextTime);
        return;
      case 'flightOutTime':
        updateTransportGroup(timePickerTarget.index, 'flightOutTime', nextTime);
        return;
      case 'pickupTime':
        updateTransportGroup(timePickerTarget.index, 'pickupTime', nextTime);
        return;
      case 'dropTime':
        updateTransportGroup(timePickerTarget.index, 'dropTime', nextTime);
        return;
    }
  };

  useEffect(() => {
    setTransportGroups((current) =>
      current.map((group, index) => {
        const nextGroup = { ...group };

        if (index === 0 && group.teamName.trim().length === 0) {
          nextGroup.teamName = getTransportGroupTeamName(index);
        }

        if (!group.flightInDate && travelStartDate) {
          nextGroup.flightInDate = travelStartDate;
          if (!group.hasEditedPickup) {
            nextGroup.pickupDate = travelStartDate;
            if (!nextGroup.pickupTime.trim()) {
              nextGroup.pickupTime = getRecommendedPickupTime(nextGroup.flightInTime);
            }
          }
        } else if (!group.hasEditedPickup && !group.pickupDate && group.flightInDate) {
          nextGroup.pickupDate = group.flightInDate;
          if (!nextGroup.pickupTime.trim()) {
            nextGroup.pickupTime = getRecommendedPickupTime(nextGroup.flightInTime);
          }
        }

        if (!group.flightOutDate && travelEndDate) {
          nextGroup.flightOutDate = travelEndDate;
          if (!group.hasEditedDrop) {
            const recommendedDrop = getRecommendedDropSchedule(
              travelEndDate,
              nextGroup.flightOutTime,
            );
            nextGroup.dropDate = recommendedDrop.date;
            nextGroup.dropTime = recommendedDrop.time;
          }
        }

        return nextGroup;
      }),
    );
  }, [travelEndDate, travelStartDate]);

  useEffect(() => {
    setTransportGroups((current) => {
      if (current.length === 0) {
        return [
          createTransportGroupDraft({
            index: 0,
            headcount: headcountTotal,
            travelStartDate,
            travelEndDate,
            flightInTime: '02:45',
            flightOutTime: '18:15',
          }),
        ];
      }

      const nextGroups = current.map((group, index) => {
        const nextGroup = { ...group };
        if (nextGroup.teamName.trim().length === 0) {
          nextGroup.teamName = getTransportGroupTeamName(index);
        }
        return nextGroup;
      });

      const firstGroup = nextGroups[0];
      if (nextGroups.length === 1 && firstGroup && firstGroup.headcount !== headcountTotal) {
        nextGroups[0] = { ...firstGroup, headcount: headcountTotal };
      }

      return nextGroups;
    });
  }, [headcountTotal, travelEndDate, travelStartDate]);

  useEffect(() => {
    const nextVariantType = resolveAutoVariantType(variantType, transportGroups);
    if (nextVariantType !== variantType) {
      setVariantType(nextVariantType);
    }
  }, [transportGroups, variantType]);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLTextAreaElement>('[data-plan-cell="true"]');
    elements.forEach((element) => autoResizeTextarea(element));
  }, [planRows]);

  useEffect(() => {
    if (!hasValidContext || createdId) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (
        !regionId &&
        !travelStartDate &&
        !travelEndDate &&
        totalDays === 6 &&
        headcountTotal === 6 &&
        headcountMale === buildDefaultMaleHeadcount(6) &&
        vehicleType === '스타렉스' &&
        transportGroups.length === 1 &&
        !transportGroups[0]?.flightInDate &&
        !transportGroups[0]?.flightOutDate &&
        transportGroups[0]?.flightInTime === '02:45' &&
        transportGroups[0]?.flightOutTime === '18:15' &&
        !transportGroups[0]?.pickupDate &&
        !transportGroups[0]?.pickupTime &&
        transportGroups[0]?.pickupPlaceType === DEFAULT_PICKUP_DROP_PLACE_TYPE &&
        !transportGroups[0]?.pickupPlaceCustomText &&
        !transportGroups[0]?.dropDate &&
        !transportGroups[0]?.dropTime &&
        transportGroups[0]?.dropPlaceType === DEFAULT_PICKUP_DROP_PLACE_TYPE &&
        !transportGroups[0]?.dropPlaceCustomText &&
        externalTransfers.length === 0 &&
        !specialNote.trim() &&
        includeRentalItems &&
        rentalItemsText.trim() === buildDefaultRentalItems(headcountTotal) &&
        eventIds.length === 0 &&
        !remark.trim() &&
        !startLocationId &&
        !startLocationVersionId &&
        selectedRoute.length === 0 &&
        planRows.length === 0 &&
        extraLodgingCounts.every((count) => count === 0) &&
        manualAdjustments.length === 0 &&
        !manualDepositInput.trim() &&
        !routePresetTemplateId &&
        !changeNote.trim() &&
        (isVersionMode || planTitle.trim() === buildDefaultPlanTitle(leaderName))
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [
    changeNote,
    createdId,
    eventIds,
    externalTransfers.length,
    extraLodgingCounts,
    hasValidContext,
    headcountMale,
    headcountTotal,
    includeRentalItems,
    isVersionMode,
    leaderName,
    manualAdjustments,
    manualDepositInput,
    planRows.length,
    planTitle,
    regionId,
    remark,
    rentalItemsText,
    routePresetTemplateId,
    selectedRoute.length,
    specialNote,
    startLocationId,
    startLocationVersionId,
    totalDays,
    transportGroups,
    travelEndDate,
    travelStartDate,
    vehicleType,
  ]);

  const updateCell = (rowIndex: number, field: keyof PlanRow, value: string): void => {
    dirtyPlanRowFieldKeysRef.current.add(getDirtyPlanRowFieldKey(rowIndex, field));
    setPlanRows((prev) =>
      prev.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row)),
    );
  };

  const updateMealCellField = (
    rowIndex: number,
    field: keyof MealCellFields,
    value: string,
  ): void => {
    dirtyPlanRowFieldKeysRef.current.add(getDirtyPlanRowFieldKey(rowIndex, 'mealCellText'));
    setPlanRows((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) {
          return row;
        }
        const nextMealFields = {
          ...parseMealCellText(row.mealCellText),
          [field]: value,
        };
        return {
          ...row,
          mealCellText: toMealCellText(nextMealFields),
        };
      }),
    );
  };

  const applyLodgingSelection = (
    rowIndex: number,
    level: LodgingSelectionLevel,
    customLodging?: RegionLodgingOption | null,
  ): void => {
    dirtyPlanRowFieldKeysRef.current.add(
      getDirtyPlanRowFieldKey(rowIndex, 'lodgingSelectionLevel'),
    );
    dirtyPlanRowFieldKeysRef.current.add(getDirtyPlanRowFieldKey(rowIndex, 'customLodgingId'));
    dirtyPlanRowFieldKeysRef.current.add(
      getDirtyPlanRowFieldKey(rowIndex, 'customLodgingNameSnapshot'),
    );
    dirtyPlanRowFieldKeysRef.current.add(getDirtyPlanRowFieldKey(rowIndex, 'lodgingCellText'));
    setPlanRows((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) {
          return row;
        }

        const baseLodgingName = toLodgingCell(
          row.locationVersionId ? locationVersionById.get(row.locationVersionId) : undefined,
        );
        const customLodgingName =
          level === 'CUSTOM' ? (customLodging?.name ?? row.customLodgingNameSnapshot ?? '') : null;

        return {
          ...row,
          lodgingSelectionLevel: level,
          customLodgingId:
            level === 'CUSTOM' ? (customLodging?.id ?? row.customLodgingId) : undefined,
          customLodgingNameSnapshot: customLodgingName,
          lodgingCellText: buildLodgingCellText({
            level,
            baseLodgingName,
            customLodgingName,
          }),
        };
      }),
    );
  };

  const lodgingSelections = useMemo(
    () =>
      planRows.map((row, index) => ({
        dayIndex: index + 1,
        level: row.lodgingSelectionLevel,
        customLodgingId: row.lodgingSelectionLevel === 'CUSTOM' ? row.customLodgingId : undefined,
      })),
    [planRows],
  );
  const lodgingUpgradeRows = useMemo(
    () =>
      planRows.map((row, index) => ({
        dayIndex: index + 1,
        locationLabel: formatLocationNameInline(
          locationById.get(row.locationId ?? '')?.name ?? row.locationId ?? '목적지 미정',
        ),
        lodgingSelectionLevel: row.lodgingSelectionLevel,
        lodgingCellText: row.lodgingCellText,
        customLodgingId: row.customLodgingId,
      })),
    [locationById, planRows],
  );
  const planStopInputs = useMemo(
    () =>
      planRows.map((row) => ({
        rowType: row.rowType,
        segmentId: row.segmentId,
        segmentVersionId: row.segmentVersionId,
        overnightStayId: row.overnightStayId,
        overnightStayDayOrder: row.overnightStayDayOrder,
        overnightStayConnectionId: row.overnightStayConnectionId,
        overnightStayConnectionVersionId: row.overnightStayConnectionVersionId,
        locationId: row.locationId,
        locationVersionId: row.locationVersionId,
        dateCellText: row.dateCellText,
        destinationCellText: row.destinationCellText,
        timeCellText: row.timeCellText,
        scheduleCellText: row.scheduleCellText,
        lodgingCellText: row.lodgingCellText,
        mealCellText: row.mealCellText,
      })),
    [planRows],
  );
  const mergedPlanStops = useMemo(
    () => buildMergedPlanStops(planStopInputs, externalTransfers, transportGroups),
    [externalTransfers, planStopInputs, transportGroups],
  );
  const pricingPreviewPlanStops = useMemo(
    () =>
      mergedPlanStops.map((row) => {
        const overnightStayId = 'overnightStayId' in row ? row.overnightStayId : undefined;
        const overnightStayDayOrder =
          'overnightStayDayOrder' in row ? row.overnightStayDayOrder : undefined;
        const overnightStayConnectionId =
          'overnightStayConnectionId' in row ? row.overnightStayConnectionId : undefined;
        const overnightStayConnectionVersionId =
          'overnightStayConnectionVersionId' in row
            ? row.overnightStayConnectionVersionId
            : undefined;

        return {
          rowType: row.rowType,
          segmentId: 'segmentId' in row ? row.segmentId : undefined,
          segmentVersionId: 'segmentVersionId' in row ? row.segmentVersionId : undefined,
          multiDayBlockId:
            'multiDayBlockId' in row ? row.multiDayBlockId : overnightStayId ?? undefined,
          multiDayBlockDayOrder:
            'multiDayBlockDayOrder' in row
              ? row.multiDayBlockDayOrder
              : overnightStayDayOrder ?? undefined,
          multiDayBlockConnectionId:
            'multiDayBlockConnectionId' in row
              ? row.multiDayBlockConnectionId
              : overnightStayConnectionId ?? undefined,
          multiDayBlockConnectionVersionId:
            'multiDayBlockConnectionVersionId' in row
              ? row.multiDayBlockConnectionVersionId
              : overnightStayConnectionVersionId ?? undefined,
          locationId: row.locationId,
          locationVersionId: 'locationVersionId' in row ? row.locationVersionId : undefined,
          dateCellText: '',
          destinationCellText: '',
          timeCellText: '',
          scheduleCellText: '',
          lodgingCellText: '',
          mealCellText: 'mealCellText' in row ? row.mealCellText : '',
        };
      }),
    [mergedPlanStops],
  );
  const displayPlanRows = useMemo(() => {
    let mainRowIndex = 0;
    return buildMergedPlanStops(planRows, externalTransfers, transportGroups).map((row) => {
      if (row.rowType === 'EXTERNAL_TRANSFER') {
        return { row, mainRowIndex: null as number | null };
      }

      const currentMainRowIndex = mainRowIndex;
      mainRowIndex += 1;
      return { row, mainRowIndex: currentMainRowIndex };
    });
  }, [externalTransfers, planRows, transportGroups]);

  const applyTemplate = (template: PlanTemplateRow, withConfirm = true): void => {
    const builderAllowsEarly =
      variantType === VariantType.Early || variantType === VariantType.EarlyExtend;
    if (
      !builderAllowsEarly &&
      templateUsesEarlyFirstDay({
        template,
        locationById: allLocationById,
        locationVersionById: allLocationVersionById,
      })
    ) {
      window.alert(
        '이 템플릿은 1일차에 얼리 일정을 사용하고 있습니다. Variant를 얼리 또는 얼리+연장으로 바꾼 뒤 다시 불러와주세요.',
      );
      return;
    }

    if (
      withConfirm &&
      !window.confirm(`템플릿 \"${template.name}\"을(를) 현재 빌더에 적용할까요?`)
    ) {
      return;
    }

    const orderedStops = sortTemplateStops(template.planStops);
    const firstStop = orderedStops[0];
    if (!firstStop) {
      return;
    }

    dirtyPlanRowFieldKeysRef.current.clear();
    setSkipNextAutoRowsSync(true);
    setRegionId(template.regionId);
    setTotalDays(template.totalDays);
    setStartLocationId(firstStop.locationId ?? '');
    setStartLocationVersionId(firstStop.locationVersionId ?? '');
    setSelectedRoute(
      buildSelectedRouteFromStops(
        orderedStops.slice(1).map((stop) => ({
          segmentId: stop.segmentId,
          segmentVersionId: stop.segmentVersionId,
          overnightStayId: stop.overnightStayId,
          overnightStayDayOrder: stop.overnightStayDayOrder,
          overnightStayConnectionId: stop.overnightStayConnectionId,
          overnightStayConnectionVersionId: stop.overnightStayConnectionVersionId,
          locationId: stop.locationId,
          locationVersionId: stop.locationVersionId,
        })),
      ),
    );
    setIsMultiDayBlockSectionOpen(false);
    setPlanRows(
      orderedStops.map((stop) =>
        buildDefaultLodgingRow({
          segmentId: stop.segmentId ?? undefined,
          segmentVersionId: stop.segmentVersionId ?? undefined,
          overnightStayId: stop.overnightStayId ?? undefined,
          overnightStayDayOrder: stop.overnightStayDayOrder ?? undefined,
          overnightStayConnectionId: stop.overnightStayConnectionId ?? undefined,
          overnightStayConnectionVersionId: stop.overnightStayConnectionVersionId ?? undefined,
          locationId: stop.locationId ?? undefined,
          locationVersionId: stop.locationVersionId ?? undefined,
          movementIntensity: stop.movementIntensity ?? null,
          dateCellText: stop.dateCellText,
          destinationCellText: stop.destinationCellText,
          timeCellText: stop.timeCellText,
          scheduleCellText: stop.scheduleCellText,
          lodgingCellText: stop.lodgingCellText,
          mealCellText: stop.mealCellText,
          baseLodgingName: stop.lodgingCellText,
        }),
      ),
    );
  };

  useEffect(() => {
    if (!initialTemplateId || hasAppliedInitialTemplate) {
      return;
    }
    if (!templateById) {
      return;
    }

    setRoutePresetTemplateId(templateById.id);
    applyTemplate(templateById, false);
    setHasAppliedInitialTemplate(true);
  }, [hasAppliedInitialTemplate, initialTemplateId, templateById]);

  const extraLodgings = useMemo<ExtraLodgingRow[]>(
    () =>
      extraLodgingCounts
        .map((lodgingCount, index) => ({ dayIndex: index + 1, lodgingCount }))
        .filter((item) => item.lodgingCount > 0),
    [extraLodgingCounts],
  );
  const extraLodgingSummary = useMemo(
    () => ({
      activeDayCount: extraLodgings.length,
      totalCount: extraLodgings.reduce((sum, item) => sum + item.lodgingCount, 0),
    }),
    [extraLodgings],
  );

  const extraLodgingDayLabels = useMemo(
    () => planRows.filter((r) => isMainPlanStopRow(r)).map((r) => r.destinationCellText.trim()),
    [planRows],
  );

  const externalTransferManualAdjustments = useMemo(
    () => buildDerivedExternalTransferManualAdjustments(externalTransfers, transportGroups),
    [externalTransfers, transportGroups],
  );

  const normalizedManualAdjustments = useMemo(
    () => [
      ...manualAdjustments
        .map((item) => ({
          kind: item.kind,
          description: item.description.trim(),
          amountText: item.amountKrw.trim(),
          amountKrw: Math.abs(Number(item.amountKrw)),
        }))
        .filter((item) => item.description.length > 0 && item.amountText.length > 0)
        .map((item) => ({
          description: item.description,
          amountKrw: item.kind === 'DISCOUNT' ? -item.amountKrw : item.amountKrw,
        })),
      ...externalTransferManualAdjustments,
    ],
    [externalTransferManualAdjustments, manualAdjustments],
  );

  const manualAdjustmentSummary = useMemo(() => {
    const validRows = manualAdjustments
      .map((item) => ({
        kind: item.kind,
        description: item.description.trim(),
        amountText: item.amountKrw.trim(),
        amountKrw: Math.abs(Number(item.amountKrw)),
      }))
      .filter(
        (item) =>
          item.description.length > 0 &&
          item.amountText.length > 0 &&
          Number.isInteger(item.amountKrw),
      );

    const addCount = validRows.filter((item) => item.kind === 'ADD').length;
    const discountCount = validRows.filter((item) => item.kind === 'DISCOUNT').length;
    const addTotal = validRows
      .filter((item) => item.kind === 'ADD')
      .reduce((sum, item) => sum + item.amountKrw, 0);
    const discountTotal = validRows
      .filter((item) => item.kind === 'DISCOUNT')
      .reduce((sum, item) => sum + item.amountKrw, 0);

    return { addCount, discountCount, addTotal, discountTotal };
  }, [manualAdjustments]);

  const normalizedManualDepositAmountKrw = useMemo(() => {
    if (!hasEditedManualDeposit) {
      return undefined;
    }

    const text = manualDepositInput.trim();
    if (text.length === 0) {
      return undefined;
    }

    const value = Number(text);
    if (!Number.isInteger(value) || value < 0) {
      return undefined;
    }

    return value;
  }, [hasEditedManualDeposit, manualDepositInput]);

  const draftExternalPickupText = useMemo(
    () => buildExternalTransferDirectionText(externalTransfersDraft, transportGroups, 'PICKUP'),
    [externalTransfersDraft, transportGroups],
  );
  const draftExternalDropText = useMemo(
    () => buildExternalTransferDirectionText(externalTransfersDraft, transportGroups, 'DROP'),
    [externalTransfersDraft, transportGroups],
  );

  const headcountFemale = headcountTotal - headcountMale;
  const applyHeadcountTotalChange = (nextTotal: number): void => {
    const previousTotal = headcountTotal;
    setRentalItemsText((currentText) => {
      if (!includeRentalItems) {
        return currentText;
      }
      const prevDefault = buildDefaultRentalItems(previousTotal);
      if (currentText.trim() === prevDefault.trim()) {
        return buildDefaultRentalItems(nextTotal);
      }
      return currentText;
    });
    setHeadcountTotal(nextTotal);
    setHeadcountMale((current) =>
      hasEditedHeadcountMaleRef.current
        ? Math.min(current, nextTotal)
        : buildDefaultMaleHeadcount(nextTotal),
    );
  };

  const handleConsultationApply = useCallback(
    (draft: ConsultationDraft) => {
      setLeaderName(draft.leaderName);
      applyHeadcountTotalChange(Math.max(1, Math.min(30, draft.headcountTotal)));
      hasEditedHeadcountMaleRef.current = true;
      setHeadcountMale(Math.max(0, Math.min(draft.headcountMale, draft.headcountTotal)));
      const regionIdValue = draft.regionId ?? null;
      if (regionIdValue) {
        setRegionId(regionIdValue);
        setStartLocationId('');
        setStartLocationVersionId('');
        setSelectedRoute([]);
        dirtyPlanRowFieldKeysRef.current.clear();
        setPlanRows([]);
        setIsMultiDayBlockSectionOpen(false);
      }
      setTravelStartDate(draft.travelStartDate);
      setTravelEndDate(draft.travelEndDate);
      setTotalDays(Math.max(2, Math.min(12, draft.totalDays)));
      setSelectedRoute((prev) => trimRouteSelectionsToTotalDays(prev, draft.totalDays));
      const vehicle = draft.vehicleType && VEHICLES.includes(draft.vehicleType as (typeof VEHICLES)[number])
        ? (draft.vehicleType as (typeof VEHICLES)[number])
        : '스타렉스';
      setVehicleType(vehicle);
      setSpecialNote(draft.specialNote);
      setRemark(draft.remark);
      const primaryGroup = createTransportGroupDraft({
        index: 0,
        headcount: draft.headcountTotal,
        travelStartDate: draft.travelStartDate,
        travelEndDate: draft.travelEndDate,
        flightInTime: draft.flightInTime ?? '02:45',
        flightOutTime: draft.flightOutTime ?? '18:15',
      });
      setTransportGroups([
        {
          ...primaryGroup,
          flightInDate: draft.flightInDate ?? draft.travelStartDate ?? primaryGroup.flightInDate,
          flightOutDate: draft.flightOutDate ?? draft.travelEndDate ?? primaryGroup.flightOutDate,
          pickupDate: draft.travelStartDate || primaryGroup.pickupDate,
          dropDate: draft.travelEndDate || primaryGroup.dropDate,
        },
      ]);
      const recTemplateId = draft.recommendedTemplateId ?? null;
      if (recTemplateId) {
        setRoutePresetTemplateId(recTemplateId);
        pendingConsultationTemplateApplyIdRef.current = recTemplateId;
      } else {
        pendingConsultationTemplateApplyIdRef.current = null;
      }
    },
    [applyHeadcountTotalChange],
  );

  useEffect(() => {
    const id = pendingConsultationTemplateApplyIdRef.current;
    if (!id) {
      return;
    }
    const template = routePresetOptions.find((t) => t.id === id);
    if (!template) {
      return;
    }
    pendingConsultationTemplateApplyIdRef.current = null;
    applyTemplate(template, false);
  }, [routePresetOptions, applyTemplate]);

  const canPreviewPricing = useMemo(
    () =>
      Boolean(
        regionId &&
        travelStartDate &&
        !manualAdjustments.some((item) => {
          const d = item.description.trim();
          const a = item.amountKrw.trim();
          if (d.length === 0 && a.length === 0) return false;
          return (
            d.length === 0 ||
            a.length === 0 ||
            !Number.isInteger(Number(item.amountKrw)) ||
            Number(item.amountKrw) < 0
          );
        }) &&
        !lodgingSelections.some(
          (item) =>
            item.level === 'CUSTOM' &&
            (!item.customLodgingId || item.customLodgingId.trim().length === 0),
        ) &&
        !externalTransfers.some((t) => !isExternalTransferComplete(t)) &&
        (vehicleType !== '하이에이스' || headcountTotal >= 3),
      ),
    [
      regionId,
      travelStartDate,
      manualAdjustments,
      lodgingSelections,
      externalTransfers,
      vehicleType,
      headcountTotal,
    ],
  );

  const {
    data: pricingPreviewData,
    previousData: pricingPreviewPreviousData,
    error: pricingPreviewError,
  } = useQuery<{ planPricingPreview: PricingPreviewRow }>(PLAN_PRICING_PREVIEW_QUERY, {
    skip: !canPreviewPricing,
    variables: {
      input: {
        regionId,
        variantType,
        totalDays,
        planStops: pricingPreviewPlanStops,
        travelStartDate: toIsoDateTime(travelStartDate),
        headcountTotal,
        transportGroupCount: transportGroups.length,
        vehicleType,
        includeRentalItems,
        eventIds,
        extraLodgings,
        lodgingSelections,
        manualAdjustments: normalizedManualAdjustments,
        manualDepositAmountKrw: normalizedManualDepositAmountKrw,
      },
    },
  });

  const pricingPreview =
    pricingPreviewData?.planPricingPreview ??
    pricingPreviewPreviousData?.planPricingPreview ??
    null;

  const validationResults = useBuilderValidation({
    planRows,
    selectedRoute,
    startLocationId,
    filteredSegments,
    filteredOvernightStayConnections,
    transportGroups,
    headcountTotal,
    headcountMale,
    vehicleType,
    travelStartDate,
    travelEndDate,
    manualAdjustments,
    lodgingSelections,
    externalTransfers,
    hasEditedManualDeposit,
    manualDepositInput,
    pricingPreview,
  });
  const validationErrors = validationResults.filter((r) => r.severity === 'error');
  const hasValidation = (id: string) => validationResults.some((r) => r.id === id);

  const pricingBuckets = useMemo(
    () =>
      pricingPreview
        ? buildPricingViewBuckets(pricingPreview.lines, pricingPreview.totalAmountKrw)
        : null,
    [pricingPreview],
  );
  const pricingDisplayAddonLines = useMemo(
    () => (pricingBuckets ? mergeLodgingSelectionDisplayLines(pricingBuckets.addonLines) : []),
    [pricingBuckets],
  );
  const pricingPreviewErrorMessage =
    pricingPreviewError?.graphQLErrors?.[0]?.message ??
    pricingPreviewError?.message ??
    '금액 미리보기 계산 중 오류가 발생했습니다.';

  useEffect(() => {
    if (!pricingPreview || hasEditedManualDeposit) {
      return;
    }
    setManualDepositInput(String(pricingPreview.depositAmountKrw));
  }, [hasEditedManualDeposit, pricingPreview]);

  useEffect(() => {
    if (!isPreviewEnabled && activePane === 'preview') {
      setActivePane('builder');
    }
  }, [activePane, isPreviewEnabled]);

  const canCreate = Boolean(
    hasPlanContext &&
    regionId &&
    leaderName.trim() &&
    validationErrors.length === 0 &&
    (includeRentalItems ? rentalItemsText.trim() : true) &&
    startLocationId &&
    startLocationVersionId &&
    1 + getConsumedRouteDayCount(selectedRoute) === totalDays &&
    planRows.length === totalDays &&
    (!isVersionMode ? planTitle.trim() : true),
  );

  const effectivePlanTitle = isVersionMode && planContext ? planContext.title : planTitle;
  const selectedEventNames = useMemo(
    () =>
      eventOptions
        .filter((eventOption) => eventIds.includes(eventOption.id))
        .map((eventOption) => eventOption.name),
    [eventIds, eventOptions],
  );
  const previewRegionName = useMemo(
    () => regions.find((region) => region.id === regionId)?.name ?? '',
    [regionId, regions],
  );
  const normalizedTransportGroups = useMemo(
    () => transportGroups.map((group) => toEstimateTransportGroup(group)),
    [transportGroups],
  );
  const primaryTransportGroup = normalizedTransportGroups[0];
  const estimateDraftSnapshot = useMemo<EstimateBuilderDraftSnapshot>(
    () =>
      createEstimateDraftSnapshot({
        planTitle: effectivePlanTitle,
        leaderName: leaderName.trim(),
        regionName: previewRegionName,
        headcountTotal,
        headcountMale,
        headcountFemale,
        travelStartDate,
        travelEndDate,
        vehicleType,
        transportGroups: normalizedTransportGroups,
        externalTransfers,
        specialNote: specialNote.trim(),
        includeRentalItems,
        rentalItemsText: rentalItemsText.trim(),
        eventNames: selectedEventNames,
        remark: remark.trim(),
        planStops: mergedPlanStops,
        pricingPreview,
      }),
    [
      effectivePlanTitle,
      leaderName,
      previewRegionName,
      headcountTotal,
      headcountMale,
      headcountFemale,
      travelStartDate,
      travelEndDate,
      vehicleType,
      normalizedTransportGroups,
      externalTransfers,
      specialNote,
      includeRentalItems,
      rentalItemsText,
      selectedEventNames,
      remark,
      planRows,
      pricingPreview,
    ],
  );
  const { data: previewEstimateData, guidesLoading: previewGuidesLoading } =
    useBuilderEstimatePreview(estimateDraftSnapshot);
  const handlePreviewTransportGroupFieldChange: EstimatePage1Editor['onTransportGroupFieldChange'] =
    (index, field, value) => {
      updateTransportGroup(
        index,
        field as keyof TransportGroupDraft,
        value as TransportGroupDraft[keyof TransportGroupDraft],
      );
    };
  const previewPage1Editor: EstimatePage1Editor = {
    headcountTotal,
    headcountMale,
    travelStartDate,
    travelEndDate,
    vehicleType,
    vehicleOptions: VEHICLES,
    transportGroups: normalizedTransportGroups,
    eventIds,
    eventOptions: eventOptions.map((eventOption) => ({
      id: eventOption.id,
      name: eventOption.name,
    })),
    specialNoteText: specialNote,
    rentalItemsText,
    remarkText: remark,
    onHeadcountTotalChange: (value) => {
      const nextTotal = Math.max(1, value || 1);
      applyHeadcountTotalChange(nextTotal);
    },
    onHeadcountMaleChange: (value) => {
      hasEditedHeadcountMaleRef.current = true;
      const nextMale = Math.max(0, Math.min(value, headcountTotal));
      setHeadcountMale(nextMale);
    },
    onTravelStartDateChange: setTravelStartDate,
    onTravelEndDateChange: setTravelEndDate,
    onVehicleTypeChange: (value) => {
      if (VEHICLES.includes(value as (typeof VEHICLES)[number])) {
        setVehicleType(value as (typeof VEHICLES)[number]);
      }
    },
    onTransportGroupFieldChange: handlePreviewTransportGroupFieldChange,
    onAddTransportGroup: () => {
      setTransportGroups((current) => {
        const next = buildTransportGroupsAfterAddTeam(current, headcountTotal, travelStartDate, travelEndDate);
        if (!next) {
          window.alert('전체 인원은 팀 수 이상이어야 합니다. 인원을 늘리거나 팀을 줄여 주세요.');
          return current;
        }
        return next;
      });
    },
    onRemoveTransportGroup: (index) =>
      setTransportGroups((current) =>
        current.length <= 1 ? current : current.filter((_, groupIndex) => groupIndex !== index),
      ),
    onToggleEventId: (value) =>
      setEventIds((current) =>
        current.includes(value) ? current.filter((id) => id !== value) : [...current, value],
      ),
    onSpecialNoteTextChange: setSpecialNote,
    onRentalItemsTextChange: (value) => {
      setIncludeRentalItems(true);
      setRentalItemsText(value);
    },
    onRemarkTextChange: setRemark,
  };

  const openEstimatePdf = (): void => {
    const draftKey = `estimate-draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify(estimateDraftSnapshot));
    } catch (_error) {
      window.alert('견적서 임시 데이터를 저장할 수 없습니다. 브라우저 저장공간을 확인해주세요.');
      return;
    }

    window.open(
      `/documents/estimate?mode=draft&draftKey=${encodeURIComponent(draftKey)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  if (!hasValidContext) {
    return (
      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">시작하기</h1>
          <p className="mt-1 text-sm text-slate-600">
            아래에서 고객 유형을 선택하면 다음 단계가 열립니다.
          </p>
        </header>

        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">고객 유형 선택</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setHomeEntryMode('new')}
              className={`min-h-[260px] rounded-2xl border p-6 text-left transition ${
                homeEntryMode === 'new'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-primary-500 hover:bg-primary-50'
              }`}
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="text-lg font-semibold">신규 고객</p>
                  <p
                    className={`mt-2 text-sm ${homeEntryMode === 'new' ? 'text-slate-100' : 'text-slate-600'}`}
                  >
                    고객을 새로 생성하고 일정 제작을 시작합니다.
                  </p>
                </div>
                <div
                  className={`text-xs font-medium ${homeEntryMode === 'new' ? 'text-slate-100' : 'text-slate-500'}`}
                >
                  선택
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="min-h-[260px] rounded-2xl border border-slate-200 bg-white p-6 text-left text-slate-900 transition hover:border-primary-500 hover:bg-primary-50"
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="text-lg font-semibold">기존 고객</p>
                  <p className="mt-2 text-sm text-slate-600">
                    고객 페이지로 이동해 기존 고객을 선택합니다.
                  </p>
                </div>
                <div className="text-xs font-medium text-slate-500">고객 페이지로 이동</div>
              </div>
            </button>
          </div>
        </Card>

        {homeEntryMode === 'new' ? (
          <>
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">1. 고객 생성</h2>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => navigate('/customers')}>
                      고객 목록
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setIsCreateUserModalOpen(true);
                        setHomeNewUserName('');
                        setHomeCreateUserError('');
                      }}
                    >
                      고객 생성
                    </Button>
                  </div>
                </div>
                {homeSelectedUserId ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    선택됨: {homeSelectedUserName || homeSelectedUserId}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">먼저 고객을 생성해 주세요.</p>
                )}
              </div>
            </Card>

            <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-3">
                <h2 className="text-sm font-semibold text-slate-900">2. 방법 선택</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900">빈 페이지 선택</h3>
                    <div className="mt-3">
                      <Button
                        disabled={!homeSelectedUserId}
                        onClick={() =>
                          navigate(
                            `/itinerary-builder?userId=${encodeURIComponent(homeSelectedUserId)}`,
                          )
                        }
                      >
                        빈 페이지로 시작
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900">템플릿에서 선택</h3>

                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-1 text-sm">
                        <span className="text-xs text-slate-600">지역</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setHomeTemplateRegionId('')}
                            className={`rounded-xl border px-3 py-1.5 text-sm ${
                              homeTemplateRegionId === ''
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            전체
                          </button>
                          {regions.map((region) => (
                            <button
                              key={`home-template-region-${region.id}`}
                              type="button"
                              onClick={() => setHomeTemplateRegionId(region.id)}
                              className={`rounded-xl border px-3 py-1.5 text-sm ${
                                homeTemplateRegionId === region.id
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {region.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-1 text-sm">
                        <span className="text-xs text-slate-600">일수</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setHomeTemplateTotalDays(0)}
                            className={`rounded-xl border px-3 py-1.5 text-sm ${
                              homeTemplateTotalDays === 0
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            전체
                          </button>
                          {Array.from({ length: 12 }, (_, idx) => idx + 2).map((day) => (
                            <button
                              key={`home-template-day-${day}`}
                              type="button"
                              onClick={() => setHomeTemplateTotalDays(day)}
                              className={`rounded-xl border px-3 py-1.5 text-sm ${
                                homeTemplateTotalDays === day
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {day}일
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 max-h-48 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
                      <p className="px-1 text-xs text-slate-500">
                        총 {homeTemplateOptions.length}개의 템플릿
                      </p>
                      {homeTemplateOptions.map((template) => (
                        <div
                          key={`home-template-${template.id}`}
                          className={`flex items-center justify-between rounded-lg border px-2 py-1.5 ${
                            homeSelectedTemplateId === template.id
                              ? 'border-slate-900 bg-slate-100'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="text-xs text-slate-700">
                            <div className="font-medium text-slate-900">{template.name}</div>
                            <div>
                              {template.totalDays}일 · {template.isActive ? '활성' : '비활성'}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setHomeSelectedTemplateId(template.id)}
                          >
                            선택
                          </Button>
                        </div>
                      ))}
                      {homeTemplateOptions.length === 0 ? (
                        <p className="px-1 py-2 text-xs text-slate-500">
                          선택한 조건에 맞는 템플릿이 없습니다.
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <Button
                        disabled={!homeSelectedUserId || !homeSelectedTemplateId}
                        onClick={() =>
                          navigate(
                            `/itinerary-builder?userId=${encodeURIComponent(homeSelectedUserId)}&templateId=${encodeURIComponent(homeSelectedTemplateId)}`,
                          )
                        }
                      >
                        템플릿으로 시작
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </>
        ) : null}

        {isCreateUserModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <Card className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">고객 생성</h3>
              <p className="mt-1 text-sm text-slate-600">
                새 고객을 등록하면 바로 신규 고객 시작에 사용됩니다.
              </p>

              <div className="mt-4 grid gap-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-slate-600">고객명</span>
                  <input
                    value={homeNewUserName}
                    onChange={(event) => setHomeNewUserName(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="고객명 입력"
                  />
                </label>
                {homeCreateUserError ? (
                  <p className="text-xs text-rose-700">{homeCreateUserError}</p>
                ) : null}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateUserModalOpen(false);
                    setHomeCreateUserError('');
                  }}
                >
                  취소
                </Button>
                <Button
                  disabled={!homeNewUserName.trim() || creatingUser}
                  onClick={async () => {
                    const trimmedName = homeNewUserName.trim();
                    if (!trimmedName) {
                      return;
                    }

                    try {
                      const result = await createUser({
                        variables: {
                          input: {
                            name: trimmedName,
                            ownerEmployeeId: employee?.id ?? null,
                          },
                        },
                      });
                      const createdUserId = result.data?.createUser.id ?? '';
                      const createdUserName = result.data?.createUser.name ?? '';
                      if (createdUserId) {
                        setHomeSelectedUserId(createdUserId);
                        setHomeSelectedUserName(createdUserName);
                        setHomeEntryMode('new');
                      }
                      setHomeNewUserName('');
                      setHomeCreateUserError('');
                      setIsCreateUserModalOpen(false);
                    } catch (error) {
                      const message =
                        error instanceof Error ? error.message : '고객 생성에 실패했습니다.';
                      setHomeCreateUserError(message);
                    }
                  }}
                >
                  {creatingUser ? '생성 중...' : '생성'}
                </Button>
              </div>
            </Card>
          </div>
        ) : null}
      </section>
    );
  }

  if (isVersionMode && planContext && planContext.userId !== userId) {
    return (
      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-8">
        <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <h1 className="text-xl font-semibold text-rose-900">유효하지 않은 요청입니다</h1>
          <p className="mt-2 text-sm text-rose-800">선택한 Plan과 userId가 일치하지 않습니다.</p>
          <div className="mt-4">
            <Button onClick={() => navigate('/customers')}>고객 목록으로 이동</Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <div
      className={`min-h-screen text-slate-900 ${isPreviewEnabled ? 'lg:h-screen lg:min-h-0' : ''}`}
    >
      <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          {isPreviewEnabled ? (
            <div className="grid flex-1 grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActivePane('builder')}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  activePane === 'builder' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                빌더
              </button>
              <button
                type="button"
                onClick={() => setActivePane('preview')}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  activePane === 'preview' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                미리보기
              </button>
            </div>
          ) : (
            <div className="flex-1 text-sm font-medium text-slate-700">빌더 전용 보기</div>
          )}
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => setIsPreviewEnabled((prev) => !prev)}
          >
            {isPreviewEnabled ? '미리보기 끄기' : '미리보기 켜기'}
          </Button>
        </div>
      </div>

      <div className={isPreviewEnabled ? 'lg:grid lg:h-full lg:grid-cols-2' : ''}>
        <div
          className={`${
            !isPreviewEnabled || activePane === 'builder' ? 'block' : 'hidden'
          } bg-slate-50 ${
            isPreviewEnabled
              ? 'border-b border-slate-200 lg:block lg:h-full lg:overflow-y-auto lg:border-b-0 lg:border-r'
              : ''
          }`}
        >
          <div
            className={`space-y-6 px-4 py-4 sm:px-6 lg:py-6 ${
              isPreviewEnabled ? 'lg:px-8' : 'mx-auto max-w-7xl lg:px-6'
            }`}
          >
            <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">여행 일정 빌더</h1>
              </div>
              <div className="flex gap-2 no-print">
                <Button variant="outline" onClick={() => setIsPreviewEnabled((prev) => !prev)}>
                  {isPreviewEnabled ? '미리보기 끄기' : '미리보기 켜기'}
                </Button>
                <Button variant="outline" onClick={openEstimatePdf}>
                  견적서 PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    dirtyPlanRowFieldKeysRef.current.clear();
                    setPlanRows(autoRows);
                  }}
                >
                  자동값 다시 채우기
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsConsultationPasteModalOpen(true)}
                  className="border-violet-600 bg-violet-600 font-medium text-white shadow-sm hover:border-violet-700 hover:bg-violet-700"
                >
                  상담 붙여넣기
                </Button>
                <Button
                  variant="primary"
                  disabled={!canCreate || creating}
                  onClick={async () => {
                    if (!canCreate) {
                      return;
                    }

                    if (isVersionMode) {
                      const result = await createPlanVersion({
                        variables: {
                          input: {
                            planId,
                            parentVersionId,
                            variantType,
                            totalDays,
                            changeNote: changeNote.trim() || undefined,
                            meta: {
                              leaderName: leaderName.trim(),
                              travelStartDate: toIsoDateTime(travelStartDate),
                              travelEndDate: toIsoDateTime(travelEndDate),
                              headcountTotal,
                              headcountMale,
                              headcountFemale,
                              vehicleType,
                              flightInTime: primaryTransportGroup?.flightInTime ?? '02:45',
                              flightOutTime: primaryTransportGroup?.flightOutTime ?? '18:15',
                              pickupDate: primaryTransportGroup?.pickupDate
                                ? toIsoDateTime(primaryTransportGroup.pickupDate)
                                : undefined,
                              pickupTime: primaryTransportGroup?.pickupTime.trim() || undefined,
                              dropDate: primaryTransportGroup?.dropDate
                                ? toIsoDateTime(primaryTransportGroup.dropDate)
                                : undefined,
                              dropTime: primaryTransportGroup?.dropTime.trim() || undefined,
                              pickupPlaceType:
                                primaryTransportGroup?.pickupPlaceType ??
                                DEFAULT_PICKUP_DROP_PLACE_TYPE,
                              pickupPlaceCustomText: normalizePickupDropCustomText(
                                primaryTransportGroup?.pickupPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                primaryTransportGroup?.pickupPlaceCustomText,
                              ),
                              dropPlaceType:
                                primaryTransportGroup?.dropPlaceType ??
                                DEFAULT_PICKUP_DROP_PLACE_TYPE,
                              dropPlaceCustomText: normalizePickupDropCustomText(
                                primaryTransportGroup?.dropPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                primaryTransportGroup?.dropPlaceCustomText,
                              ),
                              pickupDropNote: undefined,
                              externalPickupDropNote: undefined,
                              externalTransfers: externalTransfers.map((transfer) => ({
                                ...transfer,
                                travelDate: toIsoDateTime(transfer.travelDate),
                              })),
                              specialNote: specialNote.trim() || undefined,
                              includeRentalItems,
                              rentalItemsText,
                              eventIds,
                              extraLodgings,
                              lodgingSelections,
                              transportGroups: normalizedTransportGroups.map((group) => ({
                                teamName: group.teamName.trim(),
                                headcount: group.headcount,
                                flightInDate: toIsoDateTime(group.flightInDate),
                                flightInTime: group.flightInTime.trim(),
                                flightOutDate: toIsoDateTime(group.flightOutDate),
                                flightOutTime: group.flightOutTime.trim(),
                                pickupDate: group.pickupDate
                                  ? toIsoDateTime(group.pickupDate)
                                  : undefined,
                                pickupTime: group.pickupTime.trim() || undefined,
                                pickupPlaceType: group.pickupPlaceType,
                                pickupPlaceCustomText: normalizePickupDropCustomText(
                                  group.pickupPlaceType,
                                  group.pickupPlaceCustomText,
                                ),
                                dropDate: group.dropDate
                                  ? toIsoDateTime(group.dropDate)
                                  : undefined,
                                dropTime: group.dropTime.trim() || undefined,
                                dropPlaceType: group.dropPlaceType,
                                dropPlaceCustomText: normalizePickupDropCustomText(
                                  group.dropPlaceType,
                                  group.dropPlaceCustomText,
                                ),
                              })),
                              remark: remark.trim() || undefined,
                            },
                            planStops: mergedPlanStops,
                            manualAdjustments: normalizedManualAdjustments,
                            manualDepositAmountKrw: normalizedManualDepositAmountKrw,
                          },
                        },
                      });

                      const createdVersionId = result.data?.createPlanVersion.id ?? '';
                      setCreatedId(createdVersionId);
                      if (createdVersionId) {
                        navigate(`/plans/${planId}/versions/${createdVersionId}`);
                      }
                      return;
                    }

                    const result = await createPlan({
                      variables: {
                        input: {
                          userId,
                          regionId,
                          title: planTitle,
                          initialVersion: {
                            variantType,
                            totalDays,
                            changeNote: undefined,
                            meta: {
                              leaderName: leaderName.trim(),
                              travelStartDate: toIsoDateTime(travelStartDate),
                              travelEndDate: toIsoDateTime(travelEndDate),
                              headcountTotal,
                              headcountMale,
                              headcountFemale,
                              vehicleType,
                              flightInTime: primaryTransportGroup?.flightInTime ?? '02:45',
                              flightOutTime: primaryTransportGroup?.flightOutTime ?? '18:15',
                              pickupDate: primaryTransportGroup?.pickupDate
                                ? toIsoDateTime(primaryTransportGroup.pickupDate)
                                : undefined,
                              pickupTime: primaryTransportGroup?.pickupTime.trim() || undefined,
                              dropDate: primaryTransportGroup?.dropDate
                                ? toIsoDateTime(primaryTransportGroup.dropDate)
                                : undefined,
                              dropTime: primaryTransportGroup?.dropTime.trim() || undefined,
                              pickupPlaceType:
                                primaryTransportGroup?.pickupPlaceType ??
                                DEFAULT_PICKUP_DROP_PLACE_TYPE,
                              pickupPlaceCustomText: normalizePickupDropCustomText(
                                primaryTransportGroup?.pickupPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                primaryTransportGroup?.pickupPlaceCustomText,
                              ),
                              dropPlaceType:
                                primaryTransportGroup?.dropPlaceType ??
                                DEFAULT_PICKUP_DROP_PLACE_TYPE,
                              dropPlaceCustomText: normalizePickupDropCustomText(
                                primaryTransportGroup?.dropPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                primaryTransportGroup?.dropPlaceCustomText,
                              ),
                              pickupDropNote: undefined,
                              externalPickupDropNote: undefined,
                              externalTransfers: externalTransfers.map((transfer) => ({
                                ...transfer,
                                travelDate: toIsoDateTime(transfer.travelDate),
                              })),
                              specialNote: specialNote.trim() || undefined,
                              includeRentalItems,
                              rentalItemsText,
                              eventIds,
                              extraLodgings,
                              lodgingSelections,
                              transportGroups: normalizedTransportGroups.map((group) => ({
                                teamName: group.teamName.trim(),
                                headcount: group.headcount,
                                flightInDate: toIsoDateTime(group.flightInDate),
                                flightInTime: group.flightInTime.trim(),
                                flightOutDate: toIsoDateTime(group.flightOutDate),
                                flightOutTime: group.flightOutTime.trim(),
                                pickupDate: group.pickupDate
                                  ? toIsoDateTime(group.pickupDate)
                                  : undefined,
                                pickupTime: group.pickupTime.trim() || undefined,
                                pickupPlaceType: group.pickupPlaceType,
                                pickupPlaceCustomText: normalizePickupDropCustomText(
                                  group.pickupPlaceType,
                                  group.pickupPlaceCustomText,
                                ),
                                dropDate: group.dropDate
                                  ? toIsoDateTime(group.dropDate)
                                  : undefined,
                                dropTime: group.dropTime.trim() || undefined,
                                dropPlaceType: group.dropPlaceType,
                                dropPlaceCustomText: normalizePickupDropCustomText(
                                  group.dropPlaceType,
                                  group.dropPlaceCustomText,
                                ),
                              })),
                              remark: remark.trim() || undefined,
                            },
                            planStops: mergedPlanStops,
                            manualAdjustments: normalizedManualAdjustments,
                            manualDepositAmountKrw: normalizedManualDepositAmountKrw,
                          },
                        },
                      },
                    });

                    const createdPlanId = result.data?.createPlan.id ?? '';
                    setCreatedId(createdPlanId);
                    if (createdPlanId) {
                      navigate(`/plans/${createdPlanId}`);
                    }
                  }}
                >
                  {creating ? '저장 중...' : isVersionMode ? '새 버전 생성' : 'Plan 생성'}
                </Button>
              </div>
            </header>

            {createdId ? (
              <Card>
                <p className="text-sm text-emerald-700">생성 완료: {createdId}</p>
              </Card>
            ) : null}

            {isTemplateOnlyMode ? (
              <Card className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                템플릿으로 진입한 상태입니다. Plan 생성은 고객 컨텍스트에서만 가능합니다.
              </Card>
            ) : null}

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    1
                  </span>
                  <span>기본정보</span>
                </h2>
                <div className="mt-4 grid gap-4 [&>*+*]:border-t [&>*+*]:border-slate-200 [&>*+*]:pt-4">
                  {isVersionMode ? (
                    <label className="grid gap-1 text-sm">
                      <span className="text-xs text-slate-600">변경 메모</span>
                      <input
                        value={changeNote}
                        onChange={(event) => setChangeNote(event.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        placeholder="예: 숙소 동선 개선"
                      />
                    </label>
                  ) : null}

                  <label className="grid gap-1 text-sm">
                    <span className="text-xs text-slate-600">대표자명</span>
                    <input
                      value={leaderName}
                      readOnly
                      disabled
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                      placeholder="고객명을 기준으로 자동 반영"
                    />
                  </label>

                  {!isVersionMode && hasPlanContext ? (
                    <label className="grid gap-1 text-sm">
                      <span className="text-xs text-slate-600">
                        제목 <span className="ml-1 text-slate-400">*우리끼리 구분용</span>
                      </span>
                      <input
                        value={planTitle}
                        onChange={(event) => setPlanTitle(event.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        placeholder={buildDefaultPlanTitle(leaderName)}
                      />
                    </label>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-1 text-sm">
                      <span className="text-xs text-slate-600">지역</span>
                      <div className="flex flex-wrap content-start items-start gap-2">
                        {regions.map((region) => {
                          const disabled = isVersionMode && planContext?.regionId !== region.id;
                          return (
                            <button
                              key={region.id}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                setRegionId(region.id);
                                setStartLocationId('');
                                setStartLocationVersionId('');
                                setSelectedRoute([]);
                                dirtyPlanRowFieldKeysRef.current.clear();
                                setPlanRows([]);
                                setIsMultiDayBlockSectionOpen(false);
                              }}
                              className={`rounded-xl border px-3 py-1.5 text-sm ${
                                regionId === region.id
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                            >
                              {region.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm">
                      <span className="text-xs text-slate-600">인원</span>
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              const nextTotal = Math.max(1, headcountTotal - 1);
                              applyHeadcountTotalChange(nextTotal);
                            }}
                            disabled={headcountTotal <= 1}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="인원 감소"
                          >
                            -
                          </button>
                          <div className="min-w-0 flex-1 text-center text-base font-semibold text-slate-900">
                            {headcountTotal}명
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const nextTotal = Math.min(30, headcountTotal + 1);
                              applyHeadcountTotalChange(nextTotal);
                            }}
                            disabled={headcountTotal >= 30}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="인원 증가"
                          >
                            +
                          </button>
                        </div>
                        <div className="grid gap-2 pt-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-slate-600">성비 조절</div>
                            <label className="flex items-center gap-2 text-xs text-slate-600">
                              <input
                                type="checkbox"
                                checked={headcountMale === 0}
                                onChange={(event) => {
                                  hasEditedHeadcountMaleRef.current = true;
                                  if (event.target.checked) {
                                    setHeadcountMale(0);
                                    return;
                                  }
                                  setHeadcountMale((prev) => (prev === 0 ? 1 : prev));
                                }}
                              />
                              남성없음
                            </label>
                          </div>
                          <div className="flex w-full flex-wrap gap-1">
                            {Array.from({ length: headcountTotal }, (_, index) => {
                              const count = index + 1;
                              const isMaleToken = count <= headcountMale;
                              return (
                                <button
                                  key={`male-token-${count}`}
                                  type="button"
                                  onClick={() => {
                                    hasEditedHeadcountMaleRef.current = true;
                                    setHeadcountMale(count);
                                  }}
                                  className={`h-7 w-7 rounded-full border text-xs ${
                                    isMaleToken
                                      ? 'border-blue-700 bg-blue-600 text-white'
                                      : 'border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100'
                                  }`}
                                  title={
                                    isMaleToken ? `남 ${count}` : `여 ${count - headcountMale}`
                                  }
                                >
                                  {count}
                                </button>
                              );
                            })}
                          </div>
                          <div className="text-xs text-slate-600">
                            남 {headcountMale} / 여 {headcountFemale}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-1 text-sm">
                    <span className="text-xs text-slate-600">일수</span>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 12 }, (_, idx) => idx + 2).map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setTotalDays(day);
                            setSelectedRoute((prev) => trimRouteSelectionsToTotalDays(prev, day));
                            setIsMultiDayBlockSectionOpen(false);
                          }}
                          className={`rounded-xl border px-3 py-1.5 text-sm ${
                            totalDays === day
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {day}일
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2 text-sm">
                      <span className="text-xs text-slate-600">여행 기간</span>
                      <div className="grid gap-2">
                        <DateInputTrigger
                          value={travelStartDate}
                          placeholder="시작일 선택"
                          onClick={(event) =>
                            setDatePickerTarget({
                              kind: 'travelStartDate',
                              anchorEl: event.currentTarget,
                            })
                          }
                        />
                        <DateInputTrigger
                          value={travelEndDate}
                          placeholder="종료일 선택"
                          onClick={(event) =>
                            setDatePickerTarget({
                              kind: 'travelEndDate',
                              anchorEl: event.currentTarget,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-1 text-sm">
                      <span className="text-xs text-slate-600">차량</span>
                      <div className="flex flex-wrap gap-2">
                        {VEHICLES.map((vehicle) => (
                          <button
                            key={vehicle}
                            type="button"
                            onClick={() => {
                              if (vehicle === '하이에이스' && headcountTotal < 3) {
                                return;
                              }
                              setVehicleType(vehicle);
                            }}
                            disabled={vehicle === '하이에이스' && headcountTotal < 3}
                            className={`rounded-xl border px-3 py-1.5 text-sm ${
                              vehicleType === vehicle
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            } ${vehicle === '하이에이스' && headcountTotal < 3 ? 'cursor-not-allowed opacity-40' : ''}`}
                          >
                            {vehicle}
                          </button>
                        ))}
                      </div>
                      {hasValidation('hiace-headcount') ? (
                        <p className="text-xs text-rose-700">
                          하이에이스는 3인 이상부터 선택 가능하며, 7인 이상은 추가금이 없습니다.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">기본 대여물품</span>
                        <Button
                          variant="outline"
                          disabled={!includeRentalItems}
                          onClick={() =>
                            setRentalItemsText(buildDefaultRentalItems(headcountTotal))
                          }
                        >
                          초기화
                        </Button>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={includeRentalItems}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setIncludeRentalItems(checked);
                            if (!checked) {
                              setRentalItemsText('');
                            }
                          }}
                        />
                        기본 물품 포함
                      </label>
                      <textarea
                        value={rentalItemsText}
                        onChange={(event) => setRentalItemsText(event.target.value)}
                        rows={4}
                        disabled={!includeRentalItems}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid gap-1 text-sm">
                      <span className="text-xs text-slate-600">참여 이벤트</span>
                      <div className="flex flex-wrap gap-2">
                        {eventOptions.map((eventOption) => {
                          const active = eventIds.includes(eventOption.id);
                          return (
                            <button
                              key={eventOption.id}
                              type="button"
                              onClick={() =>
                                setEventIds((prev) =>
                                  prev.includes(eventOption.id)
                                    ? prev.filter((item) => item !== eventOption.id)
                                    : [...prev, eventOption.id],
                                )
                              }
                              className={`rounded-xl border px-3 py-1.5 text-sm ${
                                active
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {eventOption.name}
                            </button>
                          );
                        })}
                        {eventOptions.length === 0 ? (
                          <span className="text-xs text-slate-500">진행중 이벤트 없음</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <label className="grid gap-1 text-sm">
                    <span className="text-xs text-slate-600">
                      비고 <span className="ml-1 text-slate-400">*고객에게 노출됩니다</span>
                    </span>
                    <textarea
                      value={remark}
                      onChange={(event) => setRemark(event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="grid gap-1 text-sm">
                    <span className="text-xs text-slate-600">Variant</span>
                    <div className="flex flex-wrap gap-2">
                      {VARIANTS.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => setVariantType(variant.id)}
                          className={`rounded-xl border px-3 py-1.5 text-sm ${
                            variantType === variant.id
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {variant.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    2
                  </span>
                  <span>항공 및 이동</span>
                </h2>
                <div className="mt-5 grid gap-5 [&>*+*]:border-t [&>*+*]:border-slate-200 [&>*+*]:pt-5">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-600">팀별 항공 / 픽업 / 드랍</span>
                    </div>

                    <div className="grid gap-4">
                      {transportGroups.map((group, index) => (
                        <div
                          key={`transport-group-${index}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div>
                              {transportGroups.length > 1 ? (
                                <p className="text-sm font-semibold text-slate-900">
                                  {group.teamName || `${index + 1}번 팀`}
                                </p>
                              ) : null}
                            </div>
                            {transportGroups.length > 1 ? (
                              <Button
                                variant="outline"
                                disabled={transportGroups.length <= 1}
                                onClick={() =>
                                  setTransportGroups((current) =>
                                    current.length <= 1
                                      ? current
                                      : current.filter((_, groupIndex) => groupIndex !== index),
                                  )
                                }
                              >
                                삭제
                              </Button>
                            ) : null}
                          </div>

                          <div className="grid gap-3">
                            {transportGroups.length > 1 ? (
                              <div className="grid gap-2 md:grid-cols-2">
                                <label className="grid gap-1">
                                  <span className="text-xs text-slate-600">팀명</span>
                                  <input
                                    value={group.teamName}
                                    onChange={(event) =>
                                      updateTransportGroup(index, 'teamName', event.target.value)
                                    }
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                  />
                                </label>
                                <div className="grid gap-1">
                                  <span className="text-xs text-slate-600">인원</span>
                                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateTransportGroup(index, 'headcount', group.headcount - 1)
                                      }
                                      disabled={group.headcount <= 1}
                                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                      aria-label={`${group.teamName || `${index + 1}번 팀`} 인원 감소`}
                                    >
                                      -
                                    </button>
                                    <div className="min-w-0 flex-1 text-center text-base font-semibold text-slate-900">
                                      {group.headcount}명
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateTransportGroup(index, 'headcount', group.headcount + 1)
                                      }
                                      disabled={
                                        group.headcount >=
                                        headcountTotal - (transportGroups.length - 1)
                                      }
                                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                      aria-label={`${group.teamName || `${index + 1}번 팀`} 인원 증가`}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {!travelStartDate && !travelEndDate ? (
                              <p className="px-1 text-center text-xs font-medium text-emerald-700">
                                여행 기간을 먼저 선택해주면 자동으로 세팅돼요^^
                              </p>
                            ) : null}

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="grid gap-2">
                                <span className="text-xs text-slate-600">항공권 IN</span>
                                <div className="grid gap-2">
                                  <DateInputTrigger
                                    value={group.flightInDate}
                                    onClick={(event) =>
                                      setDatePickerTarget({
                                        kind: 'flightInDate',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <TimeInputTrigger
                                    value={group.flightInTime}
                                    onClick={(event) =>
                                      setTimePickerTarget({
                                        kind: 'flightInTime',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    {FLIGHT_IN_TIME_OPTIONS.map((time) => (
                                      <button
                                        key={`builder-flight-in-${index}-${time}`}
                                        type="button"
                                        onClick={() =>
                                          updateTransportGroup(index, 'flightInTime', time)
                                        }
                                        className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                                          group.flightInTime === time
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        {time}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="grid gap-2">
                                <span className="text-xs text-slate-600">항공권 OUT</span>
                                <div className="grid gap-2">
                                  <DateInputTrigger
                                    value={group.flightOutDate}
                                    onClick={(event) =>
                                      setDatePickerTarget({
                                        kind: 'flightOutDate',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <TimeInputTrigger
                                    value={group.flightOutTime}
                                    onClick={(event) =>
                                      setTimePickerTarget({
                                        kind: 'flightOutTime',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    {FLIGHT_OUT_TIME_OPTIONS.map((time) => (
                                      <button
                                        key={`builder-flight-out-${index}-${time}`}
                                        type="button"
                                        onClick={() =>
                                          updateTransportGroup(index, 'flightOutTime', time)
                                        }
                                        className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                                          group.flightOutTime === time
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        {time}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2">
                              <div className="grid gap-2">
                                <span className="text-xs text-slate-600">픽업</span>
                                <div className="grid gap-2">
                                  <DateInputTrigger
                                    value={group.pickupDate}
                                    onClick={(event) =>
                                      setDatePickerTarget({
                                        kind: 'pickupDate',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <TimeInputTrigger
                                    value={group.pickupTime}
                                    onClick={(event) =>
                                      setTimePickerTarget({
                                        kind: 'pickupTime',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    {PICKUP_DROP_TIME_OPTIONS.map((time) => (
                                      <button
                                        key={`builder-pickup-${index}-${time}`}
                                        type="button"
                                        onClick={() =>
                                          updateTransportGroup(index, 'pickupTime', time)
                                        }
                                        className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                                          group.pickupTime === time
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        {time}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <PlaceField
                                  label="픽업 장소"
                                  placeType={group.pickupPlaceType}
                                  customText={group.pickupPlaceCustomText}
                                  onPlaceTypeChange={(value) =>
                                    updateTransportGroup(index, 'pickupPlaceType', value)
                                  }
                                  onCustomTextChange={(value) =>
                                    updateTransportGroup(index, 'pickupPlaceCustomText', value)
                                  }
                                />
                              </div>

                              <div className="grid gap-2">
                                <span className="text-xs text-slate-600">드랍</span>
                                <div className="grid gap-2">
                                  <DateInputTrigger
                                    value={group.dropDate}
                                    onClick={(event) =>
                                      setDatePickerTarget({
                                        kind: 'dropDate',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <TimeInputTrigger
                                    value={group.dropTime}
                                    onClick={(event) =>
                                      setTimePickerTarget({
                                        kind: 'dropTime',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    {PICKUP_DROP_TIME_OPTIONS.map((time) => (
                                      <button
                                        key={`builder-drop-${index}-${time}`}
                                        type="button"
                                        onClick={() =>
                                          updateTransportGroup(index, 'dropTime', time)
                                        }
                                        className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                                          group.dropTime === time
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        {time}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <PlaceField
                                  label="드랍 장소"
                                  placeType={group.dropPlaceType}
                                  customText={group.dropPlaceCustomText}
                                  onPlaceTypeChange={(value) =>
                                    updateTransportGroup(index, 'dropPlaceType', value)
                                  }
                                  onCustomTextChange={(value) =>
                                    updateTransportGroup(index, 'dropPlaceCustomText', value)
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="pt-1">
                        <button
                          type="button"
                          disabled={transportGroups.length >= headcountTotal}
                          title={
                            transportGroups.length >= headcountTotal
                              ? '팀당 최소 1명이므로, 더 추가하려면 전체 인원을 늘려 주세요.'
                              : undefined
                          }
                          onClick={() => {
                            setTransportGroups((current) => {
                              const next = buildTransportGroupsAfterAddTeam(
                                current,
                                headcountTotal,
                                travelStartDate,
                                travelEndDate,
                              );
                              if (!next) {
                                window.alert(
                                  '전체 인원은 팀 수 이상이어야 합니다. 인원을 늘리거나 팀을 줄여 주세요.',
                                );
                                return current;
                              }
                              return next;
                            });
                          }}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          + 팀 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm">
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="min-w-0 w-1/2">
                        <span className="text-xs text-slate-600">실투어 외 픽업 / 드랍</span>
                        <p className="mt-1 text-xs text-slate-400">
                          외부 이동 항목 추가, 수정, 삭제를 모달에서 관리합니다.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {externalTransfers.length === 0
                            ? '아직 추가된 외부 이동 항목이 없습니다.'
                            : `${externalTransfers.length}건 · 픽업 ${externalTransfers.filter((item) => item.direction === 'PICKUP').length}건 · 드랍 ${
                                externalTransfers.filter((item) => item.direction === 'DROP').length
                              }건`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => {
                          setExternalTransfersDraft(externalTransfers.map(cloneExternalTransfer));
                          setExternalTransfersManagerModalState({ open: true });
                        }}
                      >
                        실투어 외 픽드랍 설정
                      </Button>
                    </div>
                  </div>

                  <label className="grid gap-1 text-sm">
                    <span className="text-xs text-slate-600">
                      특이사항 <span className="ml-1 text-slate-400">*고객에게 노출됩니다</span>
                    </span>
                    <textarea
                      value={specialNote}
                      onChange={(event) => setSpecialNote(event.target.value)}
                      rows={3}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="줄바꿈 포함 입력 가능"
                    />
                  </label>
                </div>
              </Card>

              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    3
                  </span>
                  <span>일정 선택</span>
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  이전 일차와 연결 가능한 목적지만 버튼으로 노출됩니다.
                </p>
                <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="text-xs font-semibold text-slate-700">
                    템플릿 불러오기 (현재 지역/일수)
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={routePresetTemplateId}
                      onChange={(event) => setRoutePresetTemplateId(event.target.value)}
                      disabled={!regionId || totalDays <= 0 || routePresetOptions.length === 0}
                      className="min-w-[260px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">템플릿 선택</option>
                      {routePresetOptions.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      disabled={
                        !regionId ||
                        totalDays <= 0 ||
                        routePresetOptions.length === 0 ||
                        !routePresetSelected
                      }
                      onClick={() => {
                        if (!routePresetSelected) {
                          return;
                        }
                        applyTemplate(routePresetSelected, true);
                      }}
                    >
                      불러오기
                    </Button>
                  </div>
                  {regionId && totalDays > 0 && routePresetOptions.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      선택 가능한 템플릿이 없습니다. 지역과 일수를 확인하세요.
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 space-y-4 [&>*+*]:border-t [&>*+*]:border-slate-200 [&>*+*]:pt-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-medium">1일차 출발지</div>
                    <p className="mt-1 text-xs text-slate-500">
                      목적지중 첫날 가능 목적지만 나열됩니다
                    </p>
                    {startLocationId ? (
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="text-slate-700">
                          <span className="whitespace-pre-line">
                            {formatLocationNameMultiline(
                              locationById.get(startLocationId)?.name ?? startLocationId,
                            )}
                          </span>
                          {(variantType === VariantType.Early ||
                            variantType === VariantType.EarlyExtend) && (
                            <span className="ml-2 text-xs text-amber-700">(얼리 일정)</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setStartLocationId('');
                            setStartLocationVersionId('');
                            setSelectedRoute([]);
                            dirtyPlanRowFieldKeysRef.current.clear();
                            setPlanRows([]);
                            setIsMultiDayBlockSectionOpen(false);
                          }}
                          className="text-xs text-slate-500 underline"
                        >
                          변경
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-500">출발지를 선택해주세요.</div>
                    )}
                    {!startLocationId ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                        {firstDayOptions.map((location) => (
                          <button
                            key={`start-${location.id}`}
                            type="button"
                            onClick={() => {
                              setStartLocationId(location.id);
                              setStartLocationVersionId(getDefaultVersionId(location));
                              setSelectedRoute([]);
                              setIsMultiDayBlockSectionOpen(false);
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-100"
                          >
                            <span className="whitespace-pre-line">
                              {formatLocationNameMultiline(location.name)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {!startLocationId && firstDayOptions.length === 0 ? (
                      <p className="mt-3 text-xs text-amber-700">
                        첫날 가능으로 설정된 목적지가 없습니다.
                      </p>
                    ) : null}
                  </div>

                  {selectedRoute.map((stop, index) => {
                    const isLastSelectedStop = index === selectedRoute.length - 1;
                    return (
                    <div
                      key={`selected-${index + 1}`}
                      className={`relative rounded-2xl border border-slate-200 bg-slate-50 p-3 ${
                        isLastSelectedStop ? 'pr-11' : ''
                      }`}
                    >
                      {isLastSelectedStop ? (
                        <button
                          type="button"
                          aria-label="이 일정 선택 취소"
                          title="이 일정 선택 취소"
                          onClick={() => {
                            setSelectedRoute((prev) =>
                              prev.length === 0 ? prev : prev.slice(0, -1),
                            );
                            setIsMultiDayBlockSectionOpen(false);
                          }}
                          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                        >
                          ×
                        </button>
                      ) : null}
                      {(() => {
                        const startDayIndex = getRouteStopStartDayIndex(selectedRoute, index);
                        const endDayIndex = getRouteStopEndDayIndex(selectedRoute, index);

                        if (stop.kind === 'MULTI_DAY_BLOCK') {
                          const isLastDay = endDayIndex === totalDays;
                          return (
                            <>
                              <div className="text-sm font-medium">
                                {startDayIndex === endDayIndex
                                  ? `${startDayIndex}일차`
                                  : `${startDayIndex}~${endDayIndex}일차`}{' '}
                                블록
                              </div>
                              <div className="mt-1 text-slate-700">
                                <span className="whitespace-pre-line">
                                  {formatLocationNameMultiline(
                                    locationById.get(stop.locationId)?.name ?? stop.locationId,
                                  )}
                                </span>
                                {isLastDay &&
                                  (variantType === VariantType.Extend ||
                                    variantType === VariantType.EarlyExtend) && (
                                    <span className="ml-2 text-xs text-amber-700">(연장 일정)</span>
                                  )}
                              </div>
                            </>
                          );
                        }

                        const previousStop = selectedRoute[index - 1];
                        if (previousStop?.kind === 'MULTI_DAY_BLOCK') {
                          const connection = findMultiDayBlockConnection(
                            filteredOvernightStayConnections,
                            previousStop.multiDayBlockId,
                            stop.locationId,
                          );
                          const versions = getMultiDayBlockConnectionVersions(connection);
                          const selectedVersion = resolveMultiDayBlockConnectionVersion(
                            connection,
                            stop.overnightStayConnectionVersionId,
                          );

                          const isLastDay = endDayIndex === totalDays;
                          return (
                            <>
                              <div className="text-sm font-medium">{startDayIndex}일차</div>
                              <div className="mt-1 text-slate-700">
                                <span className="whitespace-pre-line">
                                  {formatLocationNameMultiline(
                                    locationById.get(stop.locationId)?.name ?? stop.locationId,
                                  )}
                                </span>
                                {isLastDay &&
                                  (variantType === VariantType.Extend ||
                                    variantType === VariantType.EarlyExtend) && (
                                    <span className="ml-2 text-xs text-amber-700">(연장 일정)</span>
                                  )}
                              </div>
                              {versions.length > 1 ? (
                                <div className="mt-3 grid gap-2">
                                  <div className="text-xs text-slate-500">블록 다음 연결 버전</div>
                                  <div className="flex flex-wrap gap-2">
                                    {versions.map((version) => (
                                      <button
                                        key={`route-overnight-connection-version-${index}-${version.id}`}
                                        type="button"
                                        onClick={() =>
                                          setSelectedRoute((prev) =>
                                            prev.map((item, itemIndex) =>
                                              itemIndex === index && item.kind === 'LOCATION'
                                                ? {
                                                    ...item,
                                                    overnightStayConnectionId: connection?.id,
                                                    overnightStayConnectionVersionId: version.id,
                                                  }
                                                : item,
                                            ),
                                          )
                                        }
                                        className={`rounded-lg border px-3 py-1 text-xs ${
                                          selectedVersion?.id === version.id
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                                        }`}
                                      >
                                        {formatMultiDayBlockConnectionVersionLabel(version)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </>
                          );
                        }

                        const fromId =
                          index === 0
                            ? startLocationId
                            : (selectedRoute[index - 1]?.locationId ?? '');
                        const segment = findSegment(filteredSegments, fromId, stop.locationId);
                        const versions = getSegmentVersions(segment);
                        const selectedVersion = resolveSegmentVersionForDate(
                          segment,
                          travelStartDate
                            ? getRouteDateForDayIndex(travelStartDate, startDayIndex)
                            : undefined,
                          stop.segmentVersionId,
                        );

                        const isLastDay = endDayIndex === totalDays;
                        return (
                          <>
                            <div className="text-sm font-medium">{startDayIndex}일차</div>
                            <div className="mt-1 text-slate-700">
                              <span className="whitespace-pre-line">
                                {formatLocationNameMultiline(
                                  locationById.get(stop.locationId)?.name ?? stop.locationId,
                                )}
                              </span>
                              {isLastDay &&
                                (variantType === VariantType.Extend ||
                                  variantType === VariantType.EarlyExtend) && (
                                  <span className="ml-2 text-xs text-amber-700">(연장 일정)</span>
                                )}
                            </div>
                            {versions.length > 1 ? (
                              <div className="mt-3 grid gap-2">
                                <div className="text-xs text-slate-500">시즌 버전</div>
                                <div className="flex flex-wrap gap-2">
                                  {versions.map((version) => (
                                    <button
                                      key={`route-segment-version-${index}-${version.id}`}
                                      type="button"
                                      onClick={() =>
                                        setSelectedRoute((prev) =>
                                          prev.map((item, itemIndex) =>
                                            itemIndex === index && item.kind === 'LOCATION'
                                              ? {
                                                  ...item,
                                                  segmentId: segment?.id,
                                                  segmentVersionId: version.id,
                                                  overnightStayConnectionId: undefined,
                                                  overnightStayConnectionVersionId: undefined,
                                                }
                                              : item,
                                          ),
                                        )
                                      }
                                      className={`rounded-lg border px-3 py-1 text-xs ${
                                        selectedVersion?.id === version.id
                                          ? 'border-slate-900 bg-slate-900 text-white'
                                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                                      }`}
                                    >
                                      {formatSegmentVersionLabel(version)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                    );
                  })}

                  {startLocationId &&
                  startLocationVersionId &&
                  1 + getConsumedRouteDayCount(selectedRoute) < totalDays ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-4">
                      <div className="mb-3 text-sm font-medium">
                        {2 + getConsumedRouteDayCount(selectedRoute)}일차 선택
                      </div>
                      <div className="grid gap-3">
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                          {nextOptions.map((location) => (
                            <button
                              key={location.id}
                              type="button"
                              onClick={() =>
                                setSelectedRoute((prev) => {
                                  const lastStop = prev[prev.length - 1];
                                  if (lastStop?.kind === 'MULTI_DAY_BLOCK') {
                                    const connection = findMultiDayBlockConnection(
                                      filteredOvernightStayConnections,
                                      lastStop.multiDayBlockId,
                                      location.id,
                                    );
                                    return [
                                      ...prev,
                                      {
                                        kind: 'LOCATION',
                                        locationId: location.id,
                                        locationVersionId: getDefaultVersionId(location),
                                        overnightStayConnectionId: connection?.id,
                                        overnightStayConnectionVersionId:
                                          getDefaultMultiDayBlockConnectionVersionId(connection) ||
                                          undefined,
                                      },
                                    ];
                                  }

                                  const fromId =
                                    prev.length === 0
                                      ? startLocationId
                                      : (prev[prev.length - 1]?.locationId ?? '');
                                  const segment = findSegment(
                                    filteredSegments,
                                    fromId,
                                    location.id,
                                  );
                                  return [
                                    ...prev,
                                    {
                                      kind: 'LOCATION',
                                      locationId: location.id,
                                      locationVersionId: getDefaultVersionId(location),
                                      segmentId: segment?.id,
                                      segmentVersionId: undefined,
                                    },
                                  ];
                                })
                              }
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-100"
                            >
                              <span className="whitespace-pre-line">
                                {formatLocationNameMultiline(location.name)}
                              </span>
                            </button>
                          ))}
                        </div>
                        {nextOptions.length === 0 ? (
                          <p className="text-xs text-amber-700">
                            선택 가능한 다음 목적지가 없습니다.
                          </p>
                        ) : null}
                        <div
                          className="mt-3 border-t border-slate-200 pt-4"
                          role="group"
                          aria-label="연속 일정 블록 선택"
                        >
                          {!isMultiDayBlockSectionOpen ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="outline"
                                disabled={totalDays - (1 + getConsumedRouteDayCount(selectedRoute)) < 2}
                                onClick={() => setIsMultiDayBlockSectionOpen(true)}
                              >
                                연박/기차 추가
                              </Button>
                              {totalDays - (1 + getConsumedRouteDayCount(selectedRoute)) < 2 ? (
                                <span className="text-xs text-slate-500">
                                  남은 일수에 맞는 블록만 선택할 수 있습니다.
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 text-xs font-semibold text-slate-700">연속 일정 블록</div>
                                <button
                                  type="button"
                                  onClick={() => setIsMultiDayBlockSectionOpen(false)}
                                  className="shrink-0 text-xs text-slate-500 underline"
                                >
                                  접기
                                </button>
                              </div>
                              {overnightStayOptions.length > 0 ? (
                                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 md:grid-cols-3">
                                  {overnightStayOptions.map((overnightStay) => (
                                    <button
                                      key={overnightStay.id}
                                      type="button"
                                      onClick={() => {
                                        const location = locationById.get(overnightStay.locationId);
                                        setSelectedRoute((prev) => [
                                          ...prev,
                                          {
                                            kind: 'MULTI_DAY_BLOCK',
                                            multiDayBlockId: overnightStay.id,
                                            stayLength: overnightStay.days.length,
                                            locationId: overnightStay.locationId,
                                            locationVersionId: getDefaultVersionId(location) || '',
                                          },
                                        ]);
                                      }}
                                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100"
                                    >
                                      {overnightStay.title}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-amber-700">
                                  선택 가능한 블록이 없습니다.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {startLocationId || selectedRoute.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStartLocationId('');
                        setStartLocationVersionId('');
                        setSelectedRoute([]);
                        dirtyPlanRowFieldKeysRef.current.clear();
                        setPlanRows([]);
                        setIsMultiDayBlockSectionOpen(false);
                      }}
                      className="text-xs text-red-500 underline"
                    >
                      전체 루트 초기화
                    </button>
                  ) : null}
                </div>
              </Card>

              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    4
                  </span>
                  <span>추가 설정</span>
                </h2>
                <div className="mt-4 grid gap-4 [&>*+*]:border-t [&>*+*]:border-slate-200 [&>*+*]:pt-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="min-w-0 w-1/2">
                        <span className="text-xs text-slate-600">숙소 업그레이드</span>
                        <p className="mt-1 text-xs text-slate-400">
                          버튼을 눌러 일차별 숙소 등급과 지정 숙소를 한 번에 설정합니다.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {planRows.length === 0
                            ? '아직 설정할 일차가 없습니다.'
                            : `총 ${planRows.length}일차 · 업그레이드 ${planRows.filter((row) => row.lodgingSelectionLevel !== 'LV3').length}건`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => setLodgingUpgradeModalState({ open: true })}
                        disabled={planRows.length === 0}
                      >
                        숙소 업그레이드 하기
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="min-w-0 w-1/2">
                        <span className="text-xs text-slate-600">특식 4종</span>
                        <p className="mt-1 text-xs text-slate-400">
                          샤브샤브·삼겹살파티·허르헉·샤슬릭을 규칙에 맞게 일차/식사별로 배치합니다.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {planRows.length === 0
                            ? '아직 설정할 일차가 없습니다.'
                            : (() => {
                                const mainRows = planRows.filter((r) => isMainPlanStopRow(r));
                                const assignments = getAssignmentsFromPlanRows(
                                  mainRows.map((r) => ({
                                    mealCellText: r.mealCellText,
                                    destinationCellText: r.destinationCellText,
                                    scheduleCellText: r.scheduleCellText,
                                  })),
                                );
                                const count = new Set(assignments.map((a) => a.specialMeal)).size;
                                return `4종 중 ${count}종 배치됨`;
                              })()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => setSpecialMealsModalState({ open: true })}
                        disabled={planRows.length === 0}
                      >
                        특식 배치 설정
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="min-w-0 w-1/2">
                        <span className="text-xs text-slate-600">숙소 추가</span>
                        <p className="mt-1 text-xs text-slate-400">
                          버튼을 눌러 모달에서 일차별 추가 숙소 수량을 한 화면에 모아 확인·수정합니다.
                          전 일차 동일 값 일괄 적용도 가능합니다.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {planRows.length === 0
                            ? '아직 설정할 일차가 없습니다.'
                            : `적용 일차 ${extraLodgingSummary.activeDayCount}일 · 총 ${extraLodgingSummary.totalCount}개`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => setExtraLodgingsModalState({ open: true })}
                        disabled={planRows.length === 0}
                      >
                        숙소 추가 설정
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="min-w-0 w-1/2">
                        <span className="text-xs text-slate-600">기타 금액</span>
                        <p className="mt-1 text-xs text-slate-400">
                          추가와 할인을 모달에서 분리해 관리합니다.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          추가 {manualAdjustmentSummary.addCount}건 (
                          {formatKrw(manualAdjustmentSummary.addTotal)}) · 할인{' '}
                          {manualAdjustmentSummary.discountCount}건 (
                          {formatKrw(manualAdjustmentSummary.discountTotal)})
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => setManualAdjustmentsModalState({ open: true })}
                      >
                        기타 금액 설정
                      </Button>
                    </div>
                    {hasValidation('invalid-manual-adjustments') ? (
                      <p className="text-xs text-rose-700">
                        기타 금액은 내용과 0 이상 정수 금액을 함께 입력해주세요.
                      </p>
                    ) : null}
                  </div>
                </div>
              </Card>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <h2 className="text-lg font-bold text-slate-900">일정표 편집기</h2>
                <p className="mt-1 text-xs text-slate-600">
                  숙소 셀은 선택값으로 자동 생성되며 식사 셀은 아침/점심/저녁 3칸 입력으로
                  편집됩니다.
                </p>
              </div>

              <div className="overflow-auto">
                <Table className="min-w-[1280px] w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <Th className="w-[110px]">날짜</Th>
                      <Th className="w-[240px]">목적지</Th>
                      <Th className="w-[180px]">시간</Th>
                      <Th className="w-[280px]">일정</Th>
                      <Th className="w-[220px]">숙소</Th>
                      <Th className="w-[220px]">식사</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPlanRows.map(({ row, mainRowIndex }, rowIndex) => {
                      const isExternalRow = mainRowIndex === null;
                      const mealFields = parseMealCellText(row.mealCellText);
                      const timeCellValidation =
                        mainRowIndex !== null &&
                        validationResults.find((r) =>
                          r.affectedCells?.some(
                            (c) => c.rowIndex === mainRowIndex && c.field === 'timeCellText',
                          ),
                        );
                      const mealCellValidation =
                        mainRowIndex !== null &&
                        validationResults.find((r) =>
                          r.affectedCells?.some(
                            (c) => c.rowIndex === mainRowIndex && c.field === 'mealCellText',
                          ),
                        );
                      const isTimeCellAffected = Boolean(timeCellValidation);
                      const isMealCellAffected = Boolean(mealCellValidation);
                      const cellClassName = `w-full resize-none overflow-hidden rounded-xl border border-slate-200 px-3 py-2 text-sm leading-5 whitespace-pre-wrap ${
                        isExternalRow ? 'bg-slate-50 text-slate-500' : 'bg-white'
                      }`;
                      const timeCellClassName = isTimeCellAffected
                        ? `${cellClassName} border-rose-400 bg-rose-50`
                        : cellClassName;
                      const mealCellWrapperClassName = `grid gap-2 rounded-xl border p-2 ${
                        isMealCellAffected
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-slate-200 bg-white'
                      }`;
                      const mealLabelClassName = `text-xs ${isMealCellAffected ? 'text-amber-900' : 'text-slate-500'}`;
                      const mealInputClassName = `min-w-0 rounded-lg border px-2 py-1.5 text-sm outline-none transition ${
                        isMealCellAffected
                          ? 'border-amber-300 bg-amber-50 text-amber-950 focus:border-amber-500'
                          : 'border-slate-200 text-slate-900 focus:border-slate-400'
                      }`;
                      const mealXButtonClassName = `rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                        isMealCellAffected
                          ? 'border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`;

                      return (
                        <tr
                          key={`day-row-${rowIndex + 1}`}
                          className={`border-t border-slate-200 align-top ${isExternalRow ? 'bg-slate-50/60' : ''}`}
                        >
                          <Td>
                            <textarea
                              value={row.dateCellText}
                              readOnly={isExternalRow}
                              disabled={isExternalRow}
                              onChange={(event) => {
                                if (mainRowIndex === null) {
                                  return;
                                }
                                updateCell(mainRowIndex, 'dateCellText', event.target.value);
                                autoResizeTextarea(event.currentTarget);
                              }}
                              onInput={(event) => autoResizeTextarea(event.currentTarget)}
                              rows={1}
                              data-plan-cell="true"
                              className={cellClassName}
                            />
                          </Td>
                          <Td>
                            <textarea
                              value={row.destinationCellText}
                              readOnly={isExternalRow}
                              disabled={isExternalRow}
                              onChange={(event) => {
                                if (mainRowIndex === null) {
                                  return;
                                }
                                updateCell(mainRowIndex, 'destinationCellText', event.target.value);
                                autoResizeTextarea(event.currentTarget);
                              }}
                              onInput={(event) => autoResizeTextarea(event.currentTarget)}
                              rows={1}
                              data-plan-cell="true"
                              className={cellClassName}
                            />
                          </Td>
                          <Td>
                            <div className="space-y-1">
                              <textarea
                                value={row.timeCellText}
                                readOnly={isExternalRow}
                                disabled={isExternalRow}
                                onChange={(event) => {
                                  if (mainRowIndex === null) {
                                    return;
                                  }
                                  updateCell(mainRowIndex, 'timeCellText', event.target.value);
                                  autoResizeTextarea(event.currentTarget);
                                }}
                                onInput={(event) => autoResizeTextarea(event.currentTarget)}
                                rows={1}
                                data-plan-cell="true"
                                className={timeCellClassName}
                              />
                              {isTimeCellAffected && timeCellValidation ? (
                                <p className="px-1 text-xs leading-4 text-rose-700">
                                  시간 확인 필요: {timeCellValidation.message}
                                </p>
                              ) : null}
                            </div>
                          </Td>
                          <Td>
                            <textarea
                              value={row.scheduleCellText}
                              readOnly={isExternalRow}
                              disabled={isExternalRow}
                              onChange={(event) => {
                                if (mainRowIndex === null) {
                                  return;
                                }
                                updateCell(mainRowIndex, 'scheduleCellText', event.target.value);
                                autoResizeTextarea(event.currentTarget);
                              }}
                              onInput={(event) => autoResizeTextarea(event.currentTarget)}
                              rows={1}
                              data-plan-cell="true"
                              className={cellClassName}
                            />
                          </Td>
                          <Td>
                            <div
                              className={`min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm leading-5 whitespace-pre-wrap ${
                                isExternalRow
                                  ? 'bg-slate-100 text-slate-500'
                                  : 'bg-slate-50 text-slate-900'
                              }`}
                            >
                              {row.lodgingCellText || '-'}
                            </div>
                          </Td>
                          <Td>
                            {isExternalRow ? (
                              <div className="space-y-1">
                                <div
                                  className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm leading-5 whitespace-pre-wrap ${
                                    isMealCellAffected
                                      ? 'border-amber-400 bg-amber-50 text-amber-950'
                                      : isExternalRow
                                        ? 'border-slate-200 bg-slate-100 text-slate-500'
                                        : 'border-slate-200 bg-white'
                                  }`}
                                >
                                  {row.mealCellText || '-'}
                                </div>
                                {isMealCellAffected && mealCellValidation ? (
                                  <p className="px-1 text-xs leading-4 text-amber-900">
                                    식사 확인 필요: {mealCellValidation.message}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className={mealCellWrapperClassName}>
                                  {(
                                    [
                                      ['breakfast', '아침', mealFields.breakfast],
                                      ['lunch', '점심', mealFields.lunch],
                                      ['dinner', '저녁', mealFields.dinner],
                                    ] as const
                                  ).map(([field, label, mealValue]) => (
                                    <div
                                      key={field}
                                      className="grid grid-cols-[40px_minmax(0,1fr)_32px] items-center gap-2 text-sm"
                                    >
                                      <span className={mealLabelClassName}>{label}</span>
                                      <input
                                        type="text"
                                        value={mealValue}
                                        onChange={(event) => {
                                          if (mainRowIndex === null) {
                                            return;
                                          }
                                          updateMealCellField(
                                            mainRowIndex,
                                            field,
                                            event.target.value,
                                          );
                                        }}
                                        className={mealInputClassName}
                                        placeholder={`${label} 식사 입력`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (mainRowIndex === null) {
                                            return;
                                          }
                                          updateMealCellField(mainRowIndex, field, 'X');
                                        }}
                                        className={mealXButtonClassName}
                                        aria-label={`${label} 식사를 없음으로 표시`}
                                      >
                                        X
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                {isMealCellAffected && mealCellValidation ? (
                                  <p className="px-1 text-xs leading-4 text-amber-900">
                                    식사 확인 필요: {mealCellValidation.message}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </section>

            <section className="space-y-5">
              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">금액</h2>
                {pricingPreviewError ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                    {pricingPreviewErrorMessage}
                  </div>
                ) : null}
                {!pricingPreview ? (
                  <p className="mt-3 text-sm text-slate-500">
                    요건이 충족되면 금액이 자동 계산됩니다.
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {pricingBuckets ? (
                      <>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <h3 className="text-sm font-semibold text-slate-900">직원 확인용</h3>

                          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                            <div className="font-medium text-slate-900">
                              기본금 {formatKrw(pricingBuckets.baseTotal)}
                            </div>
                            {pricingBuckets.baseLines.length === 0 ? (
                              <p className="mt-2 text-xs text-slate-500">기본금 항목이 없습니다.</p>
                            ) : (
                              <div className="mt-2 max-h-[220px] overflow-auto rounded-lg border border-slate-200">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                      <th className="px-2 py-2 text-left">항목</th>
                                      <th className="px-2 py-2 text-left">가격</th>
                                      <th className="px-2 py-2 text-left">개수</th>
                                      <th className="px-2 py-2 text-left">금액</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {pricingBuckets.baseLines.map((line, index) => (
                                      <tr
                                        key={`${line.lineCode}-base-${index}`}
                                        className="border-t border-slate-200"
                                      >
                                        <td className="px-2 py-1.5">{getPricingLineLabel(line)}</td>
                                        <td className="px-2 py-1.5">
                                          {formatPricingLineUnitDisplay(line, headcountTotal)}
                                        </td>
                                        <td className="px-2 py-1.5">
                                          {formatPricingLineQuantityDisplay(line, headcountTotal)}
                                        </td>
                                        <td className="px-2 py-1.5">{formatKrw(line.amountKrw)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                            <div className="font-medium text-slate-900">
                              추가금 {formatKrw(pricingBuckets.addonTotal)}
                            </div>
                            {pricingBuckets.addonLines.length === 0 ? (
                              <p className="mt-2 text-xs text-slate-500">추가금 항목이 없습니다.</p>
                            ) : (
                              <div className="mt-2 max-h-[220px] overflow-auto rounded-lg border border-slate-200">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                      <th className="px-2 py-2 text-left">항목</th>
                                      <th className="px-2 py-2 text-left">가격</th>
                                      <th className="px-2 py-2 text-left">개수</th>
                                      <th className="px-2 py-2 text-left">금액</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {pricingDisplayAddonLines.map((line, index) => (
                                      <tr
                                        key={`${line.lineCode}-addon-${index}`}
                                        className="border-t border-slate-200"
                                      >
                                        <td className="px-2 py-1.5">
                                          {getPricingLineLabel(line)}
                                          {line.description &&
                                          line.lineCode !== 'MANUAL_ADJUSTMENT' &&
                                          line.lineCode !== 'LODGING_SELECTION' ? (
                                            <div className="text-[11px] text-slate-500">
                                              {line.description}
                                            </div>
                                          ) : null}
                                        </td>
                                        <td className="px-2 py-1.5">
                                          {line.unitPriceKrw !== null
                                            ? formatKrw(line.unitPriceKrw)
                                            : '-'}
                                        </td>
                                        <td className="px-2 py-1.5">
                                          {formatPricingLineQuantityDisplay(line, headcountTotal)}
                                        </td>
                                        <td className="px-2 py-1.5">{formatKrw(line.amountKrw)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                            <div className="font-medium text-slate-900">
                              보증금 {formatKrw(pricingPreview.securityDepositAmountKrw)}
                            </div>
                            <div className="mt-2 overflow-auto rounded-lg border border-slate-200">
                              <table className="min-w-full text-xs">
                                <thead className="bg-slate-50 text-slate-600">
                                  <tr>
                                    <th className="px-2 py-2 text-left">항목</th>
                                    <th className="px-2 py-2 text-left">기준</th>
                                    <th className="px-2 py-2 text-left">금액</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-t border-slate-200">
                                    <td className="px-2 py-1.5">
                                      {pricingPreview.securityDepositEvent
                                        ? `이벤트(${pricingPreview.securityDepositEvent.name})`
                                        : '기본 물품'}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      {pricingPreview.securityDepositMode === 'NONE'
                                        ? '-'
                                        : `${formatKrw(pricingPreview.securityDepositUnitPriceKrw)}(${formatSecurityDepositScope(pricingPreview.securityDepositMode)}) x ${pricingPreview.securityDepositQuantity}`}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      {formatKrw(pricingPreview.securityDepositAmountKrw)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                            <div className="font-medium text-slate-900">예약금/잔금</div>
                            <div className="mt-2 grid gap-1 text-xs text-slate-600">
                              <span>예약금 직접수정</span>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={manualDepositInput}
                                onChange={(event) => {
                                  setHasEditedManualDeposit(true);
                                  setManualDepositInput(event.target.value);
                                }}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                                placeholder="자동 계산값 사용 시 비워두기"
                              />
                              {hasValidation('invalid-manual-deposit') ? (
                                <p className="text-rose-600">
                                  예약금은 0 이상의 정수만 입력 가능합니다.
                                </p>
                              ) : null}
                            </div>
                            <div className="mt-2 overflow-auto rounded-lg border border-slate-200">
                              <table className="min-w-full text-xs">
                                <thead className="bg-slate-50 text-slate-600">
                                  <tr>
                                    <th className="px-2 py-2 text-left">항목</th>
                                    <th className="px-2 py-2 text-left">금액</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-t border-slate-200">
                                    <td className="px-2 py-1.5">예약금</td>
                                    <td className="px-2 py-1.5">
                                      {formatKrw(pricingPreview.depositAmountKrw)}
                                    </td>
                                  </tr>
                                  <tr className="border-t border-slate-200">
                                    <td className="px-2 py-1.5">잔금</td>
                                    <td className="px-2 py-1.5">
                                      {formatKrw(pricingPreview.balanceAmountKrw)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                          <h3 className="text-sm font-semibold text-blue-900">고객 안내용</h3>
                          <div className="mt-2 grid gap-2 text-blue-900">
                            <div className="rounded-xl border border-blue-200 bg-white p-3">
                              <div className="font-medium text-slate-900">
                                기본금 {formatKrw(pricingBuckets.baseTotal)}
                              </div>
                            </div>
                            <div className="rounded-xl border border-blue-200 bg-white p-3">
                              <div className="font-medium text-slate-900">
                                추가금 {formatKrw(pricingBuckets.addonTotal)}
                              </div>
                              {pricingBuckets.addonLines.length === 0 ? (
                                <p className="mt-2 text-xs text-blue-700">
                                  추가금 항목이 없습니다.
                                </p>
                              ) : (
                                <div className="mt-2 max-h-[180px] overflow-auto rounded-lg border border-blue-200 bg-white">
                                  <table className="min-w-full text-xs">
                                    <thead className="bg-blue-50 text-blue-900">
                                      <tr>
                                        <th className="px-2 py-2 text-left">항목</th>
                                        <th className="px-2 py-2 text-left">가격</th>
                                        <th className="px-2 py-2 text-left">개수</th>
                                        <th className="px-2 py-2 text-left">금액</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pricingDisplayAddonLines.map((line, index) => (
                                        <tr
                                          key={`${line.lineCode}-customer-addon-${index}`}
                                          className="border-t border-blue-100"
                                        >
                                          <td className="px-2 py-1.5">
                                            {getPricingLineLabel(line)}
                                            {line.description &&
                                            line.lineCode !== 'MANUAL_ADJUSTMENT' &&
                                            line.lineCode !== 'LODGING_SELECTION' ? (
                                              <div className="text-[11px] text-blue-700">
                                                {line.description}
                                              </div>
                                            ) : null}
                                          </td>
                                          <td className="px-2 py-1.5">
                                            {formatPricingLineUnitDisplay(line, headcountTotal)}
                                          </td>
                                          <td className="px-2 py-1.5">
                                            {formatPricingLineQuantityDisplay(line, headcountTotal)}
                                          </td>
                                          <td className="px-2 py-1.5">
                                            {formatKrw(line.amountKrw)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                            <div className="mt-1 overflow-hidden rounded-lg border border-blue-200 bg-white">
                              <div className="grid grid-cols-4 bg-slate-100 text-center text-[11px] font-medium text-slate-600">
                                <div className="border-r border-slate-200 px-2 py-2">총액(1인)</div>
                                <div className="border-r border-slate-200 px-2 py-2">
                                  예약금(1인)
                                </div>
                                <div className="border-r border-slate-200 px-2 py-2">잔금(1인)</div>
                                <div className="px-2 py-2">보증금(팀당/인당)</div>
                              </div>
                              <div className="grid grid-cols-4 text-center text-sm text-slate-900">
                                <div className="border-r border-slate-200 px-2 py-4 font-semibold">
                                  {formatKrw(pricingBuckets.grandTotal)}
                                </div>
                                <div className="border-r border-slate-200 px-2 py-4">
                                  {formatKrw(pricingPreview.depositAmountKrw)}
                                </div>
                                <div className="border-r border-slate-200 px-2 py-4">
                                  {formatKrw(pricingPreview.balanceAmountKrw)}
                                </div>
                                <div className="px-2 py-4">
                                  {pricingPreview.securityDepositMode === 'NONE'
                                    ? formatKrw(0)
                                    : `${formatKrw(pricingPreview.securityDepositUnitPriceKrw)} (${formatSecurityDepositScope(pricingPreview.securityDepositMode)})`}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </Card>

              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  aria-expanded={isValidationOpen}
                  aria-controls="builder-validation-panel"
                  onClick={() => setIsValidationOpen((prev) => !prev)}
                >
                  <h2 className="text-lg font-bold text-slate-900">검증</h2>
                  <span className="text-xs text-slate-500">
                    {isValidationOpen ? '닫기' : '열기'}
                  </span>
                </button>
                {isValidationOpen ? (
                  <div id="builder-validation-panel" className="mt-3 space-y-2 text-sm">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      편집 행 수: {planRows.length}
                    </div>
                    {validationResults.length === 0 ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                        모든 검증 통과
                      </div>
                    ) : null}
                    {validationResults.map((result) => (
                      <div
                        key={result.id}
                        className={`rounded-2xl border p-3 ${
                          result.severity === 'error'
                            ? 'border-rose-200 bg-rose-50 text-rose-900'
                            : 'border-amber-200 bg-amber-50 text-amber-900'
                        }`}
                      >
                        {result.message}
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>

              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  aria-expanded={isPayloadPreviewOpen}
                  aria-controls="builder-payload-preview-panel"
                  onClick={() => setIsPayloadPreviewOpen((prev) => !prev)}
                >
                  <h2 className="text-lg font-bold text-slate-900">저장 데이터 미리보기</h2>
                  <span className="text-xs text-slate-500">
                    {isPayloadPreviewOpen ? '닫기' : '열기'}
                  </span>
                </button>
                {isPayloadPreviewOpen ? (
                  <>
                    <p className="mt-1 text-xs text-slate-600">
                      저장 시 서버로 전달되는 요약입니다.
                    </p>
                    <pre
                      id="builder-payload-preview-panel"
                      className="mt-3 max-h-[280px] overflow-auto rounded-2xl bg-slate-900 p-3 text-xs leading-5 text-slate-100"
                    >
                      {JSON.stringify(
                        isVersionMode
                          ? {
                              userId,
                              planId,
                              parentVersionId,
                              regionId,
                              variantType,
                              totalDays,
                              changeNote,
                              meta: {
                                leaderName,
                                travelStartDate,
                                travelEndDate,
                                headcountTotal,
                                headcountMale,
                                headcountFemale,
                                vehicleType,
                                flightInTime: primaryTransportGroup?.flightInTime ?? '',
                                flightOutTime: primaryTransportGroup?.flightOutTime ?? '',
                                pickupDate: primaryTransportGroup?.pickupDate ?? '',
                                pickupTime: primaryTransportGroup?.pickupTime ?? '',
                                pickupPlaceType:
                                  primaryTransportGroup?.pickupPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                pickupPlaceCustomText:
                                  primaryTransportGroup?.pickupPlaceCustomText ?? '',
                                dropDate: primaryTransportGroup?.dropDate ?? '',
                                dropTime: primaryTransportGroup?.dropTime ?? '',
                                dropPlaceType:
                                  primaryTransportGroup?.dropPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                dropPlaceCustomText:
                                  primaryTransportGroup?.dropPlaceCustomText ?? '',
                                externalTransfers,
                                transportGroups: normalizedTransportGroups,
                                specialNote,
                                includeRentalItems,
                                rentalItemsText,
                                eventIds,
                                extraLodgings,
                                lodgingSelections,
                                remark,
                              },
                              manualAdjustments: normalizedManualAdjustments,
                              manualDepositAmountKrw: normalizedManualDepositAmountKrw,
                              selectedRoute,
                              planStops: mergedPlanStops,
                            }
                          : {
                              userId,
                              regionId,
                              title: planTitle,
                              variantType,
                              totalDays,
                              changeNote,
                              meta: {
                                leaderName,
                                travelStartDate,
                                travelEndDate,
                                headcountTotal,
                                headcountMale,
                                headcountFemale,
                                vehicleType,
                                flightInTime: primaryTransportGroup?.flightInTime ?? '',
                                flightOutTime: primaryTransportGroup?.flightOutTime ?? '',
                                pickupDate: primaryTransportGroup?.pickupDate ?? '',
                                pickupTime: primaryTransportGroup?.pickupTime ?? '',
                                pickupPlaceType:
                                  primaryTransportGroup?.pickupPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                pickupPlaceCustomText:
                                  primaryTransportGroup?.pickupPlaceCustomText ?? '',
                                dropDate: primaryTransportGroup?.dropDate ?? '',
                                dropTime: primaryTransportGroup?.dropTime ?? '',
                                dropPlaceType:
                                  primaryTransportGroup?.dropPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                dropPlaceCustomText:
                                  primaryTransportGroup?.dropPlaceCustomText ?? '',
                                externalTransfers,
                                transportGroups: normalizedTransportGroups,
                                specialNote,
                                includeRentalItems,
                                rentalItemsText,
                                eventIds,
                                extraLodgings,
                                lodgingSelections,
                                remark,
                              },
                              manualAdjustments: normalizedManualAdjustments,
                              manualDepositAmountKrw: normalizedManualDepositAmountKrw,
                              selectedRoute,
                              initialVersion: {
                                planStops: mergedPlanStops,
                              },
                            },
                        null,
                        2,
                      )}
                    </pre>
                  </>
                ) : null}
              </Card>
            </section>
          </div>
        </div>

        {isPreviewEnabled ? (
          <aside
            className={`${activePane === 'preview' ? 'block' : 'hidden'} bg-slate-100/80 lg:block lg:h-full lg:overflow-y-auto`}
          >
            <div className="p-4 sm:p-6 lg:sticky lg:top-0 lg:p-6">
              <div className="estimate-preview-panel rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      실시간 견적서 미리보기
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      좌측 입력값이 우측 문서에 바로 반영됩니다.
                    </p>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
                    {previewGuidesLoading ? '여행지 안내 동기화 중' : '실시간 반영'}
                  </div>
                </div>

                {previewEstimateData ? (
                  <div className="estimate-preview-frame">
                    <EstimateDocument
                      data={previewEstimateData}
                      viewMode="screen-preview"
                      page1Editor={previewPage1Editor}
                    />
                  </div>
                ) : (
                  <Card className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                    미리보기 데이터를 준비 중입니다...
                  </Card>
                )}
              </div>
            </div>
          </aside>
        ) : null}

        <ExternalTransfersManagerModal
          open={externalTransfersManagerModalState.open}
          externalTransfers={externalTransfersDraft}
          transportGroups={transportGroups}
          externalPickupText={draftExternalPickupText}
          externalDropText={draftExternalDropText}
          onClose={() => {
            setExternalTransfersManagerModalState({ open: false });
            setExternalTransfersDraft([]);
            setExternalTransferModalState({
              open: false,
              editingIndex: null,
            });
          }}
          onComplete={() => {
            setExternalTransfers(externalTransfersDraft.map(cloneExternalTransfer));
            setExternalTransfersManagerModalState({ open: false });
            setExternalTransfersDraft([]);
            setExternalTransferModalState({
              open: false,
              editingIndex: null,
            });
          }}
          onAdd={() =>
            setExternalTransferModalState({
              open: true,
              editingIndex: null,
            })
          }
          onEdit={(index) =>
            setExternalTransferModalState({
              open: true,
              editingIndex: index,
            })
          }
          onRemove={(index) =>
            setExternalTransfersDraft((current) =>
              current.filter((_item, transferIndex) => transferIndex !== index),
            )
          }
        />

        <ExternalTransferModal
          open={externalTransferModalState.open}
          transportGroups={transportGroups}
          initialValue={
            externalTransferModalState.editingIndex !== null
              ? (externalTransfersDraft[externalTransferModalState.editingIndex] ??
                buildEmptyExternalTransfer())
              : null
          }
          onClose={() =>
            setExternalTransferModalState({
              open: false,
              editingIndex: null,
            })
          }
          onSubmit={(value) => {
            setExternalTransfersDraft((current) => {
              if (externalTransferModalState.editingIndex === null) {
                return [...current, value];
              }

              return current.map((item, index) =>
                index === externalTransferModalState.editingIndex ? value : item,
              );
            });
            setExternalTransferModalState({
              open: false,
              editingIndex: null,
            });
          }}
        />

        <LodgingUpgradeModal
          open={lodgingUpgradeModalState.open}
          rows={lodgingUpgradeRows}
          onClose={() => setLodgingUpgradeModalState({ open: false })}
          onChooseLevel={(rowIndex, level) => applyLodgingSelection(rowIndex, level)}
          onChooseCustom={(rowIndex) =>
            setLodgingSelectionModalState({
              open: true,
              rowIndex,
            })
          }
        />

        <SpecialMealsModal
          open={specialMealsModalState.open}
          rows={planRows
            .filter((r) => isMainPlanStopRow(r))
            .map((r) => ({
              mealCellText: r.mealCellText,
              destinationCellText: r.destinationCellText,
              scheduleCellText: r.scheduleCellText,
            }))}
          onClose={() => setSpecialMealsModalState({ open: false })}
          onSave={(updatedRows) => {
            const mainIndices = planRows
              .map((r, i) => (isMainPlanStopRow(r) ? i : -1))
              .filter((i) => i >= 0);
            mainIndices.forEach((rowIndex) => {
              dirtyPlanRowFieldKeysRef.current.add(
                getDirtyPlanRowFieldKey(rowIndex, 'mealCellText'),
              );
            });
            setPlanRows((prev) =>
              prev.map((row, i) => {
                const j = mainIndices.indexOf(i);
                if (j < 0) return row;
                const updated = updatedRows[j];
                return updated ? { ...row, mealCellText: updated.mealCellText } : row;
              }),
            );
          }}
        />

        <ExtraLodgingsModal
          open={extraLodgingsModalState.open}
          counts={extraLodgingCounts}
          dayLabels={extraLodgingDayLabels}
          onClose={() => setExtraLodgingsModalState({ open: false })}
          onChangeCount={(index, nextValue) =>
            setExtraLodgingCounts((prev) =>
              prev.map((value, valueIndex) => (valueIndex === index ? nextValue : value)),
            )
          }
          onApplyUniform={(value) => setExtraLodgingCounts((prev) => prev.map(() => value))}
        />

        <ManualAdjustmentsModal
          open={manualAdjustmentsModalState.open}
          rows={manualAdjustments}
          onClose={() => setManualAdjustmentsModalState({ open: false })}
          onAddRow={(kind) =>
            setManualAdjustments((prev) => [
              ...prev,
              {
                kind,
                description: '',
                amountKrw: '0',
              },
            ])
          }
          onUpdateRow={(index, field, value) =>
            setManualAdjustments((prev) =>
              prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
            )
          }
          onRemoveRow={(index) =>
            setManualAdjustments((prev) => prev.filter((_row, rowIndex) => rowIndex !== index))
          }
        />

        <RegionLodgingSelectModal
          open={lodgingSelectionModalState.open}
          dayIndex={
            lodgingSelectionModalState.rowIndex !== null
              ? lodgingSelectionModalState.rowIndex + 1
              : null
          }
          lodgings={regionLodgings}
          initialSelectedId={
            lodgingSelectionModalState.rowIndex !== null
              ? (planRows[lodgingSelectionModalState.rowIndex]?.customLodgingId ?? null)
              : null
          }
          onClose={() =>
            setLodgingSelectionModalState({
              open: false,
              rowIndex: null,
            })
          }
          onSubmit={(lodgingId) => {
            const lodging = regionLodgings.find((item) => item.id === lodgingId) ?? null;
            if (lodgingSelectionModalState.rowIndex === null || !lodging) {
              setLodgingSelectionModalState({
                open: false,
                rowIndex: null,
              });
              return;
            }

            applyLodgingSelection(lodgingSelectionModalState.rowIndex, 'CUSTOM', lodging);
            setLodgingSelectionModalState({
              open: false,
              rowIndex: null,
            });
          }}
        />

        <ConsultationPasteModal
          open={isConsultationPasteModalOpen}
          onClose={() => setIsConsultationPasteModalOpen(false)}
          onApply={handleConsultationApply}
        />
        <DatePickerModal
          open={datePickerTarget !== null}
          value={activeDatePickerValue}
          anchorEl={activeDatePickerAnchorEl}
          defaultYear={getCurrentLocalYear()}
          title={activeDatePickerTitle}
          onClose={() => setDatePickerTarget(null)}
          onChange={handleDatePickerChange}
        />
        <TimePickerModal
          open={timePickerTarget !== null}
          value={activeTimePickerValue}
          anchorEl={activeTimePickerAnchorEl}
          title={activeTimePickerTitle}
          allowedMinutes={activeTimePickerAllowedMinutes}
          onClose={() => setTimePickerTarget(null)}
          onChange={handleTimePickerChange}
        />
      </div>
    </div>
  );
}
