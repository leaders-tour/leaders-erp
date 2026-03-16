import { gql, useQuery } from '@apollo/client';
import { Button, Card, Input, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LocationSubNav } from '../features/location/sub-nav';
import {
  useSegmentCrud,
  type SegmentRow,
  type SegmentTimeSlotFormInput,
  type SegmentVersionFormInput,
} from '../features/segment/hooks';
import type { Location } from '../generated/graphql';

const LOCATIONS_QUERY = gql`
  query SegmentLocations {
    locations {
      id
      regionId
      regionName
      name
    }
  }
`;

const DEFAULT_SLOT_TIMES = ['08:00', '12:00', '18:00'] as const;

interface SegmentFormState {
  fromLocationId: string;
  toLocationId: string;
  averageDistanceKm: string;
  averageTravelHours: string;
  isLongDistance: boolean;
  timeSlots: SegmentTimeSlotFormInput[];
  viaVersions: SegmentVersionDraft[];
}

interface SegmentVersionDraft {
  clientId: string;
  name: string;
  viaLocationIds: string[];
  averageDistanceKm: string;
  averageTravelHours: string;
  isLongDistance: boolean;
  timeSlots: SegmentTimeSlotFormInput[];
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

function createDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createViaVersionDraft(): SegmentVersionDraft {
  return {
    clientId: createDraftId(),
    name: '',
    viaLocationIds: [],
    averageDistanceKm: '',
    averageTravelHours: '',
    isLongDistance: false,
    timeSlots: createDefaultTimeSlots(),
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
    viaVersions: [],
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

function toFormTimeSlots(segment: SegmentRow | undefined): SegmentTimeSlotFormInput[] {
  if (!segment || segment.scheduleTimeBlocks.length === 0) {
    return createDefaultTimeSlots();
  }

  return segment.scheduleTimeBlocks
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

function toViaVersionDrafts(segment: SegmentRow | undefined): SegmentVersionDraft[] {
  if (!segment || segment.versions.length === 0) {
    return [];
  }

  return segment.versions
    .filter((version) => version.kind === 'VIA')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((version) => ({
      clientId: version.id,
      name: version.name,
      viaLocationIds: version.viaLocations.slice().sort((a, b) => a.orderIndex - b.orderIndex).map((item) => item.locationId),
      averageDistanceKm: String(version.averageDistanceKm),
      averageTravelHours: String(version.averageTravelHours),
      isLongDistance: version.isLongDistance,
      timeSlots:
        version.scheduleTimeBlocks.length > 0
          ? version.scheduleTimeBlocks
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((timeBlock) => ({
                startTime: timeBlock.startTime,
                activities:
                  timeBlock.activities.length > 0
                    ? timeBlock.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex).map((activity) => activity.description)
                    : [''],
              }))
          : createDefaultTimeSlots(),
    }));
}

function TimeSlotEditor(props: {
  title: string;
  description: string;
  value: SegmentTimeSlotFormInput[];
  onChange: (nextValue: SegmentTimeSlotFormInput[]) => void;
}): JSX.Element {
  const { title, description, value, onChange } = props;

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

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <Button type="button" variant="outline" onClick={addTimeSlot}>
          슬롯 추가
        </Button>
      </div>

      <div className="grid gap-4">
        {value.map((slot, slotIndex) => (
          <div key={`${slot.startTime}-${slotIndex}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-slate-700">시작 시간</span>
                <Input
                  value={slot.startTime}
                  onChange={(event) => updateSlotTime(slotIndex, event.target.value)}
                  placeholder="08:00"
                />
              </label>
              <Button type="button" variant="outline" onClick={() => removeTimeSlot(slotIndex)} disabled={value.length <= 1}>
                슬롯 삭제
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
                    placeholder="예: 점심 식사 후 다음 목적지로 이동"
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

function buildVersionInputs(form: SegmentFormState): SegmentVersionFormInput[] {
  return [
    {
      name: 'Direct',
      kind: 'DIRECT',
      viaLocationIds: [],
      averageDistanceKm: Number(form.averageDistanceKm),
      averageTravelHours: Number(form.averageTravelHours),
      isLongDistance: form.isLongDistance,
      timeSlots: form.timeSlots,
      isDefault: true,
    },
    ...form.viaVersions.map((version) => ({
      name: version.name.trim() || `Via ${version.viaLocationIds.join(' → ')}`,
      kind: 'VIA' as const,
      viaLocationIds: version.viaLocationIds,
      averageDistanceKm: Number(version.averageDistanceKm),
      averageTravelHours: Number(version.averageTravelHours),
      isLongDistance: version.isLongDistance,
      timeSlots: version.timeSlots,
    })),
  ];
}

function ViaVersionEditor(props: {
  value: SegmentVersionDraft[];
  locations: Location[];
  fromLocationId: string;
  toLocationId: string;
  onChange: (nextValue: SegmentVersionDraft[]) => void;
}): JSX.Element {
  const { value, locations, fromLocationId, toLocationId, onChange } = props;

  const candidateLocations = locations.filter((location) => location.id !== fromLocationId && location.id !== toLocationId);

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">경유지 버전</h3>
          <p className="text-xs text-slate-500">같은 출발지/도착지에 대해 direct 외 경유 경로 버전을 추가합니다.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => onChange([...value, createViaVersionDraft()])}>
          경유지 버전 추가
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          아직 경유지 버전이 없습니다.
        </div>
      ) : (
        value.map((version, index) => (
          <div key={version.clientId} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">Via 버전 {index + 1}</div>
                <p className="text-xs text-slate-500">경유지와 버전별 이동 정보를 입력합니다.</p>
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
                placeholder="예: Via 바양작"
              />
            </label>

            <div className="grid gap-2">
              <div className="text-sm font-medium text-slate-700">경유지 선택</div>
              <div className="flex flex-wrap gap-2">
                {candidateLocations.map((location) => {
                  const selected = version.viaLocationIds.includes(location.id);
                  return (
                    <button
                      key={`${version.clientId}-${location.id}`}
                      type="button"
                      onClick={() =>
                        onChange(
                          value.map((item) =>
                            item.clientId === version.clientId
                              ? {
                                  ...item,
                                  viaLocationIds: selected
                                    ? item.viaLocationIds.filter((locationId) => locationId !== location.id)
                                    : [...item.viaLocationIds, location.id],
                                }
                              : item,
                          ),
                        )
                      }
                      className={`rounded-lg border px-3 py-1 text-xs ${
                        selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {location.name}
                    </button>
                  );
                })}
              </div>
            </div>

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
              description="선택된 경유 버전의 시간/일정 자동 채움에 사용됩니다."
              value={version.timeSlots}
              onChange={(nextTimeSlots) =>
                onChange(
                  value.map((item) => (item.clientId === version.clientId ? { ...item, timeSlots: nextTimeSlots } : item)),
                )
              }
            />
          </div>
        ))
      )}
    </div>
  );
}

