import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, Input } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  calculateMovementIntensityByHours,
  getMovementIntensityMeta,
} from '../features/estimate/model/movement-intensity';
import { formatLocationNameInline } from '../features/location/display';
import { LocationSubNav } from '../features/location/sub-nav';
import {
  OvernightStayDaySlotEditor,
  createOvernightStayScheduleSlot,
  parseOvernightStayScheduleSlots,
  serializeOvernightStayScheduleSlots,
  type OvernightStayScheduleSlotInput,
} from '../features/overnight-stay/day-slot-editor';

interface RegionRow {
  id: string;
  name: string;
}

interface LocationRow {
  id: string;
  regionId: string;
  name: string[];
}

interface OvernightStayRow {
  id: string;
  regionId: string;
  locationId: string;
  name: string;
  title: string;
  sortOrder: number;
  isActive: boolean;
  days: Array<{
    id: string;
    dayOrder: number;
    averageDistanceKm: number;
    averageTravelHours: number;
    timeCellText: string;
    scheduleCellText: string;
    lodgingCellText: string;
    mealCellText: string;
  }>;
}

interface OvernightStayDayDraft {
  dayOrder: number;
  averageDistanceKm: string;
  averageTravelHours: string;
  scheduleSlots: OvernightStayScheduleSlotInput[];
  lodgingCellText: string;
  mealCellText: string;
}

const REGIONS_QUERY = gql`
  query OvernightStayDetailRegions {
    regions {
      id
      name
    }
  }
`;

const LOCATIONS_QUERY = gql`
  query OvernightStayDetailLocations {
    locations {
      id
      regionId
      name
    }
  }
`;

const OVERNIGHT_STAY_QUERY = gql`
  query OvernightStayDetailPage($id: ID!) {
    overnightStay(id: $id) {
      id
      regionId
      locationId
      name
      title
      sortOrder
      isActive
      days {
        id
        dayOrder
        averageDistanceKm
        averageTravelHours
        timeCellText
        scheduleCellText
        lodgingCellText
        mealCellText
      }
    }
  }
`;

const UPDATE_OVERNIGHT_STAY_MUTATION = gql`
  mutation UpdateOvernightStayPage($id: ID!, $input: OvernightStayUpdateInput!) {
    updateOvernightStay(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_OVERNIGHT_STAY_MUTATION = gql`
  mutation DeleteOvernightStayPage($id: ID!) {
    deleteOvernightStay(id: $id)
  }
