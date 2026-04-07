import { Button, Card } from '@tour/ui';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useState } from 'react';
import { ScheduleCopyColumnButtons } from '../components/ScheduleCopyColumnButtons';
import { LocationSubNav } from '../features/location/sub-nav';
import {
  formatLocationNameInline,
  formatLocationNameMultiline,
} from '../features/location/display';
import { useLocationGuideCrud } from '../features/location-guide/hooks';
import { LocationVersionEditPanel } from '../features/location/location-version-edit-panel';
import { useLocationDetail } from '../features/location/hooks';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('ko-KR');
}

function buildScheduleLines(
  timeBlocks:
    | Array<{
        id: string;
        startTime: string;
        orderIndex: number;
        activities: Array<{ id: string; description: string; orderIndex: number }>;
      }>
    | undefined,
): Array<{ time: string; activity: string }> {
  if (!timeBlocks || timeBlocks.length === 0) {
    return [];
  }

  return [...timeBlocks]
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .flatMap((timeBlock) => {
      const activities = [...timeBlock.activities]
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map((activity) => activity.description.trim())
        .filter((activity) => activity.length > 0);

      if (activities.length === 0) {
        return [{ time: timeBlock.startTime, activity: '-' }];
      }

      return activities.map((activity, index) => ({
        time: index === 0 ? timeBlock.startTime : '-',
        activity,
      }));
    });
}

