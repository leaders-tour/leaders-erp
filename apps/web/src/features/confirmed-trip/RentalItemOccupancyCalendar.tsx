import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KOREAN_WEEKDAY_LABELS,
  getDaysInMonth,
} from '../../components/date-picker/date-picker-utils';
import {
  buildRentalOccupancyWeekBlocks,
  countDailyOccupancy,
  getInitialCalendarMonth,
  isDateInInclusiveRange,
  toIso,
  type RentalOccupancyConflict,
} from './rental-occupancy-calendar';

const DEFAULT_BLOCK_COLOR = { bg: 'bg-blue-500', hover: 'hover:bg-blue-600' };

const BLOCK_COLORS = [
  DEFAULT_BLOCK_COLOR,
  { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600' },
  { bg: 'bg-violet-500', hover: 'hover:bg-violet-600' },
  { bg: 'bg-amber-500', hover: 'hover:bg-amber-600' },
  { bg: 'bg-rose-500', hover: 'hover:bg-rose-600' },
];

export function RentalItemOccupancyCalendar({
  label,
  total,
  available,
  conflicts,
  highlightStart,
  highlightEnd,
}: {
  label: string;
  total: number;
  available: number;
  conflicts: RentalOccupancyConflict[];
  highlightStart?: string | null;
  highlightEnd?: string | null;
}): JSX.Element {
  const navigate = useNavigate();
  const initialMonth = useMemo(
    () => getInitialCalendarMonth(conflicts, highlightStart),
    [conflicts, highlightStart],
  );
  const [year, setYear] = useState(initialMonth.year);
  const [month, setMonth] = useState(initialMonth.month);

  const daysInMonth = getDaysInMonth(year, month);
  const { weekBlocks, weekCount, firstWeekday } = useMemo(
    () => buildRentalOccupancyWeekBlocks(conflicts, year, month),
    [conflicts, year, month],
  );
  const dailyOccupancy = useMemo(
    () => countDailyOccupancy(conflicts, year, month),
    [conflicts, year, month],
  );

  const colorByTripId = useMemo(() => {
    const map = new Map<string, { bg: string; hover: string }>();
    let idx = 0;
    for (const conflict of conflicts) {
      if (!map.has(conflict.confirmedTripId)) {
        const palette = BLOCK_COLORS[idx % BLOCK_COLORS.length] ?? DEFAULT_BLOCK_COLOR;
        map.set(conflict.confirmedTripId, palette);
        idx += 1;
      }
    }
    return map;
  }, [conflicts]);

  function goToPrevMonth() {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  }

  function goToNextMonth() {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">
            잔여 {Math.max(0, available)} / {total}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-slate-600">
            {year}년 {month}월
          </span>
          <button
            type="button"
            onClick={goToPrevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label="이전 달"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label="다음 달"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-7 border-b border-slate-100">
        {KOREAN_WEEKDAY_LABELS.map((weekdayLabel, idx) => (
          <div
            key={weekdayLabel}
            className={`py-1.5 text-center text-[10px] font-medium ${
              idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-slate-500'
            }`}
          >
            {weekdayLabel}
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain">
        {Array.from({ length: weekCount }, (_, weekIdx) => {
          const currentBlocks = weekBlocks[weekIdx] ?? [];
          const laneCount = currentBlocks.reduce((max, block) => Math.max(max, block.lane + 1), 0);
          const rowMinHeight = 2.5 + laneCount * 1.5;

          return (
            <div key={`week-${weekIdx}`} className="relative" style={{ minHeight: `${rowMinHeight}rem` }}>
              <div className="grid grid-cols-7 divide-x divide-slate-100">
                {Array.from({ length: 7 }, (_, colIdx) => {
                  const dayNum = weekIdx * 7 + colIdx - firstWeekday + 1;
                  const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                  const isoDate = isValid ? toIso(year, month, dayNum) : '';
                  const occupancy = isoDate ? (dailyOccupancy.get(isoDate) ?? 0) : 0;
                  const isHighlighted = isoDate
                    ? isDateInInclusiveRange(isoDate, highlightStart, highlightEnd)
                    : false;
                  const isOverCapacity = occupancy > total;

                  return (
                    <div
                      key={`cell-${weekIdx}-${colIdx}`}
                      className={`px-0.5 pt-0.5 ${isHighlighted ? 'bg-sky-50' : ''}`}
                      style={{ minHeight: `${rowMinHeight}rem` }}
                    >
                      {isValid ? (
                        <div className="flex items-center justify-between gap-0.5 px-0.5">
                          <span
                            className={`text-[10px] font-medium ${
                              colIdx === 0 ? 'text-red-500' : colIdx === 6 ? 'text-blue-500' : 'text-slate-700'
                            }`}
                          >
                            {dayNum}
                          </span>
                          <span
                            className={`rounded px-0.5 text-[9px] font-semibold ${
                              isOverCapacity
                                ? 'bg-rose-100 text-rose-700'
                                : occupancy > 0
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'text-slate-300'
                            }`}
                          >
                            {occupancy}/{total}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {currentBlocks.map((block) => {
                const color = colorByTripId.get(block.confirmedTripId) ?? DEFAULT_BLOCK_COLOR;
                const colStartPct = (block.colStart / 7) * 100;
                const colWidthPct = (block.colSpan / 7) * 100;
                const topRem = 1.75 + block.lane * 1.5;
                const roundingClass = [
                  !block.clippedLeft ? 'rounded-l-full' : 'rounded-l-none',
                  !block.clippedRight ? 'rounded-r-full' : 'rounded-r-none',
                ].join(' ');

                return (
                  <button
                    key={block.key}
                    type="button"
                    onClick={() => navigate(`/confirmed-trips/${block.confirmedTripId}`)}
                    title={block.leaderName}
                    className={`absolute z-10 flex h-5 cursor-pointer items-center truncate px-1.5 text-[10px] font-medium text-white transition ${
                      block.excluded ? 'bg-slate-300 opacity-60 line-through' : `${color.bg} ${color.hover}`
                    } ${roundingClass}`}
                    style={{
                      left: `calc(${colStartPct}% + 2px)`,
                      width: `calc(${colWidthPct}% - 4px)`,
                      top: `${topRem}rem`,
                    }}
                  >
                    <span className="truncate">{block.leaderName}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
