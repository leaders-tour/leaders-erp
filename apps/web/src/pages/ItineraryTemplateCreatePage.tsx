import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatLocationNameMultiline } from '../features/location/display';
import {
  buildAutoRowsFromRoute,
  buildFirstDayOptions,
  buildNextOptions,
  buildOvernightStayOptions,
  getConsumedRouteDayCount,
  getRouteStopEndDayIndex,
  getRouteStopStartDayIndex,
  buildTemplateStopsFromRouteAndRows,
  findSegment,
  findOvernightStayConnection,
  formatOvernightStayConnectionVersionLabel,
  formatSegmentVersionLabel,
  formatLocationVersion,
  getDefaultOvernightStayConnectionVersionId,
  getDefaultSegmentVersionId,
  getDefaultVersionId,
  getOvernightStayConnectionVersions,
  getSegmentVersions,
  type LocationOption,
  type OvernightStayConnectionOption,
  type OvernightStayOption,
  type RouteSelection,
  trimRouteSelectionsToTotalDays,
  resolveOvernightStayConnectionVersion,
  resolveSegmentVersion,
  type SegmentOption,
} from '../features/plan-template/route-autofill';
import type { TemplatePlanRow } from '../features/plan-template/editor-utils';

interface RegionRow {
  id: string;
  name: string;
}

const REGIONS_QUERY = gql`
  query ItineraryTemplateCreateRegions {
    regions {
      id
      name
    }
  }
`;

const LOCATIONS_QUERY = gql`
  query ItineraryTemplateCreateLocations {
    locations {
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
  query ItineraryTemplateCreateSegments {
    segments {
      id
      regionId
      fromLocationId
      toLocationId
      defaultVersionId
      averageDistanceKm
      averageTravelHours
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
  query ItineraryTemplateCreateOvernightStays {
    overnightStays {
      id
      regionId
      locationId
      title
      isActive
      sortOrder
      days {
        id
        dayOrder
        averageDistanceKm
        averageTravelHours
        timeCellText
        scheduleCellText
        lodgingCellText
        mealCellText
      }
    }
  }
`;

