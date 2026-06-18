import { Button, Card, Table, Td, Th } from '@tour/ui';
import type { ConfirmationDocumentRow } from '../model/types';

interface ConfirmationListPanelProps {
  documents: ConfirmationDocumentRow[];
  loading?: boolean;
  onOpenDocument: (document: ConfirmationDocumentRow) => void;
  onDeleteDocument: (document: ConfirmationDocumentRow) => void;
  onCreateDocument: () => void;
  canCreate?: boolean;
  deleteLoading?: boolean;
  deletingDocumentId?: string | null;
}

function getDocumentTitle(document: ConfirmationDocumentRow): string {
  const destination = document.snapshot.destination?.trim();
  if (destination) {
    return `${destination} 여정`;
  }
  return '확정 여정';
}

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

export function ConfirmationListPanel({
  documents,
  loading = false,
  onOpenDocument,
  onDeleteDocument,
  onCreateDocument,
  canCreate = true,
  deleteLoading = false,
  deletingDocumentId = null,
}: ConfirmationListPanelProps): JSX.Element {
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">확정서 목록</h2>
        <Button variant="primary" onClick={onCreateDocument} disabled={!canCreate}>
          신규 확정서 생성
        </Button>
      </div>
      <div className="overflow-auto">
        {loading ? <p className="p-4 text-sm text-slate-500">확정서를 불러오는 중...</p> : null}
        {!loading && documents.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">저장된 확정서가 없습니다.</p>
        ) : null}
        {!loading && documents.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>제목</Th>
                <Th>대표자명</Th>
                <Th>현재 버전</Th>
                <Th>수정일</Th>
                <Th>관리</Th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <Td>
                    <div className="grid gap-1">
                      <span>{getDocumentTitle(document)}</span>
                      <span className="text-xs text-slate-500">{getStatusLabel(document.status)}</span>
                    </div>
                  </Td>
                  <Td>{document.snapshot.leaderName?.trim() || '-'}</Td>
                  <Td>{`v${document.versionNumber}`}</Td>
                  <Td>{new Date(document.updatedAt).toLocaleString('ko-KR')}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => onOpenDocument(document)}>
                        상세
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={deleteLoading && deletingDocumentId === document.id}
                        onClick={() => onDeleteDocument(document)}
                      >
                        {deleteLoading && deletingDocumentId === document.id ? '삭제 중...' : '삭제'}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </div>
    </Card>
  );
}
