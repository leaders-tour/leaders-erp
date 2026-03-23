import { gql, useQuery } from '@apollo/client';
import { Button, Card } from '@tour/ui';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  calculateMovementIntensityByHours,
  getMovementIntensityMeta,
} from '../features/estimate/model/movement-intensity';
import { formatLocationNameInline } from '../features/location/display';
import { MultiDayBlockSubNav } from '../features/multi-day-block/sub-nav';

interface LocationRow {
  id: string;
  name: string[];
}

type BlockType = 'STAY' | 'TRANSFER';

interface MultiDayBlockRow {
  id: string;
  regionId: string;
  locationId: string;
  blockType: BlockType;
  startLocationId: string;
  endLocationId: string;
  name: string;
  title: string;
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
      name
    }
  }
`;

const MULTI_DAY_BLOCK_QUERY = gql`
  query MultiDayBlockDetailPage($id: ID!) {
    multiDayBlock(id: $id) {
      id
      regionId
      locationId
      blockType
      startLocationId
      endLocationId
      name
      title
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
  const { data, loading } = useQuery<{ multiDayBlock: MultiDayBlockRow | null }>(MULTI_DAY_BLOCK_QUERY, {
    variables: { id: stayId },
    skip: !stayId,
  });

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
  const startLocation = block.startLocationId ? locationById.get(block.startLocationId) : null;
  const endLocation = block.endLocationId ? locationById.get(block.endLocationId) : null;

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
            <Link
              to={`/multi-day-blocks/${stayId}/edit`}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              수정
            </Link>
          </div>
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">요약</h2>
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <div>블록 타입: {block.blockType === 'TRANSFER' ? '야간열차' : '연박'}</div>
          <div>상태: {block.isActive ? '활성' : '비활성'}</div>
          <div>정렬 순서: {block.sortOrder}</div>
          <div>일수: {orderedDays.length}일</div>
          {block.blockType === 'STAY' ? (
            <div className="md:col-span-2">목적지: {formatLocationNameInline(baseLocation?.name ?? [block.locationId])}</div>
          ) : (
            <div className="md:col-span-2">
              경로: {formatLocationNameInline(startLocation?.name ?? [block.startLocationId])} {'→'}{' '}
              {formatLocationNameInline(endLocation?.name ?? [block.endLocationId])}
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {orderedDays.map((day) => {
          const displayLocation =
            day.displayLocationId && locationById.get(day.displayLocationId)
              ? formatLocationNameInline(locationById.get(day.displayLocationId)!.name)
              : block.blockType === 'STAY'
                ? formatLocationNameInline(baseLocation?.name ?? [block.locationId])
                : '-';
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
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">시간 / 일정</h3>
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
    </section>
  );
}
