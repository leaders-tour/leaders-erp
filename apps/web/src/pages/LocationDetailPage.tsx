import { Button, Card, Table, Td, Th } from '@tour/ui';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useState } from 'react';
import { LocationSubNav } from '../features/location/sub-nav';
import { useLocationGuideCrud } from '../features/location-guide/hooks';
import { useLocationCrud, useLocationDetail } from '../features/location/hooks';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('ko-KR');
}

function formatVersionLabel(version: { label: string; versionNumber: number } | null | undefined): string {
  if (!version) {
    return '-';
  }
  return `${version.label} (v${version.versionNumber})`;
}

export function LocationDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const locationPath = useLocation();
  const crud = useLocationCrud();
  const { location, segments, loading, refetch } = useLocationDetail(id);
  const guideCrud = useLocationGuideCrud();
  const [selectedGuideId, setSelectedGuideId] = useState('');

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

  const fromSegments = segments
    .filter((segment) => segment.toLocationId === location.id)
    .map((segment) => ({
      segmentId: segment.id,
      targetLocationId: segment.fromLocation.id,
      targetLocationName: segment.fromLocation.name,
      distanceKm: segment.averageDistanceKm,
      travelHours: segment.averageTravelHours,
    }))
    .slice(0, 5);

  const toSegments = segments
    .filter((segment) => segment.fromLocationId === location.id)
    .map((segment) => ({
      segmentId: segment.id,
      targetLocationId: segment.toLocation.id,
      targetLocationName: segment.toLocation.name,
      distanceKm: segment.averageDistanceKm,
      travelHours: segment.averageTravelHours,
    }))
    .slice(0, 5);

  const availableGuides = guideCrud.rows.filter((guide) => !guide.locationId);

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <LocationSubNav pathname={locationPath.pathname} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {location.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">목적지 상세 정보</p>
          </div>
          {location.defaultVersionId ? (
            <Link
              to={`/locations/${location.id}/versions/${location.defaultVersionId}/edit`}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              기본 버전 수정
            </Link>
          ) : null}
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">요약</h2>
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <div>지역: {location.regionName}</div>
          <div>기본 버전: {formatVersionLabel(location.defaultVersion)}</div>
          <div>내부 이동 거리: {location.internalMovementDistance ?? '-'} </div>
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
                className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
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
                className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                새 소개 생성 후 연결
              </Link>
            </div>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold">버전 목록</h2>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>버전</Th>
              <Th>변경 메모</Th>
              <Th>생성일</Th>
              <Th>상태</Th>
              <Th>액션</Th>
            </tr>
          </thead>
          <tbody>
            {location.variations.map((version) => {
              const isDefault = location.defaultVersionId === version.id;
              return (
                <tr key={version.id}>
                  <Td>
                    <div>{version.label}</div>
                    <div className="text-xs text-slate-500">v{version.versionNumber}</div>
                  </Td>
                  <Td>{version.changeNote ?? '-'}</Td>
                  <Td>{formatDate(version.createdAt)}</Td>
                  <Td>{isDefault ? '기본' : '-'}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/locations/${location.id}/versions/${version.id}`}
                        className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        상세
                      </Link>
                      <Link
                        to={`/locations/${location.id}/versions/${version.id}/edit?mode=create`}
                        className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        새 버전 생성
                      </Link>
                      {!isDefault ? (
                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (!window.confirm(`'${version.label}'를 기본 버전으로 지정할까요?`)) {
                              return;
                            }
                            await crud.setDefaultVersion(location.id, version.id);
                            await refetch();
                          }}
                        >
                          기본으로 지정
                        </Button>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">연결경로</h2>
          <Link to="/locations/connections" className="text-sm text-blue-700 hover:underline">
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
                <div key={item.segmentId} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <Link to={`/locations/${item.targetLocationId}`} className="text-slate-800 hover:underline">
                    {item.targetLocationName}
                  </Link>
                  <div className="text-slate-600">{item.distanceKm}km / {item.travelHours}시간</div>
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
                <div key={item.segmentId} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <Link to={`/locations/${item.targetLocationId}`} className="text-slate-800 hover:underline">
                    {item.targetLocationName}
                  </Link>
                  <div className="text-slate-600">{item.distanceKm}km / {item.travelHours}시간</div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
