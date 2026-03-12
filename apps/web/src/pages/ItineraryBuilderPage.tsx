import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EstimateDocument } from '../features/estimate/components/EstimateDocument';
import { useBuilderEstimatePreview } from '../features/estimate/hooks/use-builder-estimate-preview';
import type { EstimateBuilderDraftSnapshot, EstimatePage1Editor } from '../features/estimate/model/types';
import { useAuth } from '../features/auth/context';
import { toFacilityLabel, toMealLabel } from '../features/location/display';
import {
  DEFAULT_PICKUP_DROP_PLACE_TYPE,
  PICKUP_DROP_PLACE_OPTIONS,
  getRecommendedDropTime,
  getRecommendedPickupTime,
  normalizePickupDropCustomText,
  type PickupDropPlaceType,
} from '../features/plan/pickup-drop';
import { formatRouteDestinationCellText } from '../features/plan-template/route-autofill';
import { buildPricingViewBuckets, getPricingLineLabel } from '../features/pricing/view-model';
import { MealOption, VariantType } from '../generated/graphql';

interface RegionRow {
  id: string;
  name: string;
}

interface LocationRow {
  id: string;
  regionId: string;
  name: string;
  defaultVersionId: string | null;
  defaultVersion: {
    id: string;
    versionNumber: number;
    label: string;
  } | null;
  variations: Array<{
    id: string;
    versionNumber: number;
    label: string;
    lodgings: Array<{
      id: string;
      name: string;
      hasElectricity: 'YES' | 'LIMITED' | 'NO';
      hasShower: 'YES' | 'LIMITED' | 'NO';
      hasInternet: 'YES' | 'LIMITED' | 'NO';
    }>;
    mealSets: Array<{
      id: string;
      breakfast: MealOption | null;
      lunch: MealOption | null;
      dinner: MealOption | null;
    }>;
    timeBlocks: Array<{
      id: string;
      startTime: string;
      orderIndex: number;
      activities: Array<{
        id: string;
        description: string;
        orderIndex: number;
      }>;
    }>;
  }>;
}

interface LocationVersionRow {
  id: string;
  versionNumber: number;
  label: string;
  lodgings: Array<{
    id: string;
    name: string;
    hasElectricity: 'YES' | 'LIMITED' | 'NO';
    hasShower: 'YES' | 'LIMITED' | 'NO';
    hasInternet: 'YES' | 'LIMITED' | 'NO';
  }>;
  mealSets: Array<{
    id: string;
    breakfast: MealOption | null;
    lunch: MealOption | null;
    dinner: MealOption | null;
  }>;
  timeBlocks: Array<{
    id: string;
    startTime: string;
    orderIndex: number;
    activities: Array<{
      id: string;
      description: string;
      orderIndex: number;
    }>;
  }>;
}

interface SegmentRow {
  id: string;
  regionId: string;
  fromLocationId: string;
  toLocationId: string;
  averageDistanceKm: number;
  averageTravelHours: number;
}

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

interface PlanRow {
  locationId?: string;
  locationVersionId?: string;
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
}

interface ExtraLodgingRow {
  dayIndex: number;
  lodgingCount: number;
}

interface ManualAdjustmentRow {
  description: string;
  amountKrw: string;
}

