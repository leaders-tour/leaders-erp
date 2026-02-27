import { Button, Card } from '@tour/ui';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CreateVersionModal, VersionListPanel, VersionTreePanel } from '../features/plan/components';
import { usePlanDetail, usePlanVersions, type PlanVersionRow } from '../features/plan/hooks';

type TabKey = 'versions' | 'meta' | 'history';

export function PlanDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { planId } = useParams<{ planId: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('versions');
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultParentVersionId, setDefaultParentVersionId] = useState('');

  const { plan, loading: planLoading } = usePlanDetail(planId);
  const { versions, loading: versionsLoading } = usePlanVersions(planId);

  const sortedVersions = useMemo(
    () => versions.slice().sort((a, b) => b.versionNumber - a.versionNumber),
    [versions],
  );

  const openCreateVersion = (versionId: string) => {
    setDefaultParentVersionId(versionId);
    setModalOpen(true);
  };

  if (!planId) {
    return <section className="py-8 text-sm text-slate-600">잘못된 접근입니다.</section>;
  }

  if (planLoading || versionsLoading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (!plan) {
    return <section className="py-8 text-sm text-slate-600">Plan을 찾을 수 없습니다.</section>;
  }

  const currentVersion = sortedVersions.find((version) => version.id === plan.currentVersionId) ?? null;
  const baseForCreate = defaultParentVersionId || currentVersion?.id || sortedVersions[0]?.id || '';

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{plan.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              고객: {plan.user.name} · 지역: {plan.region.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/customers/${plan.userId}/plans`)}>
              고객 Plan 목록
            </Button>
            <Button
              onClick={() => {
                const parentId = currentVersion?.id ?? sortedVersions[0]?.id;
                if (!parentId) {
                  return;
                }
                openCreateVersion(parentId);
              }}
              disabled={sortedVersions.length === 0}
            >
              새 버전 생성
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
          현재 버전: {currentVersion ? `v${currentVersion.versionNumber}` : '-'}
          {currentVersion ? (
            <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">current</span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('versions')}
            className={`rounded-xl px-3 py-1.5 text-sm ${
              activeTab === 'versions' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'
            }`}
          >
            버전
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`rounded-xl px-3 py-1.5 text-sm ${
              activeTab === 'meta' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'
            }`}
          >
            메타데이터
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`rounded-xl px-3 py-1.5 text-sm ${
              activeTab === 'history' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'
            }`}
          >
            히스토리
          </button>
        </div>
      </header>

      {activeTab === 'versions' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <VersionListPanel
            versions={sortedVersions}
            currentVersionId={plan.currentVersionId}
            customerName={plan.user.name}
            onOpenVersion={(versionId) => navigate(`/plans/${plan.id}/versions/${versionId}`)}
            onOpenEstimatePdf={(versionId) =>
              window.open(
                `/documents/estimate?mode=version&versionId=${encodeURIComponent(versionId)}`,
                '_blank',
                'noopener,noreferrer',
              )
            }
            onCreateVersion={openCreateVersion}
          />
          <VersionTreePanel
            versions={sortedVersions}
            currentVersionId={plan.currentVersionId}
            onOpenVersion={(versionId) => navigate(`/plans/${plan.id}/versions/${versionId}`)}
          />
        </div>
      ) : null}

      {activeTab === 'meta' ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Plan 메타데이터</h2>
          <div className="mt-3 grid gap-2 text-sm text-slate-700">
            <div>Plan ID: {plan.id}</div>
            <div>Owner User ID: {plan.userId}</div>
            <div>Region ID: {plan.regionId}</div>
            <div>생성일: {new Date(plan.createdAt).toLocaleString('ko-KR')}</div>
            <div>수정일: {new Date(plan.updatedAt).toLocaleString('ko-KR')}</div>
          </div>
        </Card>
      ) : null}

      {activeTab === 'history' ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">버전 히스토리</h2>
          <div className="mt-3 grid gap-2 text-sm text-slate-700">
            {sortedVersions.map((version: PlanVersionRow) => (
              <div key={version.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                v{version.versionNumber} · {new Date(version.createdAt).toLocaleString('ko-KR')} · {version.changeNote ?? '메모 없음'}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <CreateVersionModal
        open={modalOpen}
        versions={sortedVersions}
        defaultParentVersionId={baseForCreate}
        onClose={() => setModalOpen(false)}
        onConfirm={(parentVersionId, changeNote) => {
          const params = new URLSearchParams({
            userId: plan.userId,
            planId: plan.id,
            parentVersionId,
          });
          if (changeNote.trim()) {
            params.set('changeNote', changeNote.trim());
          }
          navigate(`/itinerary-builder?${params.toString()}`);
        }}
      />
    </section>
  );
}
