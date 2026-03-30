import { gql, useQuery } from '@apollo/client';
import { Button, Card, Input, Table, Td, Th } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  calculateMovementIntensityByHours,
  getMovementIntensityMeta,
} from '../features/estimate/model/movement-intensity';
import { formatLocationNameInline, includesLocationNameKeyword } from '../features/location/display';
import {
  useSegmentCrud,
  type SegmentRow,
  type SegmentTimeSlotFormInput,
  type SegmentVersionFormInput,
} from '../features/segment/hooks';
import { RegionNameChip } from '../features/region/region-name-chip';
import { ConnectionSubNav } from '../features/segment/sub-nav';

const LOCATIONS_QUERY = gql`
  query SegmentLocations {
    locations {
      id
      regionId
      regionName
      name
      isFirstDayEligible
      isLastDayEligible
    }
  }
`;

const DEFAULT_SLOT_TIMES = ['08:00', '12:00', '18:00'] as const;
const TIME_SLOT_PASTE_HELPER_PLACEHOLDER = {
  timeCellText: '08:00\n12:00\n-\n18:00',
  scheduleCellText: '출발지 출발\n이동 중 점심식사\n도착지 도착 후 일정 진행\n숙소 체크인 또는 자유시간',
} as const;

type TimeSlotPasteHelperValue = {
  timeCellText: string;
  scheduleCellText: string;
};

interface LocationRow {
  id: string;
  regionId: string;
  regionName: string;
  name: string[];
  isFirstDayEligible: boolean;
  isLastDayEligible: boolean;
}

interface SegmentFormState {
  fromLocationId: string;
  toLocationId: string;
  averageDistanceKm: string;
  averageTravelHours: string;
  isLongDistance: boolean;
  timeSlots: SegmentTimeSlotFormInput[];
  earlyTimeSlots: SegmentTimeSlotFormInput[];
  extendTimeSlots: SegmentTimeSlotFormInput[];
  earlyExtendTimeSlots: SegmentTimeSlotFormInput[];
  versions: SegmentVersionDraft[];
}

interface SegmentVersionDraft {
  clientId: string;
  name: string;
  averageDistanceKm: string;
  averageTravelHours: string;
  isLongDistance: boolean;
  startDate: string;
  endDate: string;
  timeSlots: SegmentTimeSlotFormInput[];
  earlyTimeSlots: SegmentTimeSlotFormInput[];
  extendTimeSlots: SegmentTimeSlotFormInput[];
  earlyExtendTimeSlots: SegmentTimeSlotFormInput[];
}

function createTimeSlot(startTime: string): SegmentTimeSlotFormInput {
  return {
    startTime,
    activities: ['', '', '', ''],
  };
}

function createDefaultTimeSlots(): SegmentTimeSlotFormInput[] {
  return DEFAULT_SLOT_TIMES.map((time) => createTimeSlot(time));
}

function createEmptyPasteHelperValue(): TimeSlotPasteHelperValue {
  return {
    timeCellText: '',
    scheduleCellText: '',
  };
}

function createDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createVersionDraft(): SegmentVersionDraft {
  return {
    clientId: createDraftId(),
    name: '',
    averageDistanceKm: '',
    averageTravelHours: '',
    isLongDistance: false,
    startDate: '',
    endDate: '',
    timeSlots: createDefaultTimeSlots(),
    earlyTimeSlots: createDefaultTimeSlots(),
    extendTimeSlots: createDefaultTimeSlots(),
    earlyExtendTimeSlots: createDefaultTimeSlots(),
  };
}

function createEmptyForm(): SegmentFormState {
  return {
    fromLocationId: '',
    toLocationId: '',
    averageDistanceKm: '',
    averageTravelHours: '',
    isLongDistance: false,
    timeSlots: createDefaultTimeSlots(),
    earlyTimeSlots: createDefaultTimeSlots(),
    extendTimeSlots: createDefaultTimeSlots(),
    earlyExtendTimeSlots: createDefaultTimeSlots(),
    versions: [],
  };
}

function getNextSlotTime(timeSlots: SegmentTimeSlotFormInput[]): string {
  const last = timeSlots[timeSlots.length - 1];
  if (!last || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(last.startTime)) {
    return '';
  }

  const [hours = 0, minutes = 0] = last.startTime.split(':').map(Number);
  const nextTotalMinutes = (hours * 60 + minutes + 60) % (24 * 60);
  return `${String(Math.floor(nextTotalMinutes / 60)).padStart(2, '0')}:${String(nextTotalMinutes % 60).padStart(2, '0')}`;
}

function parseSegmentTimeSlots(timeCellText: string, scheduleCellText: string): SegmentTimeSlotFormInput[] {
  const timeLines = timeCellText.split(/\r?\n/);
  const scheduleLines = scheduleCellText.split(/\r?\n/);
  const lineCount = Math.max(timeLines.length, scheduleLines.length);
  const slots: SegmentTimeSlotFormInput[] = [];

  for (let index = 0; index < lineCount; index += 1) {
    const timeLine = timeLines[index]?.trim() ?? '';
    const scheduleLine = scheduleLines[index] ?? '';

    if (timeLine && timeLine !== '-') {
      slots.push({
        startTime: timeLine,
        activities: [scheduleLine],
      });
      continue;
    }

    const currentSlot = slots[slots.length - 1];
    if (!currentSlot) {
      if (scheduleLine.trim()) {
        slots.push({
          startTime: '',
          activities: [scheduleLine],
        });
      }
      continue;
    }

    currentSlot.activities.push(scheduleLine);
  }

  if (slots.length === 0) {
    return [createTimeSlot('')];
  }

  return slots.map((slot) => ({
    ...slot,
    activities: slot.activities.length > 0 ? slot.activities : [''],
  }));
}

