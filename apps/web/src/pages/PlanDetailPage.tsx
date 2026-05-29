import { ApolloError } from '@apollo/client';
import { Button, Card } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CreateVersionModal, VersionListPanel, VersionTreePanel } from '../features/plan/components';
import {
  useDeletePlanVersion,
  usePlanDetail,
  usePlanVersions,
  useUpdatePlan,
  type PlanVersionRow,
} from '../features/plan/hooks';

type TabKey = 'versions' | 'meta' | 'history';

export function PlanDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { planId } = useParams<{ planId: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('versions');
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultParentVersionId, setDefaultParentVersionId] = useState('');

  const { plan, loading: planLoading } = usePlanDetail(planId);
  const { versions, loading: versionsLoading } = usePlanVersions(planId);
  const { deletePlanVersion, loading: deleteVersionLoading } = useDeletePlanVersion();
  const { updatePlan, loading: updatePlanLoading } = useUpdatePlan();

  const [documentNumberDraft, setDocumentNumberDraft] = useState('');
  const [documentNumberMessage, setDocumentNumberMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );

  const sortedVersions = useMemo(
    () => versions.slice().sort((a, b) => b.versionNumber - a.versionNumber),
    [versions],
  );

  useEffect(() => {
    if (!plan) {
      return;
    }
    setDocumentNumberDraft(plan.documentNumberBase);
  }, [plan?.id, plan?.documentNumberBase]);

  const openCreateVersion = (versionId: string) => {
    setDefaultParentVersionId(versionId);
    setModalOpen(true);
  };

  const handleDeleteVersion = async (versionId: string) => {
    const target = sortedVersions.find((v) => v.id === versionId);
    if (!target || !planId || !plan) {
      return;
    }
    if (
      !window.confirm(
        `v${target.versionNumber} 버전을 삭제할까요? 저장된 일정·견적 데이터가 함께 삭제되며 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }
    try {
      await deletePlanVersion(versionId, planId);
    } catch (error) {
      const message =
        error instanceof ApolloError
          ? error.graphQLErrors[0]?.message?.trim()
          : error instanceof Error
            ? error.message
            : null;
      window.alert(message && message.length > 0 ? message : '버전 삭제에 실패했습니다.');
    }
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
  const currentLeaderName =
    currentVersion?.meta?.leaderName?.trim() ||
    plan.currentVersion?.meta?.leaderName?.trim() ||
    sortedVersions[0]?.meta?.leaderName?.trim() ||
    plan.user.name;

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{plan.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              대표자: {currentLeaderName} · 고객: {plan.user.name} · 지역 세트: {plan.regionSet.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/customers/${plan.userId}/plans`)}>
              고객 Plan 목록
            </Button>
            <Button
              variant="primary"
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
            onDeleteVersion={handleDeleteVersion}
            deleteVersionLoading={deleteVersionLoading}
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
            <div>문서번호 베이스: {plan.documentNumberBase}</div>
            <div>Owner User ID: {plan.userId}</div>
            <div>RegionSet ID: {plan.regionSetId}</div>
            <div>생성일: {new Date(plan.createdAt).toLocaleString('ko-KR')}</div>
            <div>수정일: {new Date(plan.updatedAt).toLocaleString('ko-KR')}</div>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900">문서번호 베이스 변경</h3>
            <p className="mt-1 text-xs text-slate-500">
              저장하면 이 플랜의 모든 버전 견적 문서번호(예: …V1, …V2)가 새 베이스에 맞게 함께 바뀝니다.
            </p>
            <div className="mt-3 flex max-w-md flex-col gap-2 sm:flex-row sm:items-end">
              <label className="grid min-w-0 flex-1 gap-1 text-sm">
                <span className="text-xs text-slate-600">9자리 숫자</span>
                <input
                  value={documentNumberDraft}
                  onChange={(event) => {
                    setDocumentNumberDraft(event.target.value.replace(/\D/g, '').slice(0, 9));
                    setDocumentNumberMessage(null);
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono tracking-wide"
                  placeholder="예: 260505001"
                />
              </label>
              <Button
                type="button"
                variant="primary"
                className="shrink-0"
                disabled={
                  updatePlanLoading ||
                  documentNumberDraft === plan.documentNumberBase ||
                  !/^[0-9]{9}$/.test(documentNumberDraft)
                }
                onClick={async () => {
                  setDocumentNumberMessage(null);
                  try {
                    await updatePlan(plan.id, { documentNumberBase: documentNumberDraft });
                    setDocumentNumberMessage({ kind: 'ok', text: '문서번호 베이스가 저장되었습니다.' });
                  } catch (error) {
                    const text =
                      error instanceof ApolloError
                        ? error.graphQLErrors
                            .map((g) => g.message.trim())
                            .filter(Boolean)
                            .join(' ') || error.message.trim()
                        : error instanceof Error
                          ? error.message
                          : '저장에 실패했습니다.';
                    setDocumentNumberMessage({ kind: 'err', text: text.length > 0 ? text : '저장에 실패했습니다.' });
                  }
                }}
              >
                {updatePlanLoading ? '저장 중...' : '저장'}
              </Button>
            </div>
            {documentNumberMessage ? (
              <p
                className={`mt-2 text-sm ${documentNumberMessage.kind === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}
                role={documentNumberMessage.kind === 'err' ? 'alert' : undefined}
              >
                {documentNumberMessage.text}
              </p>
            ) : null}
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
