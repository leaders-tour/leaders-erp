import { Button, Card, Table, Td, Th } from '@tour/ui';
import { TooltipHelpIcon } from '../../../components/TooltipHelpIcon';
import { ConfirmationDocumentMemoCell } from './ConfirmationDocumentMemoCell';
import type { ConfirmationDocumentRow } from '../model/types';
import {
  CONFIRMATION_FRESH_SOURCE_TOOLTIP,
  resolveConfirmationBuilderRowActionLabel,
} from '../utils/confirmation-builder-source';

interface ConfirmationListPanelProps {
  documents: ConfirmationDocumentRow[];
  loading?: boolean;
  selectedDocumentId?: string | null;
  onSelectDocument?: (document: ConfirmationDocumentRow) => void;
  onOpenDocument: (document: ConfirmationDocumentRow) => void;
  onDeleteDocument: (document: ConfirmationDocumentRow) => void;
  onCreateFromDocument: (document: ConfirmationDocumentRow) => void;
  onCreateFromFresh: () => void;
  canCreate?: boolean;
  deleteLoading?: boolean;
  deletingDocumentId?: string | null;
  onSaveMemo?: (documentId: string, content: string) => Promise<void>;
  memoSaving?: boolean;
  savingMemoDocumentId?: string | null;
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
  selectedDocumentId = null,
  onSelectDocument,
  onOpenDocument,
  onDeleteDocument,
  onCreateFromDocument,
  onCreateFromFresh,
  canCreate = true,
  deleteLoading = false,
  deletingDocumentId = null,
  onSaveMemo,
  memoSaving = false,
  savingMemoDocumentId = null,
}: ConfirmationListPanelProps): JSX.Element {
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">확정서 목록</h2>
          <p className="mt-1 text-xs text-slate-500">
            행을 클릭하면 우측 미리보기가 바뀝니다. 각 버전 옆에서 기준을 선택해 새 확정서를 작성할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" onClick={onCreateFromFresh} disabled={!canCreate}>
            새 버전 작성
          </Button>
          <TooltipHelpIcon
            content={CONFIRMATION_FRESH_SOURCE_TOOLTIP}
            align="right"
            ariaLabel="새 버전 작성 안내"
          />
        </div>
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
                <Th>메모</Th>
                <Th>관리</Th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const isSelected = selectedDocumentId === document.id;

                return (
                <tr
                  key={document.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-slate-100 shadow-[inset_4px_0_0_0_#334155] ring-1 ring-inset ring-slate-300'
                      : 'hover:bg-slate-50/70'
                  }`}
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => onSelectDocument?.(document)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectDocument?.(document);
                    }
                  }}
                >
                  <Td>
                    <div className="grid gap-1">
                      <span className={isSelected ? 'font-semibold text-slate-900' : undefined}>
                        {getDocumentTitle(document)}
                      </span>
                      <span className={`text-xs ${isSelected ? 'text-slate-600' : 'text-slate-500'}`}>
                        {getStatusLabel(document.status)}
                      </span>
                    </div>
                  </Td>
                  <Td>{document.snapshot.leaderName?.trim() || '-'}</Td>
                  <Td>{`v${document.versionNumber}`}</Td>
                  <Td>{new Date(document.updatedAt).toLocaleString('ko-KR')}</Td>
                  <Td>
                    {onSaveMemo ? (
                      <ConfirmationDocumentMemoCell
                        document={document}
                        saving={memoSaving && savingMemoDocumentId === document.id}
                        onSave={onSaveMemo}
                      />
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenDocument(document);
                        }}
                      >
                        상세
                      </Button>
                      <Button
                        variant="primary"
                        disabled={!canCreate}
                        onClick={(event) => {
                          event.stopPropagation();
                          onCreateFromDocument(document);
                        }}
                      >
                        {resolveConfirmationBuilderRowActionLabel(document.status)}
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={deleteLoading && deletingDocumentId === document.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteDocument(document);
                        }}
                      >
                        {deleteLoading && deletingDocumentId === document.id ? '삭제 중...' : '삭제'}
                      </Button>
                    </div>
                  </Td>
                </tr>
                );
              })}
            </tbody>
          </Table>
        ) : null}
      </div>
    </Card>
  );
}
