import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Input } from '@tour/ui';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  calculateMovementIntensityByHours,
  getMovementIntensityMeta,
} from '../features/estimate/model/movement-intensity';
import { formatLocationNameInline } from '../features/location/display';
import { MultiDayBlockDaySlotEditor, createMultiDayBlockScheduleSlot, serializeMultiDayBlockScheduleSlots, type MultiDayBlockScheduleSlotInput } from '../features/multi-day-block/day-slot-editor';
import { MultiDayBlockLodgingMealEditor } from '../features/multi-day-block/lodging-meal-editor';
import {
  createDefaultMultiDayBlockLodgingMealsDraft,
  serializeMultiDayBlockLodgingCellText,
  serializeMultiDayBlockMealCellText,
  type MultiDayBlockLodgingFormValue,
  type MultiDayBlockMealsFormValue,
} from '../features/multi-day-block/lodging-meal-form';
import { MultiDayBlockSubNav } from '../features/multi-day-block/sub-nav';

interface RegionRow {
  id: string;
  name: string;
}

interface LocationRow {
  id: string;
  regionId: string;
  name: string[];
}

interface MultiDayBlockDayDraft {
  dayOrder: number;
  displayLocationId: string;
  averageDistanceKm: string;
  averageTravelHours: string;
  scheduleSlots: MultiDayBlockScheduleSlotInput[];
  lodging: MultiDayBlockLodgingFormValue;
  meals: MultiDayBlockMealsFormValue;
}

const REGIONS_QUERY = gql`
  query OvernightStayCreateRegions {
    regions {
      id
      name
    }
  }
`;

const LOCATIONS_QUERY = gql`
  query OvernightStayCreateLocations {
    locations {
      id
      regionId
      name
    }
  }
`;

const CREATE_MULTI_DAY_BLOCK_MUTATION = gql`
  mutation CreateMultiDayBlockPage($input: MultiDayBlockCreateInput!) {
    createMultiDayBlock(input: $input) {
      id
    }
  }
`;

function createDayDraft(dayOrder: number): MultiDayBlockDayDraft {
  const defaults = createDefaultMultiDayBlockLodgingMealsDraft();
  return {
    dayOrder,
    displayLocationId: '',
    averageDistanceKm: '0',
    averageTravelHours: '0',
    scheduleSlots: [createMultiDayBlockScheduleSlot()],
    lodging: defaults.lodging,
    meals: defaults.meals,
  };
}

