import { Card } from '@tour/ui';
import { Link, useLocation, useParams } from 'react-router-dom';
import { LocationSubNav } from '../features/location/sub-nav';
import { splitLocationNameAndTag, toMealLabel } from '../features/location/display';
import { useLocationDetail } from '../features/location/hooks';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('ko-KR');
}

export function LocationDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const locationPath = useLocation();
  const { location, segments, loading } = useLocationDetail(id);

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (!location) {
    return (
      <section className="grid gap-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">목적지를 찾을 수 없습니다.</h1>
        <p className="text-sm text-slate-600">요청한 ID에 해당하는 목적지가 존재하지 않습니다.</p>
        <div>
          <Link to="/locations/list" className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
            목록으로 이동
          </Link>
        </div>
      </section>
    );
  }

  const parsedName = splitLocationNameAndTag(location.name);
  const adjacent = segments
    .filter((segment) => segment.fromLocationId === location.id || segment.toLocationId === location.id)
    .map((segment) => ({
      segmentId: segment.id,
      locationId: segment.fromLocationId === location.id ? segment.toLocation.id : segment.fromLocation.id,
      locationName: segment.fromLocationId === location.id ? segment.toLocation.name : segment.fromLocation.name,
      distanceKm: segment.averageDistanceKm,
      travelHours: segment.averageTravelHours,
    }))
    .slice(0, 5);

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <LocationSubNav pathname={locationPath.pathname} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {parsedName.name}
              {parsedName.tag ? <span className="ml-2 text-lg text-slate-600">({parsedName.tag})</span> : null}
            </h1>
            <p className="mt-1 text-sm text-slate-600">목적지 상세 정보</p>
          </div>
          <Link to={`/locations/${location.id}/edit`} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            편집
          </Link>
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">요약</h2>
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <div>지역: {location.regionName}</div>
          <div>내부 이동 거리: {location.internalMovementDistance ?? '-'} </div>
          <div>생성일: {formatDate(String(location.createdAt))}</div>
          <div>수정일: {formatDate(String(location.updatedAt))}</div>
        </div>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">시간표/일정</h2>
        <div className="grid gap-2 text-sm">
          {location.timeBlocks.length === 0 ? (
            <div className="text-slate-500">일정 없음</div>
          ) : (
            location.timeBlocks.map((timeBlock) => {
              if (timeBlock.activities.length === 0) {
                return (
                  <div key={timeBlock.id} className="grid grid-cols-[90px_minmax(0,1fr)] gap-2 leading-6">
                    <div>{timeBlock.startTime}</div>
                    <div className="text-slate-500">(일정 없음)</div>
                  </div>
                );
              }

              return (
                <div key={timeBlock.id} className="grid gap-1">
                  {timeBlock.activities.map((activity, index) => (
                    <div key={activity.id} className="grid grid-cols-[90px_minmax(0,1fr)] gap-2 leading-6">
                      <div>{index === 0 ? timeBlock.startTime : '-'}</div>
                      <div>{activity.description}</div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">숙소</h2>
          <div className="grid gap-1 text-sm">
            <div>{location.lodgings[0]?.name ?? '-'}</div>
            <div>{location.lodgings[0]?.hasElectricity ? '전기' : '전기 X'}</div>
            <div>{location.lodgings[0]?.hasShower ? '샤워' : '샤워 X'}</div>
            <div>{location.lodgings[0]?.hasInternet ? '인터넷' : '인터넷 X'}</div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">식사</h2>
          <div className="grid gap-1 text-sm">
            <div>{toMealLabel(location.mealSets[0]?.breakfast)}</div>
            <div>{toMealLabel(location.mealSets[0]?.lunch)}</div>
            <div>{toMealLabel(location.mealSets[0]?.dinner)}</div>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">연결경로</h2>
          <Link to="/locations/connections" className="text-sm text-blue-700 hover:underline">
            더보기
          </Link>
        </div>
        {adjacent.length === 0 ? (
          <div className="text-sm text-slate-500">연결 정보 없음</div>
        ) : (
          <div className="grid gap-2 text-sm">
            {adjacent.map((item) => (
              <div key={item.segmentId} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <Link to={`/locations/${item.locationId}`} className="text-slate-800 hover:underline">
                  {item.locationName}
                </Link>
                <div className="text-slate-600">{item.distanceKm}km / {item.travelHours}시간</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
