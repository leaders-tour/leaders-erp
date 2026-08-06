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

function formatCreatedAtLines(value: string): { date: string; time: string } {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString('ko-KR'),
    time: date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }),
  };
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
    <Card className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
      <div className="overflow-x-auto">
        {loading ? <p className="p-4 text-sm text-slate-500">확정서를 불러오는 중...</p> : null}
        {!loading && documents.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">저장된 확정서가 없습니다.</p>
        ) : null}
        {!loading && documents.length > 0 ? (
          <Table className="table-fixed">
            <thead>
              <tr>
                <Th className="w-[18%]">제목</Th>
                <Th className="w-[12%]">대표자명</Th>
                <Th className="w-[10%]">현재 버전</Th>
                <Th className="w-[16%]">생성일</Th>
                <Th className="w-[16%]">메모</Th>
                <Th className="w-[28%]">관리</Th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const isSelected = selectedDocumentId === document.id;
                const createdAt = formatCreatedAtLines(document.createdAt);

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
                  <Td className="align-top break-keep">
                    <div className="grid gap-1">
                      <span className={isSelected ? 'font-semibold text-slate-900' : undefined}>
                        {getDocumentTitle(document)}
                      </span>
                      <span className={`text-xs ${isSelected ? 'text-slate-600' : 'text-slate-500'}`}>
                        {getStatusLabel(document.status)}
                      </span>
                    </div>
                  </Td>
                  <Td className="align-top break-keep">{document.snapshot.leaderName?.trim() || '-'}</Td>
                  <Td className="align-top">{`v${document.versionNumber}`}</Td>
                  <Td className="align-top">
                    <div className="grid gap-0.5 text-xs leading-snug text-slate-700">
                      <span>{createdAt.date}</span>
                      <span className="text-slate-500">{createdAt.time}</span>
                    </div>
                  </Td>
                  <Td className="min-w-0 overflow-hidden align-top">
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
                  <Td className="min-w-0 align-top">
                    <div className="flex flex-col items-start gap-2">
                      <Button
                        variant="outline"
                        className="h-8 w-fit px-3 text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenDocument(document);
                        }}
                      >
                        상세
                      </Button>
                      <Button
                        variant="primary"
                        className="h-8 w-fit whitespace-normal break-keep px-3 text-xs leading-snug"
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
                        className="h-8 w-fit px-3 text-xs"
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