export function SegmentPage(): JSX.Element {
  const crud = useSegmentCrud();
  const location = useLocation();
  const { data: locationData, loading: locationsLoading } = useQuery<{ locations: Location[] }>(LOCATIONS_QUERY);

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

  const locations = useMemo(() => locationData?.locations ?? [], [locationData]);
  const locationById = useMemo(() => new Map(locations.map((item) => [item.id, item])), [locations]);

  const filteredFromLocations = useMemo(() => {
    const keyword = fromSearch.trim().toLowerCase();
    if (!keyword) {
      return locations;
    }
    return locations.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [locations, fromSearch]);

  const filteredToLocations = useMemo(() => {
    const keyword = toSearch.trim().toLowerCase();
    if (!keyword) {
      return locations;
    }
    return locations.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [locations, toSearch]);

  const selectedFromLocation = form.fromLocationId ? locationById.get(form.fromLocationId) : undefined;
  const selectedToLocation = form.toLocationId ? locationById.get(form.toLocationId) : undefined;
  const selectedEditFromLocation = editForm.fromLocationId ? locationById.get(editForm.fromLocationId) : undefined;
  const selectedEditToLocation = editForm.toLocationId ? locationById.get(editForm.toLocationId) : undefined;

  const canSubmit =
    !!selectedFromLocation &&
    !!selectedToLocation &&
    selectedFromLocation.regionId === selectedToLocation.regionId &&
    form.fromLocationId !== form.toLocationId &&
    Number(form.averageDistanceKm) > 0 &&
    Number(form.averageTravelHours) > 0 &&
    form.viaVersions.every(
      (version) =>
        version.name.trim().length > 0 &&
        version.viaLocationIds.length > 0 &&
        Number(version.averageDistanceKm) > 0 &&
        Number(version.averageTravelHours) > 0,
    );

  const canUpdate =
    !!selectedEditFromLocation &&
    !!selectedEditToLocation &&
    selectedEditFromLocation.regionId === selectedEditToLocation.regionId &&
    editForm.fromLocationId !== editForm.toLocationId &&
    Number(editForm.averageDistanceKm) > 0 &&
    Number(editForm.averageTravelHours) > 0 &&
    editForm.viaVersions.every(
      (version) =>
        version.name.trim().length > 0 &&
        version.viaLocationIds.length > 0 &&
        Number(version.averageDistanceKm) > 0 &&
        Number(version.averageTravelHours) > 0,
    );

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <LocationSubNav pathname={location.pathname} />
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">목적지 간 연결</h1>
        <p className="mt-1 text-sm text-slate-600">출발지-도착지 연결과 연결별 이동 일정을 함께 관리합니다.</p>
      </header>

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
              await crud.createRow({
                regionId: selectedFromLocation.regionId,
                fromLocationId: form.fromLocationId,
                toLocationId: form.toLocationId,
                averageDistanceKm: Number(form.averageDistanceKm),
                averageTravelHours: Number(form.averageTravelHours),
                isLongDistance: form.isLongDistance,
                timeSlots: form.timeSlots,
                versions: buildVersionInputs(form),
              });
              setForm(createEmptyForm());
              setFromSearch('');
              setToSearch('');
              setFromOpen(false);
              setToOpen(false);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
            <div className="relative grid gap-2">
              <h3 className="text-sm font-semibold text-slate-800">출발지</h3>
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
                <div className="absolute left-0 right-0 top-[76px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  {filteredFromLocations.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                  ) : (
                    filteredFromLocations.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, fromLocationId: item.id }));
                          setFromSearch(item.name);
                          setFromOpen(false);
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                      >
                        {item.name} ({item.regionName})
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <div className="relative grid gap-2">
              <h3 className="text-sm font-semibold text-slate-800">도착지</h3>
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
                <div className="absolute left-0 right-0 top-[76px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  {filteredToLocations.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                  ) : (
                    filteredToLocations.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, toLocationId: item.id }));
                          setToSearch(item.name);
                          setToOpen(false);
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                      >
                        {item.name} ({item.regionName})
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">평균 이동 시간(시간)</h3>
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={form.averageTravelHours}
              onChange={(event) => setForm((prev) => ({ ...prev, averageTravelHours: event.target.value }))}
              placeholder="예: 3.5"
            />
          </div>

          <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">평균거리(km)</h3>
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={form.averageDistanceKm}
              onChange={(event) => setForm((prev) => ({ ...prev, averageDistanceKm: event.target.value }))}
              placeholder="예: 120.5"
            />
          </div>

          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={form.isLongDistance}
              onChange={(event) => setForm((prev) => ({ ...prev, isLongDistance: event.target.checked }))}
            />
            장거리 여행
            <span className="text-xs text-slate-500">비용 추가 관련 존재, 정확한 기재 바람.</span>
          </label>

          <TimeSlotEditor
            title="Direct 일정"
            description="기본 direct 버전의 시간/일정입니다."
            value={form.timeSlots}
            onChange={(nextTimeSlots) => setForm((prev) => ({ ...prev, timeSlots: nextTimeSlots }))}
          />

          <ViaVersionEditor
            value={form.viaVersions}
            locations={locations}
            fromLocationId={form.fromLocationId}
            toLocationId={form.toLocationId}
            onChange={(nextViaVersions) => setForm((prev) => ({ ...prev, viaVersions: nextViaVersions }))}
          />

          {selectedFromLocation && selectedToLocation && selectedFromLocation.regionId !== selectedToLocation.regionId ? (
            <p className="text-sm text-red-600">출발지와 도착지는 동일한 지역이어야 합니다.</p>
          ) : null}

          <div>
            <Button type="submit" variant="primary" disabled={!canSubmit || submitting || locationsLoading || crud.loading}>
              {submitting ? '생성 중...' : '이동경로 생성'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold tracking-tight">연결 목록</h2>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>지역</Th>
              <Th>출발지</Th>
              <Th>도착지</Th>
              <Th>평균거리(km)</Th>
              <Th>평균 이동 시간(시간)</Th>
              <Th>버전</Th>
              <Th>장거리</Th>
              <Th>액션</Th>
            </tr>
          </thead>
          <tbody>
            {crud.rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.regionName}</Td>
                <Td>{locationById.get(row.fromLocationId)?.name ?? row.fromLocationId}</Td>
                <Td>{locationById.get(row.toLocationId)?.name ?? row.toLocationId}</Td>
                <Td>{row.averageDistanceKm}</Td>
                <Td>{row.averageTravelHours}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {row.versions.length === 0 ? (
                      <span className="text-xs text-slate-500">Direct</span>
                    ) : (
                      row.versions.map((version) => (
                        <span key={version.id} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                          {version.kind === 'DIRECT'
                            ? 'Direct'
                            : version.name.trim().length > 0
                              ? version.name
                              : `Via ${version.viaLocations.map((item) => locationById.get(item.locationId)?.name ?? item.locationId).join(' → ')}`}
                        </span>
                      ))
                    )}
                  </div>
                </Td>
                <Td>{row.isLongDistance ? 'Y' : 'N'}</Td>
                <Td>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingSegmentId(row.id);
                      setEditForm({
                        fromLocationId: row.fromLocationId,
                        toLocationId: row.toLocationId,
                        averageDistanceKm: String(row.averageDistanceKm),
                        averageTravelHours: String(row.averageTravelHours),
                        isLongDistance: row.isLongDistance,
                        timeSlots: toFormTimeSlots(row),
                        viaVersions: toViaVersionDrafts(row),
                      });
                      setEditFromSearch(locationById.get(row.fromLocationId)?.name ?? '');
                      setEditToSearch(locationById.get(row.toLocationId)?.name ?? '');
                      setEditFromOpen(false);
                      setEditToOpen(false);
                    }}
                  >
                    수정
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {editingSegmentId ? (
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
                await crud.updateRow(editingSegmentId, {
                  regionId: selectedEditFromLocation.regionId,
                  fromLocationId: editForm.fromLocationId,
                  toLocationId: editForm.toLocationId,
                  averageDistanceKm: Number(editForm.averageDistanceKm),
                  averageTravelHours: Number(editForm.averageTravelHours),
                  isLongDistance: editForm.isLongDistance,
                  timeSlots: editForm.timeSlots,
                  versions: buildVersionInputs(editForm),
                });
                setEditingSegmentId(null);
                setEditForm(createEmptyForm());
                setEditFromSearch('');
                setEditToSearch('');
                setEditFromOpen(false);
                setEditToOpen(false);
              } finally {
                setUpdating(false);
              }
            }}
          >
            <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
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
                            setEditFromSearch(item.name);
                            setEditFromOpen(false);
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                        >
                          {item.name} ({item.regionName})
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
                            setEditToSearch(item.name);
                            setEditToOpen(false);
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                        >
                          {item.name} ({item.regionName})
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            </div>

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

            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={editForm.isLongDistance}
                onChange={(event) => setEditForm((prev) => ({ ...prev, isLongDistance: event.target.checked }))}
              />
              장거리 여행
              <span className="text-xs text-slate-500">비용 추가 관련 존재, 정확한 기재 바람.</span>
            </label>

            <TimeSlotEditor
              title="Direct 일정"
              description="기본 direct 버전의 시간/일정입니다."
              value={editForm.timeSlots}
              onChange={(nextTimeSlots) => setEditForm((prev) => ({ ...prev, timeSlots: nextTimeSlots }))}
            />

            <ViaVersionEditor
              value={editForm.viaVersions}
              locations={locations}
              fromLocationId={editForm.fromLocationId}
              toLocationId={editForm.toLocationId}
              onChange={(nextViaVersions) => setEditForm((prev) => ({ ...prev, viaVersions: nextViaVersions }))}
            />

            {selectedEditFromLocation && selectedEditToLocation && selectedEditFromLocation.regionId !== selectedEditToLocation.regionId ? (
              <p className="text-sm text-red-600">출발지와 도착지는 동일한 지역이어야 합니다.</p>
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
          </form>
        </Card>
      ) : null}
    </section>
  );
}
