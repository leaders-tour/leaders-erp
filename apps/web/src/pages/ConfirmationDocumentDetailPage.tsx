import { Button, Card } from '@tour/ui';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmationPreviewPanel } from '../features/confirmation/components/ConfirmationPreviewPanel';
import { useConfirmationDocument } from '../features/confirmation/hooks/use-confirmation-document';
import type { ConfirmationDocumentRow } from '../features/confirmation/model/types';
import { useConfirmedTrip } from '../features/confirmed-trip/hooks';

function getStatusLabel(status: ConfirmationDocumentRow['status']): string {
  switch (status) {
    case 'DRAFT':
      return '임시저장';
    case 'PUBLISHED':
      return '발행';
    case 'ARCHIVED':
      return '보관됨';
    default:
      return status;
  }
}

function getDocumentTitle(document: ConfirmationDocumentRow): string {
  const destination = document.snapshot.destination?.trim();
  if (destination) {
    return `${destination} 여정`;
  }
  return '확정 여정';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function ConfirmationDocumentDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { documentId = '' } = useParams();
  const { document, loading } = useConfirmationDocument(documentId);
  const { trip, loading: tripLoading } = useConfirmedTrip(document?.confirmedTripId);

  if (!documentId) {
    return <section className="py-8 text-sm text-slate-600">잘못된 접근입니다.</section>;
  }

  if (loading || tripLoading) {
    return <section className="py-8 text-sm text-slate-600">확정서를 불러오는 중...</section>;
  }

  if (!document) {
    return <section className="py-8 text-sm text-slate-600">확정서를 찾을 수 없습니다.</section>;
  }

  const canEdit = document.status !== 'ARCHIVED' && trip?.status === 'ACTIVE';

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{getDocumentTitle(document)}</h1>
            <p className="mt-1 text-sm text-slate-600">
              v{document.versionNumber} · {getStatusLabel(document.status)}
              {trip?.user.name ? ` · ${trip.user.name}` : ''}
              {document.snapshot.leaderName?.trim() ? ` · 대표자 ${document.snapshot.leaderName.trim()}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>문서번호: {document.documentNumber ?? document.snapshot.documentNumber ?? '-'}</span>
              <span>수정일: {formatDateTime(document.updatedAt)}</span>
              {document.publishedAt ? <span>발행일: {formatDateTime(document.publishedAt)}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/confirmation-builder')}>
              확정서 목록
            </Button>
            <Button variant="outline" onClick={() => navigate(`/confirmed-trips/${document.confirmedTripId}`)}>
              확정 여행 상세
            </Button>
            {canEdit ? (
              <Button onClick={() => navigate(`/confirmed-trips/${document.confirmedTripId}/confirmation-builder`)}>
                수정
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <ConfirmationPreviewPanel
          snapshot={document.snapshot}
          planVersionId={document.planVersionId ?? trip?.planVersionId}
          isDraft={document.status !== 'PUBLISHED'}
        />
      </Card>
    </section>
  );
}
