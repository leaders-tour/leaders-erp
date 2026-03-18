import { Button, Card } from '@tour/ui';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatLocationNameInline, formatLocationNameMultiline, toFacilityLabel, toMealLabel } from '../features/location/display';
import { useLocationCrud, useLocationVersionDetail } from '../features/location/hooks';

export function LocationVersionDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { locationId, versionId } = useParams<{ locationId: string; versionId: string }>();
  const { version, loading, refetch } = useLocationVersionDetail(versionId);
  const crud = useLocationCrud();

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (!version || !locationId || version.locationId !== locationId) {
    return (
      <section className="grid gap-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">버전을 찾을 수 없습니다.</h1>
        <div>
          <Button onClick={() => navigate('/locations/list')}>목록으로 이동</Button>
        </div>
      </section>
    );
  }

  const isDefault = version.location.defaultVersionId === version.id;
  const versionDisplay = `${version.label} (v${version.versionNumber})`;

  return (
    <section className="grid gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            <span className="whitespace-pre-line">{formatLocationNameMultiline(version.locationNameSnapshot)}</span> · {versionDisplay}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isDefault ? '기본 버전' : '선택 버전'} {version.changeNote ? `· ${version.changeNote}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/locations/${locationId}`}
            className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            루트 상세
          </Link>
          <Link
            to={`/locations/${locationId}/versions/${version.id}/edit?mode=create`}
            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            이 버전 기반 새 버전 생성
          </Link>
          {!isDefault ? (
            <Button
              variant="outline"
              onClick={async () => {
                if (!window.confirm(`'${version.label}'를 기본 버전으로 지정할까요?`)) {
                  return;
                }
                await crud.setDefaultVersion(locationId, version.id);
                await refetch();
              }}
            >
              기본 버전으로 지정
            </Button>
          ) : (
            <Link
              to={`/locations/${locationId}/versions/${version.id}/edit`}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
            >
              기본 버전 수정
            </Link>
          )}
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">요약</h2>
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <div>버전: {versionDisplay}</div>
          <div>지역 스냅샷: {version.regionNameSnapshot}</div>
          <div>목적지 스냅샷: {formatLocationNameInline(version.locationNameSnapshot)}</div>
          <div>첫날 가능: {version.location.isFirstDayEligible ? 'Y' : 'N'}</div>
          <div>마지막날 가능: {version.location.isLastDayEligible ? 'Y' : 'N'}</div>
          <div>첫날 이동거리: {version.firstDayAverageDistanceKm ?? '-'}km</div>
          <div>첫날 이동시간: {version.firstDayAverageTravelHours ?? '-'}시간</div>
          <div>첫날 이동강도: {version.firstDayMovementIntensity ?? '-'}</div>
        </div>
      </Card>

      {version.location.isFirstDayEligible ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">1일차 기본 일정</h2>
            <div className="grid gap-2 text-sm">
              {version.firstDayTimeBlocks.map((timeBlock) => (
                <div key={timeBlock.id} className="grid gap-1">
                  {timeBlock.activities.map((activity, index) => (
                    <div key={activity.id} className="grid grid-cols-[90px_minmax(0,1fr)] gap-2 leading-6">
                      <div>{index === 0 ? timeBlock.startTime : '-'}</div>
                      <div>{activity.description}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">1일차 얼리 일정</h2>
            <div className="grid gap-2 text-sm">
              {version.firstDayEarlyTimeBlocks.map((timeBlock) => (
                <div key={timeBlock.id} className="grid gap-1">
                  {timeBlock.activities.map((activity, index) => (
                    <div key={activity.id} className="grid grid-cols-[90px_minmax(0,1fr)] gap-2 leading-6">
                      <div>{index === 0 ? timeBlock.startTime : '-'}</div>
                      <div>{activity.description}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">1일차 일정</h2>
          <div className="text-sm text-slate-500">첫날 가능 목적지가 아니므로 목적지 전용 일정이 없습니다.</div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">숙소</h2>
          <div className="grid gap-1 text-sm">
            <div>{version.lodgings[0]?.name ?? '-'}</div>
            <div>전기({toFacilityLabel(version.lodgings[0]?.hasElectricity)})</div>
            <div>샤워({toFacilityLabel(version.lodgings[0]?.hasShower)})</div>
            <div>인터넷({toFacilityLabel(version.lodgings[0]?.hasInternet)})</div>
          </div>
        </Card>
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">식사</h2>
          <div className="grid gap-1 text-sm">
            <div>{toMealLabel(version.mealSets[0]?.breakfast)}</div>
            <div>{toMealLabel(version.mealSets[0]?.lunch)}</div>
            <div>{toMealLabel(version.mealSets[0]?.dinner)}</div>
          </div>
        </Card>
      </div>

    </section>
  );
}
