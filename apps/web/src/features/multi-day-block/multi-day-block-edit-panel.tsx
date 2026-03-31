import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Input } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  calculateMovementIntensityByHours,
  getMovementIntensityMeta,
} from '../estimate/model/movement-intensity';
import { formatLocationNameInline } from '../location/display';
import { SpecialMealsModal } from '../plan/components/SpecialMealsModal';
import { useSpecialMealDestinationRules } from '../plan/hooks/use-special-meal-destination-rules';
import { getAssignmentsFromPlanRows } from '../plan/special-meals';
import {
  MultiDayBlockDaySlotEditor,
  createMultiDayBlockScheduleSlot,
  parseMultiDayBlockScheduleSlots,
  serializeMultiDayBlockScheduleSlots,
  type MultiDayBlockScheduleSlotInput,
} from './day-slot-editor';

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

interface MultiDayBlockRow {
  id: string;
  regionId: string;
  locationId: string;
  blockType: BlockType;
  startLocationId: string;
  endLocationId: string;
  name: string;
  title: string;
  sortOrder: number;
  isActive: boolean;
  days: Array<{
    id: string;
    dayOrder: number;
    displayLocationId?: string;
    averageDistanceKm: number;
    averageTravelHours: number;
    timeCellText: string;
    scheduleCellText: string;
    lodgingCellText: string;
    mealCellText: string;
  }>;
}

interface MultiDayBlockDayDraft {
  dayOrder: number;
  displayLocationId: string;
  averageDistanceKm: string;
  averageTravelHours: string;
  scheduleSlots: MultiDayBlockScheduleSlotInput[];
  lodgingCellText: string;
  mealCellText: string;
}

const REGIONS_QUERY = gql`
  query OvernightStayDetailRegions {
    regions {
      id
      name
    }
  }
`;

const LOCATIONS_QUERY = gql`
  query OvernightStayDetailLocations {
    locations {
      id
      regionId
      name
    }
  }
`;

