import { Button, Card } from '@tour/ui';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EstimateDocument } from '../features/estimate/components/EstimateDocument';
import { useEstimateSource } from '../features/estimate/hooks/use-estimate-source';
import type { EstimateSourceMode } from '../features/estimate/model/types';
import '../features/estimate/styles/estimate-print.css';

export function EstimatePrintPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const modeParam = searchParams.get('mode');
  const mode: EstimateSourceMode = modeParam === 'version' ? 'version' : 'draft';
  const versionId = searchParams.get('versionId');
  const draftKey = searchParams.get('draftKey');
  const autoPrint = searchParams.get('autoprint') === '1';

  const { data, loading, errorMessage } = useEstimateSource({
    mode,
    versionId,
    draftKey,
  });

  useEffect(() => {
    if (!autoPrint || loading || !data || errorMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 150);

    return () => window.clearTimeout(timer);
  }, [autoPrint, data, errorMessage, loading]);

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
          <Button onClick={() => window.print()}>인쇄/PDF 저장</Button>
        </div>
      </div>

      {loading ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">문서 데이터를 준비 중입니다...</Card>
      ) : null}

      {!loading && errorMessage ? (
        <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{errorMessage}</Card>
      ) : null}

      {!loading && !errorMessage && data ? <EstimateDocument data={data} /> : null}
    </section>
  );
}
