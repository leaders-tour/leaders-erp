import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Input, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import {
  calculateMovementIntensityByHours,
  getMovementIntensityMeta,
} from '../features/estimate/model/movement-intensity';
import { formatLocationNameInline } from '../features/location/display';
import { MultiDayBlockSubNav } from '../features/multi-day-block/sub-nav';

interface RegionRow {
  id: string;
  name: string;
}

interface LocationRow {
  id: string;
  regionId: string;
  name: string[];
  isLastDayEligible: boolean;
}

interface MultiDayBlockRow {
  id: string;
  regionId: string;
  name: string;
  title: string;
}

interface ConnectionRow {
  id: string;
  regionId: string;
  fromMultiDayBlockId: string;
  toLocationId: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  scheduleTimeBlocks: Array<{
    id: string;
    startTime: string;
    activities: Array<{ id: string; description: string }>;
  }>;
  extendScheduleTimeBlocks: Array<{
    id: string;
    startTime: string;
    activities: Array<{ id: string; description: string }>;
  }>;
}

interface TimeSlotDraft {
  startTime: string;
  activities: string[];
}

const LOCATIONS_QUERY = gql`
  query OvernightStayConnectionLocations {
    locations {
      id
      regionId
      name
      isLastDayEligible
    }
  }
`;

const REGIONS_QUERY = gql`
  query OvernightStayConnectionRegions {
    regions {
      id
      name
    }
  }
`;

const MULTI_DAY_BLOCKS_QUERY = gql`
  query MultiDayBlockConnectionBlocks {
    multiDayBlocks {
      id
      regionId
      name
      title
    }
  }
`;

const MULTI_DAY_BLOCK_CONNECTIONS_QUERY = gql`
  query MultiDayBlockConnectionList {
    multiDayBlockConnections {
      id
      regionId
      fromMultiDayBlockId
      toLocationId
      averageDistanceKm
      averageTravelHours
      isLongDistance
      scheduleTimeBlocks {
        id
        startTime
        activities {
          id
          description
        }
      }
      extendScheduleTimeBlocks {
        id
        startTime
        activities {
          id
          description
        }
      }
    }
  }
`;

const CREATE_MUTATION = gql`
  mutation CreateMultiDayBlockConnectionPage($input: MultiDayBlockConnectionCreateInput!) {
    createMultiDayBlockConnection(input: $input) {
      id
    }
  }
`;

const UPDATE_MUTATION = gql`
  mutation UpdateMultiDayBlockConnectionPage($id: ID!, $input: MultiDayBlockConnectionUpdateInput!) {
    updateMultiDayBlockConnection(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_MUTATION = gql`
  mutation DeleteMultiDayBlockConnectionPage($id: ID!) {
    deleteMultiDayBlockConnection(id: $id)
  }
