export interface IsoDateParts {
  year: number;
  month: number;
  day: number;
}

export interface DatePickerViewState {
  year: number;
  month: number | null;
}

export const KOREAN_WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function getCurrentLocalYear(now: Date = new Date()): number {
  return now.getFullYear();
}

export function getCurrentLocalMonth(now: Date = new Date()): number {
  return now.getMonth() + 1;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getWeekdayIndex(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function parseIsoDate(value: string | null | undefined): IsoDateParts | null {
  const trimmed = value?.trim() ?? '';
  const match = ISO_DATE_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  const maxDay = getDaysInMonth(year, month);
  if (day < 1 || day > maxDay) {
    return null;
  }

  return { year, month, day };
}

export function formatIsoDate(parts: IsoDateParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function formatDateTriggerLabel(value: string | null | undefined): string {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return '';
  }

  const weekdayLabel = KOREAN_WEEKDAY_LABELS[getWeekdayIndex(parsed.year, parsed.month, parsed.day)];
  return `${parsed.year}.${String(parsed.month).padStart(2, '0')}.${String(parsed.day).padStart(2, '0')} (${weekdayLabel})`;
}

export function getInitialDatePickerView(
  value: string | null | undefined,
  defaultYear?: number,
  now: Date = new Date(),
): DatePickerViewState {
  const parsed = parseIsoDate(value);
  if (parsed) {
    return { year: parsed.year, month: parsed.month };
  }

  return {
    year: defaultYear ?? getCurrentLocalYear(now),
    month: getCurrentLocalMonth(now),
  };
}
