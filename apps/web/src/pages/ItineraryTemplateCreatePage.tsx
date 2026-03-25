import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VariantType } from '../generated/graphql';
import { formatLocationNameMultiline } from '../features/location/display';
import { SpecialMealsModal } from '../features/plan/components/SpecialMealsModal';
import { getAssignmentsFromPlanRows } from '../features/plan/special-meals';
import {
  buildAutoRowsFromRoute,
  buildFirstDayOptions,
  buildNextOptions,
  buildMultiDayBlockOptions,
  getConsumedRouteDayCount,
  getRouteStopEndDayIndex,
  getRouteStopStartDayIndex,
  buildTemplateStopsFromRouteAndRows,
  findSegment,
  findMultiDayBlockConnection,
  formatMultiDayBlockConnectionVersionLabel,
  formatSegmentVersionLabel,
  formatLocationVersion,
  getDefaultMultiDayBlockConnectionVersionId,
  getDefaultSegmentVersionId,
  getDefaultVersionId,
  getMultiDayBlockConnectionVersions,
  getSegmentVersions,
  type LocationOption,
  type MultiDayBlockConnectionOption,
  type MultiDayBlockOption,
  type RouteSelection,
  trimRouteSelectionsToTotalDays,
  resolveMultiDayBlockConnectionVersion,
  resolveSegmentVersion,
  type SegmentOption,
} from '../features/plan-template/route-autofill';
import type { TemplatePlanRow } from '../features/plan-template/editor-utils';

interface RegionSetRow {
  id: string;
  name: string;
  isActive: boolean;
  items: Array<{ id: string; regionId: string; sortOrder: number; region: { id: string; name: string } }>;
}

const REGION_SETS_QUERY = gql`
  query ItineraryTemplateCreateRegionSets($includeInactive: Boolean) {
    regionSets(includeInactive: $includeInactive) {
      id
      name
      isActive
      items {
        id
        regionId
        sortOrder
        region {
          id
          name
        }
      }
    }
  }
`;

