import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toFacilityLabel, toMealLabel } from '../features/location/display';
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
  longDistanceSegmentCount: number;
  extraLodgingCount: number;
  lines: PricingLineRow[];
}

interface RouteSelection {
  locationId: string;
  locationVersionId: string;
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
const FLIGHT_TIME_OPTIONS = ['06:30', '08:00', '09:30', '11:00', '13:30', '15:00', '17:30', '21:00'] as const;
const EVENT_OPTIONS = ['A', 'B', 'C'] as const;

function toIsoDateTime(value: string): string {
  return `${value}T00:00:00.000Z`;
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

function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function formatKrw(value: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}

function formatLocationVersion(version: Pick<LocationVersionRow, 'label' | 'versionNumber'> | undefined): string {
  if (!version) {
    return '버전 미정';
  }
  return `${version.label} (v${version.versionNumber})`;
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

export function ItineraryBuilderPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const userId = searchParams.get('userId') ?? '';
  const planId = searchParams.get('planId') ?? '';
  const parentVersionId = searchParams.get('parentVersionId') ?? '';
  const initialChangeNote = searchParams.get('changeNote') ?? '';

  const isVersionMode = Boolean(planId);
  const hasValidContext = Boolean(userId) && (!isVersionMode || Boolean(parentVersionId));

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
  const [flightInTime, setFlightInTime] = useState<(typeof FLIGHT_TIME_OPTIONS)[number]>('08:00');
  const [flightOutTime, setFlightOutTime] = useState<(typeof FLIGHT_TIME_OPTIONS)[number]>('17:30');
  const [pickupDropNote, setPickupDropNote] = useState<string>('');
  const [externalPickupDropNote, setExternalPickupDropNote] = useState<string>('');
  const [includeRentalItems, setIncludeRentalItems] = useState<boolean>(true);
  const [rentalItemsText, setRentalItemsText] = useState<string>(buildDefaultRentalItems(6));
  const [eventCodes, setEventCodes] = useState<string[]>([]);
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
  const [hasEditedLeaderName, setHasEditedLeaderName] = useState<boolean>(false);
  const [isValidationOpen, setIsValidationOpen] = useState<boolean>(false);
  const [isPayloadPreviewOpen, setIsPayloadPreviewOpen] = useState<boolean>(false);

  const { data: planContextData } = useQuery<{ plan: PlanContextRow | null }>(PLAN_CONTEXT_QUERY, {
    variables: { id: planId },
    skip: !isVersionMode,
  });
  const { data: userData } = useQuery<{ user: UserRow | null }>(USER_QUERY, {
    variables: { id: userId },
    skip: !userId,
  });
  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const { data: segmentData } = useQuery<{ segments: SegmentRow[] }>(SEGMENTS_QUERY);

  const [createPlan, { loading: creatingPlan }] = useMutation<{ createPlan: { id: string } }>(CREATE_PLAN_MUTATION);
  const [createPlanVersion, { loading: creatingVersion }] = useMutation<{
    createPlanVersion: { id: string; versionNumber: number };
  }>(CREATE_PLAN_VERSION_MUTATION);

  const creating = creatingPlan || creatingVersion;

  const regions = regionData?.regions ?? [];
  const locations = locationData?.locations ?? [];
  const segments = segmentData?.segments ?? [];
  const planContext = planContextData?.plan ?? null;
  const selectedUserName = userData?.user?.name ?? '';

  useEffect(() => {
    if (!isVersionMode || !planContext) {
      return;
    }

    setRegionId(planContext.regionId);
  }, [isVersionMode, planContext]);

  useEffect(() => {
    const trimmedName = selectedUserName.trim();
    if (hasEditedLeaderName || leaderName.trim().length > 0 || trimmedName.length === 0) {
      return;
    }
    setLeaderName(trimmedName);
  }, [hasEditedLeaderName, leaderName, selectedUserName]);

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
      const segmentHours = segment?.averageTravelHours ?? 0;
      const totalTravelHours = segment ? segmentHours : 0;
      const destinationCellText = [
        toLocation?.name ?? toStop.locationId,
        toVersion ? `(버전: ${toVersion.label})` : '',
        segment ? `(이동시간: ${formatHours(totalTravelHours)}시간)` : '(이동시간: 미정)',
      ]
        .filter(Boolean)
        .join('\n');

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
    setPlanRows(autoRows);
  }, [autoRows]);

  useEffect(() => {
    setExtraLodgingCounts((prev) => Array.from({ length: totalDays }, (_, index) => prev[index] ?? 0));
  }, [totalDays]);

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
    const text = manualDepositInput.trim();
    if (text.length === 0) {
      return undefined;
    }

    const value = Number(text);
    if (!Number.isInteger(value) || value < 0) {
      return undefined;
    }

