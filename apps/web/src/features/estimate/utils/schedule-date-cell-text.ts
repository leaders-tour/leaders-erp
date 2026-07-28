import { addDays } from './format';

const DAY_INDEX_PATTERN = /#?\s*(\d+)\s*일차/;
const CALENDAR_DATE_LINE_PATTERN = /^\d{1,2}월\s*\d{1,2}일$/;

function toUtcDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `dateCellText`에서 n일차 숫자 추출 (예: "3일차", "2일차\n7월 15일") */
export function parseDayIndexFromDateCellText(dateCellText: string): number | null {
  const trimmed = dateCellText.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const firstLine = trimmed.split('\n')[0]?.trim() ?? trimmed;
  const labeled = firstLine.match(DAY_INDEX_PATTERN) ?? trimmed.match(DAY_INDEX_PATTERN);
  if (!labeled) {
    return null;
  }

  const dayIndex = Number(labeled[1]);
  return Number.isFinite(dayIndex) && dayIndex > 0 ? dayIndex : null;
}

export function formatDateKoreanMonthDay(value: string | null | undefined): string | null {
  const date = value ? toUtcDate(value) : null;
  if (!date) {
    return null;
  }

  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
}

export function buildScheduleDateCellText(input: {
  travelStartDate: string | null | undefined;
  dateCellText: string;
}): string {
  const trimmed = input.dateCellText.trim();
  if (trimmed.length === 0 || trimmed === '기간외') {
    return input.dateCellText;
  }

  const dayIndex = parseDayIndexFromDateCellText(trimmed);
  if (!dayIndex) {
    return input.dateCellText;
  }

  const dayLabel = `${dayIndex}일차`;
  const routeDate = input.travelStartDate ? addDays(input.travelStartDate, dayIndex - 1) : null;
  const calendarDate = routeDate ? formatDateKoreanMonthDay(routeDate) : null;
  if (!calendarDate) {
    return dayLabel;
  }

  return `${dayLabel}\n${calendarDate}`;
}

export function isScheduleDateCellWithCalendarDate(value: string): boolean {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length !== 2) {
    return false;
  }

  const dayLabel = lines[0] ?? '';
  const calendarDate = lines[1] ?? '';
  return /^\d+일차$/.test(dayLabel) && CALENDAR_DATE_LINE_PATTERN.test(calendarDate);
}

export function formatVerticalDateText(value: string): string {
  return Array.from(value.replace(/\s+/g, '')).join('\n');
}

export type ScheduleDateCellDisplay =
  | {
      mode: 'horizontal';
      dayLabel: string;
      calendarDate: string;
    }
  | {
      mode: 'vertical';
      text: string;
    };

export function parseScheduleDateCellDisplay(value: string): ScheduleDateCellDisplay {
  if (isScheduleDateCellWithCalendarDate(value)) {
    const lines = value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const dayLabel = lines[0] ?? '';
    const calendarDate = lines[1] ?? '';
    return { mode: 'horizontal', dayLabel, calendarDate };
  }

  return { mode: 'vertical', text: formatVerticalDateText(value) };
}

export function enrichAppendixPlanStopRowsWithScheduleDates<T extends { dateCellText: string }>(
  rows: readonly T[],
  travelStartDate: string | null | undefined,
): T[] {
  return rows.map((row) => ({
    ...row,
    dateCellText: buildScheduleDateCellText({
      travelStartDate,
      dateCellText: row.dateCellText,
    }),
  }));
}

export function planStopsUseScheduleDateCellCalendarLayout(
  planStops: readonly { dateCellText: string }[],
): boolean {
  return planStops.some((row) => isScheduleDateCellWithCalendarDate(row.dateCellText));
}