function toFormTimeSlots(
  timeBlocks:
    | SegmentRow['scheduleTimeBlocks']
    | SegmentRow['earlyScheduleTimeBlocks']
    | SegmentRow['extendScheduleTimeBlocks']
    | SegmentRow['earlyExtendScheduleTimeBlocks']
    | SegmentRow['versions'][number]['scheduleTimeBlocks']
    | SegmentRow['versions'][number]['earlyScheduleTimeBlocks']
    | SegmentRow['versions'][number]['extendScheduleTimeBlocks']
    | SegmentRow['versions'][number]['earlyExtendScheduleTimeBlocks']
    | undefined,
): SegmentTimeSlotFormInput[] {
  if (!timeBlocks || timeBlocks.length === 0) {
    return createDefaultTimeSlots();
  }

  return timeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((timeBlock) => ({
      startTime: timeBlock.startTime,
      activities:
        timeBlock.activities.length > 0
          ? timeBlock.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex).map((activity) => activity.description)
          : [''],
    }));
}

function buildScheduleLines(
  timeBlocks:
    | SegmentRow['scheduleTimeBlocks']
    | SegmentRow['earlyScheduleTimeBlocks']
    | SegmentRow['extendScheduleTimeBlocks']
    | SegmentRow['earlyExtendScheduleTimeBlocks']
    | SegmentRow['versions'][number]['scheduleTimeBlocks']
    | SegmentRow['versions'][number]['earlyScheduleTimeBlocks']
    | SegmentRow['versions'][number]['extendScheduleTimeBlocks']
    | SegmentRow['versions'][number]['earlyExtendScheduleTimeBlocks']
    | undefined,
): Array<{ time: string; activity: string }> {
  if (!timeBlocks || timeBlocks.length === 0) {
    return [];
  }

  return timeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((timeBlock) => {
      const activities = timeBlock.activities
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((activity) => activity.description.trim())
        .filter((activity) => activity.length > 0);

      if (activities.length === 0) {
        return [{ time: timeBlock.startTime, activity: '-' }];
      }

      return activities.map((activity, index) => ({
        time: index === 0 ? timeBlock.startTime : '-',
        activity,
      }));
    });
}

function toVersionDrafts(segment: SegmentRow | undefined): SegmentVersionDraft[] {
  if (!segment || segment.versions.length === 0) {
    return [];
  }

  return segment.versions
    .filter((version) => !version.isDefault)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((version) => ({
      clientId: version.id,
      name: version.name,
      averageDistanceKm: String(version.averageDistanceKm),
      averageTravelHours: String(version.averageTravelHours),
      isLongDistance: version.isLongDistance,
      startDate: version.startDate?.slice(0, 10) ?? '',
      endDate: version.endDate?.slice(0, 10) ?? '',
      timeSlots: toFormTimeSlots(version.scheduleTimeBlocks),
      earlyTimeSlots: toFormTimeSlots(version.earlyScheduleTimeBlocks),
      extendTimeSlots: toFormTimeSlots(version.extendScheduleTimeBlocks),
      earlyExtendTimeSlots: toFormTimeSlots(version.earlyExtendScheduleTimeBlocks),
    }));
}

function buildVariantTimeSlotInput(
  value: {
    timeSlots: SegmentTimeSlotFormInput[];
    earlyTimeSlots: SegmentTimeSlotFormInput[];
    extendTimeSlots: SegmentTimeSlotFormInput[];
    earlyExtendTimeSlots: SegmentTimeSlotFormInput[];
  },
  input: {
    includeEarly: boolean;
    includeExtend: boolean;
    includeEarlyExtend: boolean;
  },
): {
  timeSlots: SegmentTimeSlotFormInput[];
  earlyTimeSlots?: SegmentTimeSlotFormInput[];
  extendTimeSlots?: SegmentTimeSlotFormInput[];
  earlyExtendTimeSlots?: SegmentTimeSlotFormInput[];
} {
  return {
    timeSlots: value.timeSlots,
    ...(input.includeEarly ? { earlyTimeSlots: value.earlyTimeSlots } : {}),
    ...(input.includeExtend ? { extendTimeSlots: value.extendTimeSlots } : {}),
    ...(input.includeEarlyExtend ? { earlyExtendTimeSlots: value.earlyExtendTimeSlots } : {}),
  };
}

