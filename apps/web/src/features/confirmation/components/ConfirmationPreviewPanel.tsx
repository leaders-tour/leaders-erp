import { useState } from 'react';
import { Button } from '@tour/ui';
import { ConfirmationDocument } from '../components/ConfirmationDocument';
import { useConfirmationAppendixData } from '../hooks/use-confirmation-appendix-data';
import {
  getConfirmationPdfDownloadLabel,
  useConfirmationPdfDownload,
} from '../hooks/use-confirmation-pdf-download';
import type { ConfirmationDocumentSnapshot } from '../model/types';
import { snapshotToDocumentData } from '../utils/format';

interface ConfirmationPreviewPanelProps {
  snapshot: ConfirmationDocumentSnapshot;
  planVersionId?: string | null;
  isDraft?: boolean;
}

export function ConfirmationPreviewPanel({
  snapshot,
  planVersionId,
  isDraft = false,
}: ConfirmationPreviewPanelProps) {
  const { appendixData, loading } = useConfirmationAppendixData(planVersionId);
  const { downloading, phase, downloadConfirmationPdf } = useConfirmationPdfDownload();
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloadError(null);
    try {
      await downloadConfirmationPdf({
        snapshot,
        appendixData: appendixData ?? null,
        isDraft,
      });
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'PDF 다운로드에 실패했습니다.');
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          disabled={downloading || loading}
          onClick={() => void handleDownload()}
        >
          {getConfirmationPdfDownloadLabel(phase)}
        </Button>
      </div>
      {loading ? <p className="text-sm text-slate-500">일정표·안내 페이지를 불러오는 중...</p> : null}
      {downloadError ? <p className="text-sm text-rose-600">{downloadError}</p> : null}
      <ConfirmationDocument
        data={snapshotToDocumentData(snapshot)}
        appendixData={appendixData}
        viewMode="screen-preview"
      />
    </div>
  );
}
