import { Button, Input } from '@tour/ui';
import { useEffect, useState } from 'react';

export interface MultiDayBlockScheduleSlotInput {
  startTime: string;
  activities: string[];
}

const PASTE_HELPER_PLACEHOLDERS = {
  timeCellText: '08:00\n12:00\n-\n18:00',
  scheduleCellText: '가이드 접선 후 여행시작\n이동 중 점심식사\n차강소브라가 도착 / 침식지형 트래킹\n숙소 도착 (저녁식사 및 휴식)',
};

export function createMultiDayBlockScheduleSlot(startTime = '08:00'): MultiDayBlockScheduleSlotInput {
  return {
    startTime,
    activities: [''],
  };
}

function getNextSlotTime(timeSlots: MultiDayBlockScheduleSlotInput[]): string {
  const last = timeSlots[timeSlots.length - 1];
  if (!last || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(last.startTime)) {
    return '';
  }

  const [hours = 0, minutes = 0] = last.startTime.split(':').map(Number);
  const nextTotalMinutes = (hours * 60 + minutes + 60) % (24 * 60);
  return `${String(Math.floor(nextTotalMinutes / 60)).padStart(2, '0')}:${String(nextTotalMinutes % 60).padStart(2, '0')}`;
}

export function serializeMultiDayBlockScheduleSlots(value: MultiDayBlockScheduleSlotInput[]): {
  timeCellText: string;
  scheduleCellText: string;
} {
  const normalizedSlots = value.filter((slot) => slot.startTime.trim() || slot.activities.some((activity) => activity.trim()));

  if (normalizedSlots.length === 0) {
    return {
      timeCellText: '',
      scheduleCellText: '',
    };
  }

  return {
    timeCellText: normalizedSlots
      .flatMap((slot) => {
        const activities = slot.activities.length > 0 ? slot.activities : [''];
        return [slot.startTime, ...activities.slice(1).map(() => '-')];
      })
      .join('\n'),
    scheduleCellText: normalizedSlots.flatMap((slot) => (slot.activities.length > 0 ? slot.activities : [''])).join('\n'),
  };
}

export function parseMultiDayBlockScheduleSlots(
  timeCellText: string,
  scheduleCellText: string,
): MultiDayBlockScheduleSlotInput[] {
  const timeLines = timeCellText.split('\n');
  const scheduleLines = scheduleCellText.split('\n');
  const lineCount = Math.max(timeLines.length, scheduleLines.length);
  const slots: MultiDayBlockScheduleSlotInput[] = [];

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
    return [createMultiDayBlockScheduleSlot()];
  }

  return slots.map((slot) => ({
    ...slot,
    activities: slot.activities.length > 0 ? slot.activities : [''],
  }));
}

export function MultiDayBlockDaySlotEditor(props: {
  title: string;
  description: string;
  value: MultiDayBlockScheduleSlotInput[];
  onChange: (nextValue: MultiDayBlockScheduleSlotInput[]) => void;
  /** 0보다 커질 때마다 입력도우미를 비웁니다. */
  pasteHelperResetNonce?: number;
}): JSX.Element {
  const { title, description, value, onChange, pasteHelperResetNonce = 0 } = props;
  const [pasteHelper, setPasteHelper] = useState({ timeCellText: '', scheduleCellText: '' });

  useEffect(() => {
    if (pasteHelperResetNonce <= 0) {
      return;
    }
    setPasteHelper({ timeCellText: '', scheduleCellText: '' });
  }, [pasteHelperResetNonce]);

  const addTimeSlot = () => {
    onChange([...value, createMultiDayBlockScheduleSlot(getNextSlotTime(value))]);
  };

  const removeTimeSlot = (slotIndex: number) => {
    if (value.length <= 1) {
      return;
    }
    onChange(value.filter((_, index) => index !== slotIndex));
  };

  const updateSlotTime = (slotIndex: number, startTime: string) => {
    const nextSlots = [...value];
    const slot = nextSlots[slotIndex];
    if (!slot) {
      return;
    }
    nextSlots[slotIndex] = { ...slot, startTime };
    onChange(nextSlots);
  };

  const updateActivity = (slotIndex: number, activityIndex: number, descriptionText: string) => {
    const nextSlots = [...value];
    const slot = nextSlots[slotIndex];
    if (!slot) {
      return;
    }
    const nextActivities = [...slot.activities];
    if (activityIndex < 0 || activityIndex >= nextActivities.length) {
      return;
    }
    nextActivities[activityIndex] = descriptionText;
    nextSlots[slotIndex] = { ...slot, activities: nextActivities };
    onChange(nextSlots);
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

  const applyPasteHelper = () => {
    const parsed = parseMultiDayBlockScheduleSlots(pasteHelper.timeCellText, pasteHelper.scheduleCellText);
    if (parsed.length > 0) {
      onChange(parsed);
    }
  };

  const clearPasteHelper = () => {
    setPasteHelper({ timeCellText: '', scheduleCellText: '' });
  };

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 self-start">
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
              onChange={(event) => setPasteHelper((prev) => ({ ...prev, timeCellText: event.target.value }))}
              rows={8}
              className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder={PASTE_HELPER_PLACEHOLDERS.timeCellText}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-slate-700">일정</span>
            <textarea
              value={pasteHelper.scheduleCellText}
              onChange={(event) => setPasteHelper((prev) => ({ ...prev, scheduleCellText: event.target.value }))}
              rows={8}
              className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder={PASTE_HELPER_PLACEHOLDERS.scheduleCellText}
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
      <div className="grid gap-3">
        {value.map((slot, slotIndex) => (
          <div key={`${slot.startTime}-${slotIndex}`} className="grid gap-2">
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
              <div className="grid gap-2 min-w-0">
                <div className="flex h-10 items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-800">활동</h4>
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
                    <div key={`${slotIndex}-${activityIndex}`} className="flex items-center gap-2 min-w-0">
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