export function LocationDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const locationPath = useLocation();
  const { location, segments, loading, refetch } = useLocationDetail(id);
  const guideCrud = useLocationGuideCrud();
  const [selectedGuideId, setSelectedGuideId] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (!location) {
    return (
      <section className="grid gap-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">목적지를 찾을 수 없습니다.</h1>
        <p className="text-sm text-slate-600">요청한 ID에 해당하는 목적지가 존재하지 않습니다.</p>
        <div>
          <Link
            to="/locations/list"
            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          >
            목록으로 이동
          </Link>
        </div>
      </section>
    );
  }

  const fromSegments = segments
    .filter((segment) => segment.toLocationId === location.id)
    .map((segment) => ({
      segmentId: segment.id,
      targetLocationId: segment.fromLocation.id,
      targetLocationName: formatLocationNameInline(segment.fromLocation.name),
      distanceKm: segment.averageDistanceKm,
      travelHours: segment.averageTravelHours,
    }))
    .slice(0, 5);

  const toSegments = segments
    .filter((segment) => segment.fromLocationId === location.id)
    .map((segment) => ({
      segmentId: segment.id,
      targetLocationId: segment.toLocation.id,
      targetLocationName: formatLocationNameInline(segment.toLocation.name),
      distanceKm: segment.averageDistanceKm,
      travelHours: segment.averageTravelHours,
    }))
    .slice(0, 5);

  const availableGuides = guideCrud.rows.filter((guide) => !guide.locationId);
  const firstDayScheduleLines = location.isFirstDayEligible
    ? buildScheduleLines(location.defaultVersion?.firstDayTimeBlocks)
    : [];
  const firstDayEarlyScheduleLines = location.isFirstDayEligible
    ? buildScheduleLines(location.defaultVersion?.firstDayEarlyTimeBlocks)
    : [];

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <LocationSubNav pathname={locationPath.pathname} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              <span className="whitespace-pre-line">
                {formatLocationNameMultiline(location.name)}
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-600">목적지 상세 정보</p>
          </div>
          {location.defaultVersionId ? (
            <Button type="button" variant="primary" onClick={() => setEditModalOpen(true)}>
              수정
            </Button>
          ) : null}
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">요약</h2>
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <div>지역: {location.regionName}</div>
          <div>첫날 가능: {location.isFirstDayEligible ? 'Y' : 'N'}</div>
          <div>생성일: {formatDate(String(location.createdAt))}</div>
          <div>수정일: {formatDate(String(location.updatedAt))}</div>
        </div>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">여행지 안내사항</h2>
          <Link to="/location-guides" className="text-sm text-blue-700 hover:underline">
            소개 관리
          </Link>
        </div>

        {location.guide ? (
          <div className="grid gap-2 text-sm text-slate-700">
            <div className="font-medium text-slate-900">{location.guide.title}</div>
            <div className="whitespace-pre-wrap text-slate-600">{location.guide.description}</div>
            <div>이미지: {location.guide.imageUrls.length}개</div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                onClick={async () => {
                  await guideCrud.disconnectGuide(location.id);
                  await refetch();
                }}
              >
                연결 해제
              </Button>
              <Link
                to="/location-guides"
                className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
              >
                새 소개 생성 후 연결
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-slate-600">연결된 소개가 없습니다.</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedGuideId}
                onChange={(event) => setSelectedGuideId(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">기존 소개 선택</option>
                {availableGuides.map((guide) => (
                  <option key={guide.id} value={guide.id}>
                    {guide.title}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                disabled={!selectedGuideId}
                onClick={async () => {
                  if (!selectedGuideId) {
                    return;
                  }
                  await guideCrud.connectGuide(location.id, selectedGuideId);
                  setSelectedGuideId('');
                  await refetch();
                }}
              >
                기존 소개 연결
              </Button>
              <Link
                to="/location-guides"
                className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
              >
                새 소개 생성 후 연결
              </Link>
            </div>
          </div>
        )}
      </Card>

      {location.isFirstDayEligible ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">1일차 기본 일정</h2>
              <ScheduleCopyColumnButtons lines={firstDayScheduleLines} />
            </div>
            {firstDayScheduleLines.length === 0 ? (
              <div className="text-sm text-slate-500">등록된 시간 / 일정 정보가 없습니다.</div>
            ) : (
              <div className="grid gap-2 text-sm">
                {firstDayScheduleLines.map((item, index) => (
                  <div
                    key={`default-${index}`}
                    className="grid grid-cols-[90px_minmax(0,1fr)] gap-2 leading-6"
                  >
                    <div>{item.time}</div>
                    <div>{item.activity}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">1일차 얼리 일정</h2>
              <ScheduleCopyColumnButtons lines={firstDayEarlyScheduleLines} />
            </div>
            {firstDayEarlyScheduleLines.length === 0 ? (
              <div className="text-sm text-slate-500">등록된 시간 / 일정 정보가 없습니다.</div>
            ) : (
              <div className="grid gap-2 text-sm">
                {firstDayEarlyScheduleLines.map((item, index) => (
                  <div
                    key={`early-${index}`}
                    className="grid grid-cols-[90px_minmax(0,1fr)] gap-2 leading-6"
                  >
                    <div>{item.time}</div>
                    <div>{item.activity}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">1일차 일정</h2>
          <div className="text-sm text-slate-500">
            첫날 가능 목적지가 아니므로 시간 / 일정 정보가 없습니다.
          </div>
        </Card>
      )}

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">연결경로</h2>
          <Link to="/connections/list" className="text-sm text-blue-700 hover:underline">
            더보기
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-slate-800">출발 (From)</h3>
            {fromSegments.length === 0 ? (
              <div className="text-sm text-slate-500">출발 연결 정보 없음</div>
            ) : (
              fromSegments.map((item) => (
                <div
                  key={item.segmentId}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <Link
                    to={`/locations/${item.targetLocationId}`}
                    className="text-slate-800 hover:underline"
                  >
                    {item.targetLocationName}
                  </Link>
                  <div className="text-slate-600">
                    {item.distanceKm}km / {item.travelHours}h
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-slate-800">도착 (To)</h3>
            {toSegments.length === 0 ? (
              <div className="text-sm text-slate-500">도착 연결 정보 없음</div>
            ) : (
              toSegments.map((item) => (
                <div
                  key={item.segmentId}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <Link
                    to={`/locations/${item.targetLocationId}`}
                    className="text-slate-800 hover:underline"
                  >
                    {item.targetLocationName}
                  </Link>
                  <div className="text-slate-600">
                    {item.distanceKm}km / {item.travelHours}h
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {editModalOpen && location.defaultVersionId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setEditModalOpen(false);
            }
          }}
        >
          <Card className="flex max-h-[90vh] w-full max-w-8xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-900">목적지 수정</h2>
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                닫기
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <LocationVersionEditPanel
                locationId={location.id}
                versionId={location.defaultVersionId}
                isCreateMode={false}
                onProfileSaved={() => {
                  void refetch();
                  setEditModalOpen(false);
                }}
              />
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
