import { describe, expect, it } from 'vitest';
import {
  buildAllowedMinuteOptions,
  formatTimeTriggerLabel,
  formatTimeValue,
  getInitialTimePickerView,
  getNearestAllowedMinute,
  parseTimeValue,
} from './time-picker-utils';

describe('time-picker-utils', () => {
  it('parses and formats valid HH:MM values', () => {
    expect(parseTimeValue('02:45')).toEqual({ hour: 2, minute: 45 });
    expect(parseTimeValue('24:00')).toBeNull();
    expect(formatTimeValue({ hour: 4, minute: 5 })).toBe('04:05');
    expect(formatTimeTriggerLabel('4:5')).toBe('');
  });

  it('normalizes allowed minute options', () => {
    expect(buildAllowedMinuteOptions([30, 0, 30, 90])).toEqual([0, 30]);
    expect(buildAllowedMinuteOptions()).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  });

  it('finds the nearest allowed minute', () => {
    expect(getNearestAllowedMinute(17, [0, 30])).toBe(30);
    expect(getNearestAllowedMinute(14, [0, 30])).toBe(0);
  });

  it('keeps the current hour and snaps minute for restricted fields', () => {
    expect(getInitialTimePickerView('05:17', [0, 30])).toEqual({ hour: 5, minute: 30 });
  });

  it('uses the current local time when there is no value', () => {
    const now = new Date(2026, 2, 13, 16, 41, 0);
    expect(getInitialTimePickerView('', [0, 30], now)).toEqual({ hour: 16, minute: 30 });
  });
});
