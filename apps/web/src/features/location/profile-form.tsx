import { gql, useQuery } from '@apollo/client';
import { Button, Card, Input, type ButtonProps } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { MealOption, type Region } from '../../generated/graphql';
import { getMovementIntensityMeta } from '../estimate/model/movement-intensity';
import type { FacilityAvailability, LocationProfileFormInput } from './hooks';

const REGIONS_QUERY = gql`
  query LocationRegions {
    regions {
      id
      name
    }
  }
`;

const MEAL_OPTIONS: Array<{ value: MealOption; label: string }> = [
  { value: MealOption.CampMeal, label: '캠프식' },
  { value: MealOption.LocalRestaurant, label: '현지식당' },
];

const DEFAULT_SLOT_TIMES = ['08:00', '12:00', '18:00'] as const;
const PASTE_HELPER_PLACEHOLDERS: Record<TimeSlotField, TimeSlotPasteHelperValue> = {
  firstDayTimeSlots: {
    timeCellText: '08:00\n12:00\n-\n18:00',
    scheduleCellText:
      '가이드 접선 후 여행시작\n이동 중 점심식사\n차강소브라가 도착 / 침식지형 트래킹\n숙소 도착 (저녁식사 및 휴식)',
  },
  firstDayEarlyTimeSlots: {
    timeCellText: '04:00\n-\n-\n08:00\n12:00\n-\n18:00',
    scheduleCellText:
      '가이드 접선 후 울란바토르로 이동 (얼리스타트)\n울란바토르 시내 간단투어\n(수흐바타르 광장, 자이승 전승 기념탑)\n아침식사 후 차강소브라가로 출발\n이동 중 점심식사\n차강소브라가 도착 및 투어 (침식지형 트래킹 등)\n숙소 도착 (저녁식사 및 휴식)',
  },
};

export type LocationProfileFormValue = LocationProfileFormInput;
type TimeSlotField = 'firstDayTimeSlots' | 'firstDayEarlyTimeSlots';
type TimeSlotPasteHelperValue = {
  timeCellText: string;
  scheduleCellText: string;
};

function createSlot(startTime: string): LocationProfileFormInput['firstDayTimeSlots'][number] {
  return {
    startTime,
    activities: ['', '', '', ''],
  };
}

function createEmptyPasteHelperValue(): Record<TimeSlotField, TimeSlotPasteHelperValue> {
  return {
    firstDayTimeSlots: {
      timeCellText: '',
      scheduleCellText: '',
    },
    firstDayEarlyTimeSlots: {
      timeCellText: '',
      scheduleCellText: '',
    },
  };
}

function parseLocationProfileTimeSlots(
  timeCellText: string,
  scheduleCellText: string,
): LocationProfileFormInput['firstDayTimeSlots'] {
  const timeLines = timeCellText.split(/\r?\n/);
  const scheduleLines = scheduleCellText.split(/\r?\n/);
  const lineCount = Math.max(timeLines.length, scheduleLines.length);
  const slots: LocationProfileFormInput['firstDayTimeSlots'] = [];

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
    return [createSlot('')];
  }

  return slots.map((slot) => ({
    ...slot,
    activities: slot.activities.length > 0 ? slot.activities : [''],
  }));
}

function getNextSlotTime(currentSlots: LocationProfileFormInput['firstDayTimeSlots']): string {
  const last = currentSlots[currentSlots.length - 1];
  if (!last || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(last.startTime)) {
    return '';
  }
  const [hours = 0, minutes = 0] = last.startTime.split(':').map(Number);
  const total = (hours * 60 + minutes + 60) % (24 * 60);
  const nextHours = String(Math.floor(total / 60)).padStart(2, '0');
  const nextMinutes = String(total % 60).padStart(2, '0');
  return `${nextHours}:${nextMinutes}`;
}

