import { Button, Input } from '@tour/ui';

export interface MultiDayBlockScheduleSlotInput {
  startTime: string;
  activities: string[];
}

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
}): JSX.Element {
  const { title, description, value, onChange } = props;

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

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <Button type="button" variant="outline" onClick={addTimeSlot}>
          시작시간 추가
        </Button>
      </div>

      <div className="grid gap-4">
        {value.map((slot, slotIndex) => (
          <div key={`${slot.startTime}-${slotIndex}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-slate-700">시작시간</span>
                <Input value={slot.startTime} onChange={(event) => updateSlotTime(slotIndex, event.target.value)} placeholder="08:00" />
              </label>
              <Button type="button" variant="outline" onClick={() => removeTimeSlot(slotIndex)} disabled={value.length <= 1}>
                시작시간 삭제
              </Button>
            </div>

            <div className="grid gap-2">
              {slot.activities.map((activity, activityIndex) => (
                <div key={`${slotIndex}-${activityIndex}`} className="flex items-start gap-2">
                  <textarea
                    value={activity}
                    onChange={(event) => updateActivity(slotIndex, activityIndex, event.target.value)}
                    rows={2}
                    className="min-h-[72px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="활동 내용을 입력하세요"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeActivity(slotIndex, activityIndex)}
                    disabled={slot.activities.length <= 1}
                  >
                    삭제
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Button type="button" variant="outline" onClick={() => addActivity(slotIndex)}>
                활동 추가
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
