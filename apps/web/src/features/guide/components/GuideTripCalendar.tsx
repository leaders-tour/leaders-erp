import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KOREAN_WEEKDAY_LABELS,
  getDaysInMonth,
  getWeekdayIndex,
} from '../../../components/date-picker/date-picker-utils';
import {
  getTripDestination,
  getTripEndDate,
  getTripHeadcount,
  getTripLeaderName,
  getTripStartDate,
  type ConfirmedTripRow,
} from '../../confirmed-trip/hooks';
import { getColorByDestination } from '../trip-color';

interface Props {
  trips: ConfirmedTripRow[];
}

interface CalendarBlock {
  key: string;
  tripId: string;
  leaderName: string;
  headcount: number;
  colStart: number;
  colSpan: number;
  lane: number;
  clippedLeft: boolean;
  clippedRight: boolean;
}

function getTripColor(trip: ConfirmedTripRow) {
  return getColorByDestination(getTripDestination(trip));
}

function isoToLocalDate(iso: string): Date {
  const datePart = iso.split('T')[0] ?? iso;
  const [y = 0, m = 1, d = 1] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTodayIso(): string {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function buildWeekBlocks(
  trips: ConfirmedTripRow[],
  year: number,
  month: number,
): { weekBlocks: CalendarBlock[][]; weekCount: number } {
  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getWeekdayIndex(year, month, 1);
  const totalCells = firstWeekday + daysInMonth;
  const weekCount = Math.ceil(totalCells / 7);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, daysInMonth);

  const filtered = trips
    .filter((trip) => {
      const s = getTripStartDate(trip);
      const e = getTripEndDate(trip);
      if (!s || !e) return false;
      return isoToLocalDate(s) <= monthEnd && isoToLocalDate(e) >= monthStart;
    })
    .sort((a, b) => {
      const as = getTripStartDate(a);
      const bs = getTripStartDate(b);
      if (!as) return 1;
      if (!bs) return -1;
      return isoToLocalDate(as).getTime() - isoToLocalDate(bs).getTime();
    });

  const weekBlocks: CalendarBlock[][] = Array.from({ length: weekCount }, () => []);
  const weekLaneCount: number[] = new Array(weekCount).fill(0);

  for (const trip of filtered) {
    const startStr = getTripStartDate(trip);
    const endStr = getTripEndDate(trip);
    if (!startStr || !endStr) continue;
    const tripStart = isoToLocalDate(startStr);
    const tripEnd = isoToLocalDate(endStr);

    for (let weekIdx = 0; weekIdx < weekCount; weekIdx++) {
      const weekFirstDay = weekIdx * 7 - firstWeekday + 1;
      const weekLastDay = weekFirstDay + 6;
      const weekDateStart = new Date(year, month - 1, Math.max(weekFirstDay, 1));
      const weekDateEnd = new Date(year, month - 1, Math.min(weekLastDay, daysInMonth));

      if (weekDateStart > monthEnd || weekDateEnd < monthStart) continue;

      const overlapStart = tripStart > weekDateStart ? tripStart : weekDateStart;
      const overlapEnd = tripEnd < weekDateEnd ? tripEnd : weekDateEnd;
      if (overlapStart > overlapEnd) continue;
      if (overlapStart > monthEnd || overlapEnd < monthStart) continue;

      const colStart = getWeekdayIndex(
        overlapStart.getFullYear(),
        overlapStart.getMonth() + 1,
        overlapStart.getDate(),
      );
      const colEnd = getWeekdayIndex(
        overlapEnd.getFullYear(),
        overlapEnd.getMonth() + 1,
        overlapEnd.getDate(),
      );

      const lane = weekLaneCount[weekIdx] ?? 0;
      weekLaneCount[weekIdx] = lane + 1;

      weekBlocks[weekIdx]?.push({
        key: `${trip.id}-w${weekIdx}`,
        tripId: trip.id,
        leaderName: getTripLeaderName(trip),
        headcount: getTripHeadcount(trip) ?? 0,
        colStart,
        colSpan: colEnd - colStart + 1,
        lane,
        clippedLeft: tripStart < weekDateStart || tripStart < monthStart,
        clippedRight: tripEnd > weekDateEnd || tripEnd > monthEnd,
      });
    }
  }

  return { weekBlocks, weekCount };
}

export function GuideTripCalendar({ trips }: Props) {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getWeekdayIndex(year, month, 1);
  const todayIso = getTodayIso();

  const { weekBlocks, weekCount } = useMemo(
    () => buildWeekBlocks(trips, year, month),
    [trips, year, month],
  );

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{year}년 {month}월</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="이전 달"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="다음 달"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {KOREAN_WEEKDAY_LABELS.map((label, idx) => (
          <div
            key={label}
            className={`py-2 text-center text-xs font-medium ${
              idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-slate-500'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 주(week) 행들 */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: weekCount }, (_, weekIdx) => {
          const currentBlocks = weekBlocks[weekIdx] ?? [];
          const laneCount = currentBlocks.reduce((max, b) => Math.max(max, b.lane + 1), 0);
          const rowMinHeight = 2.125 + laneCount * 1.875 + 0.75;

          return (
            <div key={`week-${weekIdx}`} className="relative" style={{ minHeight: `${rowMinHeight}rem` }}>
              {/* 날짜 숫자 셀 */}
              <div className="grid grid-cols-7 divide-x divide-slate-100">
                {Array.from({ length: 7 }, (_, colIdx) => {
                  const dayNum = weekIdx * 7 + colIdx - firstWeekday + 1;
                  const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                  const isoDate = isValid ? toIso(year, month, dayNum) : '';
                  const isToday = isoDate === todayIso;

                  return (
                    <div
                      key={`cell-${weekIdx}-${colIdx}`}
                      className="px-1.5 pt-1"
                      style={{ minHeight: `${rowMinHeight}rem` }}
                    >
                      {isValid && (
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                            isToday
                              ? 'bg-slate-900 text-white'
                              : colIdx === 0
                                ? 'text-red-500'
                                : colIdx === 6
                                  ? 'text-blue-500'
                                  : 'text-slate-700'
                          }`}
                        >
                          {dayNum}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 블록 오버레이 */}
              {currentBlocks.map((block) => {
                const trip = trips.find((t) => t.id === block.tripId);
                const color = trip ? getTripColor(trip) : getColorByDestination('');

                const colStartPct = (block.colStart / 7) * 100;
                const colWidthPct = (block.colSpan / 7) * 100;
                const topRem = 2.125 + block.lane * 1.875;

                const roundingClass = [
                  !block.clippedLeft ? 'rounded-l-full' : 'rounded-l-none',
                  !block.clippedRight ? 'rounded-r-full' : 'rounded-r-none',
                ].join(' ');

                return (
                  <button
                    key={block.key}
                    type="button"
                    onClick={() => navigate(`/confirmed-trips/${block.tripId}`)}
                    title={`${block.leaderName} (${block.headcount}명)`}
                    className={`absolute z-10 flex h-7 cursor-pointer items-center gap-1 truncate px-2.5 text-[11px] font-medium text-white transition ${color.bg} ${color.hover} ${roundingClass}`}
                    style={{
                      left: `calc(${colStartPct}% + 2px)`,
                      width: `calc(${colWidthPct}% - 4px)`,
                      top: `${topRem}rem`,
                    }}
                  >
                    <span className="truncate">{block.leaderName}</span>
                    {block.headcount > 0 && (
                      <span className="shrink-0 opacity-75">{block.headcount}명</span>
                    )}
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
