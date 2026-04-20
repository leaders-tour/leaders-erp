import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KOREAN_WEEKDAY_LABELS,
  getDaysInMonth,
  getWeekdayIndex,
} from '../../components/date-picker/date-picker-utils';
import {
  getTripStartDate,
  getTripEndDate,
  getTripLeaderName,
  getTripHeadcount,
  getTripDestination,
  getTripPickupDate,
  getTripDropDate,
  type ConfirmedTripRow,
} from './hooks';

interface ConfirmedTripCalendarProps {
  trips: ConfirmedTripRow[];
  year: number;
  month: number;
  onChangeMonth: (year: number, month: number) => void;
}

interface CalendarBlock {
  /** 고유 렌더링 키 */
  key: string;
  tripId: string;
  leaderName: string;
  headcount: number;
  color: { bg: string; hover: string };
  status: 'ACTIVE' | 'CANCELLED';
  blockType: 'tour' | 'pickup' | 'drop';
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

interface CalendarTextNote {
  key: string;
  tripId: string;
  label: string;
  leaderName: string;
  status: 'ACTIVE' | 'CANCELLED';
}

const CANCELLED_COLOR: { bg: string; hover: string } = { bg: 'bg-slate-400', hover: 'hover:bg-slate-500' };
const FALLBACK_COLOR: { bg: string; hover: string } = { bg: 'bg-blue-500', hover: 'hover:bg-blue-600' };

const REGION_COLOR_RULES: Array<{ keyword: string; color: { bg: string; hover: string } }> = [
  { keyword: '고비', color: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600' } },
  { keyword: '홉스골', color: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600' } },
  { keyword: '중부', color: { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600' } },
  { keyword: '자브항', color: { bg: 'bg-violet-500', hover: 'hover:bg-violet-600' } },
];

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

function getTripCalendarColor(trip: ConfirmedTripRow): { bg: string; hover: string } {
  const destination = getTripDestination(trip).replace(/\s+/g, '');
  const matchedRule = REGION_COLOR_RULES.find((rule) => destination.includes(rule.keyword));
  return matchedRule?.color ?? FALLBACK_COLOR;
}

/**
 * 주어진 year/month 에 대해 각 주(week)의 CalendarBlock[] 배열을 계산합니다.
 * weekBlocks[weekIdx] = 해당 주에 렌더링할 블록 목록
 */
function buildWeekBlocks(
  trips: ConfirmedTripRow[],
  year: number,
  month: number,
): { weekBlocks: CalendarBlock[][]; weekNotes: CalendarTextNote[][][]; weekCount: number } {
  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getWeekdayIndex(year, month, 1);
  const totalCells = firstWeekday + daysInMonth;
  const weekCount = Math.ceil(totalCells / 7);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, daysInMonth);

  const filtered = trips
    .filter((trip) => {
      const startStr = getTripStartDate(trip);
      const endStr = getTripEndDate(trip);
      if (!startStr || !endStr) return false;
      const start = isoToLocalDate(startStr);
      const end = isoToLocalDate(endStr);
      return start <= monthEnd && end >= monthStart;
    })
    .sort((a, b) => {
      const aStartStr = getTripStartDate(a);
      const bStartStr = getTripStartDate(b);
      if (!aStartStr) return 1;
      if (!bStartStr) return -1;
      return isoToLocalDate(aStartStr).getTime() - isoToLocalDate(bStartStr).getTime();
    });

  // weekBlocks[weekIdx] 초기화
  const weekBlocks: CalendarBlock[][] = Array.from({ length: weekCount }, () => []);
  const weekNotes: CalendarTextNote[][][] = Array.from({ length: weekCount }, () =>
    Array.from({ length: 7 }, () => []),
  );

  // 주별 레인 점유 (단순 카운팅 – 주 내 순서대로 lane 배정)
  const weekLaneCount: number[] = new Array(weekCount).fill(0);

  for (const trip of filtered) {
    const startStr = getTripStartDate(trip);
    const endStr = getTripEndDate(trip);
    if (!startStr || !endStr) continue;
    const tripStart = isoToLocalDate(startStr);
    const tripEnd = isoToLocalDate(endStr);
    const color = getTripCalendarColor(trip);

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
        leaderName: getTripLeaderName(trip),
        headcount: getTripHeadcount(trip) ?? 0,
        color,
        status: trip.status,
        blockType: 'tour',
        colStart,
        colSpan: colEnd - colStart + 1,
        lane,
        clippedLeft: tripStart < weekDateStart || tripStart < monthStart,
        clippedRight: tripEnd > weekDateEnd || tripEnd > monthEnd,
      });
    }
  }

  // 날짜 칸 하단에 렌더링할 텍스트 메모 추가
  const addSingleDayNote = (
    trip: ConfirmedTripRow,
    dateStr: string,
    label: string,
  ) => {
    const date = isoToLocalDate(dateStr);
    if (date < monthStart || date > monthEnd) return;

    const dayOfMonth = date.getDate();
    const dayPosition = dayOfMonth + firstWeekday - 1; // 0-indexed grid position
    const correctWeekIdx = Math.floor(dayPosition / 7);

    if (correctWeekIdx < 0 || correctWeekIdx >= weekCount) return;

    const col = getWeekdayIndex(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    );

    weekNotes[correctWeekIdx]?.[col]?.push({
      key: `${trip.id}-${label}-w${correctWeekIdx}`,
      tripId: trip.id,
      status: trip.status,
      label,
      leaderName: getTripLeaderName(trip),
    });
  };

  // 이달에 표시할 메모성 텍스트를 날짜별로 수집
  for (const trip of trips) {
    const startStr = getTripStartDate(trip);
    const pickupStr = getTripPickupDate(trip);
    const dropStr = getTripDropDate(trip);
    if (pickupStr) addSingleDayNote(trip, pickupStr, '픽업');
    if (dropStr) addSingleDayNote(trip, dropStr, '드랍');
    if (trip.camelDollPurchased && startStr) addSingleDayNote(trip, startStr, '낙타인형 구매');
  }

  return { weekBlocks, weekNotes, weekCount };
}

export function ConfirmedTripCalendar({ trips, year, month, onChangeMonth }: ConfirmedTripCalendarProps): JSX.Element {
  const navigate = useNavigate();

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getWeekdayIndex(year, month, 1);
  const todayIso = getTodayIso();

  const { weekBlocks, weekNotes, weekCount } = useMemo(
    () => buildWeekBlocks(trips, year, month),
    [trips, year, month],
  );

  function goToPrevMonth() {
    if (month === 1) onChangeMonth(year - 1, 12);
    else onChangeMonth(year, month - 1);
  }

  function goToNextMonth() {
    if (month === 12) onChangeMonth(year + 1, 1);
    else onChangeMonth(year, month + 1);
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
          const currentNotes = weekNotes[weekIdx] ?? [];
          const laneCount = currentBlocks.reduce((max, b) => Math.max(max, b.lane + 1), 0);
          const maxNoteCount = currentNotes.reduce(
            (max, notesByDay) => Math.max(max, notesByDay.length),
            0,
          );
          const notesTopRem = 2.125 + laneCount * 1.875 + 0.25;
          const rowMinHeight = notesTopRem + maxNoteCount * 1.125 + 0.5;

          return (
            <div key={`week-${weekIdx}`} className="relative" style={{ minHeight: `${rowMinHeight}rem` }}>
              {/* 날짜 숫자 셀 */}
              <div className="grid grid-cols-7 divide-x divide-slate-100">
                {Array.from({ length: 7 }, (_, colIdx) => {
                  const dayNum = weekIdx * 7 + colIdx - firstWeekday + 1;
                  const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                  const isoDate = isValid ? toIso(year, month, dayNum) : '';
                  const isToday = isoDate === todayIso;
                  const cellNotes = currentNotes[colIdx] ?? [];

                  return (
                    <div
                      key={`cell-${weekIdx}-${colIdx}`}
                      className="relative px-1.5 pt-1"
                      style={{ minHeight: `${rowMinHeight}rem` }}
                    >
                      {isValid && (
                        <>
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
                          <div
                            className="absolute left-1.5 right-1.5 grid gap-0.5"
                            style={{ top: `${notesTopRem}rem` }}
                          >
                            {cellNotes.map((note) => (
                              <button
                                key={note.key}
                                type="button"
                                onClick={() => navigate(`/confirmed-trips/${note.tripId}`)}
                                title={`${note.label} - ${note.leaderName}`}
                                className={`w-full truncate text-left text-[11px] leading-4 transition hover:text-slate-900 ${
                                  note.status === 'CANCELLED' ? 'text-slate-400' : 'text-slate-700'
                                }`}
                              >
                                {note.label} - {note.leaderName}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 블록 오버레이 */}
              {currentBlocks.map((block) => {
                const color = block.status === 'CANCELLED' ? CANCELLED_COLOR : block.color;

                const colStartPct = (block.colStart / 7) * 100;
                const colWidthPct = (block.colSpan / 7) * 100;
                const topRem = 2.125 + block.lane * 1.875;

                const roundingClass = block.blockType === 'tour'
                  ? [
                      !block.clippedLeft ? 'rounded-l-full' : 'rounded-l-none',
                      !block.clippedRight ? 'rounded-r-full' : 'rounded-r-none',
                    ].join(' ')
                  : 'rounded-full';

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
