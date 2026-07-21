import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, Card } from '@tour/ui';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { resolveUserDisplayNameText } from '../features/plan/components/UserDisplayName';
import { ConfirmationBuilderForm } from '../features/confirmation/components/ConfirmationBuilderForm';
import { ConfirmationBuilderMemoSection } from '../features/confirmation/components/ConfirmationBuilderMemoSection';
import { ConfirmationDocument } from '../features/confirmation/components/ConfirmationDocument';
import {
  useConfirmationDocument,
  useConfirmationDraftDefaults,
  useLatestConfirmationDocument,
  useLatestPublishedConfirmationDocument,
  useSaveConfirmationDocument,
  useSaveConfirmationDocumentMemo,
} from '../features/confirmation/hooks/use-confirmation-document';
import { useConfirmationAppendixData } from '../features/confirmation/hooks/use-confirmation-appendix-data';
import { EstimateDocument } from '../features/estimate/components/EstimateDocument';
import { EstimatePreviewScaler } from '../features/estimate/components/EstimatePreviewScaler';
import { useEstimateSource } from '../features/estimate/hooks/use-estimate-source';
import type { EstimatePage2Editor } from '../features/estimate/model/types';
import type { ConfirmationBuilderState } from '../features/confirmation/model/types';
import { resolveMainPlanRowPhysicalIndex } from '../features/plan/plan-stop-row';
import { snapshotToDocumentData } from '../features/confirmation/utils/format';
import { planStopRowsToAppendixRows } from '../features/confirmation/utils/resolve-confirmation-appendix';
import {
  parseConfirmationBuilderFromDocumentId,
  parseConfirmationBuilderSource,
  resolveConfirmationBuilderSourceLabel,
  type ConfirmationBuilderSource,
} from '../features/confirmation/utils/confirmation-builder-source';
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

function resolveEffectiveSource(
  requestedSource: ConfirmationBuilderSource | null,
  latestStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined,
): ConfirmationBuilderSource {
  if (requestedSource) {
    return requestedSource;
  }
  if (latestStatus === 'DRAFT') {
    return 'draft';
  }
  return 'fresh';
}

