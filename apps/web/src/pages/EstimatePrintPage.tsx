import { useState } from 'react';
import { Button, Card } from '@tour/ui';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EstimateDocument } from '../features/estimate/components/EstimateDocument';
import { getEstimatePdfDownloadLabel, useEstimatePdfDownload } from '../features/estimate/hooks/use-estimate-pdf-download';
import { useEstimateSource } from '../features/estimate/hooks/use-estimate-source';
import type { EstimateSourceMode } from '../features/estimate/model/types';

export function EstimatePrintPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const modeParam = searchParams.get('mode');
  const mode: EstimateSourceMode = modeParam === 'version' ? 'version' : 'draft';
  const versionId = searchParams.get('versionId');
  const draftKey = searchParams.get('draftKey');
  const { downloading, phase, downloadEstimatePdf } = useEstimatePdfDownload();

  const { data, loading, errorMessage } = useEstimateSource({
    mode,
    versionId,
    draftKey,
  });

  const handleDownloadClick = async (): Promise<void> => {
    setDownloadError(null);

    try {
      if (!data) {
        throw new Error('견적서 데이터를 준비한 뒤 다시 시도해주세요.');
      }

      await downloadEstimatePdf({
        data,
      });
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'PDF 다운로드에 실패했습니다.');
    }
  };

  return (
    <section className="estimate-print-root">
      <div className="estimate-toolbar estimate-no-print">
        <div className="text-xs text-slate-600">
          출력 소스: {mode === 'version' ? '저장된 버전' : '일정 빌더 임시본'}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            이전 화면
          </Button>
          <Button onClick={() => void handleDownloadClick()} disabled={downloading || loading || !data}>
            {getEstimatePdfDownloadLabel(phase)}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">문서 데이터를 준비 중입니다...</Card>
      ) : null}

      {!loading && errorMessage ? (
        <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{errorMessage}</Card>
      ) : null}

      {!loading && !errorMessage && downloadError ? (
        <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{downloadError}</Card>
      ) : null}

      {!loading && !errorMessage && data ? <EstimateDocument data={data} /> : null}
    </section>
  );
}