const OVERNIGHT_STAY_CONNECTIONS_QUERY = gql`
  query ItineraryTemplateCreateOvernightStayConnections {
    overnightStayConnections {
      id
      regionId
      fromOvernightStayId
      toLocationId
      defaultVersionId
      averageDistanceKm
      averageTravelHours
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
        overnightStayConnectionId
        name
        averageDistanceKm
        averageTravelHours
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

export function ItineraryTemplateCreatePage(): JSX.Element {
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [regionId, setRegionId] = useState<string>('');
  const [totalDays, setTotalDays] = useState<number>(6);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [startLocationId, setStartLocationId] = useState<string>('');
  const [startLocationVersionId, setStartLocationVersionId] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<RouteSelection[]>([]);
  const [isOvernightStayPickerOpen, setIsOvernightStayPickerOpen] = useState<boolean>(false);
  const [planRows, setPlanRows] = useState<TemplatePlanRow[]>([]);

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData } = useQuery<{ locations: LocationOption[] }>(LOCATIONS_QUERY);
  const { data: segmentData } = useQuery<{ segments: SegmentOption[] }>(SEGMENTS_QUERY);
  const { data: overnightStayData } = useQuery<{ overnightStays: OvernightStayOption[] }>(OVERNIGHT_STAYS_QUERY);
  const { data: overnightStayConnectionData } = useQuery<{ overnightStayConnections: OvernightStayConnectionOption[] }>(
    OVERNIGHT_STAY_CONNECTIONS_QUERY,
  );
  const [createPlanTemplate, { loading: creating }] = useMutation<{ createPlanTemplate: { id: string } }>(
    CREATE_PLAN_TEMPLATE_MUTATION,
  );

  const regions = regionData?.regions ?? [];
  const locations = locationData?.locations ?? [];
  const segments = segmentData?.segments ?? [];
  const overnightStays = overnightStayData?.overnightStays ?? [];
  const overnightStayConnections = overnightStayConnectionData?.overnightStayConnections ?? [];

  const filteredLocations = useMemo(
    () => (regionId ? locations.filter((location) => location.regionId === regionId) : []),
    [locations, regionId],
  );

  const filteredSegments = useMemo(
    () => (regionId ? segments.filter((segment) => segment.regionId === regionId) : []),
    [segments, regionId],
  );
  const filteredOvernightStays = useMemo(
    () => (regionId ? overnightStays.filter((overnightStay) => overnightStay.regionId === regionId) : []),
    [overnightStays, regionId],
  );
  const filteredOvernightStayConnections = useMemo(
    () => (regionId ? overnightStayConnections.filter((connection) => connection.regionId === regionId) : []),
    [overnightStayConnections, regionId],
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
  const firstDayOptions = useMemo(() => buildFirstDayOptions(filteredLocations), [filteredLocations]);

  const nextOptions = useMemo(
    () =>
      buildNextOptions({
        filteredLocations,
        filteredSegments,
        filteredOvernightStayConnections,
        startLocationId,
        selectedRoute,
        totalDays,
      }),
    [filteredLocations, filteredOvernightStayConnections, filteredSegments, selectedRoute, startLocationId, totalDays],
  );

  const overnightStayOptions = useMemo(
    () =>
      buildOvernightStayOptions({
        filteredOvernightStays,
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
        filteredOvernightStays,
        filteredOvernightStayConnections,
        locationById,
        locationVersionById,
        totalDays,
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
      stop.kind === 'OVERNIGHT_STAY'
        ? Boolean(stop.overnightStayId && stop.locationId && stop.locationVersionId)
        : Boolean(stop.locationId && stop.locationVersionId),
    );

  const canSave = Boolean(name.trim() && regionId && hasCompleteRoute && planRows.length === totalDays);

  const updateCell = (rowIndex: number, field: keyof TemplatePlanRow, value: string): void => {
    setPlanRows((prev) => prev.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row)));
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
            <span className="text-xs text-slate-600">지역</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setRegionId('');
                  setStartLocationId('');
                  setStartLocationVersionId('');
                  setSelectedRoute([]);
                }}
                className={`rounded-xl border px-3 py-1.5 text-sm ${
                  regionId === ''
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                미선택
              </button>
              {regions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => {
                    setRegionId(region.id);
                    setStartLocationId('');
                    setStartLocationVersionId('');
                    setSelectedRoute([]);
                  }}
                  className={`rounded-xl border px-3 py-1.5 text-sm ${
                    regionId === region.id
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
            <span className="text-xs text-slate-600">정렬 순서</span>
            <input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(event) => setSortOrder(Math.max(0, Number(event.target.value) || 0))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
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
          <h2 className="font-medium">일차별 목적지 선택 (순차 선택)</h2>
          <p className="mt-1 text-xs text-slate-600">루트 변경 시 본문이 전체 재생성됩니다.</p>

          <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-medium">1일차 출발지</div>
            {startLocationId ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="text-slate-700">
                  <span className="whitespace-pre-line">{formatLocationNameMultiline(locationById.get(startLocationId)?.name ?? startLocationId)}</span>
                  {startLocationVersionId ? ` (${formatLocationVersion(locationVersionById.get(startLocationVersionId))})` : ''}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStartLocationId('');
                    setStartLocationVersionId('');
                    setSelectedRoute([]);
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
              {(() => {
                const startDayIndex = getRouteStopStartDayIndex(selectedRoute, index);
                const endDayIndex = getRouteStopEndDayIndex(selectedRoute, index);

                if (stop.kind === 'OVERNIGHT_STAY') {
                  return (
                    <>
                      <div className="text-sm font-medium">
                        {startDayIndex === endDayIndex ? `${startDayIndex}일차` : `${startDayIndex}~${endDayIndex}일차`} 연박
                      </div>
                      <div className="mt-1 text-slate-700">
                        <span className="whitespace-pre-line">
                          {formatLocationNameMultiline(locationById.get(stop.locationId)?.name ?? stop.locationId)}
                        </span>
                        {` (${formatLocationVersion(locationVersionById.get(stop.locationVersionId))})`}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(locationById.get(stop.locationId)?.variations ?? []).map((version) => (
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
                            {formatLocationVersion(version)}
                          </button>
                        ))}
                      </div>
                    </>
                  );
                }

                const previousStop = selectedRoute[index - 1];
                if (previousStop?.kind === 'OVERNIGHT_STAY') {
                  const connection = findOvernightStayConnection(
                    filteredOvernightStayConnections,
                    previousStop.overnightStayId,
                    stop.locationId,
                  );
                  const versions = getOvernightStayConnectionVersions(connection);
                  const selectedVersion = resolveOvernightStayConnectionVersion(
                    connection,
                    stop.overnightStayConnectionVersionId,
                  );

                  return (
                    <>
                      <div className="text-sm font-medium">{startDayIndex}일차</div>
                      <div className="mt-1 text-slate-700">
                        <span className="whitespace-pre-line">
                          {formatLocationNameMultiline(locationById.get(stop.locationId)?.name ?? stop.locationId)}
                        </span>
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
                      {versions.length > 1 ? (
                        <div className="mt-3 grid gap-2">
                          <div className="text-xs text-slate-500">연박 다음 연결 버전</div>
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
                                {formatOvernightStayConnectionVersionLabel(version)}
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

                return (
                  <>
                    <div className="text-sm font-medium">{startDayIndex}일차</div>
                    <div className="mt-1 text-slate-700">
                      <span className="whitespace-pre-line">
                        {formatLocationNameMultiline(locationById.get(stop.locationId)?.name ?? stop.locationId)}
                      </span>
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
                    {versions.length > 1 ? (
                      <div className="mt-3 grid gap-2">
                        <div className="text-xs text-slate-500">이동 버전</div>
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
          ))}

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
                          if (lastStop?.kind === 'OVERNIGHT_STAY') {
                            const connection = findOvernightStayConnection(
                              filteredOvernightStayConnections,
                              lastStop.overnightStayId,
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
                                  getDefaultOvernightStayConnectionVersionId(connection) || undefined,
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
                {nextOptions.length === 0 ? <p className="text-xs text-amber-700">선택 가능한 다음 목적지가 없습니다.</p> : null}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={totalDays - (1 + getConsumedRouteDayCount(selectedRoute)) < 2}
                    onClick={() => setIsOvernightStayPickerOpen((prev) => !prev)}
                  >
                    연박 선택하기
                  </Button>
                  {totalDays - (1 + getConsumedRouteDayCount(selectedRoute)) < 2 ? (
                    <span className="text-xs text-slate-500">남은 일수가 2일 미만이면 연박을 선택할 수 없습니다.</span>
                  ) : null}
                </div>
                {isOvernightStayPickerOpen ? (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {overnightStayOptions.map((overnightStay) => (
                      <button
                        key={overnightStay.id}
                        type="button"
                        onClick={() => {
                          const location = locationById.get(overnightStay.locationId);
                          setSelectedRoute((prev) => [
                            ...prev,
                            {
                              kind: 'OVERNIGHT_STAY',
                              overnightStayId: overnightStay.id,
                              locationId: overnightStay.locationId,
                              locationVersionId: getDefaultVersionId(location) || '',
                            },
                          ]);
                          setIsOvernightStayPickerOpen(false);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-100"
                      >
                        {overnightStay.title}
                      </button>
                    ))}
                  </div>
                ) : null}
                {isOvernightStayPickerOpen && overnightStayOptions.length === 0 ? (
                  <p className="text-xs text-amber-700">선택 가능한 연박이 없습니다.</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {selectedRoute.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSelectedRoute([]);
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
        <div className="mt-3 overflow-auto">
          <Table className="min-w-[1280px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <Th>일차</Th>
                <Th>날짜</Th>
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
                      value={row.dateCellText}
                      rows={2}
                      onChange={(event) => updateCell(rowIndex, 'dateCellText', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                  </Td>
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
                    regionId,
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
