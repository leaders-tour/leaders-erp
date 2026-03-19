import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
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
  activitiesText: string;
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

function createTimeSlot(startTime: string): TimeSlotDraft {
  return {
    startTime,
    activitiesText: '',
  };
}

function toTimeSlots(value: TimeSlotDraft[]) {
  return value.map((slot) => ({
    startTime: slot.startTime,
    activities: slot.activitiesText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean),
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

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData, refetch } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const { data: stayData } = useQuery<{ multiDayBlocks: MultiDayBlockRow[] }>(MULTI_DAY_BLOCKS_QUERY);
  const { data: connectionData } = useQuery<{ multiDayBlockConnections: ConnectionRow[] }>(MULTI_DAY_BLOCK_CONNECTIONS_QUERY);
  const [createMutation, { loading: creating }] = useMutation(CREATE_MUTATION);
  const [updateMutation, { loading: updating }] = useMutation(UPDATE_MUTATION);
  const [deleteMutation, { loading: deleting }] = useMutation(DELETE_MUTATION);

  const regions = regionData?.regions ?? [];
  const locations = locationData?.locations ?? [];
  const multiDayBlocks = stayData?.multiDayBlocks ?? [];
  const rows = connectionData?.multiDayBlockConnections ?? [];
  const filteredStays = useMemo(() => multiDayBlocks.filter((stay) => stay.regionId === regionId), [multiDayBlocks, regionId]);
  const filteredLocations = useMemo(() => locations.filter((location) => location.regionId === regionId), [locations, regionId]);
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const stayById = useMemo(() => new Map(multiDayBlocks.map((stay) => [stay.id, stay])), [multiDayBlocks]);
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

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
        <p className="mt-1 text-sm text-slate-600">{pageDescription}</p>
      </header>

      <MultiDayBlockSubNav pathname={mode === 'create' ? '/multi-day-blocks/connections/create' : mode === 'list' ? '/multi-day-blocks/connections/list' : '/multi-day-blocks/connections'} />

      {showCreateSection ? (
      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid items-start gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
              <div className="grid gap-2 text-sm">
                <span>지역</span>
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
              </div>
              <div className="grid gap-2 text-sm">
                <span>블록</span>
                <select value={fromMultiDayBlockId} onChange={(event) => setFromMultiDayBlockId(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2">
                  <option value="">블록 선택</option>
                  {filteredStays.map((stay) => (
                    <option key={stay.id} value={stay.id}>
                      {stay.name || stay.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 text-sm">
                <span>다음 목적지</span>
                <select value={toLocationId} onChange={(event) => setToLocationId(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2">
                  <option value="">목적지 선택</option>
                  {filteredLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {formatLocationNameInline(location.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-1 rounded-2xl border border-slate-200 p-4 text-sm">
                <span>거리(km)</span>
                <input value={averageDistanceKm} onChange={(event) => setAverageDistanceKm(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 rounded-2xl border border-slate-200 p-4 text-sm">
                <span>시간(h)</span>
                <input value={averageTravelHours} onChange={(event) => setAverageTravelHours(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-medium text-slate-900">자동 계산 이동강도</span>
              <span className="ml-2">
                {movementIntensityMeta ? (
                  <span
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: movementIntensityMeta.backgroundColor,
                      borderColor: movementIntensityMeta.borderColor,
                      color: movementIntensityMeta.textColor,
                    }}
                  >
                    {movementIntensityMeta.label}
                  </span>
                ) : (
                  '-'
                )}
              </span>
            </div>

            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-4 text-sm">
              <input type="checkbox" checked={isLongDistance} onChange={(event) => setIsLongDistance(event.target.checked)} />
              장거리
            </label>

            <div className="flex gap-2">
              <Button disabled={!regionId || !fromMultiDayBlockId || !toLocationId || creating || updating} onClick={submit}>
                {editingId ? (updating ? '저장 중...' : '저장') : creating ? '생성 중...' : '블록 후속 연결 생성'}
              </Button>
              {editingId ? (
                <Button variant="outline" onClick={resetForm}>
                  취소
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <div className="grid gap-2">
              <span className="text-sm font-medium">기본 일정 슬롯</span>
              {timeSlots.map((slot, index) => (
                <div key={`basic-${index}`} className="grid gap-2 rounded-2xl border border-slate-200 p-3">
                  <input
                    value={slot.startTime}
                    onChange={(event) =>
                      setTimeSlots((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, startTime: event.target.value } : item)))
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <textarea
                    rows={4}
                    value={slot.activitiesText}
                    onChange={(event) =>
                      setTimeSlots((prev) =>
                        prev.map((item, itemIndex) => (itemIndex === index ? { ...item, activitiesText: event.target.value } : item)),
                      )
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="한 줄에 하나씩 활동 입력"
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <span className="text-sm font-medium">마지막날 연장 슬롯</span>
              {extendTimeSlots.map((slot, index) => (
                <div key={`extend-${index}`} className="grid gap-2 rounded-2xl border border-slate-200 p-3">
                  <input
                    value={slot.startTime}
                    onChange={(event) =>
                      setExtendTimeSlots((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, startTime: event.target.value } : item)))
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <textarea
                    rows={4}
                    value={slot.activitiesText}
                    onChange={(event) =>
                      setExtendTimeSlots((prev) =>
                        prev.map((item, itemIndex) => (itemIndex === index ? { ...item, activitiesText: event.target.value } : item)),
                      )
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="한 줄에 하나씩 활동 입력"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      ) : null}

      {showListSection ? (
      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="overflow-auto">
          <Table className="min-w-[1240px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <Th>블록</Th>
                <Th>다음 목적지</Th>
                <Th>거리/시간</Th>
                <Th>이동강도</Th>
                <Th>기본 일정</Th>
                <Th>연장 일정</Th>
                <Th>연장 가능</Th>
                <Th>관리</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const scheduleLines = buildScheduleLines(row.scheduleTimeBlocks);
                const extendScheduleLines = buildScheduleLines(row.extendScheduleTimeBlocks);

                return (
                <tr key={row.id} className="border-t border-slate-200">
                  <Td>{stayById.get(row.fromMultiDayBlockId)?.name ?? stayById.get(row.fromMultiDayBlockId)?.title ?? row.fromMultiDayBlockId}</Td>
                  <Td>{formatLocationNameInline(locationById.get(row.toLocationId)?.name ?? [row.toLocationId])}</Td>
                  <Td>{row.averageDistanceKm}km / {row.averageTravelHours}h</Td>
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
                          <div key={`${row.id}-basic-${index}`} className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
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
                    {extendScheduleLines.length > 0 ? (
                      <div className="grid gap-1 text-sm">
                        {extendScheduleLines.map((line, index) => (
                          <div key={`${row.id}-extend-${index}`} className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
                            <span className="font-medium text-slate-700">{line.time}</span>
                            <span className="whitespace-pre-wrap text-slate-600">{line.activity}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400">-</div>
                    )}
                  </Td>
                  <Td>{row.extendScheduleTimeBlocks.length > 0 ? 'Y' : 'N'}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-blue-700 hover:underline"
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
                              activitiesText: slot.activities.map((activity) => activity.description).join('\n'),
                            })),
                          );
                          setExtendTimeSlots(
                            row.extendScheduleTimeBlocks.map((slot) => ({
                              startTime: slot.startTime,
                              activitiesText: slot.activities.map((activity) => activity.description).join('\n'),
                            })),
                          );
                        }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
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
                        disabled={deleting}
                      >
                        삭제
                      </button>
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
