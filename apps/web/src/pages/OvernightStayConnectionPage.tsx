import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import {
  calculateMovementIntensityByHours,
  getMovementIntensityMeta,
} from '../features/estimate/model/movement-intensity';
import { formatLocationNameInline } from '../features/location/display';
import { LocationSubNav } from '../features/location/sub-nav';

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

interface OvernightStayRow {
  id: string;
  regionId: string;
  name: string;
  title: string;
}

interface ConnectionRow {
  id: string;
  regionId: string;
  fromOvernightStayId: string;
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

const OVERNIGHT_STAYS_QUERY = gql`
  query OvernightStayConnectionStays {
    overnightStays {
      id
      regionId
      name
      title
    }
  }
`;

const OVERNIGHT_STAY_CONNECTIONS_QUERY = gql`
  query OvernightStayConnectionList {
    overnightStayConnections {
      id
      regionId
      fromOvernightStayId
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
  mutation CreateOvernightStayConnectionPage($input: OvernightStayConnectionCreateInput!) {
    createOvernightStayConnection(input: $input) {
      id
    }
  }
`;

const UPDATE_MUTATION = gql`
  mutation UpdateOvernightStayConnectionPage($id: ID!, $input: OvernightStayConnectionUpdateInput!) {
    updateOvernightStayConnection(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_MUTATION = gql`
  mutation DeleteOvernightStayConnectionPage($id: ID!) {
    deleteOvernightStayConnection(id: $id)
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

export function OvernightStayConnectionPage(): JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [regionId, setRegionId] = useState('');
  const [fromOvernightStayId, setFromOvernightStayId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [averageDistanceKm, setAverageDistanceKm] = useState('0');
  const [averageTravelHours, setAverageTravelHours] = useState('0');
  const [isLongDistance, setIsLongDistance] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlotDraft[]>([createTimeSlot('08:00')]);
  const [extendTimeSlots, setExtendTimeSlots] = useState<TimeSlotDraft[]>([createTimeSlot('18:00')]);

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData, refetch } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const { data: stayData } = useQuery<{ overnightStays: OvernightStayRow[] }>(OVERNIGHT_STAYS_QUERY);
  const { data: connectionData } = useQuery<{ overnightStayConnections: ConnectionRow[] }>(OVERNIGHT_STAY_CONNECTIONS_QUERY);
  const [createMutation, { loading: creating }] = useMutation(CREATE_MUTATION);
  const [updateMutation, { loading: updating }] = useMutation(UPDATE_MUTATION);
  const [deleteMutation, { loading: deleting }] = useMutation(DELETE_MUTATION);

  const regions = regionData?.regions ?? [];
  const locations = locationData?.locations ?? [];
  const overnightStays = stayData?.overnightStays ?? [];
  const rows = connectionData?.overnightStayConnections ?? [];
  const filteredStays = useMemo(() => overnightStays.filter((stay) => stay.regionId === regionId), [overnightStays, regionId]);
  const filteredLocations = useMemo(() => locations.filter((location) => location.regionId === regionId), [locations, regionId]);
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const stayById = useMemo(() => new Map(overnightStays.map((stay) => [stay.id, stay])), [overnightStays]);
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
    setFromOvernightStayId('');
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
      fromOvernightStayId,
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
    setFromOvernightStayId('');
    setToLocationId('');
  };

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">연박 연결</h1>
        <p className="mt-1 text-sm text-slate-600">연박 이후에 갈 수 있는 목적지 연결을 관리합니다.</p>
      </header>

      <LocationSubNav pathname="/locations/stays/connections" />

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3">
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
            <span>연박</span>
            <select value={fromOvernightStayId} onChange={(event) => setFromOvernightStayId(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2">
              <option value="">연박 선택</option>
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span>거리(km)</span>
              <input value={averageDistanceKm} onChange={(event) => setAverageDistanceKm(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm">
              <span>시간(h)</span>
              <input value={averageTravelHours} onChange={(event) => setAverageTravelHours(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isLongDistance} onChange={(event) => setIsLongDistance(event.target.checked)} />
              장거리
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

          <div className="flex gap-2">
            <Button disabled={!regionId || !fromOvernightStayId || !toLocationId || creating || updating} onClick={submit}>
              {editingId ? (updating ? '저장 중...' : '저장') : creating ? '생성 중...' : '연박 연결 생성'}
            </Button>
            {editingId ? (
              <Button variant="outline" onClick={resetForm}>
                취소
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="overflow-auto">
          <Table className="min-w-[860px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <Th>연박</Th>
                <Th>다음 목적지</Th>
                <Th>거리/시간</Th>
                <Th>이동강도</Th>
                <Th>연장 가능</Th>
                <Th>관리</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <Td>{stayById.get(row.fromOvernightStayId)?.name ?? stayById.get(row.fromOvernightStayId)?.title ?? row.fromOvernightStayId}</Td>
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
                  <Td>{row.extendScheduleTimeBlocks.length > 0 ? 'Y' : 'N'}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-blue-700 hover:underline"
                        onClick={() => {
                          setEditingId(row.id);
                          setRegionId(row.regionId);
                          setFromOvernightStayId(row.fromOvernightStayId);
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
                          if (!window.confirm('연박 연결을 삭제할까요?')) {
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
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </section>
  );
}