    return value;
  }, [manualDepositInput]);

  const hasInvalidManualDepositInput = useMemo(() => {
    const text = manualDepositInput.trim();
    if (text.length === 0) {
      return false;
    }

    const value = Number(text);
    return !Number.isInteger(value) || value < 0;
  }, [manualDepositInput]);

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
    if (!pricingPreview || hasEditedManualDeposit || manualDepositInput.trim().length > 0) {
      return;
    }
    setManualDepositInput(String(pricingPreview.depositAmountKrw));
  }, [hasEditedManualDeposit, manualDepositInput, pricingPreview]);

  const canCreate = Boolean(
    hasValidContext &&
      regionId &&
      leaderName.trim() &&
      hasValidDateRange &&
      hasValidHeadcount &&
      !hasHiaceHeadcountViolation &&
      !hasInvalidManualAdjustments &&
      !hasInvalidManualDepositInput &&
      (includeRentalItems ? rentalItemsText.trim() : true) &&
      startLocationId &&
      startLocationVersionId &&
      selectedRoute.length === totalDays - 1 &&
      planRows.length === totalDays &&
      (!isVersionMode ? planTitle.trim() : true),
  );

  if (!hasValidContext) {
    return (
      <section className="grid gap-4 py-8">
        <Card className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-xl font-semibold text-amber-900">컨텍스트가 없습니다</h1>
          <p className="mt-2 text-sm text-amber-800">
            일정 빌더는 고객/Plan/버전 컨텍스트에서만 접근할 수 있습니다. 고객 또는 Plan 화면에서 다시 진입해주세요.
          </p>
          <div className="mt-4">
            <Button onClick={() => navigate('/customers')}>고객 목록으로 이동</Button>
          </div>
        </Card>
      </section>
    );
  }

  if (isVersionMode && planContext && planContext.userId !== userId) {
    return (
      <section className="grid gap-4 py-8">
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
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 px-2 py-4">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">여행 일정 빌더</h1>
            <p className="mt-1 text-sm text-slate-600">
              {isVersionMode ? '기존 버전 기반 새 버전 생성' : '신규 Plan + 초기 버전 생성'}
            </p>
          </div>
          <div className="flex gap-2 no-print">
            <Button variant="outline" onClick={() => window.print()}>
              인쇄/PDF
            </Button>
            <Button variant="outline" onClick={() => setPlanRows(autoRows)}>
              자동값 다시 채우기
            </Button>
            <Button
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
                          pickupDropNote: pickupDropNote.trim() || undefined,
                          externalPickupDropNote: externalPickupDropNote.trim() || undefined,
                          includeRentalItems,
                          rentalItemsText,
                          eventCodes,
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
                          pickupDropNote: pickupDropNote.trim() || undefined,
                          externalPickupDropNote: externalPickupDropNote.trim() || undefined,
                          includeRentalItems,
                          rentalItemsText,
                          eventCodes,
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

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
            <h2 className="font-medium">설정</h2>
            <div className="mt-3 grid gap-3">
              {!isVersionMode ? (
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-slate-600">Plan 제목</span>
                  <input
                    value={planTitle}
                    onChange={(event) => setPlanTitle(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="신규 Plan 제목"
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
                  onChange={(event) => {
                    setHasEditedLeaderName(true);
                    setLeaderName(event.target.value);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="대표자명을 입력하세요"
                />
              </label>

              <div className="grid gap-1 text-sm">
                <span className="text-xs text-slate-600">문서번호</span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  서버 자동 생성 (YYMMDD + 3자리 랜덤)
                </div>
              </div>

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
                  {Array.from({ length: 9 }, (_, idx) => idx + 2).map((day) => (
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
                  {FLIGHT_TIME_OPTIONS.map((time) => (
                    <button
                      key={`in-${time}`}
                      type="button"
                      onClick={() => setFlightInTime(time)}
                      className={`rounded-xl border px-3 py-1.5 text-sm ${
                        flightInTime === time
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-600">항공권 OUT</span>
                <div className="flex flex-wrap gap-2">
                  {FLIGHT_TIME_OPTIONS.map((time) => (
                    <button
                      key={`out-${time}`}
                      type="button"
                      onClick={() => setFlightOutTime(time)}
                      className={`rounded-xl border px-3 py-1.5 text-sm ${
                        flightOutTime === time
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <label className="grid gap-1 text-sm">
                <span className="text-xs text-slate-600">픽/드랍 (보류)</span>
                <input
                  value={pickupDropNote}
                  onChange={(event) => setPickupDropNote(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="보류 항목 (입력만 가능)"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-xs text-slate-600">실투어 외 픽드랍 (보류)</span>
                <input
                  value={externalPickupDropNote}
                  onChange={(event) => setExternalPickupDropNote(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="보류 항목 (입력만 가능)"
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
                  {EVENT_OPTIONS.map((code) => {
                    const active = eventCodes.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() =>
                          setEventCodes((prev) =>
                            prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
                          )
                        }
                        className={`rounded-xl border px-3 py-1.5 text-sm ${
                          active
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {code}
                      </button>
                    );
                  })}
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
            <h2 className="font-medium">일차별 목적지 선택 (순차 선택)</h2>
            <p className="mt-1 text-xs text-slate-600">이전 일차와 연결 가능한 목적지만 버튼으로 노출됩니다.</p>

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
                        <div className="text-sm font-semibold">총합: {formatKrw(pricingBuckets.grandTotal)}</div>
                        <div>예약금: {formatKrw(pricingPreview.depositAmountKrw)}</div>
                        <div>잔금: {formatKrw(pricingPreview.balanceAmountKrw)}</div>
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
        pickupDropNote,
        externalPickupDropNote,
        includeRentalItems,
        rentalItemsText,
        eventCodes,
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
          pickupDropNote,
          externalPickupDropNote,
          includeRentalItems,
          rentalItemsText,
          eventCodes,
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
  );
}
