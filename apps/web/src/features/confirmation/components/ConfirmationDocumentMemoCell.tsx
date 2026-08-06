import { useState, type ReactNode } from 'react';
import { Button } from '@tour/ui';
import type { ConfirmationDocumentRow } from '../model/types';

interface ConfirmationDocumentMemoCellProps {
  document: ConfirmationDocumentRow;
  saving?: boolean;
  onSave: (documentId: string, content: string) => Promise<void>;
}

function ConfirmationMemoBubble({
  children,
  variant = 'filled',
}: {
  children: ReactNode;
  variant?: 'filled' | 'empty';
}): JSX.Element {
  const isFilled = variant === 'filled';

  return (
    <div
      className={`confirmation-memo-bubble relative w-full min-w-0 max-w-full px-3 py-2.5 ${
        isFilled
          ? 'rounded-2xl rounded-tl-sm border border-sky-200 bg-sky-50 text-slate-800 shadow-sm'
          : 'rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 text-slate-400'
      }`}
    >
      {isFilled ? (
        <span
          aria-hidden
          className="absolute -left-1.5 top-3 h-2.5 w-2.5 rotate-45 border-b border-l border-sky-200 bg-sky-50"
        />
      ) : null}
      {children}
    </div>
  );
}

export function ConfirmationDocumentMemoCell({
  document,
  saving = false,
  onSave,
}: ConfirmationDocumentMemoCellProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [draftMemo, setDraftMemo] = useState(document.memo?.content ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const memoContent = document.memo?.content?.trim() ?? '';
  const hasMemo = memoContent.length > 0;

  const openEditor = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    setDraftMemo(document.memo?.content ?? '');
    setErrorMessage(null);
    setIsEditing(true);
  };

  const closeEditor = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsEditing(false);
    setDraftMemo(document.memo?.content ?? '');
    setErrorMessage(null);
  };

  const savedMemoContent = document.memo?.content ?? '';
  const canClearMemo = draftMemo.trim().length > 0 || savedMemoContent.trim().length > 0;

  const handleSave = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setErrorMessage(null);
    if (draftMemo.trim().length === 0 && savedMemoContent.trim().length > 0) {
      if (!window.confirm('메모를 지울까요?')) {
        return;
      }
    }
    try {
      await onSave(document.id, draftMemo);
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '메모 저장에 실패했습니다.');
    }
  };

  const handleClear = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setErrorMessage(null);
    if (savedMemoContent.trim().length === 0) {
      setDraftMemo('');
      return;
    }
    if (!window.confirm('메모를 지울까요?')) {
      return;
    }
    setDraftMemo('');
    try {
      await onSave(document.id, '');
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '메모 삭제에 실패했습니다.');
    }
  };

  if (isEditing) {
    return (
      <div
        className="grid w-full min-w-0 max-w-full gap-2"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <ConfirmationMemoBubble variant="filled">
          <textarea
            value={draftMemo}
            onChange={(event) => setDraftMemo(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="내부 메모를 입력하세요."
            className="w-full resize-none border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </ConfirmationMemoBubble>
        <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
          <span className="text-[11px] text-slate-500">{draftMemo.trim().length}/2000</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={closeEditor} disabled={saving}>
              취소
            </Button>
            {canClearMemo ? (
              <Button
                type="button"
                variant="outline"
                className="h-8 px-3 text-xs text-rose-700 hover:text-rose-800"
                onClick={(event) => void handleClear(event)}
                disabled={saving}
              >
                {saving ? '처리 중...' : '지우기'}
              </Button>
            ) : null}
            <Button type="button" className="h-8 px-3 text-xs" onClick={(event) => void handleSave(event)} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
        {errorMessage ? <p className="text-xs text-rose-600">{errorMessage}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-2">
      <ConfirmationMemoBubble variant={hasMemo ? 'filled' : 'empty'}>
        {hasMemo ? (
          <>
            <p className="break-words whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {memoContent}
            </p>
            {document.memo?.updatedByEmployee?.name ? (
              <p className="mt-1.5 text-[10px] font-medium text-sky-700/70">
                {document.memo.updatedByEmployee.name}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-xs">메모 없음</p>
        )}
      </ConfirmationMemoBubble>
      <Button type="button" variant="outline" className="h-8 w-fit px-3 text-xs" onClick={openEditor}>
        {hasMemo ? '메모 수정' : '메모 작성'}
      </Button>
    </div>
  );
}
