import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Input } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import {
  calculateMovementIntensityByHours,
  getMovementIntensityMeta,
} from '../features/estimate/model/movement-intensity';
import { useNavigate } from 'react-router-dom';
import { formatLocationNameInline } from '../features/location/display';
import { MultiDayBlockSubNav } from '../features/multi-day-block/sub-nav';
import {
  MultiDayBlockDaySlotEditor,
  createMultiDayBlockScheduleSlot,
  serializeMultiDayBlockScheduleSlots,
  type MultiDayBlockScheduleSlotInput,
} from '../features/multi-day-block/day-slot-editor';
import { MealOption } from '../generated/graphql';
import type { FacilityAvailability } from '../features/location/hooks';

const REGULAR_MEAL_OPTIONS: Array<{ value: MealOption; label: string }> = [
  { value: MealOption.CampMeal, label: '캠프식' },
  { value: MealOption.LocalRestaurant, label: '현지식당' },
];

interface RegionRow {
  id: string;
  name: string;
}

interface LocationRow {
  id: string;
  regionId: string;
  name: string[];
}

type BlockType = 'STAY' | 'TRANSFER';

interface MultiDayBlockDayDraft {
  dayOrder: number;
  displayLocationId: string;
  averageDistanceKm: string;
  averageTravelHours: string;
  scheduleSlots: MultiDayBlockScheduleSlotInput[];
  lodging: {
    isUnspecified: boolean;
    name: string;
    hasElectricity: FacilityAvailability;
    hasShower: FacilityAvailability;
    hasInternet: FacilityAvailability;
  };
  meals: {
    breakfast: MealOption | null;
    lunch: MealOption | null;
    dinner: MealOption | null;
  };
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

function createDayDraft(dayOrder: number, displayLocationId = ''): MultiDayBlockDayDraft {
  return {
    dayOrder,
    displayLocationId,
    averageDistanceKm: '0',
    averageTravelHours: '0',
    scheduleSlots: [createMultiDayBlockScheduleSlot()],
    lodging: {
      isUnspecified: false,
      name: '여행자 캠프',
      hasElectricity: 'YES',
      hasShower: 'YES',
      hasInternet: 'YES',
    },
    meals: {
      breakfast: null,
      lunch: null,
      dinner: null,
    },
  };
}

function serializeLodging(lodging: MultiDayBlockDayDraft['lodging']): string {
  if (lodging.isUnspecified) {
    return '';
  }
  const parts: string[] = [lodging.name.trim()];
  const facilities: string[] = [];
  if (lodging.hasElectricity === 'YES') facilities.push('전기');
  else if (lodging.hasElectricity === 'LIMITED') facilities.push('전기(제한)');
  if (lodging.hasShower === 'YES') facilities.push('샤워');
  else if (lodging.hasShower === 'LIMITED') facilities.push('샤워(제한)');
  if (lodging.hasInternet === 'YES') facilities.push('인터넷');
  else if (lodging.hasInternet === 'LIMITED') facilities.push('인터넷(제한)');
  if (facilities.length > 0) {
    parts.push(facilities.join(', '));
  }
  return parts.join('\n');
}

function serializeMeals(meals: MultiDayBlockDayDraft['meals']): string {
  const getLabel = (value: MealOption | null): string =>
    value ? (REGULAR_MEAL_OPTIONS.find((opt) => opt.value === value)?.label ?? '') : '';

  const parts: string[] = [];
  if (meals.breakfast) {
    parts.push(`아침: ${getLabel(meals.breakfast)}`);
  }
  if (meals.lunch) {
    parts.push(`점심: ${getLabel(meals.lunch)}`);
  }
  if (meals.dinner) {
    parts.push(`저녁: ${getLabel(meals.dinner)}`);
  }
  return parts.join('\n');
}

export function MultiDayBlockCreatePage(): JSX.Element {
  const navigate = useNavigate();
  const [blockType, setBlockType] = useState<BlockType>('STAY');
  const [regionId, setRegionId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [startLocationId, setStartLocationId] = useState('');
  const [endLocationId, setEndLocationId] = useState('');
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [days, setDays] = useState<MultiDayBlockDayDraft[]>([createDayDraft(1), createDayDraft(2)]);
  const [daySlotPasteHelperResetNonce, setDaySlotPasteHelperResetNonce] = useState(0);

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const [createMultiDayBlock, { loading }] = useMutation<{ createMultiDayBlock: { id: string } }>(
    CREATE_MULTI_DAY_BLOCK_MUTATION,
  );

  const regions = regionData?.regions ?? [];
  const locations = locationData?.locations ?? [];
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const filteredLocations = useMemo(() => locations.filter((location) => location.regionId === regionId), [locations, regionId]);
  const selectableLocations = regionId ? filteredLocations : locations;
  const selectedLocation = locationId ? locationById.get(locationId) ?? null : null;

  const updateDay = (
    dayOrder: number,
    field: keyof MultiDayBlockDayDraft,
    value: MultiDayBlockDayDraft[keyof MultiDayBlockDayDraft],
  ) => {
    setDays((prev) => prev.map((day) => (day.dayOrder === dayOrder ? { ...day, [field]: value } : day)));
  };

  const addThirdDay = () => {
    setDays((prev) =>
      prev.length >= 3 ? prev : [...prev, createDayDraft(3, blockType === 'TRANSFER' ? endLocationId : locationId)],
    );
  };

  const removeThirdDay = () => {
    setDays((prev) => prev.filter((day) => day.dayOrder !== 3));
  };

  const handleRegionChange = (nextRegionId: string) => {
    setRegionId(nextRegionId);
    const clearIfOtherRegion = (id: string) => {
      const loc = locationById.get(id);
      return loc && loc.regionId !== nextRegionId;
    };
    if (blockType === 'STAY' && locationId && clearIfOtherRegion(locationId)) {
      setLocationId('');
    }
    if (blockType === 'TRANSFER') {
      if (startLocationId && clearIfOtherRegion(startLocationId)) setStartLocationId('');
      if (endLocationId && clearIfOtherRegion(endLocationId)) setEndLocationId('');
      setDays((prev) =>
        prev.map((d) => ({ ...d, displayLocationId: clearIfOtherRegion(d.displayLocationId) ? '' : d.displayLocationId })),
      );
    }
  };

  const handleLocationChange = (nextLocationId: string) => {
    setLocationId(nextLocationId);
    const nextLocation = locationById.get(nextLocationId);
    if (nextLocation) setRegionId(nextLocation.regionId);
  };

  const handleStartLocationChange = (nextId: string) => {
    setStartLocationId(nextId);
    const loc = locationById.get(nextId);
    if (loc) setRegionId(loc.regionId);
  };

  const handleEndLocationChange = (nextId: string) => {
    setEndLocationId(nextId);
    const loc = locationById.get(nextId);
    if (loc) setRegionId(loc.regionId);
  };

  useEffect(() => {
    if (blockType === 'STAY' && locationId) {
      setDays((prev) => prev.map((d) => ({ ...d, displayLocationId: locationId })));
    }
  }, [blockType, locationId]);

  const canSubmit =
    name.trim() &&
    (blockType === 'STAY'
      ? locationId
      : startLocationId && endLocationId && startLocationId !== endLocationId &&
        days.every((d) => d.displayLocationId));

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">연속 일정 블록 생성</h1>
          <p className="mt-1 text-sm text-slate-600">연박(같은 목적지) 또는 이동형(야간열차) 블록을 2~3일로 등록합니다.</p>
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
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 테를지 2일 표준" />
              </label>

              <fieldset className="grid gap-2">
                <span className="font-medium text-slate-900">블록 타입</span>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="blockType"
                      checked={blockType === 'STAY'}
                      onChange={() => {
                        setBlockType('STAY');
                        if (startLocationId && !locationId) setLocationId(startLocationId);
                        setStartLocationId('');
                        setEndLocationId('');
                        setDays((prev) => prev.map((d) => ({ ...d, displayLocationId: locationId || d.displayLocationId })));
                      }}
                    />
                    연박 (같은 목적지에서 2~3일)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="blockType"
                      checked={blockType === 'TRANSFER'}
                      onChange={() => {
                        setBlockType('TRANSFER');
                        if (locationId && !startLocationId) {
                          setStartLocationId(locationId);
                          setEndLocationId('');
                          setDays((prev) => prev.map((d, i) => ({ ...d, displayLocationId: i === 0 ? locationId : d.displayLocationId })));
                        }
                        setLocationId('');
                      }}
                    />
                    야간열차 (출발지→도착지 이동형)
                  </label>
                </div>
              </fieldset>

              <label className="grid gap-1 text-sm min-w-0">
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

              {blockType === 'STAY' && (
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-900">목적지</span>
                  <select
                    value={locationId}
                    onChange={(event) => handleLocationChange(event.target.value)}
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
              )}

              {blockType === 'TRANSFER' && (
                <div className="grid gap-3">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-900">출발 목적지</span>
                    <select
                      value={startLocationId}
                      onChange={(event) => handleStartLocationChange(event.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <option value="">출발지 선택</option>
                      {selectableLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {formatLocationNameInline(location.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-900">도착 목적지</span>
                    <select
                      value={endLocationId}
                      onChange={(event) => handleEndLocationChange(event.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <option value="">도착지 선택</option>
                      {selectableLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {formatLocationNameInline(location.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

            </div>

            {blockType === 'STAY' && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <span className="font-medium text-slate-900">선택된 목적지</span>
                <span className="ml-2">{selectedLocation ? formatLocationNameInline(selectedLocation.name) : '아직 선택되지 않았습니다.'}</span>
              </div>
            )}
            {blockType === 'TRANSFER' && (startLocationId || endLocationId) && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <span className="font-medium text-slate-900">경로</span>
                <span className="ml-2">
                  {startLocationId && locationById.get(startLocationId)?.name ? formatLocationNameInline(locationById.get(startLocationId)!.name) : '?'}
                  {' → '}
                  {endLocationId && locationById.get(endLocationId)?.name ? formatLocationNameInline(locationById.get(endLocationId)!.name) : '?'}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 p-4">
              {days.length < 3 ? (
                <Button variant="outline" onClick={addThirdDay}>
                  3일차 추가
                </Button>
              ) : (
                <Button variant="outline" onClick={removeThirdDay}>
                  3일차 제거
                </Button>
              )}
              <span className="text-xs text-slate-500">블록은 2일 또는 3일까지 설정할 수 있습니다.</span>
            </div>

            <div className="flex gap-2">
              <Button
                disabled={!regionId || !name.trim() || !canSubmit || loading}
                onClick={async () => {
                  const isStay = blockType === 'STAY';
                  const startId = isStay ? locationId : startLocationId;
                  const endId = isStay ? locationId : endLocationId;
                  const result = await createMultiDayBlock({
                    variables: {
                      input: {
                        regionId,
                        locationId: startId,
                        blockType,
                        startLocationId: startId,
                        endLocationId: endId,
                        name: name.trim(),
                        sortOrder: 0,
                        isActive,
                        days: days
                          .slice()
                          .sort((left, right) => left.dayOrder - right.dayOrder)
                          .map((day) => {
                            const { timeCellText, scheduleCellText } = serializeMultiDayBlockScheduleSlots(day.scheduleSlots);
                            return {
                              dayOrder: day.dayOrder,
                              displayLocationId: isStay ? locationId : day.displayLocationId || startLocationId,
                              averageDistanceKm: Number(day.averageDistanceKm) || 0,
                              averageTravelHours: Number(day.averageTravelHours) || 0,
                              timeCellText,
                              scheduleCellText,
                              lodgingCellText: serializeLodging(day.lodging),
                              mealCellText: serializeMeals(day.meals),
                            };
                          }),
                      },
                    },
                  });
                  const createdId = result.data?.createMultiDayBlock.id;
                  if (createdId) {
                    navigate(`/multi-day-blocks/${createdId}`);
                  } else {
                    setDaySlotPasteHelperResetNonce((n) => n + 1);
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
            {days
              .slice()
              .sort((left, right) => left.dayOrder - right.dayOrder)
              .map((day) => (
                <div key={day.dayOrder} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <h2 className="font-medium text-slate-900">{day.dayOrder}일차</h2>
                    <p className="mt-1 text-xs text-slate-500">일차별 표시 목적지와 이동 정보를 입력합니다.</p>
                  </div>

                  {blockType === 'TRANSFER' && (
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-900">이 일차 표시 목적지</span>
                      <select
                        value={day.displayLocationId}
                        onChange={(event) =>
                          updateDay(day.dayOrder, 'displayLocationId', event.target.value)
                        }
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
                  )}

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
                        if (!meta) {
                          return '-';
                        }
                        return (
                          <span
                            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                            style={{
                              backgroundColor: meta.backgroundColor,
                              borderColor: meta.borderColor,
                              color: meta.textColor,
                            }}
                          >
                            {meta.label}
                          </span>
                        );
                      })()}
                    </span>
                  </div>

                  <MultiDayBlockDaySlotEditor
                    title="시간 / 일정"
                    description="시작시간을 추가하고 각 시간대별 활동을 입력합니다."
                    value={day.scheduleSlots}
                    pasteHelperResetNonce={daySlotPasteHelperResetNonce}
                    onChange={(nextValue) => updateDay(day.dayOrder, 'scheduleSlots', nextValue)}
                  />

                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={day.lodging.isUnspecified}
                        onChange={(event) =>
                          updateDay(day.dayOrder, 'lodging', {
                            ...day.lodging,
                            isUnspecified: event.target.checked,
                          })
                        }
                      />
                      숙소 미지정
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-slate-700">숙소명</span>
                      <Input
                        value={day.lodging.name}
                        onChange={(event) =>
                          updateDay(day.dayOrder, 'lodging', {
                            ...day.lodging,
                            name: event.target.value,
                          })
                        }
                        disabled={day.lodging.isUnspecified}
                      />
                    </label>
                    <div className="grid gap-3 text-sm text-slate-700">
                      {([
                        ['hasElectricity', '전기'],
                        ['hasShower', '샤워'],
                        ['hasInternet', '인터넷'],
                      ] as const).map(([field, label]) => (
                        <div key={field} className="flex items-center gap-3">
                          <span className="w-16 shrink-0">{label}</span>
                          <div className="flex gap-2">
                            {([
                              ['YES', '예'],
                              ['LIMITED', '제한'],
                              ['NO', '아니오'],
                            ] as const).map(([state, stateLabel]) => (
                              <Button
                                key={state}
                                type="button"
                                variant={day.lodging[field] === state ? 'default' : 'outline'}
                                disabled={day.lodging.isUnspecified}
                                onClick={() =>
                                  updateDay(day.dayOrder, 'lodging', {
                                    ...day.lodging,
                                    [field]: state as FacilityAvailability,
                                  })
                                }
                              >
                                {stateLabel}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    {(['breakfast', 'lunch', 'dinner'] as const).map((field) => (
                      <label key={field} className="grid gap-1 text-sm">
                        <span className="text-slate-700">{field === 'breakfast' ? '아침' : field === 'lunch' ? '점심' : '저녁'}</span>
                        <div className="flex flex-wrap gap-2">
                          {REGULAR_MEAL_OPTIONS.map((option) => (
                            <Button
                              key={option.value}
                              type="button"
                              variant={day.meals[field] === option.value ? 'default' : 'outline'}
                              onClick={() =>
                                updateDay(day.dayOrder, 'meals', {
                                  ...day.meals,
                                  [field]: day.meals[field] === option.value ? null : option.value,
                                })
                              }
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </Card>
    </section>
  );
}