export function MultiDayBlockCreatePage(): JSX.Element {
  const navigate = useNavigate();
  const [regionId, setRegionId] = useState('');
  const [name, setName] = useState('');
  const [isNightTrain, setIsNightTrain] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [days, setDays] = useState<MultiDayBlockDayDraft[]>([createDayDraft(1), createDayDraft(2)]);
  const [dayEditorNonce, setDayEditorNonce] = useState(0);

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const [createMultiDayBlock, { loading }] = useMutation<{ createMultiDayBlock: { id: string } }>(
    CREATE_MULTI_DAY_BLOCK_MUTATION,
  );

  const regions = regionData?.regions ?? [];
  const locations = locationData?.locations ?? [];
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const selectableLocations = useMemo(
    () => locations.filter((location) => location.regionId === regionId),
    [locations, regionId],
  );
  const sortedDays = days.slice().sort((left, right) => left.dayOrder - right.dayOrder);
  const canSubmit = Boolean(regionId && name.trim() && sortedDays.every((day) => day.displayLocationId));

  const updateDay = (
    dayOrder: number,
    field: keyof MultiDayBlockDayDraft,
    value: MultiDayBlockDayDraft[keyof MultiDayBlockDayDraft],
  ) => {
    setDays((prev) => prev.map((day) => (day.dayOrder === dayOrder ? { ...day, [field]: value } : day)));
  };

  const handleRegionChange = (nextRegionId: string) => {
    setRegionId(nextRegionId);
    setDays((prev) =>
      prev.map((day) => {
        const location = locationById.get(day.displayLocationId);
        return location && location.regionId !== nextRegionId ? { ...day, displayLocationId: '' } : day;
      }),
    );
  };

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">연속 일정 블록 생성</h1>
          <p className="mt-1 text-sm text-slate-600">블록은 2~3일짜리 커스텀 묶음입니다. 각 일차 목적지와 본문을 직접 입력합니다.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/multi-day-blocks/list')}>
          목록으로
        </Button>
      </header>

      <MultiDayBlockSubNav pathname="/multi-day-blocks/create" />

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid items-start gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-900">블록 이름</span>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 테를지 3일 커스텀" />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-900">지역</span>
                <div className="flex flex-wrap gap-2">
                  {regions.map((region) => (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => handleRegionChange(region.id)}
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
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isNightTrain} onChange={(event) => setIsNightTrain(event.target.checked)} />
                야간열차 금액 규칙 적용
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
                활성
              </label>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 p-4">
              {sortedDays.length < 3 ? (
                <Button variant="outline" onClick={() => setDays((prev) => [...prev, createDayDraft(3)])}>
                  3일차 추가
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setDays((prev) => prev.filter((day) => day.dayOrder !== 3))}>
                  3일차 제거
                </Button>
              )}
              <span className="text-xs text-slate-500">블록은 2일 또는 3일까지 설정할 수 있습니다.</span>
            </div>

            <div className="flex gap-2">
              <Button
                disabled={!canSubmit || loading}
                onClick={async () => {
                  const result = await createMultiDayBlock({
                    variables: {
                      input: {
                        regionId,
                        name: name.trim(),
                        isNightTrain,
                        sortOrder: 0,
                        isActive,
                        days: sortedDays.map((day) => {
                          const { timeCellText, scheduleCellText } = serializeMultiDayBlockScheduleSlots(day.scheduleSlots);
                          return {
                            dayOrder: day.dayOrder,
                            displayLocationId: day.displayLocationId,
                            averageDistanceKm: Number(day.averageDistanceKm) || 0,
                            averageTravelHours: Number(day.averageTravelHours) || 0,
                            timeCellText,
                            scheduleCellText,
                            lodgingCellText: serializeMultiDayBlockLodgingCellText(day.lodging),
                            mealCellText: serializeMultiDayBlockMealCellText(day.meals),
                          };
                        }),
                      },
                    },
                  });
                  const createdId = result.data?.createMultiDayBlock.id;
                  if (createdId) {
                    navigate(`/multi-day-blocks/${createdId}`);
                  }
                }}
              >
                {loading ? '생성 중...' : '블록 생성'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/multi-day-blocks/list')}>
                취소
              </Button>
            </div>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            {sortedDays.map((day) => (
              <div key={day.dayOrder} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h2 className="font-medium text-slate-900">{day.dayOrder}일차</h2>
                  <p className="mt-1 text-xs text-slate-500">일차별 목적지와 이동/일정/숙소/식사를 설정합니다.</p>
                </div>

                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-900">이 일차 목적지</span>
                  <select
                    value={day.displayLocationId}
                    onChange={(event) => updateDay(day.dayOrder, 'displayLocationId', event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <option value="">목적지 선택</option>
                    {selectableLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {formatLocationNameInline(location.name)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  <label className="grid gap-1 rounded-2xl border border-slate-200 p-4 text-sm">
                    <span>이동시간(시간)</span>
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={day.averageTravelHours}
                      onChange={(event) => updateDay(day.dayOrder, 'averageTravelHours', event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 rounded-2xl border border-slate-200 p-4 text-sm">
                    <span>이동거리(km)</span>
                    <Input
                      type="number"
                      min={0}
                      value={day.averageDistanceKm}
                      onChange={(event) => updateDay(day.dayOrder, 'averageDistanceKm', event.target.value)}
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">자동 계산 이동강도</span>
                  <span className="ml-2">
                    {(() => {
                      const hours = Number(day.averageTravelHours);
                      if (!Number.isFinite(hours) || hours < 0) {
                        return '-';
                      }
                      const meta = getMovementIntensityMeta(calculateMovementIntensityByHours(hours));
                      return meta ? meta.label : '-';
                    })()}
                  </span>
                </div>

                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div>
                    <span className="text-sm font-medium text-slate-900">시간 / 일정</span>
                  </div>
                  <MultiDayBlockDaySlotEditor
                    key={`create-day-slots-${day.dayOrder}-${dayEditorNonce}`}
                    title="시간 / 일정"
                    description="일차별 시간표와 활동을 직접 편집하거나 입력도우미로 붙여넣을 수 있습니다."
                    value={day.scheduleSlots}
                    onChange={(nextValue) => updateDay(day.dayOrder, 'scheduleSlots', nextValue)}
                    pasteHelperResetNonce={dayEditorNonce}
                  />
                </div>

                <MultiDayBlockLodgingMealEditor
                  lodging={day.lodging}
                  meals={day.meals}
                  onLodgingChange={(nextValue) => updateDay(day.dayOrder, 'lodging', nextValue)}
                  onMealsChange={(nextValue) => updateDay(day.dayOrder, 'meals', nextValue)}
                />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}
