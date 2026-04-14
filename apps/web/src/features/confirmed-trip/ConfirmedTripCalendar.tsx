import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KOREAN_WEEKDAY_LABELS,
  getDaysInMonth,
  getWeekdayIndex,
} from '../../components/date-picker/date-picker-utils';
import type { ConfirmedTripRow } from './hooks';

interface ConfirmedTripCalendarProps {
  trips: ConfirmedTripRow[];
}

interface CalendarBlock {
  /** 고유 렌더링 키 */
  key: string;
  tripId: string;
  leaderName: string;
  headcount: number;
  colorIndex: number;
  status: 'ACTIVE' | 'CANCELLED';
  /** grid 시작 열 (0=일요일) */
  colStart: number;
  /** grid span 개수 */
  colSpan: number;
  /** 이 주에서의 수직 lane (겹침 처리) */
  lane: number;
  /** 이전 주/달에서 이어지는 블록 → 왼쪽 끝 잘림 */
  clippedLeft: boolean;
  /** 다음 주/달로 이어지는 블록 → 오른쪽 끝 잘림 */
  clippedRight: boolean;
}

const BLOCK_COLORS: Array<{ bg: string; hover: string }> = [
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
  { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600' },
  { bg: 'bg-violet-500', hover: 'hover:bg-violet-600' },
  { bg: 'bg-amber-500', hover: 'hover:bg-amber-600' },
  { bg: 'bg-rose-500', hover: 'hover:bg-rose-600' },
  { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-600' },
  { bg: 'bg-pink-500', hover: 'hover:bg-pink-600' },
  { bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600' },
];

const CANCELLED_COLOR: { bg: string; hover: string } = { bg: 'bg-slate-400', hover: 'hover:bg-slate-500' };
const FALLBACK_COLOR: { bg: string; hover: string } = { bg: 'bg-blue-500', hover: 'hover:bg-blue-600' };

/** "2026-06-08" 또는 "2026-06-08T00:00:00.000Z" 모두 처리 — 로컬 자정 기준 Date 반환 */
function isoToLocalDate(iso: string): Date {
  const datePart = iso.split('T')[0] ?? iso;
  const parts = datePart.split('-').map(Number);
  const [y = 0, m = 1, d = 1] = parts;
  return new Date(y, m - 1, d);
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTodayIso(): string {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * 주어진 year/month 에 대해 각 주(week)의 CalendarBlock[] 배열을 계산합니다.
 * weekBlocks[weekIdx] = 해당 주에 렌더링할 블록 목록
 */
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

  // 이 달과 겹치는 여행만 필터 + 색상 인덱스 맵 (전체 목록 순서 기준)
  const colorMap = new Map<string, number>();
  trips.forEach((trip, idx) => colorMap.set(trip.id, idx % BLOCK_COLORS.length));

  const filtered = trips
    .filter((trip) => {
      const meta = trip.planVersion.meta;
      if (!meta) return false;
      const start = isoToLocalDate(meta.travelStartDate);
      const end = isoToLocalDate(meta.travelEndDate);
      return start <= monthEnd && end >= monthStart;
    })
    .sort((a, b) => {
      const aStart = isoToLocalDate(a.planVersion.meta!.travelStartDate).getTime();
      const bStart = isoToLocalDate(b.planVersion.meta!.travelStartDate).getTime();
      return aStart - bStart;
    });

  // weekBlocks[weekIdx] 초기화
  const weekBlocks: CalendarBlock[][] = Array.from({ length: weekCount }, () => []);

  // 주별 레인 점유 (단순 카운팅 – 주 내 순서대로 lane 배정)
  const weekLaneCount: number[] = new Array(weekCount).fill(0);

  for (const trip of filtered) {
    const meta = trip.planVersion.meta!;
    const tripStart = isoToLocalDate(meta.travelStartDate);
    const tripEnd = isoToLocalDate(meta.travelEndDate);
    const colorIndex = colorMap.get(trip.id) ?? 0;

    for (let weekIdx = 0; weekIdx < weekCount; weekIdx++) {
      // 이 주가 커버하는 달력 날짜 범위 (이달 기준)
      const weekFirstDay = weekIdx * 7 - firstWeekday + 1; // 음수 가능 (빈칸)
      const weekLastDay = weekFirstDay + 6;

      const weekDateStart = new Date(year, month - 1, Math.max(weekFirstDay, 1));
      const weekDateEnd = new Date(year, month - 1, Math.min(weekLastDay, daysInMonth));

      // 이 주가 이달 범위를 벗어나면 스킵
      if (weekDateStart > monthEnd || weekDateEnd < monthStart) continue;

      // trip 과 이 주가 겹치는 구간
      const overlapStart = tripStart > weekDateStart ? tripStart : weekDateStart;
      const overlapEnd = tripEnd < weekDateEnd ? tripEnd : weekDateEnd;

      if (overlapStart > overlapEnd) continue;

      // 겹치는 구간이 이달 범위 안에 있어야 함
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
        leaderName: meta.leaderName,
        headcount: meta.headcountTotal,
        colorIndex,
        status: trip.status,
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

export function ConfirmedTripCalendar({ trips }: ConfirmedTripCalendarProps): JSX.Element {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getWeekdayIndex(year, month, 1);
  const todayIso = getTodayIso();

  const { weekBlocks, weekCount } = useMemo(
    () => buildWeekBlocks(trips, year, month),
    [trips, year, month],
  );

  function goToPrevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else { setMonth((m) => m - 1); }
  }

  function goToNextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else { setMonth((m) => m + 1); }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* 헤더: 월 표시 + 네비게이션 */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">
          {year}년 {month}월
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="이전 달"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="다음 달"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
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
          // 날짜 숫자 영역 높이 + 레인 높이
          const rowMinHeight = 2.5 + laneCount * 1.75;

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
                const color =
                  block.status === 'CANCELLED'
                    ? CANCELLED_COLOR
                    : (BLOCK_COLORS[block.colorIndex % BLOCK_COLORS.length] ?? FALLBACK_COLOR);

                const colStartPct = (block.colStart / 7) * 100;
                const colWidthPct = (block.colSpan / 7) * 100;
                const topRem = 1.75 + block.lane * 1.75;

                // 잘린 끝은 라운딩 없음, 자연스러운 끝은 라운딩
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
                    className={`absolute z-10 flex h-6 cursor-pointer items-center gap-1 truncate px-2 text-[11px] font-medium text-white transition ${color.bg} ${color.hover} ${roundingClass}`}
                    style={{
                      left: `calc(${colStartPct}% + ${block.clippedLeft ? 0 : 2}px)`,
                      width: `calc(${colWidthPct}% - ${(block.clippedLeft ? 0 : 2) + (block.clippedRight ? 0 : 2)}px)`,
                      top: `${topRem}rem`,
                    }}
                  >
                    <span className="truncate">{block.leaderName}</span>
                    <span className="shrink-0 opacity-75">{block.headcount}명</span>
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