export function createDefaultLocationProfileFormValue(regionId = ''): LocationProfileFormValue {
  return {
    regionId,
    name: [''],
    isFirstDayEligible: false,
    isLastDayEligible: false,
    firstDayTimeSlots: DEFAULT_SLOT_TIMES.map((slot) => createSlot(slot)),
    firstDayEarlyTimeSlots: DEFAULT_SLOT_TIMES.map((slot) => createSlot(slot)),
    firstDayAverageDistanceKm: '',
    firstDayAverageTravelHours: '',
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

interface LocationProfileFormProps {
  title: string;
  submitLabel: string;
  submitVariant?: ButtonProps['variant'];
  value: LocationProfileFormValue;
  submitting: boolean;
  nameLabel?: string;
  nameReadOnly?: boolean;
  eligibilityReadOnly?: boolean;
  onSubmit: (value: LocationProfileFormValue) => Promise<void>;
}

export function LocationProfileForm({
  title,
  submitLabel,
  submitVariant,
  value,
  submitting,
  nameLabel = '도착지',
  nameReadOnly = false,
  eligibilityReadOnly = false,
  onSubmit,
}: LocationProfileFormProps): JSX.Element {
  const { data: regionData } = useQuery<{ regions: Region[] }>(REGIONS_QUERY);
  const [form, setForm] = useState<LocationProfileFormValue>(value);
  const [pasteHelpers, setPasteHelpers] = useState<Record<TimeSlotField, TimeSlotPasteHelperValue>>(createEmptyPasteHelperValue);

  useEffect(() => {
    setForm(value);
  }, [value]);

  const regions = useMemo(() => regionData?.regions ?? [], [regionData]);

  const updateNameLine = (index: number, nextValue: string) => {
    setForm((prev) => {
      const nextName = [...prev.name];
      if (index < 0 || index >= nextName.length) {
        return prev;
      }
      nextName[index] = nextValue;
      return { ...prev, name: nextName };
    });
  };

  const addNameLine = () => {
    setForm((prev) => ({ ...prev, name: [...prev.name, ''] }));
  };

  const removeNameLine = (index: number) => {
    setForm((prev) => {
      if (prev.name.length <= 1) {
        return prev;
      }
      return {
        ...prev,
        name: prev.name.filter((_, currentIndex) => currentIndex !== index),
      };
    });
  };

  const updateSlotTime = (field: TimeSlotField, slotIndex: number, slotValue: string) => {
    setForm((prev) => {
      const nextSlots = [...prev[field]];
      const target = nextSlots[slotIndex];
      if (!target) {
        return prev;
      }
      nextSlots[slotIndex] = { ...target, startTime: slotValue };
      return { ...prev, [field]: nextSlots };
    });
  };

  const addTimeSlot = (field: TimeSlotField) => {
    setForm((prev) => ({
      ...prev,
      [field]: [...prev[field], createSlot(getNextSlotTime(prev[field]))],
    }));
  };

  const addPresetBetween = (field: TimeSlotField, beforeTime: string, presetTime: string) => {
    setForm((prev) => {
      const insertIndex = prev[field].findIndex((slot) => slot.startTime === beforeTime);
      if (insertIndex < 0) {
        return { ...prev, [field]: [...prev[field], createSlot(presetTime)] };
      }
      return {
        ...prev,
        [field]: [
          ...prev[field].slice(0, insertIndex),
          createSlot(presetTime),
          ...prev[field].slice(insertIndex),
        ],
      };
    });
  };

  const removeTimeSlot = (field: TimeSlotField, slotIndex: number) => {
    setForm((prev) => {
      if (prev[field].length <= 1) {
        return prev;
      }
      return {
        ...prev,
        [field]: prev[field].filter((_, index) => index !== slotIndex),
      };
    });
  };

  const updateActivity = (field: TimeSlotField, slotIndex: number, activityIndex: number, activityValue: string) => {
    setForm((prev) => {
      const nextSlots = [...prev[field]];
      const target = nextSlots[slotIndex];
      if (!target) {
        return prev;
      }
      const nextActivities = [...target.activities];
      if (activityIndex < 0 || activityIndex >= nextActivities.length) {
        return prev;
      }
      nextActivities[activityIndex] = activityValue;
      nextSlots[slotIndex] = { ...target, activities: nextActivities };
      return { ...prev, [field]: nextSlots };
    });
  };

  const addActivity = (field: TimeSlotField, slotIndex: number) => {
    setForm((prev) => {
      const nextSlots = [...prev[field]];
      const target = nextSlots[slotIndex];
      if (!target) {
        return prev;
      }
      nextSlots[slotIndex] = {
        ...target,
        activities: [...target.activities, ''],
      };
      return { ...prev, [field]: nextSlots };
    });
  };

  const removeActivity = (field: TimeSlotField, slotIndex: number, activityIndex: number) => {
    setForm((prev) => {
      const nextSlots = [...prev[field]];
      const target = nextSlots[slotIndex];
      if (!target || target.activities.length <= 1) {
        return prev;
      }
      nextSlots[slotIndex] = {
        ...target,
        activities: target.activities.filter((_, index) => index !== activityIndex),
      };
      return { ...prev, [field]: nextSlots };
    });
  };

  const updatePasteHelper = (field: TimeSlotField, key: keyof TimeSlotPasteHelperValue, nextValue: string) => {
    setPasteHelpers((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [key]: nextValue,
      },
    }));
  };

  const applyPasteHelper = (field: TimeSlotField) => {
    setForm((prev) => ({
      ...prev,
      [field]: parseLocationProfileTimeSlots(pasteHelpers[field].timeCellText, pasteHelpers[field].scheduleCellText),
    }));
  };

  const clearPasteHelper = (field: TimeSlotField) => {
    setPasteHelpers((prev) => ({
      ...prev,
      [field]: {
        timeCellText: '',
        scheduleCellText: '',
      },
    }));
  };

  const renderTimeSlotEditor = (input: {
    field: TimeSlotField;
    title: string;
    description: string;
    activityLabel: string;
  }) => {
    const slots = form[input.field];

    return (
      <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 self-start">
        <div className="grid gap-1">
          <h3 className="text-sm font-semibold text-slate-800">{input.title}</h3>
          <p className="text-xs text-slate-500">{input.description}</p>
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
                value={pasteHelpers[input.field].timeCellText}
                onChange={(event) => updatePasteHelper(input.field, 'timeCellText', event.target.value)}
                rows={8}
                className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder={PASTE_HELPER_PLACEHOLDERS[input.field].timeCellText}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-slate-700">일정</span>
              <textarea
                value={pasteHelpers[input.field].scheduleCellText}
                onChange={(event) => updatePasteHelper(input.field, 'scheduleCellText', event.target.value)}
                rows={8}
                className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder={PASTE_HELPER_PLACEHOLDERS[input.field].scheduleCellText}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">시간 칸의 `-`는 바로 위 시간에 이어지는 일정으로 인식됩니다.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => applyPasteHelper(input.field)} className="whitespace-nowrap">
              붙여넣기 적용
            </Button>
            <Button type="button" variant="outline" onClick={() => clearPasteHelper(input.field)} className="whitespace-nowrap">
              입력 비우기
            </Button>
          </div>
        </div>
        <div className="grid gap-3">
          {slots.map((slot, slotIndex) => (
            <div key={`${input.field}-${slotIndex}`} className="grid gap-2">
              <div className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[max-content_minmax(0,1fr)]">
                <div className="grid gap-2 md:content-start">
                  <div className="flex h-10 items-center">
                    <h4 className="text-sm font-semibold text-slate-800">출발 시간</h4>
                  </div>
                  <Input
                    className="w-[110px] border-slate-500 text-lg font-semibold"
                    value={slot.startTime}
                    onChange={(event) => updateSlotTime(input.field, slotIndex, event.target.value)}
                    placeholder="HH:mm"
                  />
                </div>
                <div className="grid gap-2 min-w-0">
                  <div className="flex h-10 items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-800">{input.activityLabel}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeTimeSlot(input.field, slotIndex)}
                      disabled={slots.length <= 1}
                      className="whitespace-nowrap"
                    >
                      삭제
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    {slot.activities.map((activity, activityIndex) => (
                      <div key={`${input.field}-${slotIndex}-activity-${activityIndex}`} className="flex items-center gap-2 min-w-0">
                        <Input
                          value={activity}
                          onChange={(event) => updateActivity(input.field, slotIndex, activityIndex, event.target.value)}
                          placeholder="활동 입력"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeActivity(input.field, slotIndex, activityIndex)}
                          disabled={slot.activities.length <= 1}
                          className="whitespace-nowrap"
                        >
                          X
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <Button type="button" variant="outline" onClick={() => addActivity(input.field, slotIndex)} className="whitespace-nowrap">
                      활동 추가
                    </Button>
                  </div>
                </div>
              </div>

              {slot.startTime === '08:00' ? (
                <div className="overflow-x-auto">
                  <Button type="button" variant="outline" onClick={() => addPresetBetween(input.field, '12:00', '10:00')} className="whitespace-nowrap">
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
                  <Button type="button" variant="outline" onClick={() => addPresetBetween(input.field, '18:00', '15:00')} className="whitespace-nowrap">
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
          <Button type="button" variant="outline" onClick={() => addTimeSlot(input.field)} className="whitespace-nowrap">
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
  };

  const movementIntensityPreview = useMemo(() => {
    const hours = Number(form.firstDayAverageTravelHours);
    if (!form.isFirstDayEligible || Number.isNaN(hours) || hours < 0) {
      return null;
    }
    if (hours <= 3) {
      return getMovementIntensityMeta('LEVEL_1');
    }
    if (hours <= 5) {
      return getMovementIntensityMeta('LEVEL_2');
    }
    if (hours <= 7) {
      return getMovementIntensityMeta('LEVEL_3');
    }
    if (hours <= 9) {
      return getMovementIntensityMeta('LEVEL_4');
    }
    return getMovementIntensityMeta('LEVEL_5');
  }, [form.firstDayAverageTravelHours, form.isFirstDayEligible]);

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            try {
              await onSubmit(form);
              setPasteHelpers(createEmptyPasteHelperValue());
            } catch {
              /* 오류는 상위 onSubmit/CRUD에서 처리 */
            }
          })();
        }}
      >
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
          <div className="grid gap-6">
            <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
              <label className="grid gap-1 text-sm min-w-0">
                <span className="text-slate-700">지역</span>
                <div className="flex flex-wrap gap-2">
                  {regions.map((region) => (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, regionId: region.id }))}
                      className={`rounded-xl border px-3 py-1.5 text-sm ${
                        form.regionId === region.id
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {region.name}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
              <label className="grid gap-1 text-sm min-w-0">
                <span className="text-slate-700">{nameLabel}</span>
                <div className="grid gap-2">
                  {form.name.map((line, index) => (
                    <div key={`location-name-${index}`} className="flex items-center gap-2">
                      <Input
                        value={line}
                        onChange={(event) => updateNameLine(index, event.target.value)}
                        required={index === 0}
                        disabled={nameReadOnly}
                        className={nameReadOnly ? 'border-slate-300 bg-slate-100 text-slate-500' : undefined}
                        placeholder={index === 0 ? '예: 욜린암' : '예: 차강소브라가'}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeNameLine(index)}
                        disabled={nameReadOnly || form.name.length <= 1}
                        className="whitespace-nowrap"
                      >
                        삭제
                      </Button>
                    </div>
                  ))}
                  <div>
                    <Button type="button" variant="outline" onClick={addNameLine} disabled={nameReadOnly}>
                      경유지 추가
                    </Button>
                  </div>
                </div>
              </label>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
              <div className="grid gap-4 text-sm text-slate-700">
                <div className="grid gap-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isFirstDayEligible}
                      disabled={eligibilityReadOnly}
                      onChange={(event) => setForm((prev) => ({ ...prev, isFirstDayEligible: event.target.checked }))}
                    />
                    첫날 가능
                  </label>
                  <p className="text-xs text-slate-500">여행일정중 첫날이 될 수 있다면 체크해주세요</p>
                </div>
                <div className="grid gap-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isLastDayEligible}
                      disabled={eligibilityReadOnly}
                      onChange={(event) => setForm((prev) => ({ ...prev, isLastDayEligible: event.target.checked }))}
                    />
                    마지막날 가능
                  </label>
                  <p className="text-xs text-slate-500">여행일정중 마지막날이 될 수 있다면 체크해주세요</p>
                </div>
              </div>
            </div>

            {form.isFirstDayEligible ? (
              <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
                <div className="grid gap-1">
                  <h3 className="text-sm font-semibold text-slate-800">첫날 이동 정보</h3>
                  <p className="text-xs text-slate-500">첫날 목적지 자동 채움에 사용되는 이동거리와 이동시간입니다.</p>
                </div>
                <div className="grid gap-3">
                  <label className="grid gap-1 text-sm">
                    <span className="text-slate-700">첫날 이동시간(시간)</span>
                    <Input
                      value={form.firstDayAverageTravelHours}
                      onChange={(event) => setForm((prev) => ({ ...prev, firstDayAverageTravelHours: event.target.value }))}
                      inputMode="decimal"
                      placeholder="예: 1.5"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-slate-700">첫날 이동거리(km)</span>
                    <Input
                      value={form.firstDayAverageDistanceKm}
                      onChange={(event) => setForm((prev) => ({ ...prev, firstDayAverageDistanceKm: event.target.value }))}
                      inputMode="decimal"
                      placeholder="예: 35"
                    />
                  </label>
                </div>
                <div className="text-sm text-slate-600">이동강도: {movementIntensityPreview ? movementIntensityPreview.label : '시간 입력 필요'}</div>
              </div>
            ) : null}

            <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.lodging.isUnspecified}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      lodging: { ...prev.lodging, isUnspecified: event.target.checked },
                    }))
                  }
                />
                숙소 미지정
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-slate-700">숙소명</span>
                <Input
                  value={form.lodging.name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      lodging: { ...prev.lodging, name: event.target.value },
                    }))
                  }
                  disabled={form.lodging.isUnspecified}
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
                        variant={form.lodging[field] === state ? 'default' : 'outline'}
                        disabled={form.lodging.isUnspecified}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            lodging: { ...prev.lodging, [field]: state as FacilityAvailability },
                          }))
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

            <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
              <div className="grid gap-1">
                <h3 className="text-sm font-semibold text-slate-800">식사</h3>
                <p className="text-xs text-slate-500">
                  특식은 견적서를 만들 때 배정합니다. 특식이 없을 때를 가정하고 넣어주세요.
                </p>
              </div>
              {(['breakfast', 'lunch', 'dinner'] as const).map((field) => (
                <label key={field} className="grid gap-1 text-sm">
                  <span className="text-slate-700">{field === 'breakfast' ? '아침' : field === 'lunch' ? '점심' : '저녁'}</span>
                  <div className="flex flex-wrap gap-2">
                    {MEAL_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={form.meals[field] === option.value ? 'default' : 'outline'}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            meals: {
                              ...prev.meals,
                              [field]: option.value,
                            },
                          }))
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

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <div>
              {form.isFirstDayEligible ? (
                renderTimeSlotEditor({
                  field: 'firstDayTimeSlots',
                  title: '1일차 기본 일정',
                  description: '일정빌더에서 1일차를 선택할 때 사용됩니다.',
                  activityLabel: '1일차 기본 일정',
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  첫날 가능을 켜면 1일차 기본 일정 입력 영역이 나타납니다.
                </div>
              )}
            </div>

            <div>
              {form.isFirstDayEligible ? (
                renderTimeSlotEditor({
                  field: 'firstDayEarlyTimeSlots',
                  title: '1일차 얼리 일정',
                  description: '일정빌더에서 1일차 얼리일 경우 사용됩니다.',
                  activityLabel: '1일차 얼리 일정',
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  첫날 가능을 켜면 1일차 얼리 일정 입력 영역이 나타납니다.
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <Button
            type="submit"
            variant={submitVariant}
            disabled={submitting || !form.regionId || form.name.every((line) => line.trim().length === 0)}
          >
            {submitting ? '저장 중...' : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
