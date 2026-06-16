import { Button, Card } from '@tour/ui';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConfirmationDocument } from '../features/confirmation/components/ConfirmationDocument';
import { useLatestPublishedConfirmationDocument } from '../features/confirmation/hooks/use-confirmation-document';
import { snapshotToDocumentData } from '../features/confirmation/utils/format';

export function ConfirmationPrintPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const confirmedTripId = searchParams.get('confirmedTripId') ?? '';
  const { document, loading } = useLatestPublishedConfirmationDocument(confirmedTripId || undefined);
  const previewData = useMemo(
    () => (document ? snapshotToDocumentData(document.snapshot) : null),
    [document],
  );

  return (
    <section className="confirmation-print-root grid gap-4 p-4">
      <div className="confirmation-no-print flex items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          {document ? `확정서 v${document.versionNumber}` : '확정서 미리보기'}
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          이전 화면
        </Button>
      </div>

      {loading ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">확정서를 불러오는 중...</Card>
      ) : null}

      {!loading && !previewData ? (
        <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          발행된 확정서가 없습니다.
        </Card>
      ) : null}

      {!loading && previewData ? <ConfirmationDocument data={previewData} viewMode="output" /> : null}
    </section>
  );
}
