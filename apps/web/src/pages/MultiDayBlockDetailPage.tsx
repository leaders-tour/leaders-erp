import { gql, useQuery } from '@apollo/client';
import { Button, Card } from '@tour/ui';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  calculateMovementIntensityByHours,
  getMovementIntensityMeta,
} from '../features/estimate/model/movement-intensity';
import { formatLocationNameInline } from '../features/location/display';
import { formatMultiDayBlockRegionSummary, getMultiDayBlockRegionEntries } from '../features/multi-day-block/region-summary';
import { RegionNameChip } from '../features/region/region-name-chip';
import { ScheduleCopyColumnButtons } from '../components/ScheduleCopyColumnButtons';
import { MultiDayBlockEditPanel } from '../features/multi-day-block/multi-day-block-edit-panel';
import { MultiDayBlockSubNav } from '../features/multi-day-block/sub-nav';

interface LocationRow {
  id: string;
  regionId: string;
  regionName: string;
  name: string[];
}

interface MultiDayBlockRow {
  id: string;
  regionId: string;
  regionIds: string[];
  locationId: string;
  name: string;
  title: string;
  isNightTrain: boolean;
  sortOrder: number;
  isActive: boolean;
  days: Array<{
    id: string;
    dayOrder: number;
    displayLocationId?: string;
    averageDistanceKm: number;
    averageTravelHours: number;
    timeCellText: string;
    scheduleCellText: string;
    lodgingCellText: string;
    mealCellText: string;
  }>;
}

const LOCATIONS_QUERY = gql`
  query OvernightStayDetailLocations {
    locations {
      id
      regionId
      regionName
      name
    }
  }
`;

const MULTI_DAY_BLOCK_QUERY = gql`
  query MultiDayBlockDetailPage($id: ID!) {
    multiDayBlock(id: $id) {
      id
      regionId
      regionIds
      locationId
      name
      title
      isNightTrain
      sortOrder
      isActive
      days {
        id
        dayOrder
        displayLocationId
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

function buildScheduleLines(timeCellText: string, scheduleCellText: string): Array<{ time: string; activity: string }> {
  const timeLines = timeCellText.split('\n');
  const scheduleLines = scheduleCellText.split('\n');
  const lineCount = Math.max(timeLines.length, scheduleLines.length);
  const lines: Array<{ time: string; activity: string }> = [];

  for (let index = 0; index < lineCount; index += 1) {
    const time = timeLines[index]?.trim() ?? '';
    const activity = scheduleLines[index]?.trim() ?? '';

    if (!time && !activity) {
      continue;
    }

    lines.push({
      time: time || '-',
      activity: activity || '-',
    });
  }

  return lines;
}

export function MultiDayBlockDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { stayId } = useParams<{ stayId: string }>();
  const { data: locationData } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const { data, loading, refetch } = useQuery<{ multiDayBlock: MultiDayBlockRow | null }>(MULTI_DAY_BLOCK_QUERY, {
    variables: { id: stayId },
    skip: !stayId,
  });
  const [editModalOpen, setEditModalOpen] = useState(false);

  const locations = locationData?.locations ?? [];
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const block = data?.multiDayBlock ?? null;

  if (!stayId) {
    return <section className="py-8 text-sm text-slate-600">잘못된 접근입니다.</section>;
  }

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (!block) {
    return (
      <section className="grid gap-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">연속 일정 블록을 찾을 수 없습니다.</h1>
        <div>
          <Link to="/multi-day-blocks/list" className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
            목록으로 이동
          </Link>
        </div>
      </section>
    );
  }

  const orderedDays = block.days.slice().sort((left, right) => left.dayOrder - right.dayOrder);
  const baseLocation = block.locationId ? locationById.get(block.locationId) : null;
  const regionEntries = getMultiDayBlockRegionEntries(
    orderedDays.map((day) => ({ dayOrder: day.dayOrder, displayLocationId: day.displayLocationId })),
    locationById,
  );

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <MultiDayBlockSubNav pathname={`/multi-day-blocks/${stayId}`} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{block.name || block.title}</h1>
            <p className="mt-1 text-sm text-slate-600">연속 일정 블록 상세 정보</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/multi-day-blocks/list')}>
              목록으로
            </Button>
            <Button type="button" variant="primary" onClick={() => setEditModalOpen(true)}>
              수정
            </Button>
          </div>
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">요약</h2>
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <div>야간열차 적용: {block.isNightTrain ? '예' : '아니오'}</div>
          <div>상태: {block.isActive ? '활성' : '비활성'}</div>
          <div>정렬 순서: {block.sortOrder}</div>
          <div>일수: {orderedDays.length}일</div>
          <div className="md:col-span-2">
            <div className="mb-1">포함 지역: {regionEntries.length > 0 ? formatMultiDayBlockRegionSummary(regionEntries) : '-'}</div>
            <div className="flex flex-wrap gap-2">
              {regionEntries.length > 0 ? regionEntries.map((region) => <RegionNameChip key={region.id} name={region.name} />) : null}
            </div>
          </div>
          <div className="md:col-span-2">대표 목적지: {formatLocationNameInline(baseLocation?.name ?? [block.locationId])}</div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {orderedDays.map((day) => {
          const displayLocation =
            day.displayLocationId && locationById.get(day.displayLocationId)
              ? formatLocationNameInline(locationById.get(day.displayLocationId)!.name)
              : formatLocationNameInline(baseLocation?.name ?? [block.locationId]);
          const movementMeta = getMovementIntensityMeta(calculateMovementIntensityByHours(day.averageTravelHours));
          const scheduleLines = buildScheduleLines(day.timeCellText, day.scheduleCellText);

          return (
            <Card key={day.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{day.dayOrder}일차</h2>
                <p className="mt-1 text-sm text-slate-500">일차별 표시 목적지와 일정 요약</p>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-700">
                <div>표시 목적지: {displayLocation}</div>
                <div>이동거리: {day.averageDistanceKm}km</div>
                <div>이동시간: {day.averageTravelHours}h</div>
                <div>
                  이동강도:{' '}
                  {movementMeta ? (
                    <span
                      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                      style={{
                        backgroundColor: movementMeta.backgroundColor,
                        borderColor: movementMeta.borderColor,
                        color: movementMeta.textColor,
                      }}
                    >
                      {movementMeta.label}
                    </span>
                  ) : (
                    '-'
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <div>
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">시간 / 일정</h3>
                    <ScheduleCopyColumnButtons lines={scheduleLines} />
                  </div>
                  {scheduleLines.length > 0 ? (
                    <div className="grid gap-1 text-sm">
                      {scheduleLines.map((line, index) => (
                        <div key={`${day.id}-${index}`} className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
                          <span className="font-medium text-slate-700">{line.time}</span>
                          <span className="whitespace-pre-wrap text-slate-600">{line.activity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">-</div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">숙소</h3>
                  <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {day.lodgingCellText || '-'}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">식사</h3>
                  <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {day.mealCellText || '-'}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {editModalOpen && stayId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setEditModalOpen(false);
            }
          }}
        >
          <Card
            className="flex max-h-[90vh] w-full max-w-8xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-900">연속 일정 블록 수정</h2>
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                닫기
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <MultiDayBlockEditPanel
                blockId={stayId}
                onSaved={() => {
                  void refetch();
                  setEditModalOpen(false);
                }}
                onDeleted={() => {
                  navigate('/multi-day-blocks/list');
                }}
                onClose={() => setEditModalOpen(false)}
              />
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
