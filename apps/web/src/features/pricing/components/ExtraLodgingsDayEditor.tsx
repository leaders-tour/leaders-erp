import { useState } from 'react';
import { Button } from '@tour/ui';

export interface ExtraLodgingsDayEditorProps {
  counts: number[];
  dayLabels?: string[];
  onChangeCount: (index: number, nextValue: number) => void;
  onApplyUniform: (value: number) => void;
  disabled?: boolean;
  isDayDisabled?: (index: number) => boolean;
}

export function ExtraLodgingsDayEditor({
  counts,
  dayLabels,
  onChangeCount,
  onApplyUniform,
  disabled = false,
  isDayDisabled,
}: ExtraLodgingsDayEditorProps): JSX.Element {
  const [uniformText, setUniformText] = useState('0');
  const editableDayIndexes = counts
    .map((_, index) => index)
    .filter((index) => !isDayDisabled?.(index));

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <label className="grid flex-1 gap-1 min-w-[140px]">
          <span className="text-xs font-medium text-slate-600">모든 일차 동일 적용</span>
          <input
            type="number"
            min={0}
            disabled={disabled}
            value={uniformText}
            onChange={(event) => setUniformText(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={disabled}
          onClick={() => {
            const n = Math.max(0, Math.floor(Number(uniformText) || 0));
            onApplyUniform(n);
          }}
        >
          일괄 적용
        </Button>
        {editableDayIndexes.length < counts.length ? (
          <p className="w-full text-xs text-slate-500">마지막 일차는 숙박하지 않아 일괄 적용에서 제외됩니다.</p>
        ) : null}
      </div>

      <div className="grid max-h-[min(60vh,520px)] gap-2 overflow-y-auto pr-1">
        {counts.map((count, index) => {
          const label = dayLabels?.[index]?.trim();
          const dayDisabled = disabled || isDayDisabled?.(index) === true;
          return (
            <div
              key={`extra-lodging-day-${index + 1}`}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                dayDisabled
                  ? 'border-slate-200 bg-slate-100/80 opacity-80'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">{index + 1}일차</div>
                {dayDisabled ? (
                  <div className="mt-0.5 text-xs text-slate-500">마지막 일차 (숙박 없음)</div>
                ) : label ? (
                  <div className="mt-0.5 truncate text-xs text-slate-500" title={label}>
                    {label}
                  </div>
                ) : null}
              </div>
              <label className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-slate-500">추가 수</span>
                <input
                  type="number"
                  min={0}
                  disabled={dayDisabled}
                  value={count}
                  onChange={(event) =>
                    onChangeCount(index, Math.max(0, Number(event.target.value) || 0))
                  }
                  className="w-[88px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm tabular-nums disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
