import { useState, type MouseEvent } from 'react';
import { DatePickerModal } from '../../../components/date-picker/DatePickerModal';
import { formatDateTriggerLabel, getCurrentLocalYear } from '../../../components/date-picker/date-picker-utils';
import { ESTIMATE_VALIDITY_DAYS } from '../model/constants';
import { addDays, formatDateKorean, todayIsoDate } from '../utils/format';

export type EstimateValidUntilControlsDensity = 'compact' | 'comfortable';

export interface EstimateValidUntilControlsProps {
  validUntilDate: string;
  onValidUntilDateChange: (value: string) => void;
  density?: EstimateValidUntilControlsDensity;
  className?: string;
}

export function EstimateValidUntilControls({
  validUntilDate,
  onValidUntilDateChange,
  density = 'comfortable',
  className,
}: EstimateValidUntilControlsProps): JSX.Element {
  const [datePickerAnchor, setDatePickerAnchor] = useState<HTMLElement | null>(null);
  const isCompact = density === 'compact';
  const labelClass = isCompact ? 'text-[11px] font-medium text-slate-600' : 'text-sm font-medium text-slate-700';
  const hintClass = isCompact ? 'text-[10px] leading-snug text-slate-500' : 'text-xs text-slate-500';

  const triggerButtonClass = isCompact
    ? 'flex min-h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[11px] text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1'
    : 'flex min-h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1';

  const presetButtonClass = isCompact
    ? 'rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2'
    : 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2';

  const displayLabel = formatDateTriggerLabel(validUntilDate) || '날짜 선택';
  const summaryLabel = formatDateKorean(validUntilDate);

  return (
    <div className={className} role="region" aria-label="견적 유효기간 설정">
      <div className={isCompact ? 'grid gap-2' : 'grid gap-3'}>
        <div className={isCompact ? 'grid gap-1' : 'grid gap-1.5'}>
          <span className={labelClass}>만료일</span>
          <button
            type="button"
            className={triggerButtonClass}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              setDatePickerAnchor(event.currentTarget);
            }}
          >
            <span>{displayLabel}</span>
            <span className="text-slate-400">열기</span>
          </button>
          {summaryLabel !== '-' ? <p className={hintClass}>견적서 표기: {summaryLabel}까지 유효</p> : null}
        </div>
        <button
          type="button"
          className={presetButtonClass}
          onClick={() => {
            const next = addDays(todayIsoDate(), ESTIMATE_VALIDITY_DAYS);
            if (next) {
              onValidUntilDateChange(next);
            }
          }}
        >
          오늘 + {ESTIMATE_VALIDITY_DAYS}일
        </button>
      </div>
      <DatePickerModal
        open={datePickerAnchor !== null}
        value={validUntilDate}
        anchorEl={datePickerAnchor}
        defaultYear={getCurrentLocalYear()}
        title="견적 유효기간"
        onClose={() => setDatePickerAnchor(null)}
        onChange={(nextIsoDate) => {
          onValidUntilDateChange(nextIsoDate);
          setDatePickerAnchor(null);
        }}
      />
    </div>
  );
}