function TimeSlotEditor(props: {
  title: string;
  description: string;
  value: SegmentTimeSlotFormInput[];
  onChange: (nextValue: SegmentTimeSlotFormInput[]) => void;
  /** 0보다 커질 때마다 입력도우미(붙여넣기 영역)를 비웁니다. 저장·생성 성공 후 부모가 증가시킵니다. */
  pasteHelperResetNonce?: number;
}): JSX.Element {
  const { title, description, value, onChange, pasteHelperResetNonce = 0 } = props;
  const [pasteHelper, setPasteHelper] = useState<TimeSlotPasteHelperValue>(createEmptyPasteHelperValue);

  useEffect(() => {
    if (pasteHelperResetNonce <= 0) {
      return;
    }
    setPasteHelper(createEmptyPasteHelperValue());
  }, [pasteHelperResetNonce]);

  const updateSlotTime = (slotIndex: number, startTime: string) => {
    const nextSlots = [...value];
    const slot = nextSlots[slotIndex];
    if (!slot) {
      return;
    }
    nextSlots[slotIndex] = { ...slot, startTime };
    onChange(nextSlots);
  };

  const updateActivity = (slotIndex: number, activityIndex: number, description: string) => {
    const nextSlots = [...value];
    const slot = nextSlots[slotIndex];
    if (!slot) {
      return;
    }
    const nextActivities = [...slot.activities];
    if (activityIndex < 0 || activityIndex >= nextActivities.length) {
      return;
    }
    nextActivities[activityIndex] = description;
    nextSlots[slotIndex] = { ...slot, activities: nextActivities };
    onChange(nextSlots);
  };

  const addTimeSlot = () => {
    onChange([...value, createTimeSlot(getNextSlotTime(value))]);
  };

  const addPresetBetween = (beforeTime: string, presetTime: string) => {
    const insertIndex = value.findIndex((slot) => slot.startTime === beforeTime);
    if (insertIndex < 0) {
      onChange([...value, createTimeSlot(presetTime)]);
      return;
    }
    onChange([...value.slice(0, insertIndex), createTimeSlot(presetTime), ...value.slice(insertIndex)]);
  };

  const removeTimeSlot = (slotIndex: number) => {
    if (value.length <= 1) {
      return;
    }
    onChange(value.filter((_, index) => index !== slotIndex));
  };

  const addActivity = (slotIndex: number) => {
    const nextSlots = [...value];
    const slot = nextSlots[slotIndex];
    if (!slot) {
      return;
    }
    nextSlots[slotIndex] = {
      ...slot,
      activities: [...slot.activities, ''],
    };
    onChange(nextSlots);
  };

  const removeActivity = (slotIndex: number, activityIndex: number) => {
    const nextSlots = [...value];
    const slot = nextSlots[slotIndex];
    if (!slot || slot.activities.length <= 1) {
      return;
    }
    nextSlots[slotIndex] = {
      ...slot,
      activities: slot.activities.filter((_, index) => index !== activityIndex),
    };
    onChange(nextSlots);
  };

  const updatePasteHelper = (key: keyof TimeSlotPasteHelperValue, nextValue: string) => {
    setPasteHelper((prev) => ({
      ...prev,
      [key]: nextValue,
    }));
  };

  const applyPasteHelper = () => {
    onChange(parseSegmentTimeSlots(pasteHelper.timeCellText, pasteHelper.scheduleCellText));
  };

  const clearPasteHelper = () => {
    setPasteHelper(createEmptyPasteHelperValue());
  };

  return (
    <div className="grid gap-3 self-start rounded-2xl border border-slate-200 p-4">
      <div className="grid gap-1">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <div className="grid gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
        <div className="grid gap-1">
          <h4 className="text-sm font-semibold text-slate-800">입력도우미</h4>
          <p className="text-xs text-slate-500">미리캔버스에서 복사/붙여넣기 하세요!</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-slate-700">시간</span>
            <textarea
              value={pasteHelper.timeCellText}
              onChange={(event) => updatePasteHelper('timeCellText', event.target.value)}
              rows={8}
              className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder={TIME_SLOT_PASTE_HELPER_PLACEHOLDER.timeCellText}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-slate-700">일정</span>
            <textarea
              value={pasteHelper.scheduleCellText}
              onChange={(event) => updatePasteHelper('scheduleCellText', event.target.value)}
              rows={8}
              className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder={TIME_SLOT_PASTE_HELPER_PLACEHOLDER.scheduleCellText}
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">시간 칸의 `-`는 바로 위 시간에 이어지는 일정으로 인식됩니다.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={applyPasteHelper} className="whitespace-nowrap">
            붙여넣기 적용
          </Button>
          <Button type="button" variant="outline" onClick={clearPasteHelper} className="whitespace-nowrap">
            입력 비우기
          </Button>
        </div>
      </div>
      <div className="grid gap-4">
        {value.map((slot, slotIndex) => (
          <div key={slotIndex} className="grid gap-2">
            <div className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[max-content_minmax(0,1fr)]">
              <div className="grid gap-2 md:content-start">
                <div className="flex h-10 items-center">
                  <h4 className="text-sm font-semibold text-slate-800">출발 시간</h4>
                </div>
                <Input
                  className="w-[110px] border-slate-500 text-lg font-semibold"
                  value={slot.startTime}
                  onChange={(event) => updateSlotTime(slotIndex, event.target.value)}
                  placeholder="HH:mm"
                />
              </div>
              <div className="grid min-w-0 gap-2">
                <div className="flex h-10 items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-800">일정</h4>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeTimeSlot(slotIndex)}
                    disabled={value.length <= 1}
                    className="whitespace-nowrap"
                  >
                    삭제
                  </Button>
                </div>
                <div className="grid gap-2">
                  {slot.activities.map((activity, activityIndex) => (
                    <div key={`${slotIndex}-${activityIndex}`} className="flex min-w-0 items-center gap-2">
                      <Input
                        value={activity}
                        onChange={(event) => updateActivity(slotIndex, activityIndex, event.target.value)}
                        placeholder="활동 입력"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeActivity(slotIndex, activityIndex)}
                        disabled={slot.activities.length <= 1}
                        className="whitespace-nowrap"
                      >
                        X
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <Button type="button" variant="outline" onClick={() => addActivity(slotIndex)} className="whitespace-nowrap">
                    활동 추가
                  </Button>
                </div>
              </div>
            </div>

            {slot.startTime === '08:00' ? (
              <div className="overflow-x-auto">
                <Button type="button" variant="outline" onClick={() => addPresetBetween('12:00', '10:00')} className="whitespace-nowrap">
                  <span aria-hidden="true" className="mr-1">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </span>
                  시간 추가
                </Button>
              </div>
            ) : null}

            {slot.startTime === '12:00' ? (
              <div className="overflow-x-auto">
                <Button type="button" variant="outline" onClick={() => addPresetBetween('18:00', '15:00')} className="whitespace-nowrap">
                  <span aria-hidden="true" className="mr-1">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </span>
                  시간 추가
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div>
        <Button type="button" variant="outline" onClick={addTimeSlot} className="whitespace-nowrap">
          <span aria-hidden="true" className="mr-1">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          시간 추가
        </Button>
      </div>
    </div>
  );
}

function buildVersionInputs(
  form: SegmentFormState,
  input: {
    includeEarly: boolean;
    includeExtend: boolean;
    includeEarlyExtend: boolean;
  },
): SegmentVersionFormInput[] {
  return [
    {
      name: '기본',
      averageDistanceKm: Number(form.averageDistanceKm),
      averageTravelHours: Number(form.averageTravelHours),
      isLongDistance: form.isLongDistance,
      ...buildVariantTimeSlotInput(form, input),
      isDefault: true,
    },
    ...form.versions.map((version) => ({
      name: version.name.trim(),
      averageDistanceKm: Number(version.averageDistanceKm),
      averageTravelHours: Number(version.averageTravelHours),
      isLongDistance: version.isLongDistance,
      ...(version.startDate ? { startDate: version.startDate } : {}),
      ...(version.endDate ? { endDate: version.endDate } : {}),
      ...buildVariantTimeSlotInput(version, input),
      isDefault: false,
    })),
  ];
}

function AlternativeVersionEditor(props: {
  value: SegmentVersionDraft[];
  includeEarly: boolean;
  includeExtend: boolean;
  includeEarlyExtend: boolean;
  onChange: (nextValue: SegmentVersionDraft[]) => void;
  pasteHelperResetNonce?: number;
}): JSX.Element {
  const { value, includeEarly, includeExtend, includeEarlyExtend, onChange, pasteHelperResetNonce } = props;

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">대안 버전</h3>
          <p className="text-xs text-slate-500">같은 출발지/도착지에 대해 직결 대안 버전을 추가합니다.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => onChange([...value, createVersionDraft()])}>
          대안 버전 추가
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          아직 대안 버전이 없습니다.
        </div>
      ) : (
        value.map((version, index) => (
          <div key={version.clientId} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">대안 버전 {index + 1}</div>
                <p className="text-xs text-slate-500">버전별 이동 정보를 입력합니다.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => onChange(value.filter((item) => item.clientId !== version.clientId))}
              >
                삭제
              </Button>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="text-slate-700">버전 이름</span>
              <Input
                value={version.name}
                onChange={(event) =>
                  onChange(
                    value.map((item) => (item.clientId === version.clientId ? { ...item, name: event.target.value } : item)),
                  )
                }
                placeholder="예: 포토스팟 우선"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="text-slate-700">평균 이동 시간(시간)</span>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={version.averageTravelHours}
                  onChange={(event) =>
                    onChange(
                      value.map((item) =>
                        item.clientId === version.clientId ? { ...item, averageTravelHours: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="예: 5.5"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-slate-700">평균거리(km)</span>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={version.averageDistanceKm}
                  onChange={(event) =>
                    onChange(
                      value.map((item) =>
                        item.clientId === version.clientId ? { ...item, averageDistanceKm: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="예: 320"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="text-slate-700">적용 시작일</span>
                <Input
                  type="date"
                  value={version.startDate}
                  onChange={(event) =>
                    onChange(
                      value.map((item) => (item.clientId === version.clientId ? { ...item, startDate: event.target.value } : item)),
                    )
                  }
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-slate-700">적용 종료일</span>
                <Input
                  type="date"
                  value={version.endDate}
                  onChange={(event) =>
                    onChange(
                      value.map((item) => (item.clientId === version.clientId ? { ...item, endDate: event.target.value } : item)),
                    )
                  }
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={version.isLongDistance}
                onChange={(event) =>
                  onChange(
                    value.map((item) =>
                      item.clientId === version.clientId ? { ...item, isLongDistance: event.target.checked } : item,
                    ),
                  )
                }
              />
              장거리 여행
            </label>

            <TimeSlotEditor
              title="버전 일정"
              description="선택된 대안 버전의 시간/일정 자동 채움에 사용됩니다."
              value={version.timeSlots}
              pasteHelperResetNonce={pasteHelperResetNonce}
              onChange={(nextTimeSlots) =>
                onChange(
                  value.map((item) => (item.clientId === version.clientId ? { ...item, timeSlots: nextTimeSlots } : item)),
                )
              }
            />
            {includeEarly ? (
              <TimeSlotEditor
                title="버전 얼리 일정"
                description="첫날 얼리 조건의 연결 자동 채움에 사용됩니다."
                value={version.earlyTimeSlots}
                pasteHelperResetNonce={pasteHelperResetNonce}
                onChange={(nextTimeSlots) =>
                  onChange(
                    value.map((item) => (item.clientId === version.clientId ? { ...item, earlyTimeSlots: nextTimeSlots } : item)),
                  )
                }
              />
            ) : null}
            {includeExtend ? (
              <TimeSlotEditor
                title="버전 연장 일정"
                description="마지막날 연장 조건의 연결 자동 채움에 사용됩니다."
                value={version.extendTimeSlots}
                pasteHelperResetNonce={pasteHelperResetNonce}
                onChange={(nextTimeSlots) =>
                  onChange(
                    value.map((item) => (item.clientId === version.clientId ? { ...item, extendTimeSlots: nextTimeSlots } : item)),
                  )
                }
              />
            ) : null}
            {includeEarlyExtend ? (
              <TimeSlotEditor
                title="버전 얼리+연장 일정"
                description="첫날 얼리이면서 마지막날 연장 조건의 연결 자동 채움에 사용됩니다."
                value={version.earlyExtendTimeSlots}
                pasteHelperResetNonce={pasteHelperResetNonce}
                onChange={(nextTimeSlots) =>
                  onChange(
                    value.map((item) =>
                      item.clientId === version.clientId ? { ...item, earlyExtendTimeSlots: nextTimeSlots } : item,
                    ),
                  )
                }
              />
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

interface SegmentPageProps {
  mode?: 'all' | 'list' | 'create';
}

export function SegmentPage({ mode = 'all' }: SegmentPageProps): JSX.Element {
  const crud = useSegmentCrud();
  const location = useLocation();
  const { data: locationData, loading: locationsLoading } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);

  const [form, setForm] = useState<SegmentFormState>(createEmptyForm);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SegmentFormState>(createEmptyForm);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [editFromSearch, setEditFromSearch] = useState('');
  const [editToSearch, setEditToSearch] = useState('');
  const [editFromOpen, setEditFromOpen] = useState(false);
  const [editToOpen, setEditToOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [createPasteHelperResetNonce, setCreatePasteHelperResetNonce] = useState(0);
  const [editPasteHelperResetNonce, setEditPasteHelperResetNonce] = useState(0);

  const locations = useMemo(() => locationData?.locations ?? [], [locationData]);
  const locationById = useMemo(() => new Map(locations.map((item) => [item.id, item])), [locations]);
  const regions = useMemo(() => {
    return Array.from(new Set(crud.rows.map((row) => row.regionName))).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [crud.rows]);
  const filteredSegmentRows = useMemo(() => {
    const byRegion =
      selectedRegion === 'ALL' ? crud.rows : crud.rows.filter((row) => row.regionName === selectedRegion);
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      return byRegion;
    }
    return byRegion.filter((row) => {
      if (row.regionName.toLowerCase().includes(keyword)) {
        return true;
      }
      const from = locationById.get(row.fromLocationId);
      const to = locationById.get(row.toLocationId);
      if (from && includesLocationNameKeyword(from.name, keyword)) {
        return true;
      }
      if (to && includesLocationNameKeyword(to.name, keyword)) {
        return true;
      }
      if (row.fromLocationId.toLowerCase().includes(keyword) || row.toLocationId.toLowerCase().includes(keyword)) {
        return true;
      }
      return row.versions.some((v) => {
        if (v.name.toLowerCase().includes(keyword)) {
          return true;
        }
        const start = v.startDate?.slice(0, 10) ?? '';
        const end = v.endDate?.slice(0, 10) ?? '';
        return start.includes(keyword) || end.includes(keyword);
      });
    });
  }, [crud.rows, selectedRegion, searchKeyword, locationById]);

  const filteredFromLocations = useMemo(() => {
    const keyword = fromSearch.trim().toLowerCase();
    if (!keyword) {
      return locations;
    }
    return locations.filter((item) => includesLocationNameKeyword(item.name, keyword));
  }, [locations, fromSearch]);

  const filteredToLocations = useMemo(() => {
    const keyword = toSearch.trim().toLowerCase();
    if (!keyword) {
      return locations;
    }
    return locations.filter((item) => includesLocationNameKeyword(item.name, keyword));
  }, [locations, toSearch]);

  const selectedFromLocation = form.fromLocationId ? locationById.get(form.fromLocationId) : undefined;
  const selectedToLocation = form.toLocationId ? locationById.get(form.toLocationId) : undefined;
  const selectedEditFromLocation = editForm.fromLocationId ? locationById.get(editForm.fromLocationId) : undefined;
  const selectedEditToLocation = editForm.toLocationId ? locationById.get(editForm.toLocationId) : undefined;
  const includeCreateEarly = Boolean(selectedFromLocation?.isFirstDayEligible);
  const includeCreateExtend = Boolean(selectedToLocation?.isLastDayEligible);
  const includeCreateEarlyExtend = includeCreateEarly && includeCreateExtend;
  const includeEditEarly = Boolean(selectedEditFromLocation?.isFirstDayEligible);
  const includeEditExtend = Boolean(selectedEditToLocation?.isLastDayEligible);
  const includeEditEarlyExtend = includeEditEarly && includeEditExtend;
  const createMovementIntensityMeta = useMemo(() => {
    const hours = Number(form.averageTravelHours);
    if (!Number.isFinite(hours) || hours < 0) {
      return null;
    }
    return getMovementIntensityMeta(calculateMovementIntensityByHours(hours));
  }, [form.averageTravelHours]);
  const editMovementIntensityMeta = useMemo(() => {
    const hours = Number(editForm.averageTravelHours);
    if (!Number.isFinite(hours) || hours < 0) {
      return null;
    }
    return getMovementIntensityMeta(calculateMovementIntensityByHours(hours));
  }, [editForm.averageTravelHours]);

  const canSubmit =
    !!selectedFromLocation &&
    !!selectedToLocation &&
    form.fromLocationId !== form.toLocationId &&
    Number(form.averageDistanceKm) > 0 &&
    Number(form.averageTravelHours) > 0 &&
    form.versions.every(
      (version) =>
        version.name.trim().length > 0 &&
        Number(version.averageDistanceKm) > 0 &&
        Number(version.averageTravelHours) > 0,
    );

  const canUpdate =
    !!selectedEditFromLocation &&
    !!selectedEditToLocation &&
    editForm.fromLocationId !== editForm.toLocationId &&
    Number(editForm.averageDistanceKm) > 0 &&
    Number(editForm.averageTravelHours) > 0 &&
    editForm.versions.every(
      (version) =>
        version.name.trim().length > 0 &&
        Number(version.averageDistanceKm) > 0 &&
        Number(version.averageTravelHours) > 0,
    );
  const showCreateSection = mode !== 'list';
  const showListSection = mode !== 'create';
  const pageTitle = mode === 'create' ? '연결 생성' : mode === 'list' ? '연결 목록' : '연결 관리';
  const pageDescription =
    mode === 'create'
      ? '출발지와 도착지 사이의 연결과 연결별 이동 일정을 생성합니다.'
      : mode === 'list'
        ? '등록된 출발지-도착지 연결과 연결별 이동 일정을 조회하고 수정합니다.'
        : '출발지-도착지 연결과 연결별 이동 일정을 함께 관리합니다.';

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <ConnectionSubNav pathname={location.pathname} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
            <p className="mt-1 text-sm text-slate-600">{pageDescription}</p>
          </div>
          {mode === 'list' ? (
            <Link
              to="/connections/create"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              연결 생성
            </Link>
          ) : null}
        </div>
      </header>

      {showCreateSection ? (
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">연결 생성</h2>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canSubmit || !selectedFromLocation || !selectedToLocation) {
              return;
            }

            setSubmitting(true);
            try {
              setErrorMessage(null);
              await crud.createRow({
                regionId: selectedFromLocation.regionId,
                fromLocationId: form.fromLocationId,
                toLocationId: form.toLocationId,
                averageDistanceKm: Number(form.averageDistanceKm),
                averageTravelHours: Number(form.averageTravelHours),
                isLongDistance: form.isLongDistance,
                ...buildVariantTimeSlotInput(form, {
                  includeEarly: includeCreateEarly,
                  includeExtend: includeCreateExtend,
                  includeEarlyExtend: includeCreateEarlyExtend,
                }),
                versions: buildVersionInputs(form, {
                  includeEarly: includeCreateEarly,
                  includeExtend: includeCreateExtend,
                  includeEarlyExtend: includeCreateEarlyExtend,
                }),
              });
              setForm(createEmptyForm());
              setCreatePasteHelperResetNonce((n) => n + 1);
              setFromSearch('');
              setToSearch('');
              setFromOpen(false);
              setToOpen(false);
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : '연결 생성에 실패했습니다.');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
            <div className="grid gap-6">
              <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
                <label className="grid gap-1 text-sm min-w-0">
                  <span className="text-slate-700">출발지</span>
                  <div className="relative">
                    <Input
                      value={fromSearch}
                      onFocus={() => setFromOpen(true)}
                      onBlur={() => setTimeout(() => setFromOpen(false), 120)}
                      onChange={(event) => {
                        setFromSearch(event.target.value);
                        setForm((prev) => ({ ...prev, fromLocationId: '' }));
                        setFromOpen(true);
                      }}
                      placeholder="출발지 검색 또는 선택"
                    />
                    {fromOpen ? (
                      <div className="absolute left-0 right-0 top-[44px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {filteredFromLocations.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                        ) : (
                          filteredFromLocations.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setForm((prev) => ({ ...prev, fromLocationId: item.id }));
                                setFromSearch(formatLocationNameInline(item.name));
                                setFromOpen(false);
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                            >
                              {formatLocationNameInline(item.name)} ({item.regionName})
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </label>
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
                <label className="grid gap-1 text-sm min-w-0">
                  <span className="text-slate-700">도착지</span>
                  <div className="relative">
                    <Input
                      value={toSearch}
                      onFocus={() => setToOpen(true)}
                      onBlur={() => setTimeout(() => setToOpen(false), 120)}
                      onChange={(event) => {
                        setToSearch(event.target.value);
                        setForm((prev) => ({ ...prev, toLocationId: '' }));
                        setToOpen(true);
                      }}
                      placeholder="도착지 검색 또는 선택"
                    />
                    {toOpen ? (
                      <div className="absolute left-0 right-0 top-[44px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {filteredToLocations.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                        ) : (
                          filteredToLocations.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setForm((prev) => ({ ...prev, toLocationId: item.id }));
                                setToSearch(formatLocationNameInline(item.name));
                                setToOpen(false);
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                            >
                              {formatLocationNameInline(item.name)} ({item.regionName})
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </label>
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
                <div className="grid gap-1">
                  <h3 className="text-sm font-semibold text-slate-800">이동 정보</h3>
                  <p className="text-xs text-slate-500">출발지와 도착지 사이의 평균 이동 거리와 시간입니다.</p>
                </div>
                <div className="grid gap-3">
                  <label className="grid gap-1 text-sm">
                    <span className="text-slate-700">평균 이동시간(시간)</span>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={form.averageTravelHours}
                      onChange={(event) => setForm((prev) => ({ ...prev, averageTravelHours: event.target.value }))}
                      inputMode="decimal"
                      placeholder="예: 3.5"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-slate-700">평균거리(km)</span>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={form.averageDistanceKm}
                      onChange={(event) => setForm((prev) => ({ ...prev, averageDistanceKm: event.target.value }))}
                      inputMode="decimal"
                      placeholder="예: 120.5"
                    />
                  </label>
                </div>
                <div className="text-sm text-slate-600">이동강도: {createMovementIntensityMeta ? createMovementIntensityMeta.label : '시간 입력 필요'}</div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isLongDistance}
                    onChange={(event) => setForm((prev) => ({ ...prev, isLongDistance: event.target.checked }))}
                  />
                  장거리 여행
                  <span className="text-xs text-slate-500">비용 추가 관련 존재, 정확한 기재 바람.</span>
                </label>
              </div>

              {selectedFromLocation && selectedToLocation && selectedFromLocation.regionId !== selectedToLocation.regionId ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-700">다른 지역 간 연결도 만들 수 있으며, 저장 지역은 출발지 기준으로 맞춰집니다.</p>
                </div>
              ) : null}

              <div>
                <Button type="submit" variant="primary" disabled={!canSubmit || submitting || locationsLoading || crud.loading}>
                  {submitting ? '생성 중...' : '연결 생성'}
                </Button>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="grid items-start gap-6 xl:grid-cols-2">
                <div>
                  <TimeSlotEditor
                    title="기본 연결"
                    description="기본 직결 버전의 시간/일정입니다."
                    value={form.timeSlots}
                    pasteHelperResetNonce={createPasteHelperResetNonce}
                    onChange={(nextTimeSlots) => setForm((prev) => ({ ...prev, timeSlots: nextTimeSlots }))}
                  />
                </div>
                <div>
                  {includeCreateEarly ? (
                    <TimeSlotEditor
                      title="출발지가 얼리일 때"
                      description="첫날 얼리 조건의 연결 일정입니다."
                      value={form.earlyTimeSlots}
                      pasteHelperResetNonce={createPasteHelperResetNonce}
                      onChange={(nextTimeSlots) => setForm((prev) => ({ ...prev, earlyTimeSlots: nextTimeSlots }))}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                      얼리 조건이 가능한 출발지/도착지일 때 얼리 일정 입력 영역이 나타납니다.
                    </div>
                  )}
                </div>
                {(includeCreateExtend || includeCreateEarlyExtend) ? (
                  <>
                    <div>
                      {includeCreateExtend ? (
                        <TimeSlotEditor
                          title="도착지가 연장일 때"
                          description="마지막날 연장 조건의 연결 일정입니다."
                          value={form.extendTimeSlots}
                          pasteHelperResetNonce={createPasteHelperResetNonce}
                          onChange={(nextTimeSlots) => setForm((prev) => ({ ...prev, extendTimeSlots: nextTimeSlots }))}
                        />
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                          연장 조건이 가능한 출발지/도착지일 때 연장 일정 입력 영역이 나타납니다.
                        </div>
                      )}
                    </div>
                    <div>
                      {includeCreateEarlyExtend ? (
                        <TimeSlotEditor
                          title="기본 버전 얼리+연장 일정"
                          description="첫날 얼리이면서 마지막날 연장 조건의 연결 일정입니다."
                          value={form.earlyExtendTimeSlots}
                          pasteHelperResetNonce={createPasteHelperResetNonce}
                          onChange={(nextTimeSlots) => setForm((prev) => ({ ...prev, earlyExtendTimeSlots: nextTimeSlots }))}
                        />
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                          얼리+연장 조건이 가능한 출발지/도착지일 때 얼리+연장 일정 입력 영역이 나타납니다.
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              <AlternativeVersionEditor
                value={form.versions}
                includeEarly={includeCreateEarly}
                includeExtend={includeCreateExtend}
                includeEarlyExtend={includeCreateEarlyExtend}
                pasteHelperResetNonce={createPasteHelperResetNonce}
                onChange={(nextVersions) => setForm((prev) => ({ ...prev, versions: nextVersions }))}
              />
            </div>
          </div>
        </form>
      </Card>
      ) : null}

      {showListSection ? (
      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="grid gap-3">
            <h2 className="text-lg font-semibold tracking-tight">연결 목록</h2>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant={selectedRegion === 'ALL' ? 'default' : 'outline'} onClick={() => setSelectedRegion('ALL')}>
                  전체
                </Button>
                {regions.map((regionName) => (
                  <Button
                    key={regionName}
                    type="button"
                    variant={selectedRegion === regionName ? 'default' : 'outline'}
                    onClick={() => setSelectedRegion(regionName)}
                  >
                    {regionName}
                  </Button>
                ))}
              </div>
              <div className="w-full md:w-[280px]">
                <Input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="출발지·도착지·지역 검색"
                />
              </div>
            </div>
          </div>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>지역</Th>
              <Th>출발지</Th>
              <Th>도착지</Th>
              <Th>평균거리(km)</Th>
              <Th>평균 이동 시간(시간)</Th>
              <Th>이동강도</Th>
              <Th>기본 일정</Th>
              <Th>버전</Th>
              <Th>장거리</Th>
              <Th>액션</Th>
            </tr>
          </thead>
          <tbody>
            {filteredSegmentRows.map((row) => {
              const scheduleLines = buildScheduleLines(row.scheduleTimeBlocks);

              return (
              <tr key={row.id}>
                <Td>
                  <RegionNameChip name={row.regionName} />
                </Td>
                <Td>{formatLocationNameInline(locationById.get(row.fromLocationId)?.name ?? row.fromLocationId)}</Td>
                <Td>{formatLocationNameInline(locationById.get(row.toLocationId)?.name ?? row.toLocationId)}</Td>
                <Td>{row.averageDistanceKm}km</Td>
                <Td>{row.averageTravelHours}h</Td>
                <Td>
                  {(() => {
                    const meta = getMovementIntensityMeta(calculateMovementIntensityByHours(row.averageTravelHours));
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
                </Td>
                <Td>
                  {scheduleLines.length > 0 ? (
                    <div className="grid gap-1 text-sm">
                      {scheduleLines.map((line, index) => (
                        <div key={`${row.id}-schedule-${index}`} className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
                          <span className="font-medium text-slate-700">{line.time}</span>
                          <span className="whitespace-pre-wrap text-slate-600">{line.activity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">-</div>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {row.versions.length === 0 ? (
                      <span className="text-xs text-slate-500">기본</span>
                    ) : (
                      row.versions.map((version) => (
                        <span key={version.id} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                          {[
                            version.name.trim() || '기본',
                            version.startDate && version.endDate ? `(${version.startDate.slice(0, 10)}~${version.endDate.slice(0, 10)})` : null,
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        </span>
                      ))
                    )}
                  </div>
                </Td>
                <Td>{row.isLongDistance ? 'Y' : 'N'}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setErrorMessage(null);
                        setEditingSegmentId(row.id);
                        setEditForm({
                          fromLocationId: row.fromLocationId,
                          toLocationId: row.toLocationId,
                          averageDistanceKm: String(row.averageDistanceKm),
                          averageTravelHours: String(row.averageTravelHours),
                          isLongDistance: row.isLongDistance,
                          timeSlots: toFormTimeSlots(row.scheduleTimeBlocks),
                          earlyTimeSlots: toFormTimeSlots(row.earlyScheduleTimeBlocks),
                          extendTimeSlots: toFormTimeSlots(row.extendScheduleTimeBlocks),
                          earlyExtendTimeSlots: toFormTimeSlots(row.earlyExtendScheduleTimeBlocks),
                          versions: toVersionDrafts(row),
                        });
                        setEditFromSearch(formatLocationNameInline(locationById.get(row.fromLocationId)?.name ?? row.fromLocationId));
                        setEditToSearch(formatLocationNameInline(locationById.get(row.toLocationId)?.name ?? row.toLocationId));
                        setEditFromOpen(false);
                        setEditToOpen(false);
                      }}
                    >
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      disabled={deletingId === row.id}
                      onClick={async () => {
                        if (!window.confirm('이 연결을 삭제할까요?')) {
                          return;
                        }

                        setDeletingId(row.id);
                        setErrorMessage(null);
                        try {
                          await crud.deleteRow(row.id);
                          if (editingSegmentId === row.id) {
                            setEditingSegmentId(null);
                          }
                        } catch (error) {
                          setErrorMessage(error instanceof Error ? error.message : '연결 삭제에 실패했습니다.');
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </Td>
              </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
      ) : null}

      {showListSection && editingSegmentId ? (
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">연결 수정</h2>
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!canUpdate || !selectedEditFromLocation || !selectedEditToLocation || !editingSegmentId) {
                return;
              }

              setUpdating(true);
              try {
                setErrorMessage(null);
                await crud.updateRow(editingSegmentId, {
                  regionId: selectedEditFromLocation.regionId,
                  fromLocationId: editForm.fromLocationId,
                  toLocationId: editForm.toLocationId,
                  averageDistanceKm: Number(editForm.averageDistanceKm),
                  averageTravelHours: Number(editForm.averageTravelHours),
                  isLongDistance: editForm.isLongDistance,
                  ...buildVariantTimeSlotInput(editForm, {
                    includeEarly: includeEditEarly,
                    includeExtend: includeEditExtend,
                    includeEarlyExtend: includeEditEarlyExtend,
                  }),
                  versions: buildVersionInputs(editForm, {
                    includeEarly: includeEditEarly,
                    includeExtend: includeEditExtend,
                    includeEarlyExtend: includeEditEarlyExtend,
                  }),
                });
                setEditingSegmentId(null);
                setEditForm(createEmptyForm());
                setEditPasteHelperResetNonce((n) => n + 1);
                setEditFromSearch('');
                setEditToSearch('');
                setEditFromOpen(false);
                setEditToOpen(false);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : '연결 저장에 실패했습니다.');
              } finally {
                setUpdating(false);
              }
            }}
          >
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            <div className="grid items-start gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
              <div className="grid gap-4">
                <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-1">
                  <div className="relative grid gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">출발지</h3>
                    <Input
                      value={editFromSearch}
                      onFocus={() => setEditFromOpen(true)}
                      onBlur={() => setTimeout(() => setEditFromOpen(false), 120)}
                      onChange={(event) => {
                        setEditFromSearch(event.target.value);
                        setEditForm((prev) => ({ ...prev, fromLocationId: '' }));
                        setEditFromOpen(true);
                      }}
                      placeholder="출발지 검색 또는 선택"
                    />
                    {editFromOpen ? (
                      <div className="absolute left-0 right-0 top-[76px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {filteredFromLocations.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                        ) : (
                          filteredFromLocations.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setEditForm((prev) => ({ ...prev, fromLocationId: item.id }));
                                setEditFromSearch(formatLocationNameInline(item.name));
                                setEditFromOpen(false);
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                            >
                              {formatLocationNameInline(item.name)} ({item.regionName})
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="relative grid gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">도착지</h3>
                    <Input
                      value={editToSearch}
                      onFocus={() => setEditToOpen(true)}
                      onBlur={() => setTimeout(() => setEditToOpen(false), 120)}
                      onChange={(event) => {
                        setEditToSearch(event.target.value);
                        setEditForm((prev) => ({ ...prev, toLocationId: '' }));
                        setEditToOpen(true);
                      }}
                      placeholder="도착지 검색 또는 선택"
                    />
                    {editToOpen ? (
                      <div className="absolute left-0 right-0 top-[76px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {filteredToLocations.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                        ) : (
                          filteredToLocations.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setEditForm((prev) => ({ ...prev, toLocationId: item.id }));
                                setEditToSearch(formatLocationNameInline(item.name));
                                setEditToOpen(false);
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                            >
                              {formatLocationNameInline(item.name)} ({item.regionName})
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">평균 이동 시간(시간)</h3>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={editForm.averageTravelHours}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, averageTravelHours: event.target.value }))}
                      placeholder="예: 3.5"
                    />
                  </div>

                  <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">평균거리(km)</h3>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={editForm.averageDistanceKm}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, averageDistanceKm: event.target.value }))}
                      placeholder="예: 120.5"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">자동 계산 이동강도</span>
                  <span className="ml-2">
                    {editMovementIntensityMeta ? (
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: editMovementIntensityMeta.backgroundColor,
                          borderColor: editMovementIntensityMeta.borderColor,
                          color: editMovementIntensityMeta.textColor,
                        }}
                      >
                        {editMovementIntensityMeta.label}
                      </span>
                    ) : (
                      '-'
                    )}
                  </span>
                </div>

                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={editForm.isLongDistance}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, isLongDistance: event.target.checked }))}
                  />
                  장거리 여행
                  <span className="text-xs text-slate-500">비용 추가 관련 존재, 정확한 기재 바람.</span>
                </label>

                {selectedEditFromLocation && selectedEditToLocation && selectedEditFromLocation.regionId !== selectedEditToLocation.regionId ? (
                  <p className="text-sm text-blue-700">다른 지역 간 연결도 저장할 수 있으며, 저장 지역은 출발지 기준으로 맞춰집니다.</p>
                ) : null}

                <div className="flex gap-2">
                  <Button type="submit" variant="primary" disabled={!canUpdate || updating || locationsLoading || crud.loading}>
                    {updating ? '저장 중...' : '수정 저장'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingSegmentId(null);
                      setEditForm(createEmptyForm());
                      setEditFromSearch('');
                      setEditToSearch('');
                      setEditFromOpen(false);
                      setEditToOpen(false);
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="grid items-start gap-6 lg:grid-cols-2">
                  <TimeSlotEditor
                    title="기본 버전 일정"
                    description="기본 직결 버전의 시간/일정입니다."
                    value={editForm.timeSlots}
                    pasteHelperResetNonce={editPasteHelperResetNonce}
                    onChange={(nextTimeSlots) => setEditForm((prev) => ({ ...prev, timeSlots: nextTimeSlots }))}
                  />
                  {includeEditEarly ? (
                    <TimeSlotEditor
                      title="기본 버전 얼리 일정"
                      description="첫날 얼리 조건의 연결 일정입니다."
                      value={editForm.earlyTimeSlots}
                      pasteHelperResetNonce={editPasteHelperResetNonce}
                      onChange={(nextTimeSlots) => setEditForm((prev) => ({ ...prev, earlyTimeSlots: nextTimeSlots }))}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                      얼리 조건이 가능한 출발지/도착지일 때 얼리 일정 입력 영역이 나타납니다.
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">기본 버전은 상시 적용 버전으로 날짜 범위를 설정하지 않습니다.</p>
                {(includeEditExtend || includeEditEarlyExtend) ? (
                  <div className="grid items-start gap-6 lg:grid-cols-2">
                    {includeEditExtend ? (
                      <TimeSlotEditor
                        title="기본 버전 연장 일정"
                        description="마지막날 연장 조건의 연결 일정입니다."
                        value={editForm.extendTimeSlots}
                        pasteHelperResetNonce={editPasteHelperResetNonce}
                        onChange={(nextTimeSlots) => setEditForm((prev) => ({ ...prev, extendTimeSlots: nextTimeSlots }))}
                      />
                    ) : (
                      <div />
                    )}
                    {includeEditEarlyExtend ? (
                      <TimeSlotEditor
                        title="기본 버전 얼리+연장 일정"
                        description="첫날 얼리이면서 마지막날 연장 조건의 연결 일정입니다."
                        value={editForm.earlyExtendTimeSlots}
                        pasteHelperResetNonce={editPasteHelperResetNonce}
                        onChange={(nextTimeSlots) => setEditForm((prev) => ({ ...prev, earlyExtendTimeSlots: nextTimeSlots }))}
                      />
                    ) : (
                      <div />
                    )}
                  </div>
                ) : null}

                <AlternativeVersionEditor
                  value={editForm.versions}
                  includeEarly={includeEditEarly}
                  includeExtend={includeEditExtend}
                  includeEarlyExtend={includeEditEarlyExtend}
                  pasteHelperResetNonce={editPasteHelperResetNonce}
                  onChange={(nextVersions) => setEditForm((prev) => ({ ...prev, versions: nextVersions }))}
                />
              </div>
            </div>
          </form>
        </Card>
      ) : null}
    </section>
  );
}