export const MULTI_DAY_BLOCK_EDIT_PANEL_QUERY = gql`
  query MultiDayBlockDetailPage($id: ID!) {
    multiDayBlock(id: $id) {
      id
      regionId
      locationId
      blockType
      startLocationId
      endLocationId
      name
      title
      sortOrder
      isActive
      days {
        id
        dayOrder
        displayLocationId
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

const UPDATE_MULTI_DAY_BLOCK_MUTATION = gql`
  mutation UpdateMultiDayBlockPage($id: ID!, $input: MultiDayBlockUpdateInput!) {
    updateMultiDayBlock(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_MULTI_DAY_BLOCK_MUTATION = gql`
  mutation DeleteMultiDayBlockPage($id: ID!) {
    deleteMultiDayBlock(id: $id)
  }
`;

function createDayDraft(dayOrder: number, displayLocationId = ''): MultiDayBlockDayDraft {
  return {
    dayOrder,
    displayLocationId,
    averageDistanceKm: '0',
    averageTravelHours: '0',
    scheduleSlots: [createMultiDayBlockScheduleSlot()],
    lodgingCellText: '',
    mealCellText: '',
  };
}

export interface MultiDayBlockEditPanelProps {
  blockId: string;
  onSaved?: () => void;
  onDeleted?: () => void;
  onClose?: () => void;
}

export function MultiDayBlockEditPanel({ blockId, onSaved, onDeleted, onClose }: MultiDayBlockEditPanelProps): JSX.Element {
  const navigate = useNavigate();
  const [blockType, setBlockType] = useState<BlockType>('STAY');
  const [regionId, setRegionId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [startLocationId, setStartLocationId] = useState('');
  const [endLocationId, setEndLocationId] = useState('');
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [days, setDays] = useState<MultiDayBlockDayDraft[]>([createDayDraft(1), createDayDraft(2)]);
  const [specialMealsModalOpen, setSpecialMealsModalOpen] = useState(false);
  const { rules: specialMealDestinationRules } = useSpecialMealDestinationRules();

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const { data, loading } = useQuery<{ multiDayBlock: MultiDayBlockRow | null }>(MULTI_DAY_BLOCK_EDIT_PANEL_QUERY, {
    variables: { id: blockId },
    skip: !blockId,
  });
  const [updateMultiDayBlock, { loading: updating }] = useMutation(UPDATE_MULTI_DAY_BLOCK_MUTATION);
  const [deleteMultiDayBlock, { loading: deleting }] = useMutation(DELETE_MULTI_DAY_BLOCK_MUTATION);

  const regions = regionData?.regions ?? [];
  const locations = locationData?.locations ?? [];
  const overnightStay = data?.multiDayBlock ?? null;
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const filteredLocations = useMemo(() => locations.filter((location) => location.regionId === regionId), [locations, regionId]);
  const selectableLocations = regionId ? filteredLocations : locations;
  const selectedLocation = locationId ? locationById.get(locationId) ?? null : null;

  useEffect(() => {
    if (!overnightStay) {
      return;
    }
    setRegionId(overnightStay.regionId);
    setLocationId(overnightStay.locationId);
    setBlockType(overnightStay.blockType ?? 'STAY');
    setStartLocationId(overnightStay.startLocationId ?? overnightStay.locationId);
    setEndLocationId(overnightStay.endLocationId ?? overnightStay.locationId);
    setName(overnightStay.name);
    setSortOrder(String(overnightStay.sortOrder));
    setIsActive(overnightStay.isActive);
    setDays(
      overnightStay.days
        .slice()
        .sort((left, right) => left.dayOrder - right.dayOrder)
        .map((day) => ({
          dayOrder: day.dayOrder,
          displayLocationId: day.displayLocationId ?? overnightStay.locationId ?? '',
          averageDistanceKm: String(day.averageDistanceKm ?? 0),
          averageTravelHours: String(day.averageTravelHours ?? 0),
          scheduleSlots: parseMultiDayBlockScheduleSlots(day.timeCellText ?? '', day.scheduleCellText ?? ''),
          lodgingCellText: day.lodgingCellText ?? '',
          mealCellText: day.mealCellText ?? '',
        })),
    );
  }, [overnightStay]);

  useEffect(() => {
    if (blockType === 'STAY' && locationId) {
      setDays((prev) => prev.map((d) => ({ ...d, displayLocationId: locationId })));
    }
  }, [blockType, locationId]);

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
    if (blockType === 'STAY' && locationId && clearIfOtherRegion(locationId)) setLocationId('');
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

  const canSave =
    Boolean(regionId && name.trim()) &&
    (blockType === 'STAY'
      ? Boolean(locationId)
      : Boolean(startLocationId && endLocationId && startLocationId !== endLocationId && days.every((d) => d.displayLocationId)));

  if (!blockId) {
    return <div className="py-8 text-sm text-slate-600">잘못된 접근입니다.</div>;
  }

  if (loading) {
    return <div className="py-8 text-sm text-slate-600">불러오는 중...</div>;
  }

  if (!overnightStay) {
    return <div className="py-8 text-sm text-slate-600">연속 일정 블록을 찾을 수 없습니다.</div>;
  }

  const handleDismiss = () => {
    if (onClose) {
      onClose();
      return;
    }
    navigate(`/multi-day-blocks/${blockId}`);
  };

  const sortedDays = days.slice().sort((left, right) => left.dayOrder - right.dayOrder);
  const wideGridClass =
    sortedDays.length >= 3
      ? 'xl:[grid-template-columns:minmax(280px,340px)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
      : 'xl:[grid-template-columns:minmax(280px,340px)_minmax(0,1fr)_minmax(0,1fr)]';

  return (
        <div className="grid gap-5">
          <div className={`grid grid-cols-1 items-start gap-4 min-w-0 ${wideGridClass}`}>
            <div className="grid min-w-0 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">설정</h2>
                <div className="grid gap-4">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-900">블록 이름</span>
                    <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 테를지 3일 확장" />
                  </label>

                  <fieldset className="grid gap-2">
                    <span className="font-medium text-slate-900">블록 타입</span>
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name={`blockType-${blockId}`} checked={blockType === 'STAY'} onChange={() => setBlockType('STAY')} />
                        연박 (같은 목적지에서 2~3일)
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name={`blockType-${blockId}`} checked={blockType === 'TRANSFER'} onChange={() => setBlockType('TRANSFER')} />
                        야간열차 (출발지→도착지 이동형)
                      </label>
                    </div>
                  </fieldset>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-900">지역</span>
                    <select
                      value={regionId}
                      onChange={(event) => handleRegionChange(event.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <option value="">전체 지역</option>
                      {regions.map((region) => (
                        <option key={region.id} value={region.id}>
                          {region.name}
                        </option>
                      ))}
                    </select>
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

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-900">정렬 순서</span>
                      <Input type="number" min={0} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
                    </label>
                    <label className="flex h-10 items-center gap-2 text-sm">
                      <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
                      활성
                    </label>
                  </div>
                </div>
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

              <div className="flex flex-wrap items-center gap-2">
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

              <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs text-slate-600">특식 4종</span>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {(() => {
                      const assignments = getAssignmentsFromPlanRows(
                        sortedDays.map((day) => ({
                          mealCellText: day.mealCellText,
                          destinationCellText: formatLocationNameInline(locationById.get(day.displayLocationId || locationId)?.name ?? []),
                          scheduleCellText: serializeMultiDayBlockScheduleSlots(day.scheduleSlots).scheduleCellText,
                        })),
                      );
                      const count = new Set(assignments.map((a) => a.specialMeal)).size;
                      return `4종 중 ${count}종 배치됨`;
                    })()}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setSpecialMealsModalOpen(true)}>
                  특식 배치 설정
                </Button>
              </div>
            </div>

            {sortedDays.map((day) => (
                <div
                  key={day.dayOrder}
                  className="grid min-w-0 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <h2 className="font-medium text-slate-900">{day.dayOrder}일차</h2>
                    <p className="mt-1 text-xs text-slate-500">일차별 표시 목적지와 이동 정보를 입력합니다.</p>
                  </div>

                  {blockType === 'TRANSFER' && (
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-900">이 일차 표시 목적지</span>
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
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    <label className="grid gap-1 text-sm">
                      <span>이동거리(km)</span>
                      <Input
                        type="number"
                        min={0}
                        value={day.averageDistanceKm}
                        onChange={(event) => updateDay(day.dayOrder, 'averageDistanceKm', event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span>이동시간(시간)</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        value={day.averageTravelHours}
                        onChange={(event) => updateDay(day.dayOrder, 'averageTravelHours', event.target.value)}
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
                    onChange={(nextValue) => updateDay(day.dayOrder, 'scheduleSlots', nextValue)}
                  />

                  <div className="grid gap-3">
                    <label className="grid gap-1 text-sm">
                      <span>숙소</span>
                      <textarea
                        rows={4}
                        value={day.lodgingCellText}
                        onChange={(event) => updateDay(day.dayOrder, 'lodgingCellText', event.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span>식사</span>
                      <textarea
                        rows={4}
                        value={day.mealCellText}
                        onChange={(event) => updateDay(day.dayOrder, 'mealCellText', event.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                  </div>
                </div>
              ))}
          </div>

          <SpecialMealsModal
            open={specialMealsModalOpen}
            rows={sortedDays.map((day) => ({
              mealCellText: day.mealCellText,
              destinationCellText: formatLocationNameInline(locationById.get(day.displayLocationId || locationId)?.name ?? []),
              scheduleCellText: serializeMultiDayBlockScheduleSlots(day.scheduleSlots).scheduleCellText,
            }))}
            specialMealDestinationRules={specialMealDestinationRules}
            onClose={() => setSpecialMealsModalOpen(false)}
            onSave={(updatedRows) => {
              setDays((prev) =>
                prev.map((day) => {
                  const idx = sortedDays.findIndex((d) => d.dayOrder === day.dayOrder);
                  const updated = idx >= 0 ? updatedRows[idx] : undefined;
                  return updated ? { ...day, mealCellText: updated.mealCellText } : day;
                }),
              );
              setSpecialMealsModalOpen(false);
            }}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!canSave || updating}
              onClick={async () => {
                const isStay = blockType === 'STAY';
                const startId = isStay ? locationId : startLocationId;
                const endId = isStay ? locationId : endLocationId;
                await updateMultiDayBlock({
                  variables: {
                    id: blockId,
                    input: {
                      regionId,
                      locationId: startId,
                      blockType,
                      startLocationId: startId,
                      endLocationId: endId,
                      name: name.trim(),
                      sortOrder: Number(sortOrder) || 0,
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
                            lodgingCellText: day.lodgingCellText,
                            mealCellText: day.mealCellText,
                          };
                        }),
                    },
                  },
                });
                if (onSaved) {
                  onSaved();
                  return;
                }
                navigate(`/multi-day-blocks/${blockId}`);
              }}
            >
              {updating ? '저장 중...' : '저장'}
            </Button>
            <Button type="button" variant="outline" onClick={handleDismiss}>
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!window.confirm('이 블록을 삭제할까요?')) {
                  return;
                }
                await deleteMultiDayBlock({ variables: { id: blockId } });
                if (onDeleted) {
                  onDeleted();
                  return;
                }
                navigate('/multi-day-blocks/list');
              }}
            >
              {deleting ? '삭제 중...' : '삭제'}
            </Button>
          </div>
        </div>
  );
}
