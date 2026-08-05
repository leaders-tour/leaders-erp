import { useEffect, useState } from 'react';
import { PdfShareReadySheet } from '../../../components/PdfShareReadySheet';
import type { PreparedPdfShare } from '../../../lib/share-pdf';
import { useConfirmationAppendixData } from '../hooks/use-confirmation-appendix-data';
import {
  getConfirmationPdfShareLabel,
  useConfirmationPdfDownload,
} from '../hooks/use-confirmation-pdf-download';
import type { ConfirmationDocumentSnapshot } from '../model/types';

const LIGHT_CLASS =
  'shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 md:text-xs';

const DARK_CLASS =
  'rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40';

export function ConfirmationPdfShareButton({
  snapshot,
  planVersionId,
  confirmationDocumentId,
  isDraft = false,
  variant = 'light',
  className,
}: {
  snapshot: ConfirmationDocumentSnapshot;
  planVersionId?: string | null;
  confirmationDocumentId?: string | null;
  isDraft?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}): JSX.Element {
  const { appendixData, loading } = useConfirmationAppendixData({
    planVersionId: planVersionId ?? snapshot.sourcePlanVersionId,
    appendixPlanStops: snapshot.appendixPlanStops,
    overallMovementIntensityColorOverride: snapshot.overallMovementIntensityColorOverride,
  });
  const { downloading, phase, prepareConfirmationPdfShare } = useConfirmationPdfDownload();
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedPdfShare | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const cacheKey =
    confirmationDocumentId ??
    `${planVersionId ?? snapshot.sourcePlanVersionId ?? ''}:${snapshot.leaderName}:${snapshot.documentNumber ?? ''}:${isDraft ? '1' : '0'}`;

  // 문서가 바뀌면 캐시 무효화
  useEffect(() => {
    setPrepared(null);
    setSheetOpen(false);
  }, [cacheKey]);

  const preparePdf = async (): Promise<PreparedPdfShare> => {
    return prepareConfirmationPdfShare({
      snapshot,
      appendixData: appendixData ?? null,
      isDraft,
    });
  };

  const handleShareClick = async (): Promise<void> => {
    setError(null);
    try {
      if (prepared) {
        setSheetOpen(true);
        return;
      }
      const next = await preparePdf();
      setPrepared(next);
      setSheetOpen(true);
    } catch (shareError) {
      const message =
        shareError instanceof Error ? shareError.message : 'PDF 공유 준비에 실패했습니다.';
      setError(message);
      window.alert(message);
    }
  };

  const handleRegenerate = async (): Promise<void> => {
    setError(null);
    try {
      const next = await preparePdf();
      setPrepared(next);
      setSheetOpen(true);
    } catch (shareError) {
      const message =
        shareError instanceof Error ? shareError.message : 'PDF 공유 준비에 실패했습니다.';
      setError(message);
      window.alert(message);
    }
  };

  return (
    <>
      <button
        type="button"
        className={[variant === 'dark' ? DARK_CLASS : LIGHT_CLASS, className].filter(Boolean).join(' ')}
        disabled={downloading || loading}
        title={error ?? (prepared ? '캐시된 확정서 PDF 공유' : '확정서 PDF 공유')}
        onClick={() => void handleShareClick()}
      >
        {getConfirmationPdfShareLabel(phase)}
      </button>
      <PdfShareReadySheet
        open={sheetOpen}
        prepared={prepared}
        documentLabel="확정서"
        regenerating={downloading}
        onClose={() => setSheetOpen(false)}
        onRegenerate={() => void handleRegenerate()}
      />
    </>
  );
}
