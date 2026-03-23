import { gql, useQuery } from '@apollo/client';
import { Card } from '@tour/ui';
import { Link, useParams } from 'react-router-dom';
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
  name: string[];
}

interface MultiDayBlockRow {
  id: string;
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

const REGIONS_QUERY = gql`
  query MultiDayBlockConnectionDetailRegions {
    regions {
      id
      name
    }
  }
`;

const LOCATIONS_QUERY = gql`
  query MultiDayBlockConnectionDetailLocations {
    locations {
      id
      name
    }
  }
`;

const MULTI_DAY_BLOCKS_QUERY = gql`
  query MultiDayBlockConnectionDetailBlocks {
    multiDayBlocks {
      id
      name
      title
    }
  }
`;

const MULTI_DAY_BLOCK_CONNECTIONS_QUERY = gql`
  query MultiDayBlockConnectionDetailList {
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

function ScheduleCard(props: {
  title: string;
  description: string;
  lines: Array<{ time: string; activity: string }>;
}): JSX.Element {
  const { title, description, lines } = props;

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {lines.length === 0 ? (
        <div className="text-sm text-slate-500">등록된 시간 / 일정 정보가 없습니다.</div>
      ) : (
        <div className="grid gap-2 text-sm">
          {lines.map((item, index) => (
            <div key={`${title}-${index}`} className="grid grid-cols-[90px_minmax(0,1fr)] gap-2 leading-6">
              <div className="font-medium text-slate-700">{item.time}</div>
              <div className="whitespace-pre-wrap text-slate-700">{item.activity}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function MultiDayBlockConnectionDetailPage(): JSX.Element {
  const { connectionId } = useParams<{ connectionId: string }>();
  const { data: regionData, loading: regionLoading } = useQuery<{ regions: RegionRow[] }>(REGIONS_QUERY);
  const { data: locationData, loading: locationLoading } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const { data: blockData, loading: blockLoading } = useQuery<{ multiDayBlocks: MultiDayBlockRow[] }>(MULTI_DAY_BLOCKS_QUERY);
  const { data: connectionData, loading: connectionLoading } = useQuery<{ multiDayBlockConnections: ConnectionRow[] }>(
    MULTI_DAY_BLOCK_CONNECTIONS_QUERY,
  );

  const loading = regionLoading || locationLoading || blockLoading || connectionLoading;
  const connection = (connectionData?.multiDayBlockConnections ?? []).find((row) => row.id === connectionId);

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (!connection) {
    return (
      <section className="grid gap-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">연결 정보를 찾을 수 없습니다.</h1>
        <p className="text-sm text-slate-600">요청한 ID에 해당하는 블록 후속 연결이 존재하지 않습니다.</p>
        <div>
          <Link to="/multi-day-blocks/connections/list" className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
            목록으로 이동
          </Link>
        </div>
      </section>
    );
  }

  const regionName = regionData?.regions.find((region) => region.id === connection.regionId)?.name ?? '-';
  const fromBlock = blockData?.multiDayBlocks.find((item) => item.id === connection.fromMultiDayBlockId);
  const toLocation = locationData?.locations.find((item) => item.id === connection.toLocationId);
  const movementIntensityMeta = getMovementIntensityMeta(calculateMovementIntensityByHours(connection.averageTravelHours));
  const scheduleLines = buildScheduleLines(connection.scheduleTimeBlocks);
  const extendScheduleLines = buildScheduleLines(connection.extendScheduleTimeBlocks);

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <MultiDayBlockSubNav pathname={`/multi-day-blocks/connections/${connection.id}`} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {fromBlock?.name ?? fromBlock?.title ?? connection.fromMultiDayBlockId}
              {' -> '}
              {formatLocationNameInline(toLocation?.name ?? [connection.toLocationId])}
            </h1>
            <p className="mt-1 text-sm text-slate-600">블록 후속 연결 상세 정보</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/multi-day-blocks/connections/list"
              className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              목록으로
            </Link>
            <Link
              to={`/multi-day-blocks/connections/${connection.id}/edit`}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              수정
            </Link>
          </div>
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">요약</h2>
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <div>지역: {regionName}</div>
          <div>장거리: {connection.isLongDistance ? 'Y' : 'N'}</div>
          <div>
            출발 블록:{' '}
            {fromBlock ? (
              <Link to={`/multi-day-blocks/${fromBlock.id}`} className="text-blue-700 hover:underline">
                {fromBlock.name || fromBlock.title}
              </Link>
            ) : (
              connection.fromMultiDayBlockId
            )}
          </div>
          <div>
            다음 목적지:{' '}
            {toLocation ? (
              <Link to={`/locations/${toLocation.id}`} className="text-blue-700 hover:underline">
                {formatLocationNameInline(toLocation.name)}
              </Link>
            ) : (
              connection.toLocationId
            )}
          </div>
          <div>평균거리: {connection.averageDistanceKm}km</div>
          <div>평균 이동시간: {connection.averageTravelHours}h</div>
          <div className="md:col-span-2">
            이동강도:{' '}
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
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <ScheduleCard
          title="기본 일정"
          description="기본 연결 시 사용하는 시간 / 일정입니다."
          lines={scheduleLines}
        />
        <ScheduleCard
          title="마지막날 연장 일정"
          description="마지막날 연장 조건에서 사용하는 시간 / 일정입니다."
          lines={extendScheduleLines}
        />
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/multi-day-blocks/${connection.fromMultiDayBlockId}`}
            className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            출발 블록 보기
          </Link>
          <Link
            to={`/locations/${connection.toLocationId}`}
            className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            도착 목적지 보기
          </Link>
        </div>
      </Card>
    </section>
  );
}
