import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KOREAN_WEEKDAY_LABELS,
  formatIsoDate,
  getCurrentLocalMonth,
  getCurrentLocalYear,
  getDaysInMonth,
  getWeekdayIndex,
  parseIsoDate,
  type IsoDateParts,
} from './date-picker-utils';

export interface DateRangePickerModalProps {
  open: boolean;
  /** YYYY-MM-DD, 빈 문자열이면 미선택 */
  from: string;
  to: string;
  onClose: () => void;
  onConfirm: (from: string, to: string) => void;
}

function toKey(parts: IsoDateParts): number {
  return parts.year * 10000 + parts.month * 100 + parts.day;
}

function formatCompactKr(fromYmd: string, toYmd: string): string {
  const a = parseIsoDate(fromYmd);
  const b = parseIsoDate(toYmd);
  if (!a || !b) return '';
  return `${a.month}.${a.day} - ${b.month}.${b.day}`;
}

export function DateRangePickerModal({
  open,
  from,
  to,
  onClose,
  onConfirm,
}: DateRangePickerModalProps): JSX.Element | null {
  const [view, setView] = useState<{ year: number; month: number }>(() => ({
    year: getCurrentLocalYear(),
    month: getCurrentLocalMonth(),
  }));
  const [range, setRange] = useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  });

  useEffect(() => {
    if (!open) return;
    const f = from?.trim() || null;
    const t = to?.trim() || null;
    setRange({ from: f, to: t && t.length > 0 ? t : null });
    const seed = parseIsoDate(f ?? '') ?? parseIsoDate(t ?? '') ?? null;
    if (seed) {
      setView({ year: seed.year, month: seed.month });
    } else {
      setView({ year: getCurrentLocalYear(), month: getCurrentLocalMonth() });
    }
  }, [open, from, to]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const shiftMonth = useCallback((delta: number) => {
    setView((v) => {
      let m = v.month + delta;
      let y = v.year;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      while (m > 12) {
        m -= 12;
        y += 1;
      }
      return { year: y, month: m };
    });
  }, []);

  const handleDayClick = useCallback((iso: string) => {
    setRange((r) => {
      if (!r.from || (r.from && r.to)) {
        return { from: iso, to: null };
      }
      const da = parseIsoDate(iso);
      const db = parseIsoDate(r.from);
      if (!da || !db) return r;
      const ka = toKey(da);
      const kb = toKey(db);
      if (ka < kb) return { from: iso, to: r.from };
      if (ka > kb) return { from: r.from, to: iso };
      return { from: r.from, to: iso };
    });
  }, []);

  const { year: viewYear, month: viewMonth } = view;
  const { from: draftFrom, to: draftTo } = range;

  const dayCells = useMemo(() => {
    const leading = getWeekdayIndex(viewYear, viewMonth, 1);
    const total = getDaysInMonth(viewYear, viewMonth);
    const blanks = Array.from({ length: leading }, (_, i) => ({ key: `b-${i}`, iso: null as string | null }));
    const days = Array.from({ length: total }, (_, i) => {
      const day = i + 1;
      const iso = formatIsoDate({ year: viewYear, month: viewMonth, day });
      return { key: `d-${iso}`, iso };
    });
    return [...blanks, ...days];
  }, [viewMonth, viewYear]);

  const startKey = useMemo(() => {
    const p = parseIsoDate(draftFrom ?? '');
    return p ? toKey(p) : null;
  }, [draftFrom]);

  const endKey = useMemo(() => {
    const p = parseIsoDate(draftTo ?? '');
    return p ? toKey(p) : null;
  }, [draftTo]);

  const rangeLo = startKey != null && endKey != null ? Math.min(startKey, endKey) : null;
  const rangeHi = startKey != null && endKey != null ? Math.max(startKey, endKey) : null;

  const dayVisual = useCallback(
    (iso: string): 'out' | 'single' | 'start' | 'end' | 'middle' => {
      const p = parseIsoDate(iso);
      if (!p) return 'out';
      const k = toKey(p);
      if (rangeLo != null && rangeHi != null) {
        if (k < rangeLo || k > rangeHi) return 'out';
        if (k === rangeLo && k === rangeHi) return 'single';
        if (k === rangeLo) return 'start';
        if (k === rangeHi) return 'end';
        return 'middle';
      }
      if (startKey != null && endKey == null && k === startKey) return 'single';
      return 'out';
    },
    [endKey, rangeHi, rangeLo, startKey],
  );

  const canConfirm = Boolean(draftFrom && draftTo && parseIsoDate(draftFrom) && parseIsoDate(draftTo));

  const footerLabel = useMemo(() => {
    if (!canConfirm || !draftFrom || !draftTo) return '시작일과 종료일을 선택하세요';
    return `${formatCompactKr(draftFrom, draftTo)} 선택 완료`;
  }, [canConfirm, draftFrom, draftTo]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(92vh,640px)] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-3xl"
        role="dialog"
        aria-label="기간 선택"
      >
        <header className="relative flex shrink-0 items-center justify-center border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">기간 선택</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex shrink-0 items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
            aria-label="이전 달"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-base font-semibold text-slate-900">
            {viewYear}. {String(viewMonth).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
            aria-label="다음 달"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <div className="grid grid-cols-7 gap-y-1 text-center text-xs font-medium text-slate-500">
            {KOREAN_WEEKDAY_LABELS.map((label) => (
              <span key={label} className="py-1">
                {label}
              </span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-y-1">
            {dayCells.map((cell) => {
              if (!cell.iso) {
                return <div key={cell.key} className="h-10" aria-hidden />;
              }
              const v = dayVisual(cell.iso);
              const parsed = parseIsoDate(cell.iso)!;
              const isMuted = v === 'out';

              let cellBg = '';
              let circle = '';
              let textCls = isMuted ? 'text-slate-400' : 'text-rose-600';

              if (v === 'middle') {
                cellBg = 'bg-sky-100';
                textCls = 'text-rose-600 font-semibold';
              } else if (v === 'start') {
                cellBg = 'bg-sky-100 rounded-l-full';
                circle = 'rounded-full bg-rose-500 text-white shadow-sm';
                textCls = 'font-semibold text-white';
              } else if (v === 'end') {
                cellBg = 'bg-sky-100 rounded-r-full';
                circle = 'rounded-full bg-rose-500 text-white shadow-sm';
                textCls = 'font-semibold text-white';
              } else if (v === 'single') {
                circle = 'rounded-full bg-rose-500 text-white shadow-sm';
                textCls = 'font-semibold text-white';
              }

              return (
                <div key={cell.key} className={`flex h-10 items-center justify-center ${cellBg}`}>
                  <button
                    type="button"
                    onClick={() => handleDayClick(cell.iso!)}
                    className={`flex h-9 w-9 items-center justify-center text-sm transition ${circle} ${
                      !circle && !isMuted ? 'rounded-full hover:bg-slate-100' : ''
                    } ${textCls}`}
                  >
                    {parsed.day}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="mt-3 w-full text-center text-xs text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
            onClick={() => setRange({ from: null, to: null })}
          >
            선택 초기화
          </button>
        </div>

        <footer className="shrink-0 border-t border-slate-100 p-3">
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (!draftFrom || !draftTo) return;
              const a = parseIsoDate(draftFrom);
              const b = parseIsoDate(draftTo);
              if (!a || !b) return;
              const ka = toKey(a);
              const kb = toKey(b);
              if (ka <= kb) onConfirm(draftFrom, draftTo);
              else onConfirm(draftTo, draftFrom);
              onClose();
            }}
            className="w-full rounded-2xl bg-slate-900 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            {footerLabel}
          </button>
          <button
            type="button"
            className="mt-2 w-full py-2 text-center text-xs text-slate-500 hover:text-slate-800"
            onClick={() => {
              onConfirm('', '');
              onClose();
            }}
          >
            출발 구간 필터 끄기 (전체 기간)
          </button>
        </footer>
      </div>
    </div>
  );
}
