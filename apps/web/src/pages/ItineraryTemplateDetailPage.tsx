import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buildEmptyPlanRow, type TemplatePlanRow } from '../features/plan-template/editor-utils';
import {
  buildAutoRowsFromRoute,
  buildNextOptions,
  buildTemplateStopsFromRouteAndRows,
  formatLocationVersion,
  getDefaultVersionId,
  type LocationOption,
  type RouteSelection,
  type SegmentOption,
} from '../features/plan-template/route-autofill';

interface RegionRow {
  id: string;
  name: string;
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
  query ItineraryTemplateDetailSegments {
    segments {
      id
      regionId
      fromLocationId
      toLocationId
      averageTravelHours
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
  const [planRows, setPlanRows] = useState<TemplatePlanRow[]>([]);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [routeRecoveryMessage, setRouteRecoveryMessage] = useState<string>('');
  const [skipNextAutoRowsSync, setSkipNextAutoRowsSync] = useState<boolean>(false);
  const [isAutoRowsSyncEnabled, setIsAutoRowsSyncEnabled] = useState<boolean>(false);

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData } = useQuery<{ locations: LocationOption[] }>(LOCATIONS_QUERY);
  const { data: segmentData } = useQuery<{ segments: SegmentOption[] }>(SEGMENTS_QUERY);
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

  const filteredLocations = useMemo(
    () => locations.filter((location) => location.regionId === formRegionId),
    [locations, formRegionId],
  );

  const filteredSegments = useMemo(
    () => segments.filter((segment) => segment.regionId === formRegionId),
    [segments, formRegionId],
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

  const nextOptions = useMemo(
    () =>
      buildNextOptions({
        filteredLocations,
        filteredSegments,
        startLocationId,
        selectedRoute,
        totalDays: formTotalDays,
      }),
    [filteredLocations, filteredSegments, selectedRoute, startLocationId, formTotalDays],
  );

  const autoRows = useMemo(
    () =>
      buildAutoRowsFromRoute({
        startLocationId,
        startLocationVersionId,
        selectedRoute,
        filteredSegments,
        locationById,
        locationVersionById,
        totalDays: formTotalDays,
      }),
    [filteredSegments, locationById, locationVersionById, selectedRoute, startLocationId, startLocationVersionId, formTotalDays],
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
      const recoveredRoute: RouteSelection[] = [];
      for (const stop of dayOrderedStops.slice(1)) {
        if (!stop?.locationId || !stop.locationVersionId) {
          break;
        }
        recoveredRoute.push({ locationId: stop.locationId, locationVersionId: stop.locationVersionId });
      }
      setSelectedRoute(recoveredRoute);
      setRouteRecoveryMessage('기존 템플릿의 위치 정보가 일부 없어 루트를 완전히 복원하지 못했습니다. 루트를 다시 선택해 주세요.');
      return;
    }

    setSelectedRoute(
      dayOrderedStops.slice(1).map((stop) => ({
        locationId: stop?.locationId ?? '',
        locationVersionId: stop?.locationVersionId ?? '',
      })),
    );
    setRouteRecoveryMessage('');
  }, [template]);

  const hasCompleteRoute =
    Boolean(startLocationId) &&
    Boolean(startLocationVersionId) &&
    selectedRoute.length === formTotalDays - 1 &&
    selectedRoute.every((stop) => Boolean(stop.locationId && stop.locationVersionId));

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
              {Array.from({ length: 9 }, (_, idx) => idx + 2).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setIsAutoRowsSyncEnabled(true);
                    setFormTotalDays(day);
                    setSelectedRoute((prev) => prev.slice(0, Math.max(day - 1, 0)));
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
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(event) => setFormIsActive(event.target.checked)}
            />
            활성
          </label>
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
                  {locationById.get(startLocationId)?.name ?? startLocationId}
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
                {filteredLocations.map((location) => (
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
            </div>
          ))}

          {startLocationId && startLocationVersionId && selectedRoute.length < formTotalDays - 1 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4">
              <div className="mb-3 text-sm font-medium">{selectedRoute.length + 2}일차 선택</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {nextOptions.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => {
                      setIsAutoRowsSyncEnabled(true);
                      setSelectedRoute((prev) => [
                        ...prev,
                        {
                          locationId: location.id,
                          locationVersionId: getDefaultVersionId(location),
                        },
                      ]);
                    }}
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