const LOCATIONS_QUERY = gql`
  query ItineraryTemplateCreateLocations($regionSetId: ID) {
    locations(regionSetId: $regionSetId) {
      id
      regionId
      name
      isFirstDayEligible
      isLastDayEligible
      defaultVersionId
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
  query ItineraryTemplateCreateSegments($regionSetId: ID) {
    segments(regionSetId: $regionSetId) {
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
  query ItineraryTemplateCreateMultiDayBlocks($regionSetId: ID) {
    multiDayBlocks(regionSetId: $regionSetId) {
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
  query ItineraryTemplateCreateMultiDayBlockConnections($regionSetId: ID) {
    multiDayBlockConnections(regionSetId: $regionSetId) {
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

const CREATE_PLAN_TEMPLATE_MUTATION = gql`
  mutation CreateItineraryTemplate($input: PlanTemplateCreateInput!) {
    createPlanTemplate(input: $input) {
      id
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

export function ItineraryTemplateCreatePage(): JSX.Element {
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [regionSetId, setRegionSetId] = useState<string>('');
  const [totalDays, setTotalDays] = useState<number>(6);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [variantType, setVariantType] = useState<VariantType>(VariantType.Basic);
  const [startLocationId, setStartLocationId] = useState<string>('');
  const [startLocationVersionId, setStartLocationVersionId] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<RouteSelection[]>([]);
  const [isOvernightStayPickerOpen, setIsOvernightStayPickerOpen] = useState<boolean>(false);
  const [planRows, setPlanRows] = useState<TemplatePlanRow[]>([]);
  const [specialMealsModalOpen, setSpecialMealsModalOpen] = useState(false);

  const { data: regionSetData } = useQuery<{ regionSets: RegionSetRow[] }>(REGION_SETS_QUERY, {
    variables: { includeInactive: false },
  });
  const { data: locationData } = useQuery<{ locations: LocationOption[] }>(LOCATIONS_QUERY, {
    variables: { regionSetId: regionSetId || undefined },
    skip: !regionSetId,
  });
  const { data: segmentData } = useQuery<{ segments: SegmentOption[] }>(SEGMENTS_QUERY, {
    variables: { regionSetId: regionSetId || undefined },
    skip: !regionSetId,
  });
  const { data: overnightStayData } = useQuery<{ multiDayBlocks: MultiDayBlockOption[] }>(OVERNIGHT_STAYS_QUERY, {
    variables: { regionSetId: regionSetId || undefined },
    skip: !regionSetId,
  });
  const { data: overnightStayConnectionData } = useQuery<{ multiDayBlockConnections: MultiDayBlockConnectionOption[] }>(
    OVERNIGHT_STAY_CONNECTIONS_QUERY,
    {
      variables: { regionSetId: regionSetId || undefined },
      skip: !regionSetId,
    },
  );
  const [createPlanTemplate, { loading: creating }] = useMutation<{ createPlanTemplate: { id: string } }>(
    CREATE_PLAN_TEMPLATE_MUTATION,
  );

  const regionSets = regionSetData?.regionSets ?? [];
  const locations = locationData?.locations ?? [];
  const segments = segmentData?.segments ?? [];
  const overnightStays = overnightStayData?.multiDayBlocks ?? [];
  const overnightStayConnections = overnightStayConnectionData?.multiDayBlockConnections ?? [];

  const filteredLocations = locations;
  const filteredSegments = segments;
  const filteredOvernightStays = overnightStays;
  const filteredOvernightStayConnections = overnightStayConnections;

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
  const firstDayOptions = useMemo(() => buildFirstDayOptions(filteredLocations), [filteredLocations]);

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
      }),
    [filteredLocations, filteredOvernightStayConnections, filteredSegments, selectedRoute, startLocationId, totalDays, variantType],
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

  const autoRows = useMemo(
    () =>
      buildAutoRowsFromRoute({
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
      }),
    [
      filteredOvernightStayConnections,
      filteredOvernightStays,
      filteredSegments,
      locationById,
      locationVersionById,
      selectedRoute,
      startLocationId,
      startLocationVersionId,
      totalDays,
      variantType,
    ],
  );

  useEffect(() => {
    setPlanRows(autoRows);
  }, [autoRows]);

  const hasCompleteRoute =
    Boolean(startLocationId) &&
    Boolean(startLocationVersionId) &&
    1 + getConsumedRouteDayCount(selectedRoute) === totalDays &&
    selectedRoute.every((stop) =>
      stop.kind === 'MULTI_DAY_BLOCK'
        ? Boolean(stop.multiDayBlockId && stop.locationId && stop.locationVersionId)
        : Boolean(stop.locationId && stop.locationVersionId),
    );

  const canSave = Boolean(name.trim() && regionSetId && hasCompleteRoute && planRows.length === totalDays);

  const updateCell = (rowIndex: number, field: keyof TemplatePlanRow, value: string): void => {
    setPlanRows((prev) => prev.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row)));
  };

  const handleVariantChange = (nextVariantType: VariantType): void => {
    if (nextVariantType === variantType) {
      return;
    }
    setVariantType(nextVariantType);
    if (selectedRoute.length > 0) {
      setSelectedRoute([]);
    }
    setIsOvernightStayPickerOpen(false);
  };

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">신규 템플릿 생성</h1>
          <p className="mt-1 text-sm text-slate-600">메타정보와 일차별 본문을 입력해 템플릿을 생성합니다.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/itinerary-templates')}>
          목록으로
        </Button>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-medium">설정</h2>
          <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">이름</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="예: 고비 6일 D"
            />
          </label>
          <div className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">지역 세트</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setRegionSetId('');
                  setStartLocationId('');
                  setStartLocationVersionId('');
                  setSelectedRoute([]);
                }}
                className={`rounded-xl border px-3 py-1.5 text-sm ${
                  regionSetId === ''
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                미선택
              </button>
              {regionSets.map((set) => {
                const memberLabel = [...set.items]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => item.region.name)
                  .join(' · ');
                return (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => {
                      setRegionSetId(set.id);
                      setStartLocationId('');
                      setStartLocationVersionId('');
                      setSelectedRoute([]);
                    }}
                    className={`rounded-xl border px-3 py-1.5 text-left text-sm ${
                      regionSetId === set.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block font-medium">{set.name}</span>
                    {set.items.length > 1 ? (
                      <span
                        className={`mt-0.5 block text-[10px] leading-tight ${
                          regionSetId === set.id ? 'text-slate-200' : 'text-slate-500'
                        }`}
                      >
                        {memberLabel}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">일수</span>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 12 }, (_, index) => index + 2).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setTotalDays(day);
                    setSelectedRoute((prev) => trimRouteSelectionsToTotalDays(prev, day));
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
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">설명</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">Variant</span>
            <div className="flex flex-wrap gap-2">
              {VARIANTS.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => handleVariantChange(variant.id)}
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
          <div className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">상태</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                aria-pressed={isActive}
                className={`rounded-xl border px-3 py-1.5 text-sm ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                활성
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                aria-pressed={!isActive}
                className={`rounded-xl border px-3 py-1.5 text-sm ${
                  !isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                비활성
              </button>
            </div>
          </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              3
            </span>
            <span>일정 선택</span>
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            이전 일차와 연결 가능한 목적지만 버튼으로 노출됩니다.
          </p>

          <div className="mt-4 space-y-4 [&>*+*]:border-t [&>*+*]:border-slate-200 [&>*+*]:pt-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-medium">1일차 출발지</div>
            <p className="mt-1 text-xs text-slate-500">목적지중 첫날 가능 목적지만 나열됩니다</p>
            {startLocationId ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="text-slate-700">
                  <span className="whitespace-pre-line">{formatLocationNameMultiline(locationById.get(startLocationId)?.name ?? startLocationId)}</span>
                  {(variantType === VariantType.Early || variantType === VariantType.EarlyExtend) && (
                    <span className="ml-2 text-xs text-amber-700">(얼리 일정)</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStartLocationId('');
                    setStartLocationVersionId('');
                    setSelectedRoute([]);
                    setIsOvernightStayPickerOpen(false);
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
                      setIsOvernightStayPickerOpen(false);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    <span className="whitespace-pre-line">{formatLocationNameMultiline(location.name)}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {!startLocationId && firstDayOptions.length === 0 ? (
              <p className="mt-3 text-xs text-amber-700">첫날 가능으로 설정된 목적지가 없습니다.</p>
            ) : null}
            {startLocationId ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {(locationById.get(startLocationId)?.variations ?? []).map((version) => {
                  const versionLabel = formatLocationVersion(version);
                  if (versionLabel === '기본' || !versionLabel) {
                    return null;
                  }
                  return (
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
                      {versionLabel}
                    </button>
                  );
                })}
              </div>
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
                    setSelectedRoute((prev) => (prev.length === 0 ? prev : prev.slice(0, -1)));
                    setIsOvernightStayPickerOpen(false);
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
                        {startDayIndex === endDayIndex ? `${startDayIndex}일차` : `${startDayIndex}~${endDayIndex}일차`} 블록
                      </div>
                      <div className="mt-1 text-slate-700">
                        <span className="whitespace-pre-line">
                          {formatLocationNameMultiline(locationById.get(stop.locationId)?.name ?? stop.locationId)}
                        </span>
                        {isLastDay && (variantType === VariantType.Extend || variantType === VariantType.EarlyExtend) && (
                          <span className="ml-2 text-xs text-amber-700">(연장 일정)</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(locationById.get(stop.locationId)?.variations ?? []).map((version) => {
                          const versionLabel = formatLocationVersion(version);
                          if (versionLabel === '기본' || !versionLabel) {
                            return null;
                          }
                          return (
                            <button
                              key={`route-stay-version-${index}-${version.id}`}
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
                              {versionLabel}
                            </button>
                          );
                        })}
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
                          {formatLocationNameMultiline(locationById.get(stop.locationId)?.name ?? stop.locationId)}
                        </span>
                        {isLastDay && (variantType === VariantType.Extend || variantType === VariantType.EarlyExtend) && (
                          <span className="ml-2 text-xs text-amber-700">(연장 일정)</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(locationById.get(stop.locationId)?.variations ?? []).map((version) => {
                          const versionLabel = formatLocationVersion(version);
                          if (versionLabel === '기본' || !versionLabel) {
                            return null;
                          }
                          return (
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
                              {versionLabel}
                            </button>
                          );
                        })}
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

                const fromId = index === 0 ? startLocationId : selectedRoute[index - 1]?.locationId ?? '';
                const segment = findSegment(filteredSegments, fromId, stop.locationId);
                const versions = getSegmentVersions(segment);
                const selectedVersion = resolveSegmentVersion(segment, stop.segmentVersionId);
                const isLastDay = endDayIndex === totalDays;

                return (
                  <>
                    <div className="text-sm font-medium">{startDayIndex}일차</div>
                    <div className="mt-1 text-slate-700">
                      <span className="whitespace-pre-line">
                        {formatLocationNameMultiline(locationById.get(stop.locationId)?.name ?? stop.locationId)}
                      </span>
                      {isLastDay && (variantType === VariantType.Extend || variantType === VariantType.EarlyExtend) && (
                        <span className="ml-2 text-xs text-amber-700">(연장 일정)</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(locationById.get(stop.locationId)?.variations ?? []).map((version) => {
                        const versionLabel = formatLocationVersion(version);
                        if (versionLabel === '기본' || !versionLabel) {
                          return null;
                        }
                        return (
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
                            {versionLabel}
                          </button>
                        );
                      })}
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

          {startLocationId && startLocationVersionId && 1 + getConsumedRouteDayCount(selectedRoute) < totalDays ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4">
              <div className="mb-3 text-sm font-medium">{2 + getConsumedRouteDayCount(selectedRoute)}일차 선택</div>
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
                                  getDefaultMultiDayBlockConnectionVersionId(connection) || undefined,
                              },
                            ];
                          }

                          const fromId = prev.length === 0 ? startLocationId : prev[prev.length - 1]?.locationId ?? '';
                          const segment = findSegment(filteredSegments, fromId, location.id);
                          return [
                            ...prev,
                            {
                              kind: 'LOCATION',
                              locationId: location.id,
                              locationVersionId: getDefaultVersionId(location),
                              segmentId: segment?.id,
                              segmentVersionId: getDefaultSegmentVersionId(segment) || undefined,
                            },
                          ];
                        })
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-100"
                    >
                      <span className="whitespace-pre-line">{formatLocationNameMultiline(location.name)}</span>
                    </button>
                  ))}
                </div>
                {nextOptions.length === 0 ? (
                  <p className="text-xs text-amber-700">선택 가능한 다음 목적지가 없습니다.</p>
                ) : null}
                <div
                  className="mt-3 border-t border-slate-200 pt-4"
                  role="group"
                  aria-label="연속 일정 블록 선택"
                >
                  {!isOvernightStayPickerOpen ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        disabled={totalDays - (1 + getConsumedRouteDayCount(selectedRoute)) < 2}
                        onClick={() => setIsOvernightStayPickerOpen(true)}
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
                          onClick={() => setIsOvernightStayPickerOpen(false)}
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
                                setIsOvernightStayPickerOpen(false);
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
                setIsOvernightStayPickerOpen(false);
              }}
              className="text-xs text-red-500 underline"
            >
              전체 루트 초기화
            </button>
          ) : null}
          </div>
        </Card>
      </section>

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">일차별 본문 편집</h2>
        <p className="mt-1 text-xs text-slate-600">루트 변경 시 아래 본문은 자동으로 다시 채워집니다.</p>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <div>
            <span className="text-xs text-slate-600">특식 4종</span>
            <p className="mt-0.5 text-xs text-slate-500">
              {planRows.length === 0
                ? '일차를 채운 뒤 설정하세요.'
                : (() => {
                    const assignments = getAssignmentsFromPlanRows(
                      planRows.map((r) => ({
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
            onClick={() => setSpecialMealsModalOpen(true)}
            disabled={planRows.length === 0}
          >
            특식 배치 설정
          </Button>
        </div>
        <SpecialMealsModal
          open={specialMealsModalOpen}
          rows={planRows.map((r) => ({
            mealCellText: r.mealCellText,
            destinationCellText: r.destinationCellText,
            scheduleCellText: r.scheduleCellText,
          }))}
          onClose={() => setSpecialMealsModalOpen(false)}
          onSave={(updatedRows) => {
            setPlanRows((prev) =>
              prev.map((row, i) => {
                const updated = updatedRows[i];
                return updated ? { ...row, mealCellText: updated.mealCellText } : row;
              }),
            );
            setSpecialMealsModalOpen(false);
          }}
        />
        <div className="mt-3 overflow-auto">
          <Table className="min-w-[1280px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <Th>일차</Th>
                <Th>목적지</Th>
                <Th>시간</Th>
                <Th>일정</Th>
                <Th>숙소</Th>
                <Th>식사</Th>
              </tr>
            </thead>
            <tbody>
              {planRows.map((row, rowIndex) => (
                <tr key={`create-row-${rowIndex + 1}`} className="border-t border-slate-200 align-top">
                  <Td>{rowIndex + 1}일차</Td>
                  <Td>
                    <textarea
                      value={row.destinationCellText}
                      rows={3}
                      onChange={(event) => updateCell(rowIndex, 'destinationCellText', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                  </Td>
                  <Td>
                    <textarea
                      value={row.timeCellText}
                      rows={3}
                      onChange={(event) => updateCell(rowIndex, 'timeCellText', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                  </Td>
                  <Td>
                    <textarea
                      value={row.scheduleCellText}
                      rows={3}
                      onChange={(event) => updateCell(rowIndex, 'scheduleCellText', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                  </Td>
                  <Td>
                    <textarea
                      value={row.lodgingCellText}
                      rows={3}
                      onChange={(event) => updateCell(rowIndex, 'lodgingCellText', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                  </Td>
                  <Td>
                    <textarea
                      value={row.mealCellText}
                      rows={3}
                      onChange={(event) => updateCell(rowIndex, 'mealCellText', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {!hasCompleteRoute ? (
          <p className="mt-3 text-xs text-amber-700">저장하려면 1일차 출발지와 {totalDays}일 전체 목적지를 순서대로 선택해야 합니다.</p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Button
            variant="primary"
            disabled={!canSave || creating}
            onClick={async () => {
              const result = await createPlanTemplate({
                variables: {
                  input: {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    regionSetId,
                    totalDays,
                    sortOrder,
                    isActive,
                    planStops: buildTemplateStopsFromRouteAndRows({
                      startLocationId,
                      startLocationVersionId,
                      selectedRoute,
                      planRows,
                    }),
                  },
                },
              });

              const createdId = result.data?.createPlanTemplate.id ?? '';
              if (createdId) {
                navigate(`/itinerary-templates?selectedTemplateId=${encodeURIComponent(createdId)}`);
              }
            }}
          >
            {creating ? '생성 중...' : '템플릿 생성'}
          </Button>
        </div>
      </Card>
    </section>
  );
}
