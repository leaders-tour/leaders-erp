import { describe, expect, it } from 'vitest';
import { formatDateTriggerLabel, getCurrentLocalYear, getDaysInMonth, getInitialDatePickerView, parseIsoDate } from './date-picker-utils';

describe('date-picker-utils', () => {
  it('parses valid ISO dates and rejects invalid ones', () => {
    expect(parseIsoDate('2026-03-13')).toEqual({ year: 2026, month: 3, day: 13 });
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('2026/03/13')).toBeNull();
  });

  it('calculates month lengths including leap years', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29);
    expect(getDaysInMonth(2025, 2)).toBe(28);
    expect(getDaysInMonth(2026, 11)).toBe(30);
  });

  it('formats the trigger label with weekday', () => {
    expect(formatDateTriggerLabel('2026-03-13')).toBe('2026.03.13 (금)');
  });

  it('uses current local year and month when there is no value', () => {
    const now = new Date(2026, 2, 13, 15, 0, 0);
    expect(getCurrentLocalYear(now)).toBe(2026);
    expect(getInitialDatePickerView('', undefined, now)).toEqual({ year: 2026, month: 3 });
  });

  it('prefers the existing value over defaults', () => {
    const now = new Date(2026, 2, 13, 15, 0, 0);
    expect(getInitialDatePickerView('2028-11-05', 2026, now)).toEqual({ year: 2028, month: 11 });
  });
});
