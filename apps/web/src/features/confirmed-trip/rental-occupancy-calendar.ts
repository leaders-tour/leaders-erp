import {
  getDaysInMonth,
  getWeekdayIndex,
  parseIsoDate,
} from '../../components/date-picker/date-picker-utils';

export interface RentalOccupancyConflict {
  confirmedTripId: string;
  excluded: boolean;
  leaderName: string;
  travelStartDate: string;
  travelEndDate: string;
}

export interface RentalOccupancyBlock {
  key: string;
  confirmedTripId: string;
  leaderName: string;
  excluded: boolean;
  colStart: number;
  colSpan: number;
  lane: number;
  clippedLeft: boolean;
  clippedRight: boolean;
}

/** "2026-06-08" 또는 ISO datetime — 로컬 자정 기준 Date */
export function isoToLocalDate(iso: string): Date {
  const datePart = iso.split('T')[0] ?? iso;
  const parts = datePart.split('-').map(Number);
  const [y = 0, m = 1, d = 1] = parts;
  return new Date(y, m - 1, d);
}

export function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function conflictStart(conflict: RentalOccupancyConflict): Date {
  return isoToLocalDate(conflict.travelStartDate);
}

function conflictEnd(conflict: RentalOccupancyConflict): Date {
  return isoToLocalDate(conflict.travelEndDate);
}

export function getInitialCalendarMonth(
  conflicts: RentalOccupancyConflict[],
  highlightStart?: string | null,
): { year: number; month: number } {
  const fromHighlight = parseIsoDate(highlightStart);
  if (fromHighlight) {
    return { year: fromHighlight.year, month: fromHighlight.month };
  }
  const sorted = [...conflicts].sort(
    (a, b) => conflictStart(a).getTime() - conflictStart(b).getTime(),
  );
  const first = sorted[0];
  if (!first) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const start = conflictStart(first);
  return { year: start.getFullYear(), month: start.getMonth() + 1 };
}

/** inclusive 날짜 구간 겹침 — excluded 제외 */
export function countDailyOccupancy(
  conflicts: RentalOccupancyConflict[],
  year: number,
  month: number,
): Map<string, number> {
  const daysInMonth = getDaysInMonth(year, month);
  const counts = new Map<string, number>();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = toIso(year, month, day);
    const date = isoToLocalDate(iso);
    let count = 0;
    for (const conflict of conflicts) {
      if (conflict.excluded) continue;
      const start = conflictStart(conflict);
      const end = conflictEnd(conflict);
      if (start <= date && end >= date) count += 1;
    }
    counts.set(iso, count);
  }
  return counts;
}

export function buildRentalOccupancyWeekBlocks(
  conflicts: RentalOccupancyConflict[],
  year: number,
  month: number,
): { weekBlocks: RentalOccupancyBlock[][]; weekCount: number; firstWeekday: number } {
  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getWeekdayIndex(year, month, 1);
  const totalCells = firstWeekday + daysInMonth;
  const weekCount = Math.ceil(totalCells / 7);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, daysInMonth);

  const filtered = [...conflicts]
    .filter((conflict) => {
      const start = conflictStart(conflict);
      const end = conflictEnd(conflict);
      return start <= monthEnd && end >= monthStart;
    })
    .sort((a, b) => conflictStart(a).getTime() - conflictStart(b).getTime());

  const weekBlocks: RentalOccupancyBlock[][] = Array.from({ length: weekCount }, () => []);
  const weekLaneCount: number[] = new Array(weekCount).fill(0);

  for (const conflict of filtered) {
    const tripStart = conflictStart(conflict);
    const tripEnd = conflictEnd(conflict);

    for (let weekIdx = 0; weekIdx < weekCount; weekIdx += 1) {
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
        key: `${conflict.confirmedTripId}-w${weekIdx}`,
        confirmedTripId: conflict.confirmedTripId,
        leaderName: conflict.leaderName,
        excluded: conflict.excluded,
        colStart,
        colSpan: colEnd - colStart + 1,
        lane,
        clippedLeft: tripStart < weekDateStart || tripStart < monthStart,
        clippedRight: tripEnd > weekDateEnd || tripEnd > monthEnd,
      });
    }
  }

  return { weekBlocks, weekCount, firstWeekday };
}

export function isDateInInclusiveRange(
  isoDate: string,
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): boolean {
  if (!startIso || !endIso) return false;
  const date = isoToLocalDate(isoDate);
  const start = isoToLocalDate(startIso);
  const end = isoToLocalDate(endIso);
  return date >= start && date <= end;
}