export function ConfirmationBuilderPage(): JSX.Element {
  const navigate = useNavigate();
  const { tripId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const requestedSource = parseConfirmationBuilderSource(searchParams);
  const fromDocumentId = parseConfirmationBuilderFromDocumentId(searchParams);
  const { trip, loading: tripLoading } = useConfirmedTrip(tripId);
  const { document: latestDocument, loading: latestLoading, refetch: refetchLatest } =
    useLatestConfirmationDocument(tripId);
  const {
    document: publishedDocument,
    loading: publishedLoading,
    refetch: refetchPublished,
  } = useLatestPublishedConfirmationDocument(tripId);
  const effectiveSource = resolveEffectiveSource(requestedSource, latestDocument?.status);
  const shouldLoadSpecificDocument =
    effectiveSource === 'version'
    || (effectiveSource === 'draft' && !!fromDocumentId);
  const shouldLoadDraftSnapshot = effectiveSource === 'draft' && !fromDocumentId;
  const shouldLoadPublishedSnapshot = effectiveSource === 'published' && !fromDocumentId;
  const shouldLoadDefaults = effectiveSource === 'fresh';
  const { document: sourceDocument, loading: sourceDocumentLoading, refetch: refetchSourceDocument } = useConfirmationDocument(
    shouldLoadSpecificDocument ? fromDocumentId ?? undefined : undefined,
  );
  const { defaults, loading: defaultsLoading } = useConfirmationDraftDefaults(
    shouldLoadDefaults ? tripId : undefined,
  );
  const { save, loading: saving } = useSaveConfirmationDocument();
  const { saveMemo, loading: memoSaving } = useSaveConfirmationDocumentMemo({ confirmedTripId: tripId });
  const [state, setState] = useState<ConfirmationBuilderState | null>(null);
  const [builderMemo, setBuilderMemo] = useState('');
  const [isEstimatePreviewOpen, setIsEstimatePreviewOpen] = useState(true);
  const appendixHydratedRef = useRef(false);

  useEffect(() => {
    appendixHydratedRef.current = false;
  }, [tripId, effectiveSource, fromDocumentId]);

  useEffect(() => {
    if (shouldLoadSpecificDocument) {
      if (sourceDocumentLoading) {
        return;
      }
      if (sourceDocument) {
        setState(sourceDocument.snapshot);
      }
      return;
    }
    if (latestLoading || (shouldLoadPublishedSnapshot && publishedLoading)) {
      return;
    }
    if (shouldLoadDraftSnapshot) {
      if (latestDocument?.status === 'DRAFT') {
        setState(latestDocument.snapshot);
      }
      return;
    }
    if (shouldLoadPublishedSnapshot) {
      if (publishedDocument) {
        setState(publishedDocument.snapshot);
      }
      return;
    }
    if (defaultsLoading) {
      return;
    }
    if (defaults?.snapshot) {
      setState(defaults.snapshot);
    }
  }, [
    defaults,
    defaultsLoading,
    latestDocument,
    latestLoading,
    publishedDocument,
    publishedLoading,
    shouldLoadDraftSnapshot,
    shouldLoadDefaults,
    shouldLoadPublishedSnapshot,
    shouldLoadSpecificDocument,
    sourceDocument,
    sourceDocumentLoading,
  ]);

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

  useEffect(() => {
    if (appendixHydratedRef.current || !state || !linkedEstimateData || !planVersionId) {
      return;
    }
    if (state.appendixPlanStops?.length) {
      appendixHydratedRef.current = true;
      return;
    }
    appendixHydratedRef.current = true;
    setState((current) =>
      current
        ? {
            ...current,
            appendixPlanStops: planStopRowsToAppendixRows(linkedEstimateData.planStops),
            overallMovementIntensityColorOverride:
              linkedEstimateData.overallMovementIntensityColorOverride ?? null,
            sourcePlanVersionId: current.sourcePlanVersionId ?? planVersionId,
          }
        : current,
    );
  }, [linkedEstimateData, planVersionId, state]);

  const appendixSourcePlanVersionId = state?.sourcePlanVersionId ?? planVersionId;
  const { data: baselineEstimateData } = useEstimateSource({
    mode: 'version',
    versionId: appendixSourcePlanVersionId,
    draftKey: null,
  });
  const baselineAppendixPlanStops = useMemo(
    () =>
      baselineEstimateData ? planStopRowsToAppendixRows(baselineEstimateData.planStops) : null,
    [baselineEstimateData],
  );
  const baselineOverallMovementIntensityColorOverride =
    baselineEstimateData?.overallMovementIntensityColorOverride ?? null;

  const { appendixData: confirmationAppendixData, loading: confirmationAppendixLoading } =
    useConfirmationAppendixData({
      planVersionId: appendixSourcePlanVersionId,
      appendixPlanStops: state?.appendixPlanStops,
      overallMovementIntensityColorOverride: state?.overallMovementIntensityColorOverride,
    });

  const appendixPage2Editor = useMemo<EstimatePage2Editor>(
    () => ({
      onMovementIntensityColorOverrideChange: (mainRowIndex, color) => {
        const structureRows =
          confirmationAppendixData?.planStops ?? linkedEstimateData?.planStops ?? [];
        const physicalIndex = resolveMainPlanRowPhysicalIndex(structureRows, mainRowIndex);
        setState((current) => {
          if (!current?.appendixPlanStops?.length) {
            return current;
          }
          const nextRows = current.appendixPlanStops.map((row, index) =>
            index === physicalIndex ? { ...row, movementIntensityColorOverride: color } : row,
          );
          return { ...current, appendixPlanStops: nextRows };
        });
      },
      onOverallMovementIntensityColorOverrideChange: (color) => {
        setState((current) =>
          current ? { ...current, overallMovementIntensityColorOverride: color } : current,
        );
      },
    }),
    [confirmationAppendixData?.planStops, linkedEstimateData?.planStops],
  );

  const scheduleRowMeta = useMemo(() => {
    const stops = confirmationAppendixData?.planStops ?? linkedEstimateData?.planStops;
    return stops?.map((row) => ({ rowType: row.rowType ?? 'MAIN' })) ?? [];
  }, [confirmationAppendixData?.planStops, linkedEstimateData?.planStops]);

  const hasSourcePlanVersionMismatch =
    !!state?.sourcePlanVersionId
    && !!planVersionId
    && state.sourcePlanVersionId !== planVersionId;

  const previewData = useMemo(
    () => (state ? snapshotToDocumentData(state, { consolidateAccommodationLines: true }) : null),
    [state],
  );
  const sourceVersionNumber =
    sourceDocument?.versionNumber
    ?? (effectiveSource === 'published' ? publishedDocument?.versionNumber : undefined)
    ?? (effectiveSource === 'draft' && latestDocument?.status === 'DRAFT'
      ? latestDocument.versionNumber
      : undefined)
    ?? null;
  const sourceDetail = resolveConfirmationBuilderSourceLabel(effectiveSource, sourceVersionNumber);

  const memoTargetDocument = useMemo(() => {
    if (shouldLoadSpecificDocument && sourceDocument?.status === 'DRAFT') {
      return sourceDocument;
    }
    if (shouldLoadDraftSnapshot && latestDocument?.status === 'DRAFT') {
      return latestDocument;
    }
    return null;
  }, [latestDocument, shouldLoadDraftSnapshot, shouldLoadSpecificDocument, sourceDocument]);

  useEffect(() => {
    setBuilderMemo(memoTargetDocument?.memo?.content ?? '');
  }, [memoTargetDocument?.id, memoTargetDocument?.memo?.content]);

  const isLoadingInitialState =
    tripLoading
    || latestLoading
    || (shouldLoadPublishedSnapshot && publishedLoading)
    || (shouldLoadDefaults && defaultsLoading)
    || (shouldLoadSpecificDocument && sourceDocumentLoading);

  if (isLoadingInitialState) {
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

  if (shouldLoadDraftSnapshot && latestDocument?.status !== 'DRAFT') {
    return (
      <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        이어쓸 임시저장 확정서가 없습니다.
      </Card>
    );
  }

  if (effectiveSource === 'version' && !fromDocumentId) {
    return (
      <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        기준으로 삼을 확정서 버전이 지정되지 않았습니다.
      </Card>
    );
  }

  if (shouldLoadSpecificDocument && !sourceDocumentLoading && !sourceDocument) {
    return (
      <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        선택한 확정서 버전을 찾을 수 없습니다.
      </Card>
    );
  }

  if (
    shouldLoadSpecificDocument
    && sourceDocument
    && sourceDocument.confirmedTripId !== tripId
  ) {
    return (
      <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        다른 확정 건의 확정서는 기준으로 사용할 수 없습니다.
      </Card>
    );
  }

  if (
    shouldLoadSpecificDocument
    && sourceDocument
    && effectiveSource === 'draft'
    && sourceDocument.status !== 'DRAFT'
  ) {
    return (
      <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        임시저장 상태의 확정서만 이어쓸 수 있습니다.
      </Card>
    );
  }

  if (shouldLoadPublishedSnapshot && !publishedDocument) {
    return (
      <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        복사할 발행된 확정서가 없습니다. 견적·확정건·계약서 기준으로 새로 작성해 주세요.
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

  const handleRestoreSchedule = () => {
    if (!baselineAppendixPlanStops) {
      return;
    }
    setState((current) =>
      current
        ? {
            ...current,
            appendixPlanStops: baselineAppendixPlanStops.map((row) => ({ ...row })),
            overallMovementIntensityColorOverride: baselineOverallMovementIntensityColorOverride,
          }
        : current,
    );
  };

  const handleSaveBuilderMemo = async (content?: string) => {
    if (!memoTargetDocument?.id) {
      return;
    }
    const nextMemo = content ?? builderMemo;
    if (content !== undefined) {
      setBuilderMemo(content);
    }
    await saveMemo(memoTargetDocument.id, nextMemo);
    await Promise.all([
      refetchLatest(),
      shouldLoadSpecificDocument ? refetchSourceDocument() : Promise.resolve(),
    ]);
  };

  const handleSave = async () => {
    try {
      const payload: ConfirmationBuilderState = {
        ...state,
        sourcePlanVersionId: state.sourcePlanVersionId ?? planVersionId,
      };
      const saved = await save(tripId, payload, true);
      if (!saved) {
        throw new Error('저장 결과가 없습니다.');
      }
      if (builderMemo.trim()) {
        await saveMemo(saved.id, builderMemo);
      }
      await Promise.all([refetchLatest(), refetchPublished()]);
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
        <main className="confirmation-builder-editor-column min-h-0 overflow-y-auto bg-slate-50 px-3 py-4 lg:h-full lg:px-4 lg:py-4">
          <div className="confirmation-builder-editor-header mb-3 flex shrink-0 flex-col gap-2">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">확정서 빌더</h1>
              <p className="mt-1 text-xs leading-snug text-slate-600">
                {resolveUserDisplayNameText(trip.user)} · {trip.planVersion?.meta?.leaderName ?? trip.destination ?? '확정 여행'}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">{sourceDetail}</p>
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

          {hasSourcePlanVersionMismatch ? (
            <Card className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              연결 견적 버전이 바뀌었습니다. 확정서 일정표는 v
              {linkedPlanVersion?.versionNumber ?? '?'} 기준으로 유지됩니다. 「기존 일정으로
              초기화」를 사용하면 현재 연결 견적 일정표로 되돌릴 수 있습니다.
            </Card>
          ) : null}

          <ConfirmationBuilderMemoSection
            value={builderMemo}
            onChange={setBuilderMemo}
            onSave={handleSaveBuilderMemo}
            saving={memoSaving}
            saveOnPublish={!memoTargetDocument}
            updatedByEmployeeName={memoTargetDocument?.memo?.updatedByEmployee?.name ?? null}
          />

          <ConfirmationBuilderForm
            value={state}
            onChange={setState}
            scheduleEditor={{
              rows: state.appendixPlanStops ?? [],
              rowMeta: scheduleRowMeta,
              onRowsChange: (appendixPlanStops) =>
                setState((current) => (current ? { ...current, appendixPlanStops } : current)),
              onRestore: handleRestoreSchedule,
              restoreDisabled: !baselineAppendixPlanStops,
              loading: linkedEstimateLoading && !state.appendixPlanStops?.length,
            }}
          />
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
            description="Page1 입력값과 일정표 편집 내용이 확정서에 반영됩니다."
            badge={confirmationAppendixLoading ? '일정표·안내 동기화 중' : '실시간 반영'}
            loading={confirmationAppendixLoading}
            loadingMessage="확정서 일정표·안내 페이지를 불러오는 중..."
          >
            <div className="estimate-preview-frame confirmation-builder-preview-frame confirmation-builder-preview-frame--confirmation">
              <ConfirmationDocument
                data={previewData}
                appendixData={confirmationAppendixData}
                appendixPage2Editor={appendixPage2Editor}
                viewMode="screen-preview"
              />
            </div>
          </DocumentPreviewPanel>
        </aside>
      </div>
    </section>
  );
}
