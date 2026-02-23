import { Button, Card } from '@tour/ui';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { VersionSnapshotView } from '../features/plan/components';
import { usePlanVersionDetail, useSetCurrentPlanVersion } from '../features/plan/hooks';

export function PlanVersionDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { planId, versionId } = useParams<{ planId: string; versionId: string }>();
  const { version, loading } = usePlanVersionDetail(versionId);
  const { setCurrentPlanVersion, loading: settingCurrent } = useSetCurrentPlanVersion();
  const [confirming, setConfirming] = useState(false);

  if (!planId || !versionId) {
    return <section className="py-8 text-sm text-slate-600">잘못된 접근입니다.</section>;
  }

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (!version) {
    return <section className="py-8 text-sm text-slate-600">버전을 찾을 수 없습니다.</section>;
  }

  const isCurrent = version.plan.currentVersionId === version.id;

  return (
    <section className="grid gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {version.plan.title} · v{version.versionNumber}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            고객: {version.plan.user.name} · 지역: {version.plan.region.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/plans/${planId}`)}>
            Plan 상세로
          </Button>
          <Button
            onClick={() => {
              const params = new URLSearchParams({
                userId: version.plan.userId,
                planId,
                parentVersionId: version.id,
              });
              navigate(`/itinerary-builder?${params.toString()}`);
            }}
          >
            이 버전 기반 새 버전 생성
          </Button>
          <Button
            variant="outline"
            disabled={isCurrent || settingCurrent}
            onClick={() => setConfirming(true)}
          >
            {isCurrent ? '현재 버전' : '현재 버전으로 지정'}
          </Button>
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2 text-sm text-slate-700">
          <div>부모 버전: {version.parentVersionId ? version.parentVersionId.slice(0, 8) : '-'}</div>
          <div>타입: {version.variantType}</div>
          <div>일수: {version.totalDays}</div>
          <div>변경 메모: {version.changeNote ?? '-'}</div>
        </div>
      </Card>

      {version.meta ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">운영 정보</h2>
          <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <div>대표자명: {version.meta.leaderName}</div>
            <div>문서번호: {version.meta.documentNumber}</div>
            <div>
              여행기간: {new Date(version.meta.travelStartDate).toLocaleDateString('ko-KR')} ~{' '}
              {new Date(version.meta.travelEndDate).toLocaleDateString('ko-KR')}
            </div>
            <div>
              인원: 총 {version.meta.headcountTotal} (남 {version.meta.headcountMale} / 여 {version.meta.headcountFemale})
            </div>
            <div>차량: {version.meta.vehicleType}</div>
            <div>
              항공권: IN {version.meta.flightInTime} / OUT {version.meta.flightOutTime}
            </div>
            <div>참여 이벤트: {version.meta.eventCodes.length > 0 ? version.meta.eventCodes.join(', ') : '-'}</div>
            <div>픽/드랍: {version.meta.pickupDropNote ?? '-'}</div>
            <div>실투어 외 픽드랍: {version.meta.externalPickupDropNote ?? '-'}</div>
            <div className="md:col-span-2 whitespace-pre-wrap">기본 대여물품: {version.meta.rentalItemsText}</div>
            <div className="md:col-span-2 whitespace-pre-wrap">비고: {version.meta.remark ?? '-'}</div>
          </div>
        </Card>
      ) : null}

      <VersionSnapshotView version={version} />

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <Card className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">현재 버전 변경</h3>
            <p className="mt-1 text-sm text-slate-600">v{version.versionNumber}을 현재 버전으로 지정하시겠습니까?</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)}>
                취소
              </Button>
              <Button
                onClick={async () => {
                  await setCurrentPlanVersion(planId, version.id);
                  setConfirming(false);
                }}
              >
                지정
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
