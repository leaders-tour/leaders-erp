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

function createDefaultForm(regionId = ''): LocationProfileFormInput {
  return {
    regionId,
    name: '',
    timeSlots: [
      { startTime: '08:00', activities: ['', '', '', ''] },
      { startTime: '12:00', activities: ['', '', '', ''] },
      { startTime: '18:00', activities: ['', '', '', ''] },
    ],
    lodging: {
      isUnspecified: false,
      name: '여행자 캠프',
      hasElectricity: false,
      hasShower: false,
      hasInternet: false,
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

  const updateActivity = (slotIndex: number, activityIndex: number, value: string) => {
    setForm((prev) => {
      const nextSlots = [...prev.timeSlots];
      const target = nextSlots[slotIndex];
      if (!target) {
        return prev;
      }
      const nextActivities = [...target.activities] as [string, string, string, string];
      nextActivities[activityIndex] = value;
      nextSlots[slotIndex] = { ...target, activities: nextActivities };
      return { ...prev, timeSlots: nextSlots as LocationProfileFormInput['timeSlots'] };
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
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-slate-700">지역</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={form.regionId}
                onChange={(event) => setForm((prev) => ({ ...prev, regionId: event.target.value }))}
                required
              >
                <option value="">선택하세요</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-slate-700">이름</span>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
            </label>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">시간/일정</h3>
            {form.timeSlots.map((slot, slotIndex) => (
              <div key={slot.startTime} className="grid gap-2">
                <div className="text-sm font-medium text-slate-700">{slot.startTime}</div>
                {slot.activities.map((activity, activityIndex) => (
                  <Input
                    key={`${slot.startTime}-${activityIndex}`}
                    value={activity}
                    onChange={(event) => updateActivity(slotIndex, activityIndex, event.target.value)}
                    placeholder="활동 입력"
                  />
                ))}
              </div>
            ))}
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
            <div className="flex flex-wrap gap-4 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.lodging.hasElectricity}
                  disabled={form.lodging.isUnspecified}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      lodging: { ...prev.lodging, hasElectricity: event.target.checked },
                    }))
                  }
                />
                전기
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.lodging.hasShower}
                  disabled={form.lodging.isUnspecified}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      lodging: { ...prev.lodging, hasShower: event.target.checked },
                    }))
                  }
                />
                샤워
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.lodging.hasInternet}
                  disabled={form.lodging.isUnspecified}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      lodging: { ...prev.lodging, hasInternet: event.target.checked },
                    }))
                  }
                />
                인터넷
              </label>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-3">
            <h3 className="md:col-span-3 text-sm font-semibold text-slate-800">식사</h3>
            {(['breakfast', 'lunch', 'dinner'] as const).map((field) => (
              <label key={field} className="grid gap-1 text-sm">
                <span className="text-slate-700">{field === 'breakfast' ? '아침' : field === 'lunch' ? '점심' : '저녁'}</span>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={form.meals[field] ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      meals: {
                        ...prev.meals,
                        [field]: (event.target.value || null) as MealOption | null,
                      },
                    }))
                  }
                >
                  <option value="">선택 안 함</option>
                  {MEAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div>
            <Button type="submit" disabled={submitting}>
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
