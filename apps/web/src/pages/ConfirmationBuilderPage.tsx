import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from '@tour/ui';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmationBuilderForm } from '../features/confirmation/components/ConfirmationBuilderForm';
import { ConfirmationDocument } from '../features/confirmation/components/ConfirmationDocument';
import {
  useConfirmationDraftDefaults,
  useLatestConfirmationDocument,
  useSaveConfirmationDocument,
} from '../features/confirmation/hooks/use-confirmation-document';
import { useConfirmationAppendixData } from '../features/confirmation/hooks/use-confirmation-appendix-data';
import {
  getConfirmationPdfDownloadLabel,
  useConfirmationPdfDownload,
} from '../features/confirmation/hooks/use-confirmation-pdf-download';
import type { ConfirmationBuilderState } from '../features/confirmation/model/types';
import { snapshotToDocumentData } from '../features/confirmation/utils/format';
import { useConfirmedTrip } from '../features/confirmed-trip/hooks';

export function ConfirmationBuilderPage(): JSX.Element {
  const navigate = useNavigate();
  const { tripId = '' } = useParams();
  const { trip, loading: tripLoading } = useConfirmedTrip(tripId);
  const { document, loading: documentLoading, refetch: refetchDocument } = useLatestConfirmationDocument(tripId);
  const shouldLoadDefaults = !documentLoading && !document;
  const { defaults, loading: defaultsLoading } = useConfirmationDraftDefaults(
    shouldLoadDefaults ? tripId : undefined,
  );
  const { save, loading: saving } = useSaveConfirmationDocument();
  const { downloading, phase, downloadConfirmationPdf } = useConfirmationPdfDownload();
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [state, setState] = useState<ConfirmationBuilderState | null>(null);

  useEffect(() => {
    if (documentLoading) {
      return;
    }
    if (document?.status === 'DRAFT' || document?.status === 'PUBLISHED') {
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

  const previewData = useMemo(() => (state ? snapshotToDocumentData(state) : null), [state]);
  const planVersionId = document?.planVersionId ?? defaults?.planVersionId ?? trip?.planVersionId ?? null;
  const { appendixData, loading: appendixLoading } = useConfirmationAppendixData(planVersionId);

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

  if (!state || !previewData) {
    return (
      <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        확정서 기본값을 불러오지 못했습니다. 견적서가 연결된 확정 건인지 확인해주세요.
      </Card>
    );
  }

  const handleSave = async (publish: boolean) => {
    try {
      const saved = await save(tripId, state, publish);
      if (!saved) {
        throw new Error('저장 결과가 없습니다.');
      }
      await refetchDocument();
      if (publish) {
        navigate(`/confirmed-trips/${tripId}`);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.');
    }
  };

  const handleDownload = async () => {
    setDownloadError(null);
    try {
      await downloadConfirmationPdf({
        snapshot: state,
        appendixData: appendixData ?? null,
        isDraft: document?.status !== 'PUBLISHED',
      });
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'PDF 다운로드에 실패했습니다.');
    }
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">확정서 빌더</h1>
          <p className="mt-1 text-sm text-slate-600">{trip.user.name} · {trip.planVersion?.meta?.leaderName ?? trip.destination ?? '확정 여행'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => navigate(`/confirmed-trips/${tripId}`)}>
            확정 상세로
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => navigate(`/documents/confirmation?confirmedTripId=${encodeURIComponent(tripId)}`)}
          >
            크게 보기
          </Button>
          <Button
            type="button"
            disabled={downloading || appendixLoading || !state}
            onClick={() => void handleDownload()}
          >
            {getConfirmationPdfDownloadLabel(phase)}
          </Button>
        </div>
      </div>

      {downloadError ? (
        <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{downloadError}</Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <ConfirmationBuilderForm
            value={state}
            onChange={setState}
            saving={saving}
            onSaveDraft={() => void handleSave(false)}
            onPublish={() => void handleSave(true)}
          />
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">미리보기</h2>
          {appendixLoading ? (
            <p className="mb-3 text-xs text-slate-500">일정표·안내 페이지를 불러오는 중...</p>
          ) : null}
          <ConfirmationDocument data={previewData} appendixData={appendixData} viewMode="screen-preview" />
        </Card>
      </div>
    </section>
  );
}
