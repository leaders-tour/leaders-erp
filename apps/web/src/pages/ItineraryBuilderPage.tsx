import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { toFacilityLabel, toMealLabel } from '../features/location/display';
import { MealOption, VariantType } from '../generated/graphql';

interface RegionRow {
  id: string;
  name: string;
}

interface LocationRow {
  id: string;
  regionId: string;
  name: string;
  internalMovementDistance: number | null;
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

interface PlanRow {
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
}

const REGIONS_QUERY = gql`
  query ItineraryRegions {
    regions {
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
      internalMovementDistance
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

const VARIANTS = [
  { id: VariantType.Basic, label: '기본' },
  { id: VariantType.Early, label: '얼리' },
  { id: VariantType.Afternoon, label: '오후' },
  { id: VariantType.Extend, label: '연장' },
];

function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function toTimeCell(location: LocationRow | undefined): string {
  if (!location || location.timeBlocks.length === 0) {
    return '';
  }

  return location.timeBlocks
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

function toScheduleCell(location: LocationRow | undefined): string {
  if (!location || location.timeBlocks.length === 0) {
    return '';
  }

  return location.timeBlocks
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

function toLodgingCell(location: LocationRow | undefined): string {
  const lodging = location?.lodgings[0];
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

function toMealCell(location: LocationRow | undefined): string {
  const mealSet = location?.mealSets[0];
  return [
    `아침 ${toMealLabel(mealSet?.breakfast)}`,
    `점심 ${toMealLabel(mealSet?.lunch)}`,
    `저녁 ${toMealLabel(mealSet?.dinner)}`,
  ].join('\n');
}

export function ItineraryBuilderPage(): JSX.Element {
  const [variantType, setVariantType] = useState<VariantType>(VariantType.Basic);
  const [totalDays, setTotalDays] = useState<number>(6);
  const [regionId, setRegionId] = useState<string>('');
  const [startLocationId, setStartLocationId] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<string[]>([]);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [createdPlanId, setCreatedPlanId] = useState<string>('');

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const { data: segmentData } = useQuery<{ segments: SegmentRow[] }>(SEGMENTS_QUERY);
  const [createPlan, { loading: creating }] = useMutation<{ createPlan: { id: string } }>(CREATE_PLAN_MUTATION);

  const regions = regionData?.regions ?? [];
  const locations = locationData?.locations ?? [];
  const segments = segmentData?.segments ?? [];

  const filteredLocations = useMemo(
    () => locations.filter((location) => location.regionId === regionId),
    [locations, regionId],
  );

  const filteredSegments = useMemo(
    () => segments.filter((segment) => segment.regionId === regionId),
    [segments, regionId],
  );

  const locationById = useMemo(() => new Map(filteredLocations.map((location) => [location.id, location])), [filteredLocations]);

  const nextOptions = useMemo(() => {
    if (selectedRoute.length >= totalDays - 1) {
      return [];
    }

    const fromId = selectedRoute.length === 0 ? startLocationId : selectedRoute[selectedRoute.length - 1];
    if (!fromId) {
      return [];
    }

    const toIds = filteredSegments.filter((segment) => segment.fromLocationId === fromId).map((segment) => segment.toLocationId);
    return filteredLocations.filter((location) => toIds.includes(location.id));
  }, [filteredLocations, filteredSegments, selectedRoute, startLocationId, totalDays]);

  const autoRows = useMemo((): PlanRow[] => {
    if (!startLocationId) {
      return [];
    }

    const orderedLocationIds = [startLocationId, ...selectedRoute];

    return orderedLocationIds.map((toId, index) => {
      const dayIndex = index + 1;
      const fromId = index === 0 ? '' : orderedLocationIds[index - 1] ?? '';
      const segment = filteredSegments.find((item) => item.fromLocationId === fromId && item.toLocationId === toId);
      const toLocation = locationById.get(toId);
      const segmentHours = segment?.averageTravelHours ?? 0;
      const internalHours = toLocation?.internalMovementDistance ?? 0;
      const totalTravelHours = segment ? segmentHours + internalHours : 0;
      const destinationCellText = [
        toLocation?.name ?? toId,
        segment
          ? `(이동시간: ${formatHours(totalTravelHours)}시간)`
          : '(이동시간: 미정)',
      ].join('\n');

      return {
        dateCellText: `${dayIndex}일차`,
        destinationCellText,
        timeCellText: toTimeCell(toLocation),
        scheduleCellText: toScheduleCell(toLocation),
        lodgingCellText: toLodgingCell(toLocation),
        mealCellText: toMealCell(toLocation),
      };
    });
  }, [filteredSegments, locationById, selectedRoute, startLocationId]);

  useEffect(() => {
    setPlanRows(autoRows);
  }, [autoRows]);

  const hasMissingSegment = useMemo(() => {
    return selectedRoute.some((toId, index) => {
      const fromId = index === 0 ? startLocationId : selectedRoute[index - 1] ?? '';
      return !filteredSegments.some((segment) => segment.fromLocationId === fromId && segment.toLocationId === toId);
    });
  }, [filteredSegments, selectedRoute, startLocationId]);

  const updateCell = (rowIndex: number, field: keyof PlanRow, value: string): void => {
    setPlanRows((prev) => prev.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row)));
  };

  const canCreate = Boolean(
    regionId && startLocationId && selectedRoute.length === totalDays - 1 && planRows.length === totalDays,
  );

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 px-2 py-4">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">여행 일정 생성기</h1>
            <p className="mt-1 text-sm text-slate-600">목적지 순차 선택 → 자동 채움 → 자유 편집 → 저장/PDF</p>
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

                const result = await createPlan({
                  variables: {
                    input: {
                      regionId,
                      variantType,
                      totalDays,
                      planStops: planRows,
                    },
                  },
                });

                setCreatedPlanId(result.data?.createPlan.id ?? '');
              }}
            >
              {creating ? '생성 중...' : '일정 생성'}
            </Button>
          </div>
        </header>

        {createdPlanId ? (
          <Card>
            <p className="text-sm text-emerald-700">Plan 생성 완료: {createdPlanId}</p>
          </Card>
        ) : null}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
            <h2 className="font-medium">설정</h2>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-1 text-sm">
                <span className="text-xs text-slate-600">지역</span>
                <div className="flex flex-wrap gap-2">
                  {regions.map((region) => (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => {
                        setRegionId(region.id);
                        setStartLocationId('');
                        setSelectedRoute([]);
                        setPlanRows([]);
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

              <div className="grid gap-1 text-sm">
                <span className="text-xs text-slate-600">일수</span>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 9 }, (_, idx) => idx + 2).map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setTotalDays(day);
                        setSelectedRoute((prev) => prev.slice(0, day));
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
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm lg:col-span-2">
            <h2 className="font-medium">일차별 목적지 선택 (순차 선택)</h2>
            <p className="mt-1 text-xs text-slate-600">이전 일차와 연결 가능한 목적지만 버튼으로 노출됩니다.</p>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-medium">1일차 출발지</div>
                {startLocationId ? (
                  <div className="mt-1 text-slate-700">{locationById.get(startLocationId)?.name ?? startLocationId}</div>
                ) : (
                  <div className="mt-1 text-xs text-slate-500">출발지를 선택해주세요.</div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {filteredLocations.map((location) => (
                    <button
                      key={`start-${location.id}`}
                      type="button"
                      onClick={() => {
                        setStartLocationId(location.id);
                        setSelectedRoute([]);
                      }}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        startLocationId === location.id
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white hover:bg-slate-100'
                      }`}
                    >
                      {location.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedRoute.map((locationId, index) => (
                <div key={`selected-${index + 1}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-medium">{index + 2}일차</div>
                  <div className="mt-1 text-slate-700">{locationById.get(locationId)?.name ?? locationId}</div>
                </div>
              ))}

              {startLocationId && selectedRoute.length < totalDays - 1 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4">
                  <div className="mb-3 text-sm font-medium">{selectedRoute.length + 2}일차 선택</div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {nextOptions.map((location) => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => setSelectedRoute((prev) => [...prev, location.id])}
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
                        onChange={(event) => updateCell(rowIndex, 'dateCellText', event.target.value)}
                        className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 whitespace-pre-wrap"
                      />
                    </Td>
                    <Td>
                      <textarea
                        value={row.destinationCellText}
                        onChange={(event) => updateCell(rowIndex, 'destinationCellText', event.target.value)}
                        className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 whitespace-pre-wrap"
                      />
                    </Td>
                    <Td>
                      <textarea
                        value={row.timeCellText}
                        onChange={(event) => updateCell(rowIndex, 'timeCellText', event.target.value)}
                        className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 whitespace-pre-wrap"
                      />
                    </Td>
                    <Td>
                      <textarea
                        value={row.scheduleCellText}
                        onChange={(event) => updateCell(rowIndex, 'scheduleCellText', event.target.value)}
                        className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 whitespace-pre-wrap"
                      />
                    </Td>
                    <Td>
                      <textarea
                        value={row.lodgingCellText}
                        onChange={(event) => updateCell(rowIndex, 'lodgingCellText', event.target.value)}
                        className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 whitespace-pre-wrap"
                      />
                    </Td>
                    <Td>
                      <textarea
                        value={row.mealCellText}
                        onChange={(event) => updateCell(rowIndex, 'mealCellText', event.target.value)}
                        className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 whitespace-pre-wrap"
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
            <h2 className="font-medium">검증</h2>
            <div className="mt-3 space-y-2 text-sm">
              {hasMissingSegment ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  일부 구간 템플릿이 없습니다. Segment 데이터를 보강해주세요.
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">현재 구간 커버리지 정상</div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-3">편집 행 수: {planRows.length}</div>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
            <h2 className="font-medium">저장 데이터 미리보기</h2>
            <p className="mt-1 text-xs text-slate-600">Plan 생성 시 서버로 전달되는 요약입니다.</p>
            <pre className="mt-3 max-h-[280px] overflow-auto rounded-2xl bg-slate-900 p-3 text-xs leading-5 text-slate-100">
{JSON.stringify(
  {
    regionId,
    variantType,
    totalDays,
    selectedRoute,
    planStops: planRows,
  },
  null,
  2,
)}
            </pre>
          </Card>
        </section>
      </div>
    </div>
  );
}
