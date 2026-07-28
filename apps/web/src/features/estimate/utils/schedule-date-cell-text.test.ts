import { describe, expect, it } from 'vitest';
import {
  buildScheduleDateCellText,
  enrichAppendixPlanStopRowsWithScheduleDates,
  formatDateKoreanMonthDay,
  isScheduleDateCellWithCalendarDate,
  parseDayIndexFromDateCellText,
  parseScheduleDateCellDisplay,
  planStopsUseScheduleDateCellCalendarLayout,
} from './schedule-date-cell-text';
import { planStopRowsToAppendixRows } from '../../confirmation/utils/resolve-confirmation-appendix';

describe('parseDayIndexFromDateCellText', () => {
  it('extracts day index from legacy label', () => {
    expect(parseDayIndexFromDateCellText('2일차')).toBe(2);
  });

  it('extracts day index from two-line label', () => {
    expect(parseDayIndexFromDateCellText('2일차\n7월 15일')).toBe(2);
  });

  it('returns null for custom text', () => {
    expect(parseDayIndexFromDateCellText('출발일')).toBeNull();
  });
});

describe('formatDateKoreanMonthDay', () => {
  it('formats month and day without year', () => {
    expect(formatDateKoreanMonthDay('2026-07-15')).toBe('7월 15일');
  });

  it('returns null for invalid input', () => {
    expect(formatDateKoreanMonthDay('invalid')).toBeNull();
  });
});

describe('buildScheduleDateCellText', () => {
  it('builds two-line date cell text from travel start date', () => {
    expect(
      buildScheduleDateCellText({
        travelStartDate: '2026-07-14',
        dateCellText: '2일차',
      }),
    ).toBe('2일차\n7월 15일');
  });

  it('refreshes calendar date when label already includes a date', () => {
    expect(
      buildScheduleDateCellText({
        travelStartDate: '2026-08-01',
        dateCellText: '1일차\n7월 15일',
      }),
    ).toBe('1일차\n8월 1일');
  });

  it('preserves external transfer label', () => {
    expect(
      buildScheduleDateCellText({
        travelStartDate: '2026-07-14',
        dateCellText: '기간외',
      }),
    ).toBe('기간외');
  });

  it('preserves custom text without day index', () => {
    expect(
      buildScheduleDateCellText({
        travelStartDate: '2026-07-14',
        dateCellText: '출발일',
      }),
    ).toBe('출발일');
  });

  it('handles month boundary', () => {
    expect(
      buildScheduleDateCellText({
        travelStartDate: '2026-07-31',
        dateCellText: '2일차',
      }),
    ).toBe('2일차\n8월 1일');
  });

  it('handles leap day', () => {
    expect(
      buildScheduleDateCellText({
        travelStartDate: '2024-02-28',
        dateCellText: '2일차',
      }),
    ).toBe('2일차\n2월 29일');
  });

  it('falls back to day label when travel start date is missing', () => {
    expect(
      buildScheduleDateCellText({
        travelStartDate: null,
        dateCellText: '3일차',
      }),
    ).toBe('3일차');
  });
});

describe('isScheduleDateCellWithCalendarDate', () => {
  it('detects new two-line format', () => {
    expect(isScheduleDateCellWithCalendarDate('2일차\n7월 15일')).toBe(true);
  });

  it('returns false for legacy single-line format', () => {
    expect(isScheduleDateCellWithCalendarDate('2일차')).toBe(false);
  });
});

describe('parseScheduleDateCellDisplay', () => {
  it('returns horizontal display for new format', () => {
    expect(parseScheduleDateCellDisplay('2일차\n7월 15일')).toEqual({
      mode: 'horizontal',
      dayLabel: '2일차',
      calendarDate: '7월 15일',
    });
  });

  it('returns vertical display for legacy format', () => {
    expect(parseScheduleDateCellDisplay('2일차')).toEqual({
      mode: 'vertical',
      text: '2\n일\n차',
    });
  });
});

describe('enrichAppendixPlanStopRowsWithScheduleDates', () => {
  it('adds calendar dates to appendix rows', () => {
    expect(
      enrichAppendixPlanStopRowsWithScheduleDates(
        [{ dateCellText: '2일차', destinationCellText: '테를지' }],
        '2026-07-14',
      ),
    ).toEqual([{ dateCellText: '2일차\n7월 15일', destinationCellText: '테를지' }]);
  });
});

describe('planStopsUseScheduleDateCellCalendarLayout', () => {
  it('returns true when any row uses calendar date layout', () => {
    expect(
      planStopsUseScheduleDateCellCalendarLayout([
        { dateCellText: '1일차' },
        { dateCellText: '2일차\n7월 15일' },
      ]),
    ).toBe(true);
  });

  it('returns false for legacy rows only', () => {
    expect(
      planStopsUseScheduleDateCellCalendarLayout([
        { dateCellText: '1일차' },
        { dateCellText: '2일차' },
      ]),
    ).toBe(false);
  });
});

describe('planStopRowsToAppendixRows', () => {
  it('enriches rows when travel start date is provided', () => {
    expect(
      planStopRowsToAppendixRows(
        [
          {
            dateCellText: '1일차',
            destinationCellText: '공항',
            timeCellText: '',
            scheduleCellText: '',
            lodgingCellText: '',
            mealCellText: '',
            movementIntensityColorOverride: null,
          },
        ],
        '2026-07-01',
      ),
    ).toEqual([
      {
        dateCellText: '1일차\n7월 1일',
        destinationCellText: '공항',
        timeCellText: '',
        scheduleCellText: '',
        lodgingCellText: '',
        mealCellText: '',
        movementIntensityColorOverride: null,
      },
    ]);
  });
});
