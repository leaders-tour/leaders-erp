import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, Card } from '@tour/ui';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmationBuilderForm } from '../features/confirmation/components/ConfirmationBuilderForm';
import { ConfirmationDocument } from '../features/confirmation/components/ConfirmationDocument';
import {
  useConfirmationDraftDefaults,
  useLatestConfirmationDocument,
  useSaveConfirmationDocument,
} from '../features/confirmation/hooks/use-confirmation-document';
import { EstimateDocument } from '../features/estimate/components/EstimateDocument';
import { EstimatePreviewScaler } from '../features/estimate/components/EstimatePreviewScaler';
import { useEstimateSource } from '../features/estimate/hooks/use-estimate-source';
import type { ConfirmationBuilderState } from '../features/confirmation/model/types';
import { snapshotToDocumentData } from '../features/confirmation/utils/format';
import { useConfirmedTrip } from '../features/confirmed-trip/hooks';
import '../features/confirmation/styles/confirmation-builder-page.css';

function DocumentPreviewPanel({
  title,
  description,
  badge,
  loadingMessage,
  errorMessage,
  loading,
  children,
}: {
  title: string;
  description: string;
  badge: string;
  loadingMessage?: string;
  errorMessage?: string | null;
  loading?: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="estimate-preview-panel rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-600">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
            {badge}
          </div>
        </div>
      </div>

      {loading && loadingMessage ? (
        <p className="mb-3 text-xs text-slate-500">{loadingMessage}</p>
      ) : null}

      {errorMessage ? (
        <Card className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMessage}
        </Card>
      ) : (
        children
      )}
    </div>
  );
}