interface PricingLineRow {
  lineCode: string;
  sourceType: 'RULE' | 'MANUAL';
  description: string | null;
  ruleId: string | null;
  unitPriceKrw: number | null;
  quantity: number;
  amountKrw: number;
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

interface RouteSelection {
  locationId: string;
  locationVersionId: string;
}

interface PlanTemplateStopRow {
  id: string;
  dayIndex: number;
  locationId: string | null;
  locationVersionId: string | null;
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
      row.locationId === other.locationId &&
      row.locationVersionId === other.locationVersionId &&
      row.dateCellText === other.dateCellText &&
      row.destinationCellText === other.destinationCellText &&
      row.timeCellText === other.timeCellText &&
      row.scheduleCellText === other.scheduleCellText &&
      row.lodgingCellText === other.lodgingCellText &&
      row.mealCellText === other.mealCellText
    );
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

const LOCATIONS_QUERY = gql`
  query ItineraryLocations {
    locations {
      id
      regionId
      name
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
        lodgings {
          id
          name
          hasElectricity
          hasShower
          hasInternet
        }
        mealSets {
          id
          breakfast
          lunch
          dinner
        }
        timeBlocks {
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
      averageDistanceKm
      averageTravelHours
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
        locationId
        locationVersionId
        dateCellText
        destinationCellText
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
        locationId
        locationVersionId
        dateCellText
        destinationCellText
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
  { id: VariantType.EarlyNight, label: '얼리(00-04)' },
  { id: VariantType.EarlyMorning, label: '얼리(04-08)' },
  { id: VariantType.EarlyNightExtend, label: '얼리(00-04)+연장' },
  { id: VariantType.EarlyMorningExtend, label: '얼리(04-08)+연장' },
];

const VEHICLES = ['스타렉스', '푸르공', '벨파이어', '하이에이스'] as const;
const FLIGHT_IN_TIME_OPTIONS = ['00:15', '00:30', '00:35', '00:55', '02:40', '04:15', '10:25', '13:50', '14:15', '16:05', '18:40', '23:30'] as const;
const FLIGHT_OUT_TIME_OPTIONS = ['00:50', '01:30', '01:50', '01:55', '07:45', '11:05', '12:25', '15:15', '15:20', '18:20'] as const;

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

function formatKrw(value: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
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

function formatLocationVersion(version: Pick<LocationVersionRow, 'label' | 'versionNumber'> | undefined): string {
  if (!version) {
    return '버전 미정';
  }
  return `${version.label} (v${version.versionNumber})`;
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
  flightInTime: string;
  flightOutTime: string;
  pickupDate: string;
  pickupTime: string;
  dropDate: string;
  dropTime: string;
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
  pickupDropNote: string;
  externalPickupDropNote: string;
  specialNote: string;
  includeRentalItems: boolean;
  rentalItemsText: string;
  eventNames: string[];
  remark: string;
  planStops: PlanRow[];
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
    flightInTime: input.flightInTime,
    flightOutTime: input.flightOutTime,
    pickupDate: input.pickupDate,
    pickupTime: input.pickupTime,
    dropDate: input.dropDate,
    dropTime: input.dropTime,
    pickupPlaceType: input.pickupPlaceType,
    pickupPlaceCustomText: input.pickupPlaceCustomText,
    dropPlaceType: input.dropPlaceType,
    dropPlaceCustomText: input.dropPlaceCustomText,
    externalPickupDate: input.externalPickupDate,
    externalPickupTime: input.externalPickupTime,
    externalPickupPlaceType: input.externalPickupPlaceType,
    externalPickupPlaceCustomText: input.externalPickupPlaceCustomText,
    externalDropDate: input.externalDropDate,
    externalDropTime: input.externalDropTime,
    externalDropPlaceType: input.externalDropPlaceType,
    externalDropPlaceCustomText: input.externalDropPlaceCustomText,
    pickupDropNote: input.pickupDropNote,
    externalPickupDropNote: input.externalPickupDropNote,
    specialNote: input.specialNote,
    includeRentalItems: input.includeRentalItems,
    rentalItemsText: input.rentalItemsText,
    eventNames: input.eventNames,
    remark: input.remark,
    planStops: input.planStops.map((row) => ({
      locationId: row.locationId,
      dateCellText: row.dateCellText,
      destinationCellText: row.destinationCellText,
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

function toTimeCell(version: LocationVersionRow | undefined): string {
  if (!version || version.timeBlocks.length === 0) {
    return '';
  }

  return version.timeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((timeBlock) => {
      const orderedActivities = timeBlock.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex);
      if (orderedActivities.length <= 1) {
        return [timeBlock.startTime];
      }
      return [timeBlock.startTime, ...orderedActivities.slice(1).map(() => '-')];
    })
    .join('\n');
}

function toScheduleCell(version: LocationVersionRow | undefined): string {
  if (!version || version.timeBlocks.length === 0) {
    return '';
  }

  return version.timeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((timeBlock) => {
      const orderedActivities = timeBlock.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex);
      if (orderedActivities.length === 0) {
        return ['(일정 없음)'];
      }
      return orderedActivities.map((activity) => activity.description);
    })
    .join('\n');
}

function toLodgingCell(version: LocationVersionRow | undefined): string {
  const lodging = version?.lodgings[0];
  if (!lodging) {
    return '';
  }

  return [
    lodging.name,
    `전기 ${toFacilityLabel(lodging.hasElectricity)}`,
    `샤워 ${toFacilityLabel(lodging.hasShower)}`,
    `인터넷 ${toFacilityLabel(lodging.hasInternet)}`,
  ].join('\n');
}

function toMealCell(version: LocationVersionRow | undefined): string {
  const mealSet = version?.mealSets[0];
  return [
    `아침 ${toMealLabel(mealSet?.breakfast)}`,
    `점심 ${toMealLabel(mealSet?.lunch)}`,
    `저녁 ${toMealLabel(mealSet?.dinner)}`,
  ].join('\n');
}

function autoResizeTextarea(element: HTMLTextAreaElement): void {
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

function sortTemplateStops(stops: PlanTemplateStopRow[]): PlanTemplateStopRow[] {
  return stops.slice().sort((a, b) => a.dayIndex - b.dayIndex);
}

function PlaceField({ label, placeType, customText, onPlaceTypeChange, onCustomTextChange }: PlaceFieldProps): JSX.Element {
  return (
    <div className="grid gap-2 text-sm">
      <span className="text-xs text-slate-600">{label}</span>
      <select
        value={placeType}
        onChange={(event) => onPlaceTypeChange(event.target.value as PickupDropPlaceType)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        {PICKUP_DROP_PLACE_OPTIONS.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
  const [planTitle, setPlanTitle] = useState<string>('신규 여행 일정');
  const [changeNote, setChangeNote] = useState<string>(initialChangeNote);
  const [leaderName, setLeaderName] = useState<string>('');
  const [travelStartDate, setTravelStartDate] = useState<string>('');
  const [travelEndDate, setTravelEndDate] = useState<string>('');
  const [headcountTotal, setHeadcountTotal] = useState<number>(6);
  const [headcountMale, setHeadcountMale] = useState<number>(6);
  const [vehicleType, setVehicleType] = useState<(typeof VEHICLES)[number]>('스타렉스');
  const [flightInTime, setFlightInTime] = useState<string>('10:25');
  const [flightOutTime, setFlightOutTime] = useState<string>('18:20');
  const [isCustomFlightInTime, setIsCustomFlightInTime] = useState<boolean>(false);
  const [isCustomFlightOutTime, setIsCustomFlightOutTime] = useState<boolean>(false);
  const [pickupDate, setPickupDate] = useState<string>('');
  const [pickupTime, setPickupTime] = useState<string>('');
  const [dropDate, setDropDate] = useState<string>('');
  const [dropTime, setDropTime] = useState<string>('');
  const [pickupPlaceType, setPickupPlaceType] = useState<PickupDropPlaceType>(DEFAULT_PICKUP_DROP_PLACE_TYPE);
  const [pickupPlaceCustomText, setPickupPlaceCustomText] = useState<string>('');
  const [dropPlaceType, setDropPlaceType] = useState<PickupDropPlaceType>(DEFAULT_PICKUP_DROP_PLACE_TYPE);
  const [dropPlaceCustomText, setDropPlaceCustomText] = useState<string>('');
  const [externalPickupDate, setExternalPickupDate] = useState<string>('');
  const [externalPickupTime, setExternalPickupTime] = useState<string>('');
  const [externalPickupPlaceType, setExternalPickupPlaceType] = useState<PickupDropPlaceType>(DEFAULT_PICKUP_DROP_PLACE_TYPE);
  const [externalPickupPlaceCustomText, setExternalPickupPlaceCustomText] = useState<string>('');
  const [externalDropDate, setExternalDropDate] = useState<string>('');
  const [externalDropTime, setExternalDropTime] = useState<string>('');
  const [externalDropPlaceType, setExternalDropPlaceType] = useState<PickupDropPlaceType>(DEFAULT_PICKUP_DROP_PLACE_TYPE);
  const [externalDropPlaceCustomText, setExternalDropPlaceCustomText] = useState<string>('');
  const [specialNote, setSpecialNote] = useState<string>('');
  const [includeRentalItems, setIncludeRentalItems] = useState<boolean>(true);
  const [rentalItemsText, setRentalItemsText] = useState<string>(buildDefaultRentalItems(6));
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [remark, setRemark] = useState<string>('');
  const [startLocationId, setStartLocationId] = useState<string>('');
  const [startLocationVersionId, setStartLocationVersionId] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<RouteSelection[]>([]);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [extraLodgingCounts, setExtraLodgingCounts] = useState<number[]>(Array.from({ length: 6 }, () => 0));
  const [manualAdjustments, setManualAdjustments] = useState<ManualAdjustmentRow[]>([]);
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
  const [homeEntryMode, setHomeEntryMode] = useState<'new' | 'existing' | null>(null);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState<boolean>(false);
  const [homeNewUserName, setHomeNewUserName] = useState<string>('');
  const [homeCreateUserError, setHomeCreateUserError] = useState<string>('');
  const hasEditedPickupRef = useRef<boolean>(false);
  const hasEditedDropRef = useRef<boolean>(false);

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
  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const { data: segmentData } = useQuery<{ segments: SegmentRow[] }>(SEGMENTS_QUERY);
  const { data: templateListData } = useQuery<{ planTemplates: PlanTemplateRow[] }>(PLAN_TEMPLATES_QUERY, {
    variables: {
      regionId: hasValidContext ? regionId || undefined : undefined,
      totalDays: hasValidContext ? totalDays : undefined,
      activeOnly: true,
    },
    skip: hasValidContext ? !regionId : false,
  });
  const { data: templateByIdData } = useQuery<{ planTemplate: PlanTemplateRow | null }>(PLAN_TEMPLATE_QUERY, {
    variables: { id: initialTemplateId },
    skip: !initialTemplateId,
  });

  const [createPlan, { loading: creatingPlan }] = useMutation<{ createPlan: { id: string } }>(CREATE_PLAN_MUTATION);
  const [createPlanVersion, { loading: creatingVersion }] = useMutation<{
    createPlanVersion: { id: string; versionNumber: number };
  }>(CREATE_PLAN_VERSION_MUTATION);
  const [createUser, { loading: creatingUser }] = useMutation<{ createUser: UserRow }>(CREATE_USER_MUTATION);

  const creating = creatingPlan || creatingVersion;

  const regions = regionData?.regions ?? [];
  const locations = locationData?.locations ?? [];
  const segments = segmentData?.segments ?? [];
  const planContext = planContextData?.plan ?? null;
  const selectedUserName = userData?.user?.name ?? '';
  const eventOptions = eventData?.events ?? [];
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

  const routePresetOptions = useMemo(
    () =>
      templateOptions.filter(
        (template) =>
          template.isActive &&
          template.regionId === regionId &&
          template.totalDays === totalDays,
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
    if (!routePresetTemplateId) {
      return;
    }
    if (!routePresetOptions.some((template) => template.id === routePresetTemplateId)) {
      setRoutePresetTemplateId('');
    }
  }, [routePresetOptions, routePresetTemplateId]);

  const filteredLocations = useMemo(
    () => locations.filter((location) => location.regionId === regionId),
    [locations, regionId],
  );

  const filteredSegments = useMemo(
    () => segments.filter((segment) => segment.regionId === regionId),
    [segments, regionId],
  );

  const locationById = useMemo(() => new Map(filteredLocations.map((location) => [location.id, location])), [filteredLocations]);
  const locationVersionById = useMemo(
    () =>
      new Map(
        filteredLocations.flatMap((location) =>
          location.variations.map((version) => [version.id, version] as const),
        ),
      ),
    [filteredLocations],
  );

  const getDefaultVersionId = (location: LocationRow | undefined): string => {
    if (!location) {
      return '';
    }
    return location.defaultVersionId ?? location.variations[0]?.id ?? '';
  };

  const nextOptions = useMemo(() => {
    if (selectedRoute.length >= totalDays - 1) {
      return [];
    }

    const fromId = selectedRoute.length === 0 ? startLocationId : selectedRoute[selectedRoute.length - 1]?.locationId;
    if (!fromId) {
      return [];
    }

    const toIds = filteredSegments.filter((segment) => segment.fromLocationId === fromId).map((segment) => segment.toLocationId);
    return filteredLocations.filter((location) => toIds.includes(location.id));
  }, [filteredLocations, filteredSegments, selectedRoute, startLocationId, totalDays]);

  const autoRows = useMemo((): PlanRow[] => {
    if (!startLocationId || !startLocationVersionId) {
      return [];
    }

    const orderedStops: RouteSelection[] = [{ locationId: startLocationId, locationVersionId: startLocationVersionId }, ...selectedRoute];

    return orderedStops.map((toStop, index) => {
      const dayIndex = index + 1;
      const fromId = index === 0 ? '' : orderedStops[index - 1]?.locationId ?? '';
      const segment = filteredSegments.find((item) => item.fromLocationId === fromId && item.toLocationId === toStop.locationId);
      const toLocation = locationById.get(toStop.locationId);
      const toVersion = locationVersionById.get(toStop.locationVersionId);
      const destinationCellText = formatRouteDestinationCellText({
        locationName: toLocation?.name ?? toStop.locationId,
        averageTravelHours: segment?.averageTravelHours,
        averageDistanceKm: segment?.averageDistanceKm,
      });

      return {
        locationId: toStop.locationId,
        locationVersionId: toStop.locationVersionId,
        dateCellText: `${dayIndex}일차`,
        destinationCellText,
        timeCellText: toTimeCell(toVersion),
        scheduleCellText: toScheduleCell(toVersion),
        lodgingCellText: toLodgingCell(toVersion),
        mealCellText: toMealCell(toVersion),
      };
    });
  }, [filteredSegments, locationById, locationVersionById, selectedRoute, startLocationId, startLocationVersionId]);

  useEffect(() => {
    if (skipNextAutoRowsSync) {
      setSkipNextAutoRowsSync(false);
      return;
    }
    setPlanRows((current) => (arePlanRowsEqual(current, autoRows) ? current : autoRows));
  }, [autoRows, skipNextAutoRowsSync]);

  useEffect(() => {
    setExtraLodgingCounts((prev) => Array.from({ length: totalDays }, (_, index) => prev[index] ?? 0));
  }, [totalDays]);

  useEffect(() => {
    if (!travelStartDate) {
      setTravelEndDate('');
      return;
    }
    setTravelEndDate(toAutoTravelEndDate(travelStartDate, totalDays));
  }, [totalDays, travelStartDate]);

  const handlePickupDateChange = (value: string): void => {
    hasEditedPickupRef.current = true;
    setPickupDate(value);
  };

  const handlePickupTimeChange = (value: string): void => {
    hasEditedPickupRef.current = true;
    setPickupTime(value);
  };

  const handleDropDateChange = (value: string): void => {
    hasEditedDropRef.current = true;
    setDropDate(value);
  };

  const handleDropTimeChange = (value: string): void => {
    hasEditedDropRef.current = true;
    setDropTime(value);
  };

  const handlePlaceTypeChange = (
    setter: (value: PickupDropPlaceType) => void,
    customSetter: (value: string) => void,
    value: PickupDropPlaceType,
  ): void => {
    setter(value);
    if (value !== 'CUSTOM') {
      customSetter('');
    }
  };

  useEffect(() => {
    if (hasEditedPickupRef.current) {
      return;
    }

    setPickupDate(travelStartDate);
    setPickupTime(travelStartDate ? getRecommendedPickupTime(flightInTime) : '');
  }, [flightInTime, travelStartDate]);

  useEffect(() => {
    if (hasEditedDropRef.current) {
      return;
    }

    setDropDate(travelEndDate);
    setDropTime(travelEndDate ? getRecommendedDropTime(flightOutTime) : '');
  }, [flightOutTime, travelEndDate]);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLTextAreaElement>('[data-plan-cell="true"]');
    elements.forEach((element) => autoResizeTextarea(element));
  }, [planRows]);

  const hasMissingSegment = useMemo(() => {
    return selectedRoute.some((toStop, index) => {
      const fromId = index === 0 ? startLocationId : selectedRoute[index - 1]?.locationId ?? '';
      return !filteredSegments.some((segment) => segment.fromLocationId === fromId && segment.toLocationId === toStop.locationId);
    });
  }, [filteredSegments, selectedRoute, startLocationId]);

  const updateCell = (rowIndex: number, field: keyof PlanRow, value: string): void => {
    setPlanRows((prev) => prev.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row)));
  };

  const applyTemplate = (template: PlanTemplateRow, withConfirm = true): void => {
    if (withConfirm && !window.confirm(`템플릿 \"${template.name}\"을(를) 현재 빌더에 적용할까요?`)) {
      return;
    }

    const orderedStops = sortTemplateStops(template.planStops);
    const firstStop = orderedStops[0];
    if (!firstStop) {
      return;
    }

    setSkipNextAutoRowsSync(true);
    setRegionId(template.regionId);
    setTotalDays(template.totalDays);
    setStartLocationId(firstStop.locationId ?? '');
    setStartLocationVersionId(firstStop.locationVersionId ?? '');
    setSelectedRoute(
      orderedStops.slice(1).map((stop) => ({
        locationId: stop.locationId ?? '',
        locationVersionId: stop.locationVersionId ?? '',
      })),
    );
    setPlanRows(
      orderedStops.map((stop) => ({
        locationId: stop.locationId ?? undefined,
        locationVersionId: stop.locationVersionId ?? undefined,
        dateCellText: stop.dateCellText,
        destinationCellText: stop.destinationCellText,
        timeCellText: stop.timeCellText,
        scheduleCellText: stop.scheduleCellText,
        lodgingCellText: stop.lodgingCellText,
        mealCellText: stop.mealCellText,
      })),
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

  const normalizedManualAdjustments = useMemo(
    () =>
      manualAdjustments
        .map((item) => ({
          description: item.description.trim(),
          amountText: item.amountKrw.trim(),
          amountKrw: Number(item.amountKrw),
        }))
        .filter((item) => item.description.length > 0 && item.amountText.length > 0)
        .map((item) => ({ description: item.description, amountKrw: item.amountKrw })),
    [manualAdjustments],
  );

  const hasInvalidManualAdjustments = manualAdjustments.some((item) => {
    const description = item.description.trim();
    const amountText = item.amountKrw.trim();

    if (description.length === 0 && amountText.length === 0) {
      return false;
    }

    return description.length === 0 || amountText.length === 0 || !Number.isInteger(Number(item.amountKrw));
  });

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

  const hasInvalidManualDepositInput = useMemo(() => {
    if (!hasEditedManualDeposit) {
      return false;
    }

    const text = manualDepositInput.trim();
    if (text.length === 0) {
      return false;
    }

    const value = Number(text);
    return !Number.isInteger(value) || value < 0;
  }, [hasEditedManualDeposit, manualDepositInput]);

  const hasMissingCustomPlaceText = useMemo(
    () =>
      [
        [pickupPlaceType, pickupPlaceCustomText],
        [dropPlaceType, dropPlaceCustomText],
        [externalPickupPlaceType, externalPickupPlaceCustomText],
        [externalDropPlaceType, externalDropPlaceCustomText],
      ].some(([placeType, customText]) => placeType === 'CUSTOM' && (customText?.trim() ?? '').length === 0),
    [
      dropPlaceCustomText,
      dropPlaceType,
      externalDropPlaceCustomText,
      externalDropPlaceType,
      externalPickupPlaceCustomText,
      externalPickupPlaceType,
      pickupPlaceCustomText,
      pickupPlaceType,
    ],
  );

  const headcountFemale = headcountTotal - headcountMale;
  const hasValidDateRange = Boolean(travelStartDate && travelEndDate) && travelStartDate <= travelEndDate;
  const hasValidHeadcount = headcountTotal > 0 && headcountMale >= 0 && headcountFemale >= 0 && headcountMale <= headcountTotal;
  const hasHiaceHeadcountViolation = vehicleType === '하이에이스' && headcountTotal < 3;

  const canPreviewPricing = Boolean(
    regionId &&
      travelStartDate &&
      !hasInvalidManualAdjustments &&
      !hasHiaceHeadcountViolation,
  );

  const { data: pricingPreviewData, previousData: pricingPreviewPreviousData, error: pricingPreviewError } = useQuery<{ planPricingPreview: PricingPreviewRow }>(
    PLAN_PRICING_PREVIEW_QUERY,
    {
      skip: !canPreviewPricing,
      variables: {
        input: {
          regionId,
          variantType,
          totalDays,
          planStops: planRows,
          travelStartDate: toIsoDateTime(travelStartDate),
          headcountTotal,
          vehicleType,
          includeRentalItems,
          eventIds,
          extraLodgings,
          manualAdjustments: normalizedManualAdjustments,
          manualDepositAmountKrw: normalizedManualDepositAmountKrw,
        },
      },
    },
  );

  const pricingPreview = pricingPreviewData?.planPricingPreview ?? pricingPreviewPreviousData?.planPricingPreview ?? null;
  const pricingBuckets = useMemo(
    () =>
      pricingPreview
        ? buildPricingViewBuckets(pricingPreview.lines, pricingPreview.totalAmountKrw)
        : null,
    [pricingPreview],
  );
  const pricingPreviewErrorMessage =
    pricingPreviewError?.graphQLErrors?.[0]?.message ?? pricingPreviewError?.message ?? '금액 미리보기 계산 중 오류가 발생했습니다.';

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
      hasValidDateRange &&
      hasValidHeadcount &&
      !hasHiaceHeadcountViolation &&
      !hasInvalidManualAdjustments &&
      !hasInvalidManualDepositInput &&
      !hasMissingCustomPlaceText &&
      (includeRentalItems ? rentalItemsText.trim() : true) &&
      startLocationId &&
      startLocationVersionId &&
      selectedRoute.length === totalDays - 1 &&
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
        flightInTime,
        flightOutTime,
        pickupDate,
        pickupTime,
        dropDate,
        dropTime,
        pickupPlaceType,
        pickupPlaceCustomText,
        dropPlaceType,
        dropPlaceCustomText,
        externalPickupDate,
        externalPickupTime,
        externalPickupPlaceType,
        externalPickupPlaceCustomText,
        externalDropDate,
        externalDropTime,
        externalDropPlaceType,
        externalDropPlaceCustomText,
        pickupDropNote: '',
        externalPickupDropNote: '',
        specialNote: specialNote.trim(),
        includeRentalItems,
        rentalItemsText: rentalItemsText.trim(),
        eventNames: selectedEventNames,
        remark: remark.trim(),
        planStops: planRows,
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
      flightInTime,
      flightOutTime,
      pickupDate,
      pickupTime,
      dropDate,
      dropTime,
      pickupPlaceType,
      pickupPlaceCustomText,
      dropPlaceType,
      dropPlaceCustomText,
      externalPickupDate,
      externalPickupTime,
      externalPickupPlaceType,
      externalPickupPlaceCustomText,
      externalDropDate,
      externalDropTime,
      externalDropPlaceType,
      externalDropPlaceCustomText,
      specialNote,
      includeRentalItems,
      rentalItemsText,
      selectedEventNames,
      remark,
      planRows,
      pricingPreview,
    ],
  );
  const { data: previewEstimateData, guidesLoading: previewGuidesLoading } = useBuilderEstimatePreview(estimateDraftSnapshot);
  const previewPage1Editor: EstimatePage1Editor = {
    headcountTotal,
    headcountMale,
    travelStartDate,
    travelEndDate,
    vehicleType,
    vehicleOptions: VEHICLES,
    flightInTime,
    flightOutTime,
    pickupDate,
    pickupTime,
    pickupPlaceType,
    pickupPlaceCustomText,
    dropDate,
    dropTime,
    dropPlaceType,
    dropPlaceCustomText,
    externalPickupDate,
    externalPickupTime,
    externalPickupPlaceType,
    externalPickupPlaceCustomText,
    externalDropDate,
    externalDropTime,
    externalDropPlaceType,
    externalDropPlaceCustomText,
    eventIds,
    eventOptions: eventOptions.map((eventOption) => ({ id: eventOption.id, name: eventOption.name })),
    specialNoteText: specialNote,
    rentalItemsText,
    remarkText: remark,
    onHeadcountTotalChange: (value) => {
      const nextTotal = Math.max(1, value || 1);
      setHeadcountTotal(nextTotal);
      setHeadcountMale((current) => Math.min(current, nextTotal));
    },
    onHeadcountMaleChange: (value) => {
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
    onFlightInTimeChange: setFlightInTime,
    onFlightOutTimeChange: setFlightOutTime,
    onPickupDateChange: handlePickupDateChange,
    onPickupTimeChange: handlePickupTimeChange,
    onPickupPlaceTypeChange: (value) => handlePlaceTypeChange(setPickupPlaceType, setPickupPlaceCustomText, value),
    onPickupPlaceCustomTextChange: setPickupPlaceCustomText,
    onDropDateChange: handleDropDateChange,
    onDropTimeChange: handleDropTimeChange,
    onDropPlaceTypeChange: (value) => handlePlaceTypeChange(setDropPlaceType, setDropPlaceCustomText, value),
    onDropPlaceCustomTextChange: setDropPlaceCustomText,
    onExternalPickupDateChange: setExternalPickupDate,
    onExternalPickupTimeChange: setExternalPickupTime,
    onExternalPickupPlaceTypeChange: (value) =>
      handlePlaceTypeChange(setExternalPickupPlaceType, setExternalPickupPlaceCustomText, value),
    onExternalPickupPlaceCustomTextChange: setExternalPickupPlaceCustomText,
    onExternalDropDateChange: setExternalDropDate,
    onExternalDropTimeChange: setExternalDropTime,
    onExternalDropPlaceTypeChange: (value) =>
      handlePlaceTypeChange(setExternalDropPlaceType, setExternalDropPlaceCustomText, value),
    onExternalDropPlaceCustomTextChange: setExternalDropPlaceCustomText,
    onToggleEventId: (value) =>
      setEventIds((current) => (current.includes(value) ? current.filter((id) => id !== value) : [...current, value])),
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
          <p className="mt-1 text-sm text-slate-600">아래에서 고객 유형을 선택하면 다음 단계가 열립니다.</p>
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
                  <p className={`mt-2 text-sm ${homeEntryMode === 'new' ? 'text-slate-100' : 'text-slate-600'}`}>
                    고객을 새로 생성하고 일정 제작을 시작합니다.
                  </p>
                </div>
                <div className={`text-xs font-medium ${homeEntryMode === 'new' ? 'text-slate-100' : 'text-slate-500'}`}>
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
                  <p className="mt-2 text-sm text-slate-600">고객 페이지로 이동해 기존 고객을 선택합니다.</p>
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
                    <p className="mt-1 text-xs text-slate-600">템플릿 없이 새 일정 빌더를 바로 시작합니다.</p>
                    <div className="mt-3">
                      <Button
                        disabled={!homeSelectedUserId}
                        onClick={() => navigate(`/itinerary-builder?userId=${encodeURIComponent(homeSelectedUserId)}`)}
                      >
                        빈 페이지로 시작
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900">템플릿에서 선택</h3>
                    <p className="mt-1 text-xs text-slate-600">템플릿을 먼저 선택한 뒤 빌더를 시작합니다.</p>
                    <div className="mt-3 max-h-48 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
                      {templateOptions.map((template) => (
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
                          <Button variant="outline" onClick={() => setHomeSelectedTemplateId(template.id)}>
                            선택
                          </Button>
                        </div>
                      ))}
                      {templateOptions.length === 0 ? (
                        <p className="px-1 py-2 text-xs text-slate-500">선택 가능한 템플릿이 없습니다.</p>
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
              <p className="mt-1 text-sm text-slate-600">새 고객을 등록하면 바로 신규 고객 시작에 사용됩니다.</p>

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
                {homeCreateUserError ? <p className="text-xs text-rose-700">{homeCreateUserError}</p> : null}
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
                      const message = error instanceof Error ? error.message : '고객 생성에 실패했습니다.';
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
    <div className={`min-h-screen text-slate-900 ${isPreviewEnabled ? 'lg:h-screen lg:min-h-0' : ''}`}>
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
          <Button variant="outline" className="shrink-0" onClick={() => setIsPreviewEnabled((prev) => !prev)}>
            {isPreviewEnabled ? '미리보기 끄기' : '미리보기 켜기'}
          </Button>
        </div>
      </div>

      <div className={isPreviewEnabled ? 'lg:grid lg:h-full lg:grid-cols-2' : ''}>
        <div
          className={`${
            !isPreviewEnabled || activePane === 'builder' ? 'block' : 'hidden'
          } bg-slate-50 ${
            isPreviewEnabled ? 'border-b border-slate-200 lg:block lg:h-full lg:overflow-y-auto lg:border-b-0 lg:border-r' : ''
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
            <p className="mt-1 text-sm text-slate-600">
              {isTemplateOnlyMode
                ? '템플릿 수정 모드 (Plan 저장 비활성)'
                : isVersionMode
                  ? '기존 버전 기반 새 버전 생성'
                  : '신규 Plan + 초기 버전 생성'}
            </p>
          </div>
          <div className="flex gap-2 no-print">
            <Button variant="outline" onClick={() => setIsPreviewEnabled((prev) => !prev)}>
              {isPreviewEnabled ? '미리보기 끄기' : '미리보기 켜기'}
            </Button>
            <Button variant="outline" onClick={openEstimatePdf}>
              견적서 PDF
            </Button>
            <Button variant="outline" onClick={() => setPlanRows(autoRows)}>
              자동값 다시 채우기
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
                          flightInTime,
                          flightOutTime,
                          pickupDate: pickupDate ? toIsoDateTime(pickupDate) : undefined,
                          pickupTime: pickupTime.trim() || undefined,
                          dropDate: dropDate ? toIsoDateTime(dropDate) : undefined,
                          dropTime: dropTime.trim() || undefined,
                          pickupPlaceType,
                          pickupPlaceCustomText: normalizePickupDropCustomText(pickupPlaceType, pickupPlaceCustomText),
                          dropPlaceType,
                          dropPlaceCustomText: normalizePickupDropCustomText(dropPlaceType, dropPlaceCustomText),
                          externalPickupDate: externalPickupDate ? toIsoDateTime(externalPickupDate) : undefined,
                          externalPickupTime: externalPickupTime.trim() || undefined,
                          externalPickupPlaceType,
                          externalPickupPlaceCustomText: normalizePickupDropCustomText(
                            externalPickupPlaceType,
                            externalPickupPlaceCustomText,
                          ),
                          externalDropDate: externalDropDate ? toIsoDateTime(externalDropDate) : undefined,
                          externalDropTime: externalDropTime.trim() || undefined,
                          externalDropPlaceType,
                          externalDropPlaceCustomText: normalizePickupDropCustomText(
                            externalDropPlaceType,
                            externalDropPlaceCustomText,
                          ),
                          pickupDropNote: undefined,
                          externalPickupDropNote: undefined,
                          specialNote: specialNote.trim() || undefined,
                          includeRentalItems,
                          rentalItemsText,
                          eventIds,
                          extraLodgings,
                          remark: remark.trim() || undefined,
                        },
                        planStops: planRows,
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
                          flightInTime,
                          flightOutTime,
                          pickupDate: pickupDate ? toIsoDateTime(pickupDate) : undefined,
                          pickupTime: pickupTime.trim() || undefined,
                          dropDate: dropDate ? toIsoDateTime(dropDate) : undefined,
                          dropTime: dropTime.trim() || undefined,
                          pickupPlaceType,
                          pickupPlaceCustomText: normalizePickupDropCustomText(pickupPlaceType, pickupPlaceCustomText),
                          dropPlaceType,
                          dropPlaceCustomText: normalizePickupDropCustomText(dropPlaceType, dropPlaceCustomText),
                          externalPickupDate: externalPickupDate ? toIsoDateTime(externalPickupDate) : undefined,
                          externalPickupTime: externalPickupTime.trim() || undefined,
                          externalPickupPlaceType,
                          externalPickupPlaceCustomText: normalizePickupDropCustomText(
                            externalPickupPlaceType,
                            externalPickupPlaceCustomText,
                          ),
                          externalDropDate: externalDropDate ? toIsoDateTime(externalDropDate) : undefined,
                          externalDropTime: externalDropTime.trim() || undefined,
                          externalDropPlaceType,
                          externalDropPlaceCustomText: normalizePickupDropCustomText(
                            externalDropPlaceType,
                            externalDropPlaceCustomText,
                          ),
                          pickupDropNote: undefined,
                          externalPickupDropNote: undefined,
                          specialNote: specialNote.trim() || undefined,
                          includeRentalItems,
                          rentalItemsText,
                          eventIds,
                          extraLodgings,
                          remark: remark.trim() || undefined,
                        },
                        planStops: planRows,
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

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
            <h2 className="font-medium">설정</h2>
            <div className="mt-3 grid gap-3">
              {!isVersionMode && hasPlanContext ? (
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-slate-600">제목</span>
                  <input
                    value={planTitle}
                    onChange={(event) => setPlanTitle(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="신규 제목"
                  />
                </label>
              ) : null}

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

              <div className="grid gap-1 text-sm">
                <span className="text-xs text-slate-600">지역</span>
                <div className="flex flex-wrap gap-2">
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
                          setPlanRows([]);
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
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={headcountTotal}
                    onChange={(event) => {
                      const total = Math.max(1, Number(event.target.value) || 1);
                      setHeadcountTotal(total);
                      setHeadcountMale((prev) => Math.min(prev, total));
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <div className="grid gap-2 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-slate-600">남성 토큰 선택 (성비조절)</div>
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={headcountMale === 0}
                          onChange={(event) => {
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
                            onClick={() => setHeadcountMale(count)}
                            className={`h-7 w-7 rounded-full border text-xs ${
                              isMaleToken
                                ? 'border-blue-700 bg-blue-600 text-white'
                                : 'border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100'
                            }`}
                            title={isMaleToken ? `남 ${count}` : `여 ${count - headcountMale}`}
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


              <div className="grid gap-1 text-sm">
                <span className="text-xs text-slate-600">일수</span>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 12 }, (_, idx) => idx + 2).map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setTotalDays(day);
                        setSelectedRoute((prev) => prev.slice(0, day - 1));
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

              <div className="grid gap-2 text-sm">
                <span className="text-xs text-slate-600">여행 기간</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={travelStartDate}
                    onChange={(event) => setTravelStartDate(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={travelEndDate}
                    onChange={(event) => setTravelEndDate(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
                {hasHiaceHeadcountViolation ? (
                  <p className="text-xs text-rose-700">하이에이스는 3인 이상부터 선택 가능하며, 7인 이상은 추가금이 없습니다.</p>
                ) : null}
              </div>

              <div className="grid gap-2 text-sm">
                <span className="text-xs text-slate-600">항공권 IN</span>
                <div className="flex flex-wrap gap-2">
                  {FLIGHT_IN_TIME_OPTIONS.map((time) => (
                    <button
                      key={`in-${time}`}
                      type="button"
                      onClick={() => {
                        setIsCustomFlightInTime(false);
                        setFlightInTime(time);
                      }}
                      className={`rounded-xl border px-3 py-1.5 text-sm ${
                        flightInTime === time
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomFlightInTime((prev) => !prev)}
                    className={`rounded-xl border px-3 py-1.5 text-sm ${
                      isCustomFlightInTime
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    직접
                  </button>
                  {isCustomFlightInTime ? (
                    <input
                      value={flightInTime}
                      onChange={(event) => setFlightInTime(event.target.value)}
                      placeholder="직접"
                      className="h-[34px] w-[72px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                    />
                  ) : null}
                </div>
                <span className="text-xs text-slate-600">항공권 OUT</span>
                <div className="flex flex-wrap gap-2">
                  {FLIGHT_OUT_TIME_OPTIONS.map((time) => (
                    <button
                      key={`out-${time}`}
                      type="button"
                      onClick={() => {
                        setIsCustomFlightOutTime(false);
                        setFlightOutTime(time);
                      }}
                      className={`rounded-xl border px-3 py-1.5 text-sm ${
                        flightOutTime === time
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomFlightOutTime((prev) => !prev)}
                    className={`rounded-xl border px-3 py-1.5 text-sm ${
                      isCustomFlightOutTime
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    직접
                  </button>
                  {isCustomFlightOutTime ? (
                    <input
                      value={flightOutTime}
                      onChange={(event) => setFlightOutTime(event.target.value)}
                      placeholder="직접"
                      className="h-[34px] w-[72px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                    />
                  ) : null}
                </div>
              </div>

              <div className="grid gap-2 text-sm">
                <span className="text-xs text-slate-600">픽업 / 드랍 날짜 및 시간</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(event) => handlePickupDateChange(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(event) => handlePickupTimeChange(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={dropDate}
                    onChange={(event) => handleDropDateChange(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={dropTime}
                    onChange={(event) => handleDropTimeChange(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <PlaceField
                    label="픽업 장소"
                    placeType={pickupPlaceType}
                    customText={pickupPlaceCustomText}
                    onPlaceTypeChange={(value) => handlePlaceTypeChange(setPickupPlaceType, setPickupPlaceCustomText, value)}
                    onCustomTextChange={setPickupPlaceCustomText}
                  />
                  <PlaceField
                    label="드랍 장소"
                    placeType={dropPlaceType}
                    customText={dropPlaceCustomText}
                    onPlaceTypeChange={(value) => handlePlaceTypeChange(setDropPlaceType, setDropPlaceCustomText, value)}
                    onCustomTextChange={setDropPlaceCustomText}
                  />
                </div>
              </div>

              <div className="grid gap-2 text-sm">
                <span className="text-xs text-slate-600">실투어 외 픽업 / 드랍 날짜 및 시간</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={externalPickupDate}
                    onChange={(event) => setExternalPickupDate(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={externalPickupTime}
                    onChange={(event) => setExternalPickupTime(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={externalDropDate}
                    onChange={(event) => setExternalDropDate(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={externalDropTime}
                    onChange={(event) => setExternalDropTime(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <PlaceField
                    label="실투어 외 픽업 장소"
                    placeType={externalPickupPlaceType}
                    customText={externalPickupPlaceCustomText}
                    onPlaceTypeChange={(value) =>
                      handlePlaceTypeChange(setExternalPickupPlaceType, setExternalPickupPlaceCustomText, value)
                    }
                    onCustomTextChange={setExternalPickupPlaceCustomText}
                  />
                  <PlaceField
                    label="실투어 외 드랍 장소"
                    placeType={externalDropPlaceType}
                    customText={externalDropPlaceCustomText}
                    onPlaceTypeChange={(value) =>
                      handlePlaceTypeChange(setExternalDropPlaceType, setExternalDropPlaceCustomText, value)
                    }
                    onCustomTextChange={setExternalDropPlaceCustomText}
                  />
                </div>
              </div>

              <label className="grid gap-1 text-sm">
                <span className="text-xs text-slate-600">
                  특별요청사항 <span className="ml-1 text-slate-400">*고객에게 노출됩니다</span>
                </span>
                <textarea
                  value={specialNote}
                  onChange={(event) => setSpecialNote(event.target.value)}
                  rows={3}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="줄바꿈 포함 입력 가능"
                />
              </label>

              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">기본 대여물품</span>
                  <Button
                    variant="outline"
                    disabled={!includeRentalItems}
                    onClick={() => setRentalItemsText(buildDefaultRentalItems(headcountTotal))}
                  >
                    기본값 다시 계산
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
                  {eventOptions.length === 0 ? <span className="text-xs text-slate-500">진행중 이벤트 없음</span> : null}
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

              <div className="grid gap-2 text-sm">
                <span className="text-xs text-slate-600">숙소 추가 수량(일차별)</span>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: totalDays }, (_, index) => (
                    <label key={`extra-lodging-${index + 1}`} className="grid gap-1">
                      <span className="text-xs text-slate-500">{index + 1}일차</span>
                      <input
                        type="number"
                        min={0}
                        value={extraLodgingCounts[index] ?? 0}
                        onChange={(event) =>
                          setExtraLodgingCounts((prev) =>
                            prev.map((value, valueIndex) =>
                              valueIndex === index ? Math.max(0, Number(event.target.value) || 0) : value,
                            ),
                          )
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">기타금액(증액/할인)</span>
                  <Button
                    variant="outline"
                    onClick={() => setManualAdjustments((prev) => [...prev, { description: '', amountKrw: '0' }])}
                  >
                    항목 추가
                  </Button>
                </div>
                {manualAdjustments.length === 0 ? (
                  <p className="text-xs text-slate-500">추가된 기타금액 항목이 없습니다.</p>
                ) : (
                  <div className="grid gap-2">
                    {manualAdjustments.map((item, index) => (
                      <div key={`manual-adjustment-${index}`} className="grid grid-cols-[1fr_140px_auto] gap-2">
                        <input
                          value={item.description}
                          onChange={(event) =>
                            setManualAdjustments((prev) =>
                              prev.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, description: event.target.value } : row,
                              ),
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="내용"
                        />
                        <input
                          type="number"
                          value={item.amountKrw}
                          onChange={(event) =>
                            setManualAdjustments((prev) =>
                              prev.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, amountKrw: event.target.value } : row,
                              ),
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="금액(+/-)"
                        />
                        <Button
                          variant="destructive"
                          onClick={() =>
                            setManualAdjustments((prev) => prev.filter((_row, rowIndex) => rowIndex !== index))
                          }
                        >
                          삭제
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {hasInvalidManualAdjustments ? (
                  <p className="text-xs text-rose-700">기타금액은 내용과 정수 금액(+/-)을 함께 입력해주세요.</p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm lg:col-span-2">
            <h2 className="font-medium">일차별 목적지 선택</h2>
            <p className="mt-1 text-xs text-slate-600">이전 일차와 연결 가능한 목적지만 버튼으로 노출됩니다.</p>
            <div className="mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="text-xs font-semibold text-slate-700">템플릿 불러오기 (현재 지역/일수)</div>
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
                  disabled={!regionId || totalDays <= 0 || routePresetOptions.length === 0 || !routePresetSelected}
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
                <p className="text-xs text-slate-500">선택 가능한 템플릿이 없습니다. 지역과 일수를 확인하세요.</p>
              ) : null}
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-medium">1일차 출발지</div>
                {startLocationId ? (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="text-slate-700">
                      {locationById.get(startLocationId)?.name ?? startLocationId}
                      {startLocationVersionId ? ` (${formatLocationVersion(locationVersionById.get(startLocationVersionId))})` : ''}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStartLocationId('');
                        setStartLocationVersionId('');
                        setSelectedRoute([]);
                        setPlanRows([]);
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
                    {filteredLocations.map((location) => (
                      <button
                        key={`start-${location.id}`}
                        type="button"
                        onClick={() => {
                          setStartLocationId(location.id);
                          setStartLocationVersionId(getDefaultVersionId(location));
                          setSelectedRoute([]);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-100"
                      >
                        {location.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                {startLocationId ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(locationById.get(startLocationId)?.variations ?? []).map((version) => (
                      <button
                        key={`start-version-${version.id}`}
                        type="button"
                        onClick={() => setStartLocationVersionId(version.id)}
                        className={`rounded-lg border px-3 py-1 text-xs ${
                          startLocationVersionId === version.id
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {formatLocationVersion(version)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {selectedRoute.map((stop, index) => (
                <div key={`selected-${index + 1}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-medium">{index + 2}일차</div>
                  <div className="mt-1 text-slate-700">
                    {locationById.get(stop.locationId)?.name ?? stop.locationId}
                    {` (${formatLocationVersion(locationVersionById.get(stop.locationVersionId))})`}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(locationById.get(stop.locationId)?.variations ?? []).map((version) => (
                      <button
                        key={`route-version-${index}-${version.id}`}
                        type="button"
                        onClick={() =>
                          setSelectedRoute((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, locationVersionId: version.id } : item,
                            ),
                          )
                        }
                        className={`rounded-lg border px-3 py-1 text-xs ${
                          stop.locationVersionId === version.id
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {formatLocationVersion(version)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {startLocationId && startLocationVersionId && selectedRoute.length < totalDays - 1 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4">
                  <div className="mb-3 text-sm font-medium">{selectedRoute.length + 2}일차 선택</div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {nextOptions.map((location) => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() =>
                          setSelectedRoute((prev) => [
                            ...prev,
                            {
                              locationId: location.id,
                              locationVersionId: getDefaultVersionId(location),
                            },
                          ])
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-100"
                      >
                        {location.name}
                      </button>
                    ))}
                  </div>
                  {nextOptions.length === 0 ? <p className="text-xs text-amber-700">선택 가능한 다음 목적지가 없습니다.</p> : null}
                </div>
              ) : null}

              {selectedRoute.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoute([]);
                    setPlanRows([]);
                  }}
                  className="text-xs text-red-500 underline"
                >
                  전체 루트 초기화
                </button>
              ) : null}
            </div>
          </Card>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-medium">일정표 편집기</h2>
            <p className="mt-1 text-xs text-slate-600">모든 셀은 줄바꿈 포함 자유 편집됩니다.</p>
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
                {planRows.map((row, rowIndex) => (
                  <tr key={`day-row-${rowIndex + 1}`} className="border-t border-slate-200 align-top">
                    <Td>
                      <textarea
                        value={row.dateCellText}
                        onChange={(event) => {
                          updateCell(rowIndex, 'dateCellText', event.target.value);
                          autoResizeTextarea(event.currentTarget);
                        }}
                        onInput={(event) => autoResizeTextarea(event.currentTarget)}
                        rows={1}
                        data-plan-cell="true"
                        className="w-full resize-none overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 whitespace-pre-wrap"
                      />
                    </Td>
                    <Td>
                      <textarea
                        value={row.destinationCellText}
                        onChange={(event) => {
                          updateCell(rowIndex, 'destinationCellText', event.target.value);
                          autoResizeTextarea(event.currentTarget);
                        }}
                        onInput={(event) => autoResizeTextarea(event.currentTarget)}
                        rows={1}
                        data-plan-cell="true"
                        className="w-full resize-none overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 whitespace-pre-wrap"
                      />
                    </Td>
                    <Td>
                      <textarea
                        value={row.timeCellText}
                        onChange={(event) => {
                          updateCell(rowIndex, 'timeCellText', event.target.value);
                          autoResizeTextarea(event.currentTarget);
                        }}
                        onInput={(event) => autoResizeTextarea(event.currentTarget)}
                        rows={1}
                        data-plan-cell="true"
                        className="w-full resize-none overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 whitespace-pre-wrap"
                      />
                    </Td>
                    <Td>
                      <textarea
                        value={row.scheduleCellText}
                        onChange={(event) => {
                          updateCell(rowIndex, 'scheduleCellText', event.target.value);
                          autoResizeTextarea(event.currentTarget);
                        }}
                        onInput={(event) => autoResizeTextarea(event.currentTarget)}
                        rows={1}
                        data-plan-cell="true"
                        className="w-full resize-none overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 whitespace-pre-wrap"
                      />
                    </Td>
                    <Td>
                      <textarea
                        value={row.lodgingCellText}
                        onChange={(event) => {
                          updateCell(rowIndex, 'lodgingCellText', event.target.value);
                          autoResizeTextarea(event.currentTarget);
                        }}
                        onInput={(event) => autoResizeTextarea(event.currentTarget)}
                        rows={1}
                        data-plan-cell="true"
                        className="w-full resize-none overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 whitespace-pre-wrap"
                      />
                    </Td>
                    <Td>
                      <textarea
                        value={row.mealCellText}
                        onChange={(event) => {
                          updateCell(rowIndex, 'mealCellText', event.target.value);
                          autoResizeTextarea(event.currentTarget);
                        }}
                        onInput={(event) => autoResizeTextarea(event.currentTarget)}
                        rows={1}
                        data-plan-cell="true"
                        className="w-full resize-none overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 whitespace-pre-wrap"
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </section>

        <section className="space-y-4">
          <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
            <h2 className="font-medium">금액</h2>
            {pricingPreviewError ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                {pricingPreviewErrorMessage}
              </div>
            ) : null}
            {!pricingPreview ? (
              <p className="mt-3 text-sm text-slate-500">요건이 충족되면 금액이 자동 계산됩니다.</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {pricingBuckets ? (
                  <>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <h3 className="text-sm font-semibold text-slate-900">직원 확인용</h3>

                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="font-medium text-slate-900">기본금 {formatKrw(pricingBuckets.baseTotal)}</div>
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
                                  <tr key={`${line.lineCode}-base-${index}`} className="border-t border-slate-200">
                                    <td className="px-2 py-1.5">{getPricingLineLabel(line)}</td>
                                    <td className="px-2 py-1.5">{line.unitPriceKrw !== null ? formatKrw(line.unitPriceKrw) : '-'}</td>
                                    <td className="px-2 py-1.5">{line.quantity}</td>
                                    <td className="px-2 py-1.5">{formatKrw(line.amountKrw)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="font-medium text-slate-900">추가금 {formatKrw(pricingBuckets.addonTotal)}</div>
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
                                {pricingBuckets.addonLines.map((line, index) => (
                                  <tr key={`${line.lineCode}-addon-${index}`} className="border-t border-slate-200">
                                    <td className="px-2 py-1.5">
                                      {getPricingLineLabel(line)}
                                      {line.description && line.lineCode !== 'MANUAL_ADJUSTMENT' ? (
                                        <div className="text-[11px] text-slate-500">{line.description}</div>
                                      ) : null}
                                    </td>
                                    <td className="px-2 py-1.5">{line.unitPriceKrw !== null ? formatKrw(line.unitPriceKrw) : '-'}</td>
                                    <td className="px-2 py-1.5">{line.quantity}</td>
                                    <td className="px-2 py-1.5">{formatKrw(line.amountKrw)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="font-medium text-slate-900">보증금 {formatKrw(pricingPreview.securityDepositAmountKrw)}</div>
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
                                  {pricingPreview.securityDepositEvent ? `이벤트(${pricingPreview.securityDepositEvent.name})` : '기본 물품'}
                                </td>
                                <td className="px-2 py-1.5">
                                  {pricingPreview.securityDepositMode === 'NONE'
                                    ? '-'
                                    : `${formatKrw(pricingPreview.securityDepositUnitPriceKrw)}(${formatSecurityDepositScope(pricingPreview.securityDepositMode)}) x ${pricingPreview.securityDepositQuantity}`}
                                </td>
                                <td className="px-2 py-1.5">{formatKrw(pricingPreview.securityDepositAmountKrw)}</td>
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
                            {hasInvalidManualDepositInput ? (
                              <p className="text-rose-600">예약금은 0 이상의 정수만 입력 가능합니다.</p>
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
                                <td className="px-2 py-1.5">{formatKrw(pricingPreview.depositAmountKrw)}</td>
                              </tr>
                              <tr className="border-t border-slate-200">
                                <td className="px-2 py-1.5">잔금</td>
                                <td className="px-2 py-1.5">{formatKrw(pricingPreview.balanceAmountKrw)}</td>
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
                          <div className="font-medium text-slate-900">기본금 {formatKrw(pricingBuckets.baseTotal)}</div>
                        </div>
                        <div className="rounded-xl border border-blue-200 bg-white p-3">
                          <div className="font-medium text-slate-900">추가금 {formatKrw(pricingBuckets.addonTotal)}</div>
                          {pricingBuckets.addonLines.length === 0 ? (
                            <p className="mt-2 text-xs text-blue-700">추가금 항목이 없습니다.</p>
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
                                  {pricingBuckets.addonLines.map((line, index) => (
                                    <tr key={`${line.lineCode}-customer-addon-${index}`} className="border-t border-blue-100">
                                      <td className="px-2 py-1.5">
                                        {getPricingLineLabel(line)}
                                        {line.description && line.lineCode !== 'MANUAL_ADJUSTMENT' ? (
                                          <div className="text-[11px] text-blue-700">{line.description}</div>
                                        ) : null}
                                      </td>
                                      <td className="px-2 py-1.5">{line.unitPriceKrw !== null ? formatKrw(line.unitPriceKrw) : '-'}</td>
                                      <td className="px-2 py-1.5">{line.quantity}</td>
                                      <td className="px-2 py-1.5">{formatKrw(line.amountKrw)}</td>
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
                            <div className="border-r border-slate-200 px-2 py-2">예약금(1인)</div>
                            <div className="border-r border-slate-200 px-2 py-2">잔금(1인)</div>
                            <div className="px-2 py-2">보증금(팀당/인당)</div>
                          </div>
                          <div className="grid grid-cols-4 text-center text-sm text-slate-900">
                            <div className="border-r border-slate-200 px-2 py-4 font-semibold">{formatKrw(pricingBuckets.grandTotal)}</div>
                            <div className="border-r border-slate-200 px-2 py-4">{formatKrw(pricingPreview.depositAmountKrw)}</div>
                            <div className="border-r border-slate-200 px-2 py-4">{formatKrw(pricingPreview.balanceAmountKrw)}</div>
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
              <h2 className="font-medium">검증</h2>
              <span className="text-xs text-slate-500">{isValidationOpen ? '닫기' : '열기'}</span>
            </button>
            {isValidationOpen ? (
              <div id="builder-validation-panel" className="mt-3 space-y-2 text-sm">
                {hasMissingSegment ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    일부 구간 템플릿이 없습니다. Segment 데이터를 보강해주세요.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">현재 구간 커버리지 정상</div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-3">편집 행 수: {planRows.length}</div>
                {hasHiaceHeadcountViolation ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-900">
                    하이에이스는 3인 이상부터 선택 가능하며, 7인 이상은 추가금이 없습니다.
                  </div>
                ) : null}
                {hasInvalidManualAdjustments ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-900">
                    기타금액 항목의 내용/금액을 확인해주세요.
                  </div>
                ) : null}
                {hasInvalidManualDepositInput ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-900">
                    예약금 수동 입력값을 확인해주세요.
                  </div>
                ) : null}
                {hasMissingCustomPlaceText ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-900">
                    직접입력 장소를 선택한 항목의 장소명을 입력해주세요.
                  </div>
                ) : null}
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
              <h2 className="font-medium">저장 데이터 미리보기</h2>
              <span className="text-xs text-slate-500">{isPayloadPreviewOpen ? '닫기' : '열기'}</span>
            </button>
            {isPayloadPreviewOpen ? (
              <>
                <p className="mt-1 text-xs text-slate-600">저장 시 서버로 전달되는 요약입니다.</p>
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
        flightInTime,
        flightOutTime,
        pickupDate,
        pickupTime,
        pickupPlaceType,
        pickupPlaceCustomText,
        dropDate,
        dropTime,
        dropPlaceType,
        dropPlaceCustomText,
        externalPickupDate,
        externalPickupTime,
        externalPickupPlaceType,
        externalPickupPlaceCustomText,
        externalDropDate,
        externalDropTime,
        externalDropPlaceType,
        externalDropPlaceCustomText,
        specialNote,
        includeRentalItems,
        rentalItemsText,
        eventIds,
        extraLodgings,
        remark,
      },
      manualAdjustments: normalizedManualAdjustments,
      manualDepositAmountKrw: normalizedManualDepositAmountKrw,
      selectedRoute,
      planStops: planRows,
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
          flightInTime,
          flightOutTime,
          pickupDate,
          pickupTime,
          pickupPlaceType,
          pickupPlaceCustomText,
          dropDate,
          dropTime,
          dropPlaceType,
          dropPlaceCustomText,
          externalPickupDate,
          externalPickupTime,
          externalPickupPlaceType,
          externalPickupPlaceCustomText,
          externalDropDate,
          externalDropTime,
          externalDropPlaceType,
          externalDropPlaceCustomText,
          specialNote,
          includeRentalItems,
          rentalItemsText,
          eventIds,
          extraLodgings,
          remark,
        },
        manualAdjustments: normalizedManualAdjustments,
        manualDepositAmountKrw: normalizedManualDepositAmountKrw,
        selectedRoute,
        initialVersion: {
          planStops: planRows,
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
          <aside className={`${activePane === 'preview' ? 'block' : 'hidden'} bg-slate-100/80 lg:block lg:h-full lg:overflow-y-auto`}>
            <div className="p-4 sm:p-6 lg:sticky lg:top-0 lg:p-6">
              <div className="estimate-preview-panel rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">실시간 견적서 미리보기</h2>
                    <p className="mt-1 text-xs text-slate-600">좌측 입력값이 우측 문서에 바로 반영됩니다.</p>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
                    {previewGuidesLoading ? '여행지 안내 동기화 중' : '실시간 반영'}
                  </div>
                </div>

              {previewEstimateData ? (
                <div className="estimate-preview-frame">
                    <EstimateDocument data={previewEstimateData} viewMode="screen-preview" page1Editor={previewPage1Editor} />
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
      </div>
    </div>
  );
}
