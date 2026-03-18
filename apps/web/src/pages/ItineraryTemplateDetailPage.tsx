import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buildEmptyPlanRow, type TemplatePlanRow } from '../features/plan-template/editor-utils';
import { formatLocationNameMultiline } from '../features/location/display';
import {
  buildAutoRowsFromRoute,
  buildSelectedRouteFromStops,
  buildFirstDayOptions,
  buildNextOptions,
  buildOvernightStayOptions,
  buildTemplateStopsFromRouteAndRows,
  findSegment,
  findOvernightStayConnection,
  formatOvernightStayConnectionVersionLabel,
  formatSegmentVersionLabel,
  formatLocationVersion,
  getConsumedRouteDayCount,
  getDefaultOvernightStayConnectionVersionId,
  getDefaultSegmentVersionId,
  getDefaultVersionId,
  getOvernightStayConnectionVersions,
  getRouteStopEndDayIndex,
  getRouteStopStartDayIndex,
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

interface RegionRow {
  id: string;
  name: string;
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
  multiDayBlockId: string | null;
  multiDayBlockDayOrder: number | null;
  multiDayBlockConnectionId: string | null;
  multiDayBlockConnectionVersionId: string | null;
  locationId: string | null;
  locationVersionId: string | null;
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5' | null;
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
  updatedAt: string;
  planStops: PlanTemplateStopRow[];
}

const REGIONS_QUERY = gql`
  query ItineraryTemplateDetailRegions {
    regions {
      id
      name
    }
  }
`;

const LOCATIONS_QUERY = gql`
  query ItineraryTemplateDetailLocations {
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
  query ItineraryTemplateDetailSegments {
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

const PLAN_TEMPLATE_QUERY = gql`
  query ItineraryTemplateDetail($id: ID!) {
    planTemplate(id: $id) {
      id
      name
      description
      regionId
      totalDays
      sortOrder
      isActive
      updatedAt
      planStops {
        id
        dayIndex
        segmentId
        segmentVersionId
        overnightStayId
        overnightStayDayOrder
        overnightStayConnectionId
        overnightStayConnectionVersionId
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

const OVERNIGHT_STAYS_QUERY = gql`
  query ItineraryTemplateDetailOvernightStays {
    overnightStays {
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
  query ItineraryTemplateDetailOvernightStayConnections {
    overnightStayConnections {
      id
      regionId
      fromOvernightStayId
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
        overnightStayConnectionId
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

const UPDATE_PLAN_TEMPLATE_MUTATION = gql`
  mutation UpdateItineraryTemplateDetail($id: ID!, $input: PlanTemplateUpdateInput!) {
    updatePlanTemplate(id: $id, input: $input) {
      id
      updatedAt
    }
  }
`;

const DELETE_PLAN_TEMPLATE_MUTATION = gql`
  mutation DeleteItineraryTemplateDetail($id: ID!) {
    deletePlanTemplate(id: $id)
  }
`;

export function ItineraryTemplateDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();

  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formRegionId, setFormRegionId] = useState<string>('');
  const [formTotalDays, setFormTotalDays] = useState<number>(6);
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [startLocationId, setStartLocationId] = useState<string>('');
  const [startLocationVersionId, setStartLocationVersionId] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<RouteSelection[]>([]);
  const [isOvernightStayPickerOpen, setIsOvernightStayPickerOpen] = useState<boolean>(false);
  const [planRows, setPlanRows] = useState<TemplatePlanRow[]>([]);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [routeRecoveryMessage, setRouteRecoveryMessage] = useState<string>('');
  const [skipNextAutoRowsSync, setSkipNextAutoRowsSync] = useState<boolean>(false);
  const [isAutoRowsSyncEnabled, setIsAutoRowsSyncEnabled] = useState<boolean>(false);

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData } = useQuery<{ locations: LocationOption[] }>(LOCATIONS_QUERY);
  const { data: segmentData } = useQuery<{ segments: SegmentOption[] }>(SEGMENTS_QUERY);
  const { data: overnightStayData } = useQuery<{ overnightStays: OvernightStayOption[] }>(OVERNIGHT_STAYS_QUERY);
  const { data: overnightStayConnectionData } = useQuery<{ overnightStayConnections: OvernightStayConnectionOption[] }>(
    OVERNIGHT_STAY_CONNECTIONS_QUERY,
  );
  const {
    data: templateData,
    loading,
    error,
    refetch,
  } = useQuery<{ planTemplate: PlanTemplateRow | null }>(PLAN_TEMPLATE_QUERY, {
    variables: { id: templateId },
    skip: !templateId,
  });

  const [updateTemplate, { loading: updating }] = useMutation(UPDATE_PLAN_TEMPLATE_MUTATION);
  const [deleteTemplate, { loading: deleting }] = useMutation(DELETE_PLAN_TEMPLATE_MUTATION);

  const template = templateData?.planTemplate ?? null;
  const regions = regionData?.regions ?? [];
  const locations = locationData?.locations ?? [];
  const segments = segmentData?.segments ?? [];
  const overnightStays = overnightStayData?.overnightStays ?? [];
  const overnightStayConnections = overnightStayConnectionData?.overnightStayConnections ?? [];

  const filteredLocations = useMemo(
    () => (formRegionId ? locations.filter((location) => location.regionId === formRegionId) : []),
    [locations, formRegionId],
  );

  const filteredSegments = useMemo(
    () => (formRegionId ? segments.filter((segment) => segment.regionId === formRegionId) : []),
    [segments, formRegionId],
  );
  const filteredOvernightStays = useMemo(
    () => (formRegionId ? overnightStays.filter((overnightStay) => overnightStay.regionId === formRegionId) : []),
    [overnightStays, formRegionId],
  );
  const filteredOvernightStayConnections = useMemo(
    () => (formRegionId ? overnightStayConnections.filter((connection) => connection.regionId === formRegionId) : []),
    [overnightStayConnections, formRegionId],
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
        totalDays: formTotalDays,
      }),
    [filteredLocations, filteredOvernightStayConnections, filteredSegments, selectedRoute, startLocationId, formTotalDays],
  );

  const overnightStayOptions = useMemo(
    () =>
      buildOvernightStayOptions({
        filteredOvernightStays,
        filteredSegments,
        startLocationId,
        selectedRoute,
        totalDays: formTotalDays,
      }),
    [filteredOvernightStays, filteredSegments, selectedRoute, startLocationId, formTotalDays],
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
        totalDays: formTotalDays,
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
      formTotalDays,
    ],
  );

  useEffect(() => {
    if (skipNextAutoRowsSync) {
      setSkipNextAutoRowsSync(false);
      return;
    }
    if (!isAutoRowsSyncEnabled) {
      return;
    }
    setPlanRows(autoRows);
  }, [autoRows, isAutoRowsSyncEnabled, skipNextAutoRowsSync]);

  useEffect(() => {
    if (!template) {
      return;
    }

    const stopByDayIndex = new Map(template.planStops.map((stop) => [stop.dayIndex, stop]));
    const rowsFromTemplate: TemplatePlanRow[] = Array.from({ length: template.totalDays }, (_, index) => {
      const stop = stopByDayIndex.get(index + 1);
      if (!stop) {
        return buildEmptyPlanRow(index + 1);
      }

      return {
        segmentId: stop.segmentId ?? undefined,
        segmentVersionId: stop.segmentVersionId ?? undefined,
        overnightStayId: stop.overnightStayId ?? undefined,
        overnightStayDayOrder: stop.overnightStayDayOrder ?? undefined,
        overnightStayConnectionId: stop.overnightStayConnectionId ?? undefined,
        overnightStayConnectionVersionId: stop.overnightStayConnectionVersionId ?? undefined,
        multiDayBlockId: stop.multiDayBlockId ?? undefined,
        multiDayBlockDayOrder: stop.multiDayBlockDayOrder ?? undefined,
        multiDayBlockConnectionId: stop.multiDayBlockConnectionId ?? undefined,
        multiDayBlockConnectionVersionId: stop.multiDayBlockConnectionVersionId ?? undefined,
        locationId: stop.locationId ?? undefined,
        locationVersionId: stop.locationVersionId ?? undefined,
        dateCellText: stop.dateCellText,
        destinationCellText: stop.destinationCellText,
        timeCellText: stop.timeCellText,
        scheduleCellText: stop.scheduleCellText,
        lodgingCellText: stop.lodgingCellText,
        mealCellText: stop.mealCellText,
      };
    });

    const dayOrderedStops: Array<PlanTemplateStopRow | undefined> = Array.from(
      { length: template.totalDays },
      (_, index) => stopByDayIndex.get(index + 1),
    );

    const hasMissingRouteData = dayOrderedStops.some((stop) => !stop?.locationId || !stop?.locationVersionId);
    const firstStop = dayOrderedStops[0];

    setFormName(template.name);
    setFormDescription(template.description ?? '');
    setFormRegionId(template.regionId);
    setFormTotalDays(template.totalDays);
    setFormSortOrder(template.sortOrder);
    setFormIsActive(template.isActive);
    setIsAutoRowsSyncEnabled(false);
    setSkipNextAutoRowsSync(true);
    setPlanRows(rowsFromTemplate);
    setSaveMessage('');

    if (firstStop?.locationId && firstStop.locationVersionId) {
      setStartLocationId(firstStop.locationId);
      setStartLocationVersionId(firstStop.locationVersionId);
    } else {
      setStartLocationId('');
      setStartLocationVersionId('');
    }

    if (hasMissingRouteData) {
      setSelectedRoute(
        buildSelectedRouteFromStops(
          dayOrderedStops
            .slice(1)
            .filter((stop): stop is PlanTemplateStopRow => Boolean(stop))
            .map((stop) => ({
              segmentId: stop.segmentId,
              segmentVersionId: stop.segmentVersionId,
              overnightStayId: stop.overnightStayId,
              overnightStayDayOrder: stop.overnightStayDayOrder,
              overnightStayConnectionId: stop.overnightStayConnectionId,
              overnightStayConnectionVersionId: stop.overnightStayConnectionVersionId,
              multiDayBlockId: stop.multiDayBlockId,
              multiDayBlockDayOrder: stop.multiDayBlockDayOrder,
              multiDayBlockConnectionId: stop.multiDayBlockConnectionId,
              multiDayBlockConnectionVersionId: stop.multiDayBlockConnectionVersionId,
              locationId: stop.locationId,
              locationVersionId: stop.locationVersionId,
            })),
        ),
      );
      setRouteRecoveryMessage('기존 템플릿의 위치 정보가 일부 없어 루트를 완전히 복원하지 못했습니다. 루트를 다시 선택해 주세요.');
      return;
    }

    setSelectedRoute(
      buildSelectedRouteFromStops(
        dayOrderedStops.slice(1).map((stop) => ({
          segmentId: stop?.segmentId,
          segmentVersionId: stop?.segmentVersionId,
          overnightStayId: stop?.overnightStayId,
          overnightStayDayOrder: stop?.overnightStayDayOrder,
          overnightStayConnectionId: stop?.overnightStayConnectionId,
          overnightStayConnectionVersionId: stop?.overnightStayConnectionVersionId,
          multiDayBlockId: stop?.multiDayBlockId,
          multiDayBlockDayOrder: stop?.multiDayBlockDayOrder,
          multiDayBlockConnectionId: stop?.multiDayBlockConnectionId,
          multiDayBlockConnectionVersionId: stop?.multiDayBlockConnectionVersionId,
          locationId: stop?.locationId,
          locationVersionId: stop?.locationVersionId,
        })),
      ),
    );
    setRouteRecoveryMessage('');
  }, [template]);

  const hasCompleteRoute =
    Boolean(startLocationId) &&
    Boolean(startLocationVersionId) &&
    1 + getConsumedRouteDayCount(selectedRoute) === formTotalDays &&
    selectedRoute.every((stop) =>
      stop.kind === 'MULTI_DAY_BLOCK'
        ? Boolean(stop.multiDayBlockId && stop.locationId && stop.locationVersionId)
        : Boolean(stop.locationId && stop.locationVersionId),
    );

  const canSave = Boolean(formName.trim() && formRegionId && hasCompleteRoute && planRows.length === formTotalDays);

  const updateCell = (rowIndex: number, field: keyof TemplatePlanRow, value: string): void => {
    setPlanRows((prev) => prev.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row)));
  };

  if (!templateId) {
    return <section className="py-8 text-sm text-slate-600">잘못된 접근입니다.</section>;
  }

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (error) {
    return (
      <section className="grid gap-4 py-8">
        <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <h1 className="text-xl font-semibold text-rose-900">오류가 발생했습니다</h1>
          <p className="mt-2 text-sm text-rose-800">템플릿 데이터를 불러오지 못했습니다.</p>
          <div className="mt-4">
            <Button onClick={() => navigate('/itinerary-templates')}>목록으로 이동</Button>
          </div>
        </Card>
      </section>
    );
  }

  if (!template) {
    return (
      <section className="grid gap-4 py-8">
        <Card className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-xl font-semibold text-amber-900">템플릿을 찾을 수 없습니다</h1>
          <p className="mt-2 text-sm text-amber-800">삭제되었거나 잘못된 템플릿 ID입니다.</p>
          <div className="mt-4">
            <Button onClick={() => navigate('/itinerary-templates')}>목록으로 이동</Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{template.name}</h1>
          <p className="mt-1 text-sm text-slate-600">템플릿 메타정보와 일차별 본문을 수정할 수 있습니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/itinerary-templates')}>
            목록으로
          </Button>
        </div>
      </header>

      {saveMessage ? (
        <Card className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{saveMessage}</Card>
      ) : null}

      {routeRecoveryMessage ? (
        <Card className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{routeRecoveryMessage}</Card>
      ) : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-medium">설정</h2>
          <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">이름</span>
            <input
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">지역</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAutoRowsSyncEnabled(true);
                  setFormRegionId('');
                  setStartLocationId('');
                  setStartLocationVersionId('');
                  setSelectedRoute([]);
                  setRouteRecoveryMessage('');
                }}
                className={`rounded-xl border px-3 py-1.5 text-sm ${
                  formRegionId === ''
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
                    setIsAutoRowsSyncEnabled(true);
                    setFormRegionId(region.id);
                    setStartLocationId('');
                    setStartLocationVersionId('');
                    setSelectedRoute([]);
                    setRouteRecoveryMessage('');
                  }}
                  className={`rounded-xl border px-3 py-1.5 text-sm ${
                    formRegionId === region.id
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
              {Array.from({ length: 12 }, (_, idx) => idx + 2).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setIsAutoRowsSyncEnabled(true);
                    setFormTotalDays(day);
                    setSelectedRoute((prev) => trimRouteSelectionsToTotalDays(prev, day));
                    setRouteRecoveryMessage('');
                  }}
                  className={`rounded-xl border px-3 py-1.5 text-sm ${
                    formTotalDays === day
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
              value={formSortOrder}
              onChange={(event) => setFormSortOrder(Math.max(0, Number(event.target.value) || 0))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">설명</span>
            <textarea
              value={formDescription}
              onChange={(event) => setFormDescription(event.target.value)}
              rows={2}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">상태</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFormIsActive(true)}
                aria-pressed={formIsActive}
                className={`rounded-xl border px-3 py-1.5 text-sm ${
                  formIsActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                활성
              </button>
              <button
                type="button"
                onClick={() => setFormIsActive(false)}
                aria-pressed={!formIsActive}
                className={`rounded-xl border px-3 py-1.5 text-sm ${
                  !formIsActive
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
                    setIsAutoRowsSyncEnabled(true);
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
                      setIsAutoRowsSyncEnabled(true);
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
                    onClick={() => {
                      setIsAutoRowsSyncEnabled(true);
                      setStartLocationVersionId(version.id);
                    }}
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

                if (stop.kind === 'MULTI_DAY_BLOCK') {
                  return (
                    <>
                      <div className="text-sm font-medium">
                        {startDayIndex === endDayIndex ? `${startDayIndex}일차` : `${startDayIndex}~${endDayIndex}일차`} 블록
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
                            onClick={() => {
                              setIsAutoRowsSyncEnabled(true);
                              setSelectedRoute((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, locationVersionId: version.id } : item,
                                ),
                              );
                            }}
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
                if (previousStop?.kind === 'MULTI_DAY_BLOCK') {
                  const connection = findOvernightStayConnection(
                    filteredOvernightStayConnections,
                    previousStop.multiDayBlockId,
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
                            onClick={() => {
                              setIsAutoRowsSyncEnabled(true);
                              setSelectedRoute((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, locationVersionId: version.id } : item,
                                ),
                              );
                            }}
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
                          <div className="text-xs text-slate-500">블록 다음 연결 버전</div>
                          <div className="flex flex-wrap gap-2">
                            {versions.map((version) => (
                              <button
                                key={`route-overnight-connection-version-${index}-${version.id}`}
                                type="button"
                                onClick={() => {
                                  setIsAutoRowsSyncEnabled(true);
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
                                  );
                                }}
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
                          onClick={() => {
                            setIsAutoRowsSyncEnabled(true);
                            setSelectedRoute((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, locationVersionId: version.id } : item,
                              ),
                            );
                          }}
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
                              onClick={() => {
                                setIsAutoRowsSyncEnabled(true);
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
                                );
                              }}
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

          {startLocationId && startLocationVersionId && 1 + getConsumedRouteDayCount(selectedRoute) < formTotalDays ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4">
              <div className="mb-3 text-sm font-medium">{2 + getConsumedRouteDayCount(selectedRoute)}일차 선택</div>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {nextOptions.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => {
                        setIsAutoRowsSyncEnabled(true);
                        setSelectedRoute((prev) => {
                          const lastStop = prev[prev.length - 1];
                          if (lastStop?.kind === 'MULTI_DAY_BLOCK') {
                            const connection = findOvernightStayConnection(
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
                        });
                      }}
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
                    disabled={formTotalDays - (1 + getConsumedRouteDayCount(selectedRoute)) < 2}
                    onClick={() => setIsOvernightStayPickerOpen((prev) => !prev)}
                  >
                    연속 일정 블록 선택하기
                  </Button>
                  {formTotalDays - (1 + getConsumedRouteDayCount(selectedRoute)) < 2 ? (
                    <span className="text-xs text-slate-500">남은 일수에 맞는 블록만 선택할 수 있습니다.</span>
                  ) : null}
                </div>
                {isOvernightStayPickerOpen ? (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {overnightStayOptions.map((overnightStay) => (
                      <button
                        key={overnightStay.id}
                        type="button"
                        onClick={() => {
                          setIsAutoRowsSyncEnabled(true);
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
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-100"
                      >
                        {overnightStay.title}
                      </button>
                    ))}
                  </div>
                ) : null}
                {isOvernightStayPickerOpen && overnightStayOptions.length === 0 ? (
                  <p className="text-xs text-amber-700">선택 가능한 연속 일정 블록이 없습니다.</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {selectedRoute.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setIsAutoRowsSyncEnabled(true);
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
                <tr key={`detail-row-${rowIndex + 1}`} className="border-t border-slate-200 align-top">
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
          <p className="mt-3 text-xs text-amber-700">저장하려면 1일차 출발지와 {formTotalDays}일 전체 목적지를 순서대로 선택해야 합니다.</p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Button
            variant="primary"
            disabled={updating || !canSave}
            onClick={async () => {
              await updateTemplate({
                variables: {
                  id: template.id,
                  input: {
                    name: formName.trim(),
                    description: formDescription.trim(),
                    regionId: formRegionId,
                    totalDays: formTotalDays,
                    sortOrder: formSortOrder,
                    isActive: formIsActive,
                    planStops: buildTemplateStopsFromRouteAndRows({
                      startLocationId,
                      startLocationVersionId,
                      selectedRoute,
                      planRows,
                    }),
                  },
                },
              });
              await refetch();
              setSaveMessage('템플릿 메타와 일차별 본문을 저장했습니다.');
            }}
          >
            {updating ? '저장 중...' : '저장'}
          </Button>
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={async () => {
              if (!window.confirm(`템플릿 \"${template.name}\"을(를) 삭제할까요?`)) {
                return;
              }
              await deleteTemplate({ variables: { id: template.id } });
              navigate('/itinerary-templates');
            }}
          >
            {deleting ? '삭제 중...' : '삭제'}
          </Button>
        </div>
      </Card>
    </section>
  );
}
