import { useEffect, useState } from 'react';
import { PdfShareReadySheet } from '../../../components/PdfShareReadySheet';
import type { PreparedPdfShare } from '../../../lib/share-pdf';
import {
  getEstimatePdfShareLabel,
  useEstimatePdfDownload,
} from '../hooks/use-estimate-pdf-download';
import { useEstimateSource } from '../hooks/use-estimate-source';

const LIGHT_CLASS =
  'shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 md:text-xs';

const DARK_CLASS =
  'rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40';

export function EstimatePdfShareButton({
  planVersionId,
  variant = 'light',
  className,
}: {
  planVersionId: string;
  variant?: 'light' | 'dark';
  className?: string;
}): JSX.Element {
  const { data, loading } = useEstimateSource({
    mode: 'version',
    versionId: planVersionId,
    draftKey: null,
  });
  const { downloading, phase, prepareEstimatePdfShare } = useEstimatePdfDownload();
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedPdfShare | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // 버전이 바뀌면 캐시 무효화 (같은 버전이면 재사용)
  useEffect(() => {
    setPrepared(null);
    setSheetOpen(false);
  }, [planVersionId]);

  const preparePdf = async (): Promise<PreparedPdfShare> => {
    if (!data) {
      throw new Error('견적서 데이터를 준비한 뒤 다시 시도해주세요.');
    }
    return prepareEstimatePdfShare({ data });
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
        disabled={downloading || loading || !data}
        title={error ?? (prepared ? '캐시된 견적서 PDF 공유' : '견적서 PDF 공유')}
        onClick={() => void handleShareClick()}
      >
        {getEstimatePdfShareLabel(phase)}
      </button>
      <PdfShareReadySheet
        open={sheetOpen}
        prepared={prepared}
        documentLabel="견적서"
        regenerating={downloading}
        onClose={() => setSheetOpen(false)}
        onRegenerate={() => void handleRegenerate()}
      />
    </>
  );
}