`;

function createDayDraft(dayOrder: number): OvernightStayDayDraft {
  return {
    dayOrder,
    averageDistanceKm: '0',
    averageTravelHours: '0',
    scheduleSlots: [createOvernightStayScheduleSlot()],
    lodgingCellText: '',
    mealCellText: '',
  };
}

export function OvernightStayDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { stayId } = useParams<{ stayId: string }>();
  const [regionId, setRegionId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [days, setDays] = useState<OvernightStayDayDraft[]>([createDayDraft(1), createDayDraft(2)]);

  const { data: regionData } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const { data, loading, refetch } = useQuery<{ overnightStay: OvernightStayRow | null }>(OVERNIGHT_STAY_QUERY, {
    variables: { id: stayId },
    skip: !stayId,
  });
  const [updateOvernightStay, { loading: updating }] = useMutation(UPDATE_OVERNIGHT_STAY_MUTATION);
  const [deleteOvernightStay, { loading: deleting }] = useMutation(DELETE_OVERNIGHT_STAY_MUTATION);

  const regions = regionData?.regions ?? [];
  const locations = locationData?.locations ?? [];
  const overnightStay = data?.overnightStay ?? null;
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const filteredLocations = useMemo(() => locations.filter((location) => location.regionId === regionId), [locations, regionId]);
  const selectableLocations = regionId ? filteredLocations : locations;
  const selectedLocation = locationId ? locationById.get(locationId) ?? null : null;

  useEffect(() => {
    if (!overnightStay) {
      return;
    }
    setRegionId(overnightStay.regionId);
    setLocationId(overnightStay.locationId);
    setName(overnightStay.name);
    setSortOrder(String(overnightStay.sortOrder));
    setIsActive(overnightStay.isActive);
    setDays(
      overnightStay.days
        .slice()
        .sort((left, right) => left.dayOrder - right.dayOrder)
        .map((day) => {
          return {
            dayOrder: day.dayOrder,
            averageDistanceKm: String(day?.averageDistanceKm ?? 0),
            averageTravelHours: String(day?.averageTravelHours ?? 0),
            scheduleSlots: parseOvernightStayScheduleSlots(day?.timeCellText ?? '', day?.scheduleCellText ?? ''),
            lodgingCellText: day?.lodgingCellText ?? '',
            mealCellText: day?.mealCellText ?? '',
          };
        }),
    );
  }, [overnightStay]);

  const updateDay = (dayOrder: number, field: keyof OvernightStayDayDraft, value: OvernightStayDayDraft[keyof OvernightStayDayDraft]) => {
    setDays((prev) => prev.map((day) => (day.dayOrder === dayOrder ? { ...day, [field]: value } : day)));
  };

  const addThirdDay = () => {
    setDays((prev) => (prev.length >= 3 ? prev : [...prev, createDayDraft(3)]));
  };

  const removeThirdDay = () => {
    setDays((prev) => prev.filter((day) => day.dayOrder !== 3));
  };

  const handleRegionChange = (nextRegionId: string) => {
    setRegionId(nextRegionId);
    if (!locationId) {
      return;
    }
    const currentLocation = locationById.get(locationId);
    if (currentLocation && currentLocation.regionId !== nextRegionId) {
      setLocationId('');
    }
  };

  const handleLocationChange = (nextLocationId: string) => {
    setLocationId(nextLocationId);
    const nextLocation = locationById.get(nextLocationId);
    if (nextLocation) {
      setRegionId(nextLocation.regionId);
    }
  };

  if (!stayId) {
    return <section className="py-8 text-sm text-slate-600">잘못된 접근입니다.</section>;
  }

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (!overnightStay) {
    return <section className="py-8 text-sm text-slate-600">연박을 찾을 수 없습니다.</section>;
  }

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{name || overnightStay.title}</h1>
          <p className="mt-1 text-sm text-slate-600">연박 일차별 데이터를 수정합니다.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/locations/stays')}>
          목록으로
        </Button>
      </header>

      <LocationSubNav pathname={`/locations/stays/${stayId}`} />

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-5">
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_160px_auto] lg:items-end">
            <label className="grid gap-1 text-sm lg:col-span-2">
              <span className="font-medium text-slate-900">연박 이름</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 테를지 3일 확장" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-900">지역</span>
              <select
                value={regionId}
                onChange={(event) => handleRegionChange(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <option value="">전체 지역</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-900">목적지</span>
              <select
                value={locationId}
                onChange={(event) => handleLocationChange(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <option value="">기존 목적지에서 선택</option>
                {selectableLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {formatLocationNameInline(location.name)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-900">정렬 순서</span>
              <Input type="number" min={0} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
            </label>

            <label className="flex h-10 items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              활성
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <span className="font-medium text-slate-900">선택된 목적지</span>
            <span className="ml-2">{selectedLocation ? formatLocationNameInline(selectedLocation.name) : '아직 선택되지 않았습니다.'}</span>
          </div>

          <div className="flex items-center gap-2">
            {days.length < 3 ? (
              <Button variant="outline" onClick={addThirdDay}>
                3일차 추가
              </Button>
            ) : (
              <Button variant="outline" onClick={removeThirdDay}>
                3일차 제거
              </Button>
            )}
            <span className="text-xs text-slate-500">연박은 2일 또는 3일까지 설정할 수 있습니다.</span>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {days
              .slice()
              .sort((left, right) => left.dayOrder - right.dayOrder)
              .map((day) => (
                <div key={day.dayOrder} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <h2 className="font-medium text-slate-900">{day.dayOrder}일차</h2>
                    <p className="mt-1 text-xs text-slate-500">연결 화면과 같은 카드 구조로 연박 전용 데이터만 수정합니다.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      <span>이동거리(km)</span>
                      <Input
                        type="number"
                        min={0}
                        value={day.averageDistanceKm}
                        onChange={(event) => updateDay(day.dayOrder, 'averageDistanceKm', event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span>이동시간(시간)</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        value={day.averageTravelHours}
                        onChange={(event) => updateDay(day.dayOrder, 'averageTravelHours', event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">자동 계산 이동강도</span>
                    <span className="ml-2">
                      {(() => {
                        const hours = Number(day.averageTravelHours);
                        if (!Number.isFinite(hours) || hours < 0) {
                          return '-';
                        }
                        const meta = getMovementIntensityMeta(calculateMovementIntensityByHours(hours));
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
                    </span>
                  </div>

                  <OvernightStayDaySlotEditor
                    title="시간 / 일정"
                    description="시작시간을 추가하고 각 시간대별 활동을 입력합니다."
                    value={day.scheduleSlots}
                    onChange={(nextValue) => updateDay(day.dayOrder, 'scheduleSlots', nextValue)}
                  />

                  <div className="grid gap-3">
                    <label className="grid gap-1 text-sm">
                      <span>숙소</span>
                      <textarea
                        rows={4}
                        value={day.lodgingCellText}
                        onChange={(event) => updateDay(day.dayOrder, 'lodgingCellText', event.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span>식사</span>
                      <textarea
                        rows={4}
                        value={day.mealCellText}
                        onChange={(event) => updateDay(day.dayOrder, 'mealCellText', event.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                  </div>
                </div>
              ))}
          </div>

          <div className="flex gap-2">
            <Button
              disabled={!regionId || !locationId || !name.trim() || updating}
              onClick={async () => {
                await updateOvernightStay({
                  variables: {
                    id: stayId,
                    input: {
                      regionId,
                      locationId,
                      name: name.trim(),
                      sortOrder: Number(sortOrder) || 0,
                      isActive,
                      days: days
                        .slice()
                        .sort((left, right) => left.dayOrder - right.dayOrder)
                        .map((day) => {
                          const { timeCellText, scheduleCellText } = serializeOvernightStayScheduleSlots(day.scheduleSlots);
                          return {
                            dayOrder: day.dayOrder,
                            averageDistanceKm: Number(day.averageDistanceKm) || 0,
                            averageTravelHours: Number(day.averageTravelHours) || 0,
                            timeCellText,
                            scheduleCellText,
                            lodgingCellText: day.lodgingCellText,
                            mealCellText: day.mealCellText,
                          };
                        }),
                    },
                  },
                });
                await refetch();
              }}
            >
              {updating ? '저장 중...' : '저장'}
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!window.confirm('이 연박을 삭제할까요?')) {
                  return;
                }
                await deleteOvernightStay({ variables: { id: stayId } });
                navigate('/locations/stays');
              }}
            >
              {deleting ? '삭제 중...' : '삭제'}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