export function ConfirmationBuilderPage(): JSX.Element {
  const navigate = useNavigate();
  const { tripId = '' } = useParams();
  const { trip, loading: tripLoading } = useConfirmedTrip(tripId);
  const { document, loading: documentLoading, refetch: refetchDocument } = useLatestConfirmationDocument(tripId);
  const isResumingDraft = document?.status === 'DRAFT';
  const shouldLoadDefaults = !documentLoading && !isResumingDraft;
  const { defaults, loading: defaultsLoading } = useConfirmationDraftDefaults(
    shouldLoadDefaults ? tripId : undefined,
  );
  const { save, loading: saving } = useSaveConfirmationDocument();
  const [state, setState] = useState<ConfirmationBuilderState | null>(null);
  const [isEstimatePreviewOpen, setIsEstimatePreviewOpen] = useState(true);

  useEffect(() => {
    if (documentLoading) {
      return;
    }
    if (document?.status === 'DRAFT') {
      setState(document.snapshot);
      return;
    }
    if (defaultsLoading) {
      return;
    }
    if (defaults?.snapshot) {
      setState(defaults.snapshot);
    }
  }, [document, documentLoading, defaults, defaultsLoading]);

  const previewData = useMemo(
    () => (state ? snapshotToDocumentData(state, { consolidateAccommodationLines: true }) : null),
    [state],
  );
  const planVersionId = trip?.planVersionId ?? null;
  const {
    data: linkedEstimateData,
    loading: linkedEstimateLoading,
    errorMessage: linkedEstimateError,
    version: linkedPlanVersion,
  } = useEstimateSource({
    mode: 'version',
    versionId: planVersionId,
    draftKey: null,
  });

  if (tripLoading || documentLoading || (shouldLoadDefaults && defaultsLoading)) {
    return <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">확정서 데이터를 불러오는 중...</Card>;
  }

  if (!trip || trip.status !== 'ACTIVE') {
    return (
      <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        ACTIVE 확정 여행만 확정서를 만들 수 있습니다.
      </Card>
    );
  }

  if (!planVersionId) {
    return (
      <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        연결된 견적서 버전이 없어 확정서를 만들 수 없습니다.
      </Card>
    );
  }

  if (!state || !previewData) {
    return (
      <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        확정서 기본값을 불러오지 못했습니다. 견적서가 연결된 확정 건인지 확인해주세요.
      </Card>
    );
  }

  const handleSave = async () => {
    try {
      const saved = await save(tripId, state, true);
      if (!saved) {
        throw new Error('저장 결과가 없습니다.');
      }
      await refetchDocument();
      navigate(`/confirmation-documents/${saved.id}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.');
    }
  };

  const linkedEstimateBadge = linkedEstimateLoading
    ? '여행지 안내 동기화 중'
    : linkedPlanVersion
      ? `v${linkedPlanVersion.versionNumber} · 저장된 버전`
      : '저장된 버전';

  return (
    <section className="confirmation-builder-page min-h-screen text-slate-900 lg:h-screen lg:min-h-0">
      <div
        className={`confirmation-builder-workspace grid gap-6 lg:h-full lg:min-h-0 lg:gap-0 ${
          isEstimatePreviewOpen
            ? 'confirmation-builder-workspace--with-estimate'
            : 'confirmation-builder-workspace--without-estimate'
        }`}
      >
        <main className="confirmation-builder-editor-column grid content-start gap-3 bg-slate-50 px-3 py-4 lg:h-full lg:overflow-y-auto lg:px-4 lg:py-4">
          <div className="confirmation-builder-editor-header flex flex-col gap-2">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">확정서 빌더</h1>
              <p className="mt-1 text-xs leading-snug text-slate-600">
                {trip.user.name} · {trip.planVersion?.meta?.leaderName ?? trip.destination ?? '확정 여행'}
              </p>
            </div>
            <div className="confirmation-builder-editor-actions flex flex-col gap-2">
              <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={() => setIsEstimatePreviewOpen((current) => !current)}
              >
                {isEstimatePreviewOpen ? '견적서 미리보기 끄기' : '견적서 미리보기 켜기'}
              </Button>
              <Button variant="outline" type="button" className="w-full" onClick={() => navigate(-1)}>
                뒤로가기
              </Button>
              <Button type="button" variant="primary" className="w-full" disabled={saving} onClick={() => void handleSave()}>
                발행 저장
              </Button>
            </div>
          </div>

          <ConfirmationBuilderForm value={state} onChange={setState} />
        </main>

        {isEstimatePreviewOpen ? (
          <aside className="confirmation-builder-preview-column bg-slate-100/80 px-3 py-4 sm:px-4 lg:h-full lg:overflow-y-auto lg:border-l lg:border-slate-200 lg:py-4">
            <DocumentPreviewPanel
              title="연결 견적서 미리보기"
              description="확정 여행에 연결된 견적서·일정표 버전입니다. 참고용으로만 표시됩니다."
              badge={linkedEstimateBadge}
              loading={linkedEstimateLoading}
              loadingMessage="견적서 미리보기를 불러오는 중..."
              errorMessage={linkedEstimateError}
            >
              {linkedEstimateData ? (
                <div className="estimate-preview-frame confirmation-builder-preview-frame">
                  <EstimatePreviewScaler>
                    <EstimateDocument data={linkedEstimateData} viewMode="screen-preview" />
                  </EstimatePreviewScaler>
                </div>
              ) : linkedEstimateLoading ? null : (
                <Card className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                  미리보기 데이터를 준비 중입니다...
                </Card>
              )}
            </DocumentPreviewPanel>
          </aside>
        ) : null}

        <aside className="confirmation-builder-preview-column confirmation-builder-preview-column--confirmation bg-slate-100/80 px-3 py-4 sm:px-4 lg:h-full lg:overflow-y-auto lg:border-l lg:border-slate-200 lg:py-4">
          <DocumentPreviewPanel
            title="실시간 확정서 미리보기"
            description="좌측 입력값이 문서에 바로 반영됩니다."
            badge={linkedEstimateLoading ? '일정표·안내 동기화 중' : '실시간 반영'}
            loading={linkedEstimateLoading}
            loadingMessage="연결 견적서 기준 일정표·안내 페이지를 불러오는 중..."
          >
            <div className="estimate-preview-frame confirmation-builder-preview-frame confirmation-builder-preview-frame--confirmation">
              <ConfirmationDocument
                data={previewData}
                appendixData={linkedEstimateData}
                viewMode="screen-preview"
              />
            </div>
          </DocumentPreviewPanel>
        </aside>
      </div>
    </section>
  );
}