`;

const TIME_SLOT_PASTE_HELPER_PLACEHOLDER = {
  timeCellText: '08:00\n12:00\n-\n18:00',
  scheduleCellText: '블록 출발\n이동 중 점심식사\n목적지 도착 후 일정 진행\n숙소 체크인 또는 자유시간',
} as const;

type TimeSlotPasteHelperValue = {
  timeCellText: string;
  scheduleCellText: string;
};

function createEmptyPasteHelperValue(): TimeSlotPasteHelperValue {
  return {
    timeCellText: '',
    scheduleCellText: '',
  };
}

function createTimeSlot(startTime: string): TimeSlotDraft {
  return {
    startTime,
    activities: [''],
  };
}

function parseTimeSlots(timeCellText: string, scheduleCellText: string): TimeSlotDraft[] {
  const timeLines = timeCellText.split(/\r?\n/);
  const scheduleLines = scheduleCellText.split(/\r?\n/);
  const lineCount = Math.max(timeLines.length, scheduleLines.length);
  const slots: TimeSlotDraft[] = [];

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

function toTimeSlots(value: TimeSlotDraft[]) {
  return value.map((slot) => ({
    startTime: slot.startTime,
    activities: slot.activities.map((item) => item.trim()).filter(Boolean),
  }));
}

function buildScheduleLines(
  timeBlocks: Array<{
    id: string;
    startTime: string;
    activities: Array<{ id: string; description: string }>;
  }>,
): Array<{ time: string; activity: string }> {
  if (timeBlocks.length === 0) {
    return [];
  }

  return timeBlocks.flatMap((timeBlock) => {
    const activities = timeBlock.activities.map((activity) => activity.description.trim()).filter(Boolean);

    if (activities.length === 0) {
      return [{ time: timeBlock.startTime, activity: '-' }];
    }

    return activities.map((activity, index) => ({
      time: index === 0 ? timeBlock.startTime : '-',
      activity,
    }));
  });
}

interface MultiDayBlockConnectionPageProps {
  mode?: 'all' | 'list' | 'create';
}

export function MultiDayBlockConnectionPage({ mode = 'all' }: MultiDayBlockConnectionPageProps): JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [regionId, setRegionId] = useState('');
  const [fromMultiDayBlockId, setFromMultiDayBlockId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [averageDistanceKm, setAverageDistanceKm] = useState('0');
  const [averageTravelHours, setAverageTravelHours] = useState('0');
  const [isLongDistance, setIsLongDistance] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlotDraft[]>([createTimeSlot('08:00')]);
  const [extendTimeSlots, setExtendTimeSlots] = useState<TimeSlotDraft[]>([createTimeSlot('18:00')]);
  const [blockSearch, setBlockSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [blockOpen, setBlockOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [timeSlotsPasteHelper, setTimeSlotsPasteHelper] = useState<TimeSlotPasteHelperValue>(createEmptyPasteHelperValue());
  const [extendTimeSlotsPasteHelper, setExtendTimeSlotsPasteHelper] = useState<TimeSlotPasteHelperValue>(createEmptyPasteHelperValue());

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData, refetch } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const { data: stayData } = useQuery<{ multiDayBlocks: MultiDayBlockRow[] }>(MULTI_DAY_BLOCKS_QUERY);
  const { data: connectionData } = useQuery<{ multiDayBlockConnections: ConnectionRow[] }>(MULTI_DAY_BLOCK_CONNECTIONS_QUERY);
  const [createMutation, { loading: creating }] = useMutation(CREATE_MUTATION);
  const [updateMutation, { loading: updating }] = useMutation(UPDATE_MUTATION);
  const [deleteMutation, { loading: deleting }] = useMutation(DELETE_MUTATION);

  const locations = locationData?.locations ?? [];
  const multiDayBlocks = stayData?.multiDayBlocks ?? [];
  const rows = connectionData?.multiDayBlockConnections ?? [];
  const filteredStays = useMemo(() => multiDayBlocks.filter((stay) => stay.regionId === regionId), [multiDayBlocks, regionId]);
  const filteredLocations = useMemo(() => locations.filter((location) => location.regionId === regionId), [locations, regionId]);
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const stayById = useMemo(() => new Map(multiDayBlocks.map((stay) => [stay.id, stay])), [multiDayBlocks]);
  const regions = regionData?.regions ?? [];
  const regionNames = useMemo(() => {
    return Array.from(new Set(rows.map((row) => {
      const region = regions.find((r) => r.id === row.regionId);
      return region?.name ?? '';
    }))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [rows, regions]);
  const filteredRows = useMemo(() => {
    if (selectedRegion === 'ALL') {
      return rows;
    }
    return rows.filter((row) => {
      const region = regions.find((r) => r.id === row.regionId);
      return region?.name === selectedRegion;
    });
  }, [rows, selectedRegion, regions]);
  const filteredBlockOptions = useMemo(() => {
    if (!blockSearch.trim()) {
      return filteredStays;
    }
    const searchLower = blockSearch.toLowerCase();
    return filteredStays.filter((stay) => {
      const name = (stay.name || stay.title || '').toLowerCase();
      return name.includes(searchLower);
    });
  }, [filteredStays, blockSearch]);
  const filteredLocationOptions = useMemo(() => {
    if (!locationSearch.trim()) {
      return filteredLocations;
    }
    const searchLower = locationSearch.toLowerCase();
    return filteredLocations.filter((location) => {
      const name = formatLocationNameInline(location.name).toLowerCase();
      return name.includes(searchLower);
    });
  }, [filteredLocations, locationSearch]);
  const movementIntensityMeta = useMemo(() => {
    const hours = Number(averageTravelHours);
    if (!Number.isFinite(hours) || hours < 0) {
      return null;
    }
    return getMovementIntensityMeta(calculateMovementIntensityByHours(hours));
  }, [averageTravelHours]);

  const resetForm = () => {
    setEditingId(null);
    setRegionId('');
    setFromMultiDayBlockId('');
    setToLocationId('');
    setAverageDistanceKm('0');
    setAverageTravelHours('0');
    setIsLongDistance(false);
    setTimeSlots([createTimeSlot('08:00')]);
    setExtendTimeSlots([createTimeSlot('18:00')]);
    setBlockSearch('');
    setLocationSearch('');
    setBlockOpen(false);
    setLocationOpen(false);
    setTimeSlotsPasteHelper(createEmptyPasteHelperValue());
    setExtendTimeSlotsPasteHelper(createEmptyPasteHelperValue());
  };

  const submit = async () => {
    const input = {
      regionId,
      fromMultiDayBlockId,
      toLocationId,
      averageDistanceKm: Number(averageDistanceKm) || 0,
      averageTravelHours: Number(averageTravelHours) || 0,
      isLongDistance,
      timeSlots: toTimeSlots(timeSlots),
      extendTimeSlots: toTimeSlots(extendTimeSlots),
    };

    if (editingId) {
      await updateMutation({ variables: { id: editingId, input } });
    } else {
      await createMutation({ variables: { input } });
    }
    await refetch();
    resetForm();
  };

  const handleRegionSelect = (nextRegionId: string) => {
    setRegionId(nextRegionId);
    setFromMultiDayBlockId('');
    setToLocationId('');
    setBlockSearch('');
    setLocationSearch('');
  };

  const showCreateSection = mode !== 'list';
  const showListSection = mode !== 'create';
  const pageTitle = mode === 'create' ? '블록 후속 연결 생성' : mode === 'list' ? '블록 후속 연결 목록' : '블록 후속 연결';
  const pageDescription =
    mode === 'create'
      ? '블록 이후에 갈 수 있는 목적지 연결을 생성합니다.'
      : mode === 'list'
        ? '등록된 블록 후속 연결을 조회하고 수정합니다.'
        : '블록 이후에 갈 수 있는 목적지 연결을 관리합니다.';

  const selectedBlock = fromMultiDayBlockId ? stayById.get(fromMultiDayBlockId) : null;
  const selectedLocation = toLocationId ? locationById.get(toLocationId) : null;

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <MultiDayBlockSubNav pathname={mode === 'create' ? '/multi-day-blocks/connections/create' : mode === 'list' ? '/multi-day-blocks/connections/list' : '/multi-day-blocks/connections'} />
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
        <p className="mt-1 text-sm text-slate-600">{pageDescription}</p>
      </header>

      {showCreateSection ? (
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">블록 후속 연결 생성</h2>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!regionId || !fromMultiDayBlockId || !toLocationId) {
              return;
            }
            await submit();
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
                        onClick={() => handleRegionSelect(region.id)}
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
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
                <label className="grid gap-1 text-sm min-w-0">
                  <span className="text-slate-700">블록</span>
                  <div className="relative">
                    <Input
                      value={blockSearch || (selectedBlock ? (selectedBlock.name || selectedBlock.title) : '')}
                      onFocus={() => setBlockOpen(true)}
                      onBlur={() => setTimeout(() => setBlockOpen(false), 120)}
                      onChange={(event) => {
                        setBlockSearch(event.target.value);
                        setFromMultiDayBlockId('');
                        setBlockOpen(true);
                      }}
                      placeholder="블록 검색 또는 선택"
                      disabled={!regionId}
                    />
                    {blockOpen && regionId ? (
                      <div className="absolute left-0 right-0 top-[44px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {filteredBlockOptions.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                        ) : (
                          filteredBlockOptions.map((stay) => (
                            <button
                              key={stay.id}
                              type="button"
                              onClick={() => {
                                setFromMultiDayBlockId(stay.id);
                                setBlockSearch(stay.name || stay.title);
                                setBlockOpen(false);
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                            >
                              {stay.name || stay.title}
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
                  <span className="text-slate-700">다음 목적지</span>
                  <div className="relative">
                    <Input
                      value={locationSearch || (selectedLocation ? formatLocationNameInline(selectedLocation.name) : '')}
                      onFocus={() => setLocationOpen(true)}
                      onBlur={() => setTimeout(() => setLocationOpen(false), 120)}
                      onChange={(event) => {
                        setLocationSearch(event.target.value);
                        setToLocationId('');
                        setLocationOpen(true);
                      }}
                      placeholder="목적지 검색 또는 선택"
                      disabled={!regionId}
                    />
                    {locationOpen && regionId ? (
                      <div className="absolute left-0 right-0 top-[44px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {filteredLocationOptions.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                        ) : (
                          filteredLocationOptions.map((location) => (
                            <button
                              key={location.id}
                              type="button"
                              onClick={() => {
                                setToLocationId(location.id);
                                setLocationSearch(formatLocationNameInline(location.name));
                                setLocationOpen(false);
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                            >
                              {formatLocationNameInline(location.name)}
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
                  <p className="text-xs text-slate-500">블록과 목적지 사이의 평균 이동 거리와 시간입니다.</p>
                </div>
                <div className="grid gap-3">
                  <label className="grid gap-1 text-sm">
                    <span className="text-slate-700">평균 이동시간(시간)</span>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={averageTravelHours}
                      onChange={(event) => setAverageTravelHours(event.target.value)}
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
                      value={averageDistanceKm}
                      onChange={(event) => setAverageDistanceKm(event.target.value)}
                      inputMode="decimal"
                      placeholder="예: 120.5"
                    />
                  </label>
                </div>
                <div className="text-sm text-slate-600">이동강도: {movementIntensityMeta ? movementIntensityMeta.label : '시간 입력 필요'}</div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isLongDistance}
                    onChange={(event) => setIsLongDistance(event.target.checked)}
                  />
                  장거리 여행
                  <span className="text-xs text-slate-500">비용 추가 관련 존재, 정확한 기재 바람.</span>
                </label>
              </div>

              <div>
                <Button type="submit" variant="primary" disabled={!regionId || !fromMultiDayBlockId || !toLocationId || creating}>
                  {creating ? '생성 중...' : '블록 후속 연결 생성'}
                </Button>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="grid items-start gap-6 xl:grid-cols-2">
                <div className="grid gap-3 self-start rounded-2xl border border-slate-200 p-4">
                  <div className="grid gap-1">
                    <h3 className="text-sm font-semibold text-slate-800">기본 일정</h3>
                    <p className="text-xs text-slate-500">기본 연결의 시간/일정입니다.</p>
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
                          value={timeSlotsPasteHelper.timeCellText}
                          onChange={(event) => setTimeSlotsPasteHelper((prev) => ({ ...prev, timeCellText: event.target.value }))}
                          rows={8}
                          className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder={TIME_SLOT_PASTE_HELPER_PLACEHOLDER.timeCellText}
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span className="text-slate-700">일정</span>
                        <textarea
                          value={timeSlotsPasteHelper.scheduleCellText}
                          onChange={(event) => setTimeSlotsPasteHelper((prev) => ({ ...prev, scheduleCellText: event.target.value }))}
                          rows={8}
                          className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder={TIME_SLOT_PASTE_HELPER_PLACEHOLDER.scheduleCellText}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">시간 칸의 `-`는 바로 위 시간에 이어지는 일정으로 인식됩니다.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => {
                          const parsed = parseTimeSlots(timeSlotsPasteHelper.timeCellText, timeSlotsPasteHelper.scheduleCellText);
                          if (parsed.length > 0) {
                            setTimeSlots(parsed);
                          }
                        }}
                        className="whitespace-nowrap"
                      >
                        붙여넣기 적용
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTimeSlotsPasteHelper(createEmptyPasteHelperValue())}
                        className="whitespace-nowrap"
                      >
                        입력 비우기
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    {timeSlots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="grid gap-2">
                        <div className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[max-content_minmax(0,1fr)]">
                          <div className="grid gap-2 md:content-start">
                            <div className="flex h-10 items-center">
                              <h4 className="text-sm font-semibold text-slate-800">출발 시간</h4>
                            </div>
                            <Input
                              className="w-[110px] border-slate-500 text-lg font-semibold"
                              value={slot.startTime}
                              onChange={(event) =>
                                setTimeSlots((prev) => prev.map((item, itemIndex) => (itemIndex === slotIndex ? { ...item, startTime: event.target.value } : item)))
                              }
                              placeholder="HH:mm"
                            />
                          </div>
                          <div className="grid min-w-0 gap-2">
                            <div className="flex h-10 items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold text-slate-800">일정</h4>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTimeSlots((prev) => prev.filter((_, i) => i !== slotIndex))}
                                disabled={timeSlots.length <= 1}
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
                                    onChange={(event) => {
                                      const nextSlots = [...timeSlots];
                                      const slot = nextSlots[slotIndex];
                                      if (!slot) return;
                                      const nextActivities = [...slot.activities];
                                      nextActivities[activityIndex] = event.target.value;
                                      nextSlots[slotIndex] = { ...slot, activities: nextActivities };
                                      setTimeSlots(nextSlots);
                                    }}
                                    placeholder="활동 입력"
                                  />
                                  {slot.activities.length > 1 ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        const nextSlots = [...timeSlots];
                                        const slot = nextSlots[slotIndex];
                                        if (!slot) return;
                                        nextSlots[slotIndex] = {
                                          ...slot,
                                          activities: slot.activities.filter((_, i) => i !== activityIndex),
                                        };
                                        setTimeSlots(nextSlots);
                                      }}
                                      className="whitespace-nowrap"
                                    >
                                      X
                                    </Button>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                            <div className="overflow-x-auto">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const nextSlots = [...timeSlots];
                                  const slot = nextSlots[slotIndex];
                                  if (!slot) return;
                                  nextSlots[slotIndex] = { ...slot, activities: [...slot.activities, ''] };
                                  setTimeSlots(nextSlots);
                                }}
                                className="whitespace-nowrap"
                              >
                                활동 추가
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTimeSlots((prev) => [...prev, createTimeSlot('')])}
                      className="whitespace-nowrap"
                    >
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

                <div className="grid gap-3 self-start rounded-2xl border border-slate-200 p-4">
                  <div className="grid gap-1">
                    <h3 className="text-sm font-semibold text-slate-800">마지막날 연장 일정</h3>
                    <p className="text-xs text-slate-500">마지막날 연장 조건의 연결 일정입니다.</p>
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
                          value={extendTimeSlotsPasteHelper.timeCellText}
                          onChange={(event) => setExtendTimeSlotsPasteHelper((prev) => ({ ...prev, timeCellText: event.target.value }))}
                          rows={8}
                          className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder={TIME_SLOT_PASTE_HELPER_PLACEHOLDER.timeCellText}
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span className="text-slate-700">일정</span>
                        <textarea
                          value={extendTimeSlotsPasteHelper.scheduleCellText}
                          onChange={(event) => setExtendTimeSlotsPasteHelper((prev) => ({ ...prev, scheduleCellText: event.target.value }))}
                          rows={8}
                          className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder={TIME_SLOT_PASTE_HELPER_PLACEHOLDER.scheduleCellText}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">시간 칸의 `-`는 바로 위 시간에 이어지는 일정으로 인식됩니다.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => {
                          const parsed = parseTimeSlots(extendTimeSlotsPasteHelper.timeCellText, extendTimeSlotsPasteHelper.scheduleCellText);
                          if (parsed.length > 0) {
                            setExtendTimeSlots(parsed);
                          }
                        }}
                        className="whitespace-nowrap"
                      >
                        붙여넣기 적용
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setExtendTimeSlotsPasteHelper(createEmptyPasteHelperValue())}
                        className="whitespace-nowrap"
                      >
                        입력 비우기
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    {extendTimeSlots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="grid gap-2">
                        <div className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[max-content_minmax(0,1fr)]">
                          <div className="grid gap-2 md:content-start">
                            <div className="flex h-10 items-center">
                              <h4 className="text-sm font-semibold text-slate-800">출발 시간</h4>
                            </div>
                            <Input
                              className="w-[110px] border-slate-500 text-lg font-semibold"
                              value={slot.startTime}
                              onChange={(event) =>
                                setExtendTimeSlots((prev) => prev.map((item, itemIndex) => (itemIndex === slotIndex ? { ...item, startTime: event.target.value } : item)))
                              }
                              placeholder="HH:mm"
                            />
                          </div>
                          <div className="grid min-w-0 gap-2">
                            <div className="flex h-10 items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold text-slate-800">일정</h4>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setExtendTimeSlots((prev) => prev.filter((_, i) => i !== slotIndex))}
                                disabled={extendTimeSlots.length <= 1}
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
                                    onChange={(event) => {
                                      const nextSlots = [...extendTimeSlots];
                                      const slot = nextSlots[slotIndex];
                                      if (!slot) return;
                                      const nextActivities = [...slot.activities];
                                      nextActivities[activityIndex] = event.target.value;
                                      nextSlots[slotIndex] = { ...slot, activities: nextActivities };
                                      setExtendTimeSlots(nextSlots);
                                    }}
                                    placeholder="활동 입력"
                                  />
                                  {slot.activities.length > 1 ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        const nextSlots = [...extendTimeSlots];
                                        const slot = nextSlots[slotIndex];
                                        if (!slot) return;
                                        nextSlots[slotIndex] = {
                                          ...slot,
                                          activities: slot.activities.filter((_, i) => i !== activityIndex),
                                        };
                                        setExtendTimeSlots(nextSlots);
                                      }}
                                      className="whitespace-nowrap"
                                    >
                                      X
                                    </Button>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                            <div className="overflow-x-auto">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const nextSlots = [...extendTimeSlots];
                                  const slot = nextSlots[slotIndex];
                                  if (!slot) return;
                                  nextSlots[slotIndex] = { ...slot, activities: [...slot.activities, ''] };
                                  setExtendTimeSlots(nextSlots);
                                }}
                                className="whitespace-nowrap"
                              >
                                활동 추가
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setExtendTimeSlots((prev) => [...prev, createTimeSlot('')])}
                      className="whitespace-nowrap"
                    >
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
              </div>
            </div>
          </div>
        </form>
      </Card>
      ) : null}

      {showListSection && editingId ? (
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">블록 후속 연결 수정</h2>
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!regionId || !fromMultiDayBlockId || !toLocationId) {
                return;
              }
              await submit();
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
                          onClick={() => handleRegionSelect(region.id)}
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
                </div>

                <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
                  <label className="grid gap-1 text-sm min-w-0">
                    <span className="text-slate-700">블록</span>
                    <div className="relative">
                      <Input
                        value={blockSearch || (selectedBlock ? (selectedBlock.name || selectedBlock.title) : '')}
                        onFocus={() => setBlockOpen(true)}
                        onBlur={() => setTimeout(() => setBlockOpen(false), 120)}
                        onChange={(event) => {
                          setBlockSearch(event.target.value);
                          setFromMultiDayBlockId('');
                          setBlockOpen(true);
                        }}
                        placeholder="블록 검색 또는 선택"
                        disabled={!regionId}
                      />
                      {blockOpen && regionId ? (
                        <div className="absolute left-0 right-0 top-[44px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                          {filteredBlockOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                          ) : (
                            filteredBlockOptions.map((stay) => (
                              <button
                                key={stay.id}
                                type="button"
                                onClick={() => {
                                  setFromMultiDayBlockId(stay.id);
                                  setBlockSearch(stay.name || stay.title);
                                  setBlockOpen(false);
                                }}
                                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                              >
                                {stay.name || stay.title}
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
                    <span className="text-slate-700">다음 목적지</span>
                    <div className="relative">
                      <Input
                        value={locationSearch || (selectedLocation ? formatLocationNameInline(selectedLocation.name) : '')}
                        onFocus={() => setLocationOpen(true)}
                        onBlur={() => setTimeout(() => setLocationOpen(false), 120)}
                        onChange={(event) => {
                          setLocationSearch(event.target.value);
                          setToLocationId('');
                          setLocationOpen(true);
                        }}
                        placeholder="목적지 검색 또는 선택"
                        disabled={!regionId}
                      />
                      {locationOpen && regionId ? (
                        <div className="absolute left-0 right-0 top-[44px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                          {filteredLocationOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                          ) : (
                            filteredLocationOptions.map((location) => (
                              <button
                                key={location.id}
                                type="button"
                                onClick={() => {
                                  setToLocationId(location.id);
                                  setLocationSearch(formatLocationNameInline(location.name));
                                  setLocationOpen(false);
                                }}
                                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                              >
                                {formatLocationNameInline(location.name)}
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
                    <p className="text-xs text-slate-500">블록과 목적지 사이의 평균 이동 거리와 시간입니다.</p>
                  </div>
                  <div className="grid gap-3">
                    <label className="grid gap-1 text-sm">
                      <span className="text-slate-700">평균 이동시간(시간)</span>
                      <Input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={averageTravelHours}
                        onChange={(event) => setAverageTravelHours(event.target.value)}
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
                        value={averageDistanceKm}
                        onChange={(event) => setAverageDistanceKm(event.target.value)}
                        inputMode="decimal"
                        placeholder="예: 120.5"
                      />
                    </label>
                  </div>
                  <div className="text-sm text-slate-600">이동강도: {movementIntensityMeta ? movementIntensityMeta.label : '시간 입력 필요'}</div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={isLongDistance}
                      onChange={(event) => setIsLongDistance(event.target.checked)}
                    />
                    장거리 여행
                    <span className="text-xs text-slate-500">비용 추가 관련 존재, 정확한 기재 바람.</span>
                  </label>
                </div>

                <div>
                  <Button type="submit" variant="primary" disabled={!regionId || !fromMultiDayBlockId || !toLocationId || updating}>
                    {updating ? '저장 중...' : '저장'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} className="ml-2">
                    취소
                  </Button>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="grid items-start gap-6 xl:grid-cols-2">
                  <div className="grid gap-3 self-start rounded-2xl border border-slate-200 p-4">
                    <div className="grid gap-1">
                      <h3 className="text-sm font-semibold text-slate-800">기본 일정</h3>
                      <p className="text-xs text-slate-500">기본 연결의 시간/일정입니다.</p>
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
                            value={timeSlotsPasteHelper.timeCellText}
                            onChange={(event) => setTimeSlotsPasteHelper((prev) => ({ ...prev, timeCellText: event.target.value }))}
                            rows={8}
                            className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                            placeholder={TIME_SLOT_PASTE_HELPER_PLACEHOLDER.timeCellText}
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          <span className="text-slate-700">일정</span>
                          <textarea
                            value={timeSlotsPasteHelper.scheduleCellText}
                            onChange={(event) => setTimeSlotsPasteHelper((prev) => ({ ...prev, scheduleCellText: event.target.value }))}
                            rows={8}
                            className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                            placeholder={TIME_SLOT_PASTE_HELPER_PLACEHOLDER.scheduleCellText}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-slate-500">시간 칸의 `-`는 바로 위 시간에 이어지는 일정으로 인식됩니다.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            const parsed = parseTimeSlots(timeSlotsPasteHelper.timeCellText, timeSlotsPasteHelper.scheduleCellText);
                            if (parsed.length > 0) {
                              setTimeSlots(parsed);
                            }
                          }}
                          className="whitespace-nowrap"
                        >
                          붙여넣기 적용
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setTimeSlotsPasteHelper(createEmptyPasteHelperValue())}
                          className="whitespace-nowrap"
                        >
                          입력 비우기
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-4">
                      {timeSlots.map((slot, slotIndex) => (
                        <div key={slotIndex} className="grid gap-2">
                          <div className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[max-content_minmax(0,1fr)]">
                            <div className="grid gap-2 md:content-start">
                              <div className="flex h-10 items-center">
                                <h4 className="text-sm font-semibold text-slate-800">출발 시간</h4>
                              </div>
                              <Input
                                className="w-[110px] border-slate-500 text-lg font-semibold"
                                value={slot.startTime}
                                onChange={(event) =>
                                  setTimeSlots((prev) => prev.map((item, itemIndex) => (itemIndex === slotIndex ? { ...item, startTime: event.target.value } : item)))
                                }
                                placeholder="HH:mm"
                              />
                            </div>
                            <div className="grid min-w-0 gap-2">
                              <div className="flex h-10 items-center justify-between gap-2">
                                <h4 className="text-sm font-semibold text-slate-800">일정</h4>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setTimeSlots((prev) => prev.filter((_, i) => i !== slotIndex))}
                                  disabled={timeSlots.length <= 1}
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
                                      onChange={(event) => {
                                        const nextSlots = [...timeSlots];
                                        const slot = nextSlots[slotIndex];
                                        if (!slot) return;
                                        const nextActivities = [...slot.activities];
                                        nextActivities[activityIndex] = event.target.value;
                                        nextSlots[slotIndex] = { ...slot, activities: nextActivities };
                                        setTimeSlots(nextSlots);
                                      }}
                                      placeholder="활동 입력"
                                    />
                                    {slot.activities.length > 1 ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          const nextSlots = [...timeSlots];
                                          const slot = nextSlots[slotIndex];
                                          if (!slot) return;
                                          nextSlots[slotIndex] = {
                                            ...slot,
                                            activities: slot.activities.filter((_, i) => i !== activityIndex),
                                          };
                                          setTimeSlots(nextSlots);
                                        }}
                                        className="whitespace-nowrap"
                                      >
                                        X
                                      </Button>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                              <div className="overflow-x-auto">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    const nextSlots = [...timeSlots];
                                    const slot = nextSlots[slotIndex];
                                    if (!slot) return;
                                    nextSlots[slotIndex] = { ...slot, activities: [...slot.activities, ''] };
                                    setTimeSlots(nextSlots);
                                  }}
                                  className="whitespace-nowrap"
                                >
                                  활동 추가
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTimeSlots((prev) => [...prev, createTimeSlot('')])}
                        className="whitespace-nowrap"
                      >
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

                  <div className="grid gap-3 self-start rounded-2xl border border-slate-200 p-4">
                    <div className="grid gap-1">
                      <h3 className="text-sm font-semibold text-slate-800">마지막날 연장 일정</h3>
                      <p className="text-xs text-slate-500">마지막날 연장 조건의 연결 일정입니다.</p>
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
                            value={extendTimeSlotsPasteHelper.timeCellText}
                            onChange={(event) => setExtendTimeSlotsPasteHelper((prev) => ({ ...prev, timeCellText: event.target.value }))}
                            rows={8}
                            className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                            placeholder={TIME_SLOT_PASTE_HELPER_PLACEHOLDER.timeCellText}
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          <span className="text-slate-700">일정</span>
                          <textarea
                            value={extendTimeSlotsPasteHelper.scheduleCellText}
                            onChange={(event) => setExtendTimeSlotsPasteHelper((prev) => ({ ...prev, scheduleCellText: event.target.value }))}
                            rows={8}
                            className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                            placeholder={TIME_SLOT_PASTE_HELPER_PLACEHOLDER.scheduleCellText}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-slate-500">시간 칸의 `-`는 바로 위 시간에 이어지는 일정으로 인식됩니다.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            const parsed = parseTimeSlots(extendTimeSlotsPasteHelper.timeCellText, extendTimeSlotsPasteHelper.scheduleCellText);
                            if (parsed.length > 0) {
                              setExtendTimeSlots(parsed);
                            }
                          }}
                          className="whitespace-nowrap"
                        >
                          붙여넣기 적용
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setExtendTimeSlotsPasteHelper(createEmptyPasteHelperValue())}
                          className="whitespace-nowrap"
                        >
                          입력 비우기
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-4">
                      {extendTimeSlots.map((slot, slotIndex) => (
                        <div key={slotIndex} className="grid gap-2">
                          <div className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[max-content_minmax(0,1fr)]">
                            <div className="grid gap-2 md:content-start">
                              <div className="flex h-10 items-center">
                                <h4 className="text-sm font-semibold text-slate-800">출발 시간</h4>
                              </div>
                              <Input
                                className="w-[110px] border-slate-500 text-lg font-semibold"
                                value={slot.startTime}
                                onChange={(event) =>
                                  setExtendTimeSlots((prev) => prev.map((item, itemIndex) => (itemIndex === slotIndex ? { ...item, startTime: event.target.value } : item)))
                                }
                                placeholder="HH:mm"
                              />
                            </div>
                            <div className="grid min-w-0 gap-2">
                              <div className="flex h-10 items-center justify-between gap-2">
                                <h4 className="text-sm font-semibold text-slate-800">일정</h4>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setExtendTimeSlots((prev) => prev.filter((_, i) => i !== slotIndex))}
                                  disabled={extendTimeSlots.length <= 1}
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
                                      onChange={(event) => {
                                        const nextSlots = [...extendTimeSlots];
                                        const slot = nextSlots[slotIndex];
                                        if (!slot) return;
                                        const nextActivities = [...slot.activities];
                                        nextActivities[activityIndex] = event.target.value;
                                        nextSlots[slotIndex] = { ...slot, activities: nextActivities };
                                        setExtendTimeSlots(nextSlots);
                                      }}
                                      placeholder="활동 입력"
                                    />
                                    {slot.activities.length > 1 ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          const nextSlots = [...extendTimeSlots];
                                          const slot = nextSlots[slotIndex];
                                          if (!slot) return;
                                          nextSlots[slotIndex] = {
                                            ...slot,
                                            activities: slot.activities.filter((_, i) => i !== activityIndex),
                                          };
                                          setExtendTimeSlots(nextSlots);
                                        }}
                                        className="whitespace-nowrap"
                                      >
                                        X
                                      </Button>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                              <div className="overflow-x-auto">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    const nextSlots = [...extendTimeSlots];
                                    const slot = nextSlots[slotIndex];
                                    if (!slot) return;
                                    nextSlots[slotIndex] = { ...slot, activities: [...slot.activities, ''] };
                                    setExtendTimeSlots(nextSlots);
                                  }}
                                  className="whitespace-nowrap"
                                >
                                  활동 추가
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setExtendTimeSlots((prev) => [...prev, createTimeSlot('')])}
                        className="whitespace-nowrap"
                      >
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
                </div>
              </div>
            </div>
          </form>
        </Card>
      ) : null}

      {showListSection ? (
      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="grid gap-3">
            <h2 className="text-lg font-semibold tracking-tight">블록 후속 연결 목록</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant={selectedRegion === 'ALL' ? 'default' : 'outline'} onClick={() => setSelectedRegion('ALL')}>
                전체
              </Button>
              {regionNames.map((regionName) => (
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
          </div>
        </div>
        <div className="overflow-auto">
          <Table className="min-w-[1500px] w-full">
            <thead>
              <tr>
                <Th>지역</Th>
                <Th>블록</Th>
                <Th>다음 목적지</Th>
                <Th>평균거리(km)</Th>
                <Th>평균 이동 시간(시간)</Th>
                <Th>이동강도</Th>
                <Th>기본 시간 / 일정</Th>
                <Th>연장 시간 / 일정</Th>
                <Th>장거리</Th>
                <Th>액션</Th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const region = regions.find((r) => r.id === row.regionId);
                const scheduleLines = buildScheduleLines(row.scheduleTimeBlocks);
                const extendScheduleLines = buildScheduleLines(row.extendScheduleTimeBlocks);

                return (
                  <tr key={row.id} className="align-top">
                    <Td>{region?.name ?? '-'}</Td>
                    <Td>{stayById.get(row.fromMultiDayBlockId)?.name ?? stayById.get(row.fromMultiDayBlockId)?.title ?? row.fromMultiDayBlockId}</Td>
                    <Td>{formatLocationNameInline(locationById.get(row.toLocationId)?.name ?? [row.toLocationId])}</Td>
                    <Td>{row.averageDistanceKm}</Td>
                    <Td>{row.averageTravelHours}</Td>
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
                    <Td className="min-w-[280px]">
                      {scheduleLines.length > 0 ? (
                        <div className="grid gap-1 text-sm">
                          {scheduleLines.map((line, index) => (
                            <div key={`${row.id}-basic-${index}`} className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
                              <span className="font-medium text-slate-700">{line.time}</span>
                              <span className="whitespace-pre-wrap text-slate-600">{line.activity}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400">-</div>
                      )}
                    </Td>
                    <Td className="min-w-[280px]">
                      {extendScheduleLines.length > 0 ? (
                        <div className="grid gap-1 text-sm">
                          {extendScheduleLines.map((line, index) => (
                            <div key={`${row.id}-extend-${index}`} className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
                              <span className="font-medium text-slate-700">{line.time}</span>
                              <span className="whitespace-pre-wrap text-slate-600">{line.activity}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400">-</div>
                      )}
                    </Td>
                    <Td>{row.isLongDistance ? 'Y' : 'N'}</Td>
                    <Td>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingId(row.id);
                            setRegionId(row.regionId);
                            setFromMultiDayBlockId(row.fromMultiDayBlockId);
                            setToLocationId(row.toLocationId);
                            setAverageDistanceKm(String(row.averageDistanceKm));
                            setAverageTravelHours(String(row.averageTravelHours));
                            setIsLongDistance(row.isLongDistance);
                            setTimeSlots(
                              row.scheduleTimeBlocks.map((slot) => ({
                                startTime: slot.startTime,
                                activities: slot.activities.map((activity) => activity.description).length > 0
                                  ? slot.activities.map((activity) => activity.description)
                                  : [''],
                              })),
                            );
                            setExtendTimeSlots(
                              row.extendScheduleTimeBlocks.map((slot) => ({
                                startTime: slot.startTime,
                                activities: slot.activities.map((activity) => activity.description).length > 0
                                  ? slot.activities.map((activity) => activity.description)
                                  : [''],
                              })),
                            );
                            setBlockSearch(stayById.get(row.fromMultiDayBlockId)?.name || stayById.get(row.fromMultiDayBlockId)?.title || '');
                            setLocationSearch(formatLocationNameInline(locationById.get(row.toLocationId)?.name ?? []));
                          }}
                        >
                          수정
                        </Button>
                        <Button
                          variant="outline"
                          disabled={deleting}
                          onClick={async () => {
                            if (!window.confirm('블록 후속 연결을 삭제할까요?')) {
                              return;
                            }
                            await deleteMutation({ variables: { id: row.id } });
                            await refetch();
                            if (editingId === row.id) {
                              resetForm();
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
        </div>
      </Card>
      ) : null}
    </section>
  );
}
