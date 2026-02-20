import { gql, useQuery } from '@apollo/client';
import { Button, Card, Input, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import { MealOption, type Region } from '../generated/graphql';
import { type LocationProfileFormInput, useLocationCrud } from '../features/location/hooks';

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
  { value: MealOption.PorkParty, label: '삼겹살파티' },
  { value: MealOption.Horhog, label: '허르헉' },
  { value: MealOption.Shashlik, label: '샤슬릭' },
  { value: MealOption.ShabuShabu, label: '샤브샤브' },
];

const DEFAULT_SLOT_TIMES = ['08:00', '12:00', '18:00'] as const;

function createSlot(startTime: string): LocationProfileFormInput['timeSlots'][number] {
  return {
    startTime,
    activities: ['', '', '', ''],
  };
}

function getNextSlotTime(currentSlots: LocationProfileFormInput['timeSlots']): string {
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

function createDefaultForm(regionId = ''): LocationProfileFormInput {
  return {
    regionId,
    name: '',
    timeSlots: DEFAULT_SLOT_TIMES.map((slot) => createSlot(slot)),
    lodging: {
      isUnspecified: false,
      name: '여행자 캠프',
      hasElectricity: true,
      hasShower: true,
      hasInternet: true,
    },
    meals: {
      breakfast: null,
      lunch: null,
      dinner: null,
    },
  };
}

export function LocationPage(): JSX.Element {
  const crud = useLocationCrud();
  const { data: regionData } = useQuery<{ regions: Region[] }>(REGIONS_QUERY);
  const [form, setForm] = useState<LocationProfileFormInput>(() => createDefaultForm());
  const [submitting, setSubmitting] = useState(false);

  const regions = useMemo(() => regionData?.regions ?? [], [regionData]);

  const updateSlotTime = (slotIndex: number, value: string) => {
    setForm((prev) => {
      const nextSlots = [...prev.timeSlots];
      const target = nextSlots[slotIndex];
      if (!target) {
        return prev;
      }
      nextSlots[slotIndex] = { ...target, startTime: value };
      return { ...prev, timeSlots: nextSlots };
    });
  };

  const addTimeSlot = () => {
    setForm((prev) => ({
      ...prev,
      timeSlots: [...prev.timeSlots, createSlot(getNextSlotTime(prev.timeSlots))],
    }));
  };

  const addPresetBetween = (beforeTime: string, presetTime: string) => {
    setForm((prev) => {
      const insertIndex = prev.timeSlots.findIndex((slot) => slot.startTime === beforeTime);
      if (insertIndex < 0) {
        return { ...prev, timeSlots: [...prev.timeSlots, createSlot(presetTime)] };
      }
      return {
        ...prev,
        timeSlots: [
          ...prev.timeSlots.slice(0, insertIndex),
          createSlot(presetTime),
          ...prev.timeSlots.slice(insertIndex),
        ],
      };
    });
  };

  const removeTimeSlot = (slotIndex: number) => {
    setForm((prev) => {
      if (prev.timeSlots.length <= 1) {
        return prev;
      }
      return {
        ...prev,
        timeSlots: prev.timeSlots.filter((_, index) => index !== slotIndex),
      };
    });
  };

  const updateActivity = (slotIndex: number, activityIndex: number, value: string) => {
    setForm((prev) => {
      const nextSlots = [...prev.timeSlots];
      const target = nextSlots[slotIndex];
      if (!target) {
        return prev;
      }
      const nextActivities = [...target.activities];
      if (activityIndex < 0 || activityIndex >= nextActivities.length) {
        return prev;
      }
      nextActivities[activityIndex] = value;
      nextSlots[slotIndex] = { ...target, activities: nextActivities };
      return { ...prev, timeSlots: nextSlots };
    });
  };

  const addActivity = (slotIndex: number) => {
    setForm((prev) => {
      const nextSlots = [...prev.timeSlots];
      const target = nextSlots[slotIndex];
      if (!target) {
        return prev;
      }
      nextSlots[slotIndex] = {
        ...target,
        activities: [...target.activities, ''],
      };
      return { ...prev, timeSlots: nextSlots };
    });
  };

  const removeActivity = (slotIndex: number, activityIndex: number) => {
    setForm((prev) => {
      const nextSlots = [...prev.timeSlots];
      const target = nextSlots[slotIndex];
      if (!target || target.activities.length <= 1) {
        return prev;
      }
      nextSlots[slotIndex] = {
        ...target,
        activities: target.activities.filter((_, index) => index !== activityIndex),
      };
      return { ...prev, timeSlots: nextSlots };
    });
  };

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">목적지</h1>
        <p className="mt-1 text-sm text-slate-600">이름, 타임테이블, 숙소, 식사를 한 번에 생성합니다.</p>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">목적지 생성</h2>
        <form
          className="grid gap-6"
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            try {
              await crud.createProfile(form);
              setForm(createDefaultForm(form.regionId));
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <div className="grid gap-3 md:grid-cols-2 md:items-start">
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

            <label className="grid gap-1 text-sm min-w-0">
              <span className="text-slate-700">이름</span>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
            </label>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">시간/일정</h3>
            <div className="grid gap-3">
              {form.timeSlots.map((slot, slotIndex) => (
                <div key={`slot-${slotIndex}`} className="grid gap-2">
                  <div className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="grid gap-2">
                      <h4 className="text-sm font-semibold text-slate-800"># 시간</h4>
                      <Input
                        value={slot.startTime}
                        onChange={(event) => updateSlotTime(slotIndex, event.target.value)}
                        placeholder="HH:mm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeTimeSlot(slotIndex)}
                        disabled={form.timeSlots.length <= 1}
                        className="whitespace-nowrap"
                      >
                        X
                      </Button>
                    </div>
                    <div className="grid gap-2 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800"># 활동</h4>
                      <div className="grid gap-2">
                        {slot.activities.map((activity, activityIndex) => (
                          <div key={`slot-${slotIndex}-activity-${activityIndex}`} className="flex items-center gap-2 min-w-0">
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

          <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">숙소</h3>
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
                    <Button
                      type="button"
                      variant={form.lodging[field] ? 'default' : 'outline'}
                      disabled={form.lodging.isUnspecified}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          lodging: { ...prev.lodging, [field]: true },
                        }))
                      }
                    >
                      예
                    </Button>
                    <Button
                      type="button"
                      variant={!form.lodging[field] ? 'default' : 'outline'}
                      disabled={form.lodging.isUnspecified}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          lodging: { ...prev.lodging, [field]: false },
                        }))
                      }
                    >
                      아니오
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">식사</h3>
            {(['breakfast', 'lunch', 'dinner'] as const).map((field) => (
              <label key={field} className="grid gap-1 text-sm">
                <span className="text-slate-700">{field === 'breakfast' ? '아침' : field === 'lunch' ? '점심' : '저녁'}</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={form.meals[field] === null ? 'default' : 'outline'}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        meals: {
                          ...prev.meals,
                          [field]: null,
                        },
                      }))
                    }
                  >
                    선택 안 함
                  </Button>
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

          <div>
            <Button type="submit" disabled={submitting || !form.regionId || !form.name.trim()}>
              {submitting ? '생성 중...' : '목적지 생성'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold tracking-tight">목적지 목록</h2>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>지역</Th>
              <Th>목적지명</Th>
              <Th>기본 숙소</Th>
              <Th>관리</Th>
            </tr>
          </thead>
          <tbody>
            {crud.rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.id}</Td>
                <Td>{row.regionName}</Td>
                <Td>{row.name}</Td>
                <Td>{row.defaultLodgingType}</Td>
                <Td>
                  <Button variant="destructive" onClick={() => void crud.deleteRow(row.id)} disabled={crud.loading}>
                    삭제
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </section>
  );
}
