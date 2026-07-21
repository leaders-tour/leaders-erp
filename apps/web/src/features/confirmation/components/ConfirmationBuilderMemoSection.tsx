import { Button } from '@tour/ui';
import { useState, type ReactNode } from 'react';

function MemoBubble({ children, filled = true }: { children: ReactNode; filled?: boolean }): JSX.Element {
  return (
    <div
      className={`relative max-w-none px-3 py-2.5 ${
        filled
          ? 'rounded-2xl rounded-tl-sm border border-sky-200 bg-sky-50 text-slate-800 shadow-sm'
          : 'rounded-2xl border border-dashed border-slate-200 bg-slate-50/80'
      }`}
    >
      {filled ? (
        <span
          aria-hidden
          className="absolute -left-1.5 top-3 h-2.5 w-2.5 rotate-45 border-b border-l border-sky-200 bg-sky-50"
        />
      ) : null}
      {children}
    </div>
  );
}

interface ConfirmationBuilderMemoSectionProps {
  value: string;
  onChange: (value: string) => void;
  onSave: (content?: string) => Promise<void>;
  saving?: boolean;
  saveOnPublish?: boolean;
  updatedByEmployeeName?: string | null;
  errorMessage?: string | null;
}

export function ConfirmationBuilderMemoSection({
  value,
  onChange,
  onSave,
  saving = false,
  saveOnPublish = false,
  updatedByEmployeeName,
  errorMessage,
}: ConfirmationBuilderMemoSectionProps): JSX.Element {
  const [localError, setLocalError] = useState<string | null>(null);

  const canClearMemo =
    value.trim().length > 0 || (updatedByEmployeeName != null && updatedByEmployeeName.length > 0);

  const handleSave = async (content?: string) => {
    const nextContent = content ?? value;
    if (
      !saveOnPublish
      && nextContent.trim().length === 0
      && (value.trim().length > 0 || updatedByEmployeeName)
    ) {
      if (!window.confirm('메모를 지울까요?')) {
        return;
      }
    }
    setLocalError(null);
    try {
      await onSave(content);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : '메모 저장에 실패했습니다.');
    }
  };

  const handleClear = async () => {
    if (value.trim().length > 0 || (!saveOnPublish && updatedByEmployeeName)) {
      if (!window.confirm('메모를 지울까요?')) {
        return;
      }
    }
    onChange('');
    if (saveOnPublish) {
      return;
    }
    setLocalError(null);
    try {
      await onSave('');
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : '메모 삭제에 실패했습니다.');
    }
  };

  const helperText = saveOnPublish
    ? '발행 저장 시 이 메모가 새 확정서 버전에 함께 저장됩니다.'
    : '임시저장 중인 확정서에 바로 저장할 수 있습니다.';

  return (
    <section className="confirmation-builder-section confirmation-builder-section--memo">
      <div className="confirmation-builder-section__header">
        <div className="confirmation-builder-section__title-wrap">
          <span className="confirmation-builder-section__number">0</span>
          <div>
            <h3>내부 메모</h3>
            <p>확정서 PDF에는 포함되지 않는 운영용 메모입니다.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <MemoBubble filled={value.trim().length > 0}>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="고객 전달용이 아닌 내부 메모를 입력하세요."
            className="w-full resize-y border-0 bg-transparent p-0 text-sm leading-relaxed text-slate-900 outline-none placeholder:text-slate-400"
          />
        </MemoBubble>

        <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
          <div className="grid gap-1">
            <p className="text-[11px] text-slate-500">{value.trim().length}/2000 · {helperText}</p>
            {updatedByEmployeeName ? (
              <p className="text-[10px] font-medium text-sky-700/70">최근 저장: {updatedByEmployeeName}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {canClearMemo ? (
              <Button
                type="button"
                variant="outline"
                className="h-8 px-3 text-xs text-rose-700 hover:text-rose-800"
                disabled={saving}
                onClick={() => void handleClear()}
              >
                {saving ? '처리 중...' : '지우기'}
              </Button>
            ) : null}
            <Button
              type="button"
              variant={saveOnPublish ? 'outline' : 'primary'}
              className="h-8 px-3 text-xs"
              disabled={saving || saveOnPublish}
              onClick={() => void handleSave()}
            >
              {saving ? '저장 중...' : saveOnPublish ? '발행 저장 시 반영' : '메모 저장'}
            </Button>
          </div>
        </div>

        {localError || errorMessage ? (
          <p className="text-xs text-rose-600">{localError ?? errorMessage}</p>
        ) : null}
      </div>
    </section>
  );
}
