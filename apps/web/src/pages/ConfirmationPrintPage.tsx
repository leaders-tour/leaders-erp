import { useMemo, useState } from 'react';
import { Button, Card } from '@tour/ui';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConfirmationDocument } from '../features/confirmation/components/ConfirmationDocument';
import {
  getConfirmationPdfDownloadLabel,
  useConfirmationPdfDownload,
} from '../features/confirmation/hooks/use-confirmation-pdf-download';
import { useLatestPublishedConfirmationDocument } from '../features/confirmation/hooks/use-confirmation-document';
import { useConfirmationAppendixData } from '../features/confirmation/hooks/use-confirmation-appendix-data';
import { snapshotToDocumentData } from '../features/confirmation/utils/format';

export function ConfirmationPrintPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const confirmedTripId = searchParams.get('confirmedTripId') ?? '';
  const { document, loading } = useLatestPublishedConfirmationDocument(confirmedTripId || undefined);
  const { downloading, phase, downloadConfirmationPdf } = useConfirmationPdfDownload();
  const previewData = useMemo(
    () => (document ? snapshotToDocumentData(document.snapshot) : null),
    [document],
  );
  const { appendixData, loading: appendixLoading } = useConfirmationAppendixData(document?.planVersionId);

  const handleDownloadClick = async (): Promise<void> => {
    setDownloadError(null);

    try {
      if (!document || !previewData) {
        throw new Error('확정서 데이터를 준비한 뒤 다시 시도해주세요.');
      }

      await downloadConfirmationPdf({
        snapshot: document.snapshot,
        appendixData: appendixData ?? null,
        isDraft: false,
      });
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'PDF 다운로드에 실패했습니다.');
    }
  };

  return (
    <section className="confirmation-print-root grid gap-4 p-4">
      <div className="confirmation-no-print flex items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          {document ? `확정서 v${document.versionNumber}` : '확정서 미리보기'}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            이전 화면
          </Button>
          <Button
            onClick={() => void handleDownloadClick()}
            disabled={downloading || loading || appendixLoading || !previewData}
          >
            {getConfirmationPdfDownloadLabel(phase)}
          </Button>
        </div>
      </div>

      {loading || appendixLoading ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">확정서를 불러오는 중...</Card>
      ) : null}

      {!loading && !appendixLoading && !previewData ? (
        <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          발행된 확정서가 없습니다.
        </Card>
      ) : null}

      {!loading && !appendixLoading && downloadError ? (
        <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{downloadError}</Card>
      ) : null}

      {!loading && !appendixLoading && previewData ? (
        <ConfirmationDocument data={previewData} appendixData={appendixData} viewMode="output" />
      ) : null}
    </section>
  );
}
