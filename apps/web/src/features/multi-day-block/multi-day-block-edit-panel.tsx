import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Input } from '@tour/ui';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MultiDayBlockDaySlotEditor, createMultiDayBlockScheduleSlot, parseMultiDayBlockScheduleSlots, serializeMultiDayBlockScheduleSlots, type MultiDayBlockScheduleSlotInput } from './day-slot-editor';
import { MultiDayBlockLocationSearchSelect } from './location-search-select';
import { MultiDayBlockLodgingMealEditor } from './lodging-meal-editor';
import {
  createDefaultMultiDayBlockLodgingMealsDraft,
  parseMultiDayBlockLodgingMealsDraft,
  serializeMultiDayBlockLodgingCellText,
  serializeMultiDayBlockMealCellText,
  type MultiDayBlockLodgingFormValue,
  type MultiDayBlockMealsFormValue,
} from './lodging-meal-form';

interface LocationRow {
  id: string;
  regionId: string;
  regionName: string;
  name: string[];
}

interface MultiDayBlockRow {
  id: string;
  regionId: string;
  locationId: string;
  name: string;
  title: string;
  isNightTrain: boolean;
  sortOrder: number;
  isActive: boolean;
  days: Array<{
    id: string;
    dayOrder: number;
    displayLocationId: string;
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
  lodging: MultiDayBlockLodgingFormValue;
  meals: MultiDayBlockMealsFormValue;
}

const LOCATIONS_QUERY = gql`
  query OvernightStayDetailLocations {
    locations {
      id
      regionId
      regionName
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
      name
      title
      isNightTrain
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

export interface MultiDayBlockEditPanelProps {
  blockId: string;
  onSaved?: () => void;
  onDeleted?: () => void;
  onClose?: () => void;
}

export function MultiDayBlockEditPanel({ blockId, onSaved, onDeleted, onClose }: MultiDayBlockEditPanelProps): JSX.Element {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [isNightTrain, setIsNightTrain] = useState(false);
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [days, setDays] = useState<MultiDayBlockDayDraft[]>([createDayDraft(1), createDayDraft(2)]);

  const { data: locationData } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const { data, loading } = useQuery<{ multiDayBlock: MultiDayBlockRow | null }>(MULTI_DAY_BLOCK_EDIT_PANEL_QUERY, {
    variables: { id: blockId },
    skip: !blockId,
    onCompleted: (result) => {
      const block = result.multiDayBlock;
      if (!block) {
        return;
      }
      setName(block.name);
      setIsNightTrain(block.isNightTrain);
      setSortOrder(String(block.sortOrder));
      setIsActive(block.isActive);
      setDays(
        block.days
          .slice()
          .sort((left, right) => left.dayOrder - right.dayOrder)
          .map((day) => ({
            ...parseMultiDayBlockLodgingMealsDraft({
              lodgingCellText: day.lodgingCellText ?? '',
              mealCellText: day.mealCellText ?? '',
            }),
            dayOrder: day.dayOrder,
            displayLocationId: day.displayLocationId,
            averageDistanceKm: String(day.averageDistanceKm ?? 0),
            averageTravelHours: String(day.averageTravelHours ?? 0),
            scheduleSlots: parseMultiDayBlockScheduleSlots(day.timeCellText ?? '', day.scheduleCellText ?? ''),
          })),
      );
    },
  });
  const [updateMultiDayBlock, { loading: updating }] = useMutation(UPDATE_MULTI_DAY_BLOCK_MUTATION);
  const [deleteMultiDayBlock, { loading: deleting }] = useMutation(DELETE_MULTI_DAY_BLOCK_MUTATION);

  const locations = locationData?.locations ?? [];
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const block = data?.multiDayBlock ?? null;
  const sortedDays = days.slice().sort((left, right) => left.dayOrder - right.dayOrder);
  const canSave = Boolean(name.trim() && sortedDays.every((day) => day.displayLocationId));

  const updateDay = (
    dayOrder: number,
    field: keyof MultiDayBlockDayDraft,
    value: MultiDayBlockDayDraft[keyof MultiDayBlockDayDraft],
  ) => {
    setDays((prev) => prev.map((day) => (day.dayOrder === dayOrder ? { ...day, [field]: value } : day)));
  };

  if (!blockId) {
    return <div className="py-8 text-sm text-slate-600">잘못된 접근입니다.</div>;
  }

  if (loading) {
    return <div className="py-8 text-sm text-slate-600">불러오는 중...</div>;
  }

  if (!block) {
    return <div className="py-8 text-sm text-slate-600">연속 일정 블록을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[280px_repeat(3,minmax(0,1fr))]">
        <div className="grid gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">설정</h2>
            <div className="grid gap-4">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-900">블록 이름</span>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isNightTrain} onChange={(event) => setIsNightTrain(event.target.checked)} />
                야간열차 금액 규칙 적용
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-900">정렬 순서</span>
                <Input type="number" min={0} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
                활성
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              disabled={!canSave || updating}
              onClick={async () => {
                await updateMultiDayBlock({
                  variables: {
                    id: blockId,
                    input: {
                      name: name.trim(),
                      isNightTrain,
                      sortOrder: Number(sortOrder) || 0,
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
                onSaved?.();
              }}
            >
              {updating ? '저장 중...' : '저장'}
            </Button>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={async () => {
                await deleteMultiDayBlock({ variables: { id: blockId } });
                onDeleted?.();
              }}
            >
              {deleting ? '삭제 중...' : '삭제'}
            </Button>
            <Button variant="outline" onClick={() => (onClose ? onClose() : navigate(`/multi-day-blocks/${blockId}`))}>
              닫기
            </Button>
          </div>
        </div>

        {sortedDays.map((day) => (
          <div key={day.dayOrder} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h2 className="font-medium text-slate-900">{day.dayOrder}일차</h2>
              <p className="mt-1 text-xs text-slate-500">일차별 목적지와 이동/일정/숙소/식사를 수정합니다.</p>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-900">이 일차 목적지</span>
              <MultiDayBlockLocationSearchSelect
                locations={locations}
                selectedLocationId={day.displayLocationId}
                onSelect={(locationId) => updateDay(day.dayOrder, 'displayLocationId', locationId)}
              />
            </label>
            {day.displayLocationId ? (
              <div className="text-xs text-slate-500">
                선택 지역: {locationById.get(day.displayLocationId)?.regionName ?? '-'}
              </div>
            ) : null}

            <div className="grid gap-3">
              <Input
                type="number"
                min={0}
                value={day.averageDistanceKm}
                onChange={(event) => updateDay(day.dayOrder, 'averageDistanceKm', event.target.value)}
              />
              <Input
                type="number"
                min={0}
                step="0.5"
                value={day.averageTravelHours}
                onChange={(event) => updateDay(day.dayOrder, 'averageTravelHours', event.target.value)}
              />
            </div>

            <MultiDayBlockDaySlotEditor
              title="시간 / 일정"
              description="일차별 시간표와 활동을 직접 편집하거나 입력도우미로 붙여넣을 수 있습니다."
              value={day.scheduleSlots}
              onChange={(nextValue) => updateDay(day.dayOrder, 'scheduleSlots', nextValue)}
            />

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
  );
}
