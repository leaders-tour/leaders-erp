import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Input, StatusBadge, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import { VariantType } from '../generated/graphql';

type CellSource = 'AUTO' | 'OVERRIDE';
type EditableField = 'distanceText' | 'lodgingText' | 'mealsText';

interface RegionRow {
  id: string;
  name: string;
}

interface LocationRow {
  id: string;
  regionId: string;
  name: string;
  defaultLodgingType: string;
  timeBlocks: Array<{
    id: string;
    startTime: string;
    label: string;
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

interface TimeTableItem {
  time: string;
  text: string;
}

interface PlanStopDraft {
  dayIndex: number;
  fromLocationId: string;
  toLocationId: string;
  distanceText: string;
  lodgingText: string;
  mealsText: string;
  timeTable: TimeTableItem[];
}

interface PlanStopPayload {
  dayIndex: number;
  fromLocationId: string;
  toLocationId: string;
  lodgingId: null;
  mealSetId: null;
  distanceText: string;
  lodgingText: string;
  mealsText: string;
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
      defaultLodgingType
      timeBlocks {
        id
        startTime
        label
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

function inferMeals(params: { lodging: string; variant: VariantType; day: number; isLastDay: boolean }): string {
  const { lodging, variant, day, isLastDay } = params;

  let breakfast = '캠프식';
  let lunch = '현지식당';
  let dinner = '캠프식';

  if (lodging.includes('온천')) {
    dinner = '삼겹살파티';
  }

  if (variant === VariantType.Afternoon && day === 1) {
    breakfast = 'X';
  }

  if (isLastDay) {
    dinner = '샤브샤브';
  }

  return `${breakfast}\n${lunch}\n${dinner}`;
}

function overrideKey(dayIndex: number, field: EditableField): string {
  return `${dayIndex}.${field}`;
}

export function ItineraryBuilderPage(): JSX.Element {
  const [variantType, setVariantType] = useState<VariantType>(VariantType.Basic);
  const [totalDays, setTotalDays] = useState<number>(6);
  const [regionId, setRegionId] = useState<string>('');
  const [startLocationId, setStartLocationId] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
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
    if (selectedRoute.length >= totalDays) {
      return [];
    }

    const fromId = selectedRoute.length === 0 ? startLocationId : selectedRoute[selectedRoute.length - 1];
    if (!fromId) {
      return [];
    }

    const toIds = filteredSegments.filter((segment) => segment.fromLocationId === fromId).map((segment) => segment.toLocationId);
    return filteredLocations.filter((location) => toIds.includes(location.id));
  }, [filteredLocations, filteredSegments, selectedRoute, startLocationId, totalDays]);

  const dayDrafts = useMemo((): PlanStopDraft[] => {
    return selectedRoute.map((toId, index) => {
      const dayIndex = index + 1;
      const fromId = index === 0 ? startLocationId : selectedRoute[index - 1] ?? '';
      const segment = filteredSegments.find((item) => item.fromLocationId === fromId && item.toLocationId === toId);
      const toLocation = locationById.get(toId);
      const distanceText = segment ? `이동 ${segment.averageTravelHours}시간 (${segment.averageDistanceKm}km)` : '구간 미정';
      const lodgingText = toLocation?.defaultLodgingType ?? '숙소 미정';
      const mealsText = inferMeals({ lodging: lodgingText, variant: variantType, day: dayIndex, isLastDay: dayIndex === totalDays });
      const timeTable =
        toLocation?.timeBlocks
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .flatMap((timeBlock) => {
            if (timeBlock.activities.length === 0) {
              return [{ time: timeBlock.startTime, text: '(활동 미지정)' }];
            }
            return [...timeBlock.activities]
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((activity) => ({ time: timeBlock.startTime, text: activity.description }));
          }) ?? [];

      return {
        dayIndex,
        fromLocationId: fromId,
        toLocationId: toId,
        distanceText,
        lodgingText,
        mealsText,
        timeTable,
      };
    });
  }, [filteredSegments, locationById, selectedRoute, startLocationId, totalDays, variantType]);

  const getCell = (draft: PlanStopDraft, field: EditableField): { value: string; source: CellSource } => {
    const key = overrideKey(draft.dayIndex, field);
    if (overrides[key] !== undefined) {
      return { value: overrides[key], source: 'OVERRIDE' };
    }
    return { value: draft[field], source: 'AUTO' };
  };

  const setCell = (dayIndex: number, field: EditableField, value: string): void => {
    setOverrides((prev) => ({ ...prev, [overrideKey(dayIndex, field)]: value }));
  };

  const hasMissingSegment = dayDrafts.some((draft) => draft.distanceText.includes('구간 미정'));

  const payloadPlanStops = useMemo((): PlanStopPayload[] => {
    return dayDrafts.map((draft) => ({
      dayIndex: draft.dayIndex,
      fromLocationId: draft.fromLocationId,
      toLocationId: draft.toLocationId,
      lodgingId: null,
      mealSetId: null,
      distanceText: getCell(draft, 'distanceText').value,
      lodgingText: getCell(draft, 'lodgingText').value,
      mealsText: getCell(draft, 'mealsText').value,
    }));
  }, [dayDrafts, overrides]);

  const canCreate = Boolean(regionId && startLocationId && selectedRoute.length === totalDays && !hasMissingSegment);

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 px-2 py-4">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">여행 일정 생성기</h1>
            <p className="mt-1 text-sm text-slate-600">목적지 순차 선택 → 자동 채움 → 오버라이드 → 저장/인쇄</p>
          </div>
          <div className="flex gap-2 no-print">
            <Button variant="outline" onClick={() => window.print()}>
              인쇄/PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOverrides({});
              }}
            >
              오버라이드 초기화
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
                      planStops: payloadPlanStops,
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
                        setOverrides({});
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
                        setOverrides({});
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
                  <div className="text-sm font-medium">{index + 1}일차</div>
                  <div className="mt-1 text-slate-700">{locationById.get(locationId)?.name ?? locationId}</div>
                </div>
              ))}

              {startLocationId && selectedRoute.length < totalDays ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4">
                  <div className="mb-3 text-sm font-medium">{selectedRoute.length + 1}일차 선택</div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {nextOptions.map((location) => (
                      <button
                        key={location.id}
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
                  onClick={() => {
                    setSelectedRoute([]);
                    setOverrides({});
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
            <p className="mt-1 text-xs text-slate-600">이동/숙소/식사를 수정하면 OVERRIDE로 표시됩니다.</p>
          </div>

          <div className="overflow-auto">
            <Table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th className="w-[70px]">날짜</Th>
                  <Th className="w-[200px]">구간</Th>
                  <Th className="w-[270px]">이동/타임테이블</Th>
                  <Th className="w-[190px]">이동 문구</Th>
                  <Th className="w-[170px]">숙소</Th>
                  <Th className="w-[180px]">식사</Th>
                </tr>
              </thead>
              <tbody>
                {dayDrafts.map((draft) => {
                  const fromName = locationById.get(draft.fromLocationId)?.name ?? draft.fromLocationId;
                  const toName = locationById.get(draft.toLocationId)?.name ?? draft.toLocationId;

                  const distance = getCell(draft, 'distanceText');
                  const lodging = getCell(draft, 'lodgingText');
                  const meals = getCell(draft, 'mealsText');

                  return (
                    <tr key={`day-row-${draft.dayIndex}`} className="border-t border-slate-200 align-top">
                      <Td>
                        <div className="font-medium">{draft.dayIndex}일차</div>
                      </Td>
                      <Td>
                        <div className="text-slate-900">
                          {fromName} → {toName}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">A→B 구간 기반 자동 생성</div>
                      </Td>
                      <Td>
                        <div className="space-y-2">
                          {draft.timeTable.map((item, index) => (
                            <div key={`tb-${draft.dayIndex}-${index}`} className="flex gap-3 text-sm">
                              <div className="w-[58px] font-medium text-slate-700">{item.time}</div>
                              <div className="flex-1 text-slate-900">{item.text}</div>
                            </div>
                          ))}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center justify-between">
                          <StatusBadge tone={distance.source === 'AUTO' ? 'auto' : 'override'} label={distance.source} />
                        </div>
                        <div className="mt-2">
                          <Input value={distance.value} onChange={(event) => setCell(draft.dayIndex, 'distanceText', event.target.value)} />
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center justify-between">
                          <StatusBadge tone={lodging.source === 'AUTO' ? 'auto' : 'override'} label={lodging.source} />
                        </div>
                        <div className="mt-2">
                          <Input value={lodging.value} onChange={(event) => setCell(draft.dayIndex, 'lodgingText', event.target.value)} />
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center justify-between">
                          <StatusBadge tone={meals.source === 'AUTO' ? 'auto' : 'override'} label={meals.source} />
                        </div>
                        <div className="mt-2">
                          <textarea
                            value={meals.value}
                            onChange={(event) => setCell(draft.dayIndex, 'mealsText', event.target.value)}
                            className="min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5"
                          />
                        </div>
                      </Td>
                    </tr>
                  );
                })}
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

              {Object.keys(overrides).length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-3">오버라이드 {Object.keys(overrides).length}개 적용됨</div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-3">오버라이드 없음</div>
              )}
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
    overridesCount: Object.keys(overrides).length,
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
