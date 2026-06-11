import { describe, expect, it } from 'vitest';
import {
  buildRentalOccupancyWeekBlocks,
  countDailyOccupancy,
  getInitialCalendarMonth,
  type RentalOccupancyConflict,
} from './rental-occupancy-calendar';

function conflict(input: {
  id: string;
  start: string;
  end: string;
  excluded?: boolean;
  leaderName?: string;
}): RentalOccupancyConflict {
  return {
    confirmedTripId: input.id,
    excluded: input.excluded ?? false,
    leaderName: input.leaderName ?? input.id,
    travelStartDate: `${input.start}T00:00:00.000Z`,
    travelEndDate: `${input.end}T00:00:00.000Z`,
  };
}

describe('rental-occupancy-calendar', () => {
  it('counts daily occupancy with inclusive dates, excluding excluded conflicts', () => {
    const conflicts = [
      conflict({ id: 'a', start: '2026-06-11', end: '2026-06-13' }),
      conflict({ id: 'b', start: '2026-06-14', end: '2026-06-18' }),
      conflict({ id: 'self', start: '2026-06-13', end: '2026-06-17', excluded: true }),
    ];
    const counts = countDailyOccupancy(conflicts, 2026, 6);

    expect(counts.get('2026-06-13')).toBe(1);
    expect(counts.get('2026-06-14')).toBe(1);
    expect(counts.get('2026-06-17')).toBe(1);
    expect(counts.get('2026-06-18')).toBe(1);
  });

  it('counts same-day end/start boundary as overlapping on that day', () => {
    const conflicts = [
      conflict({ id: 'a', start: '2026-06-11', end: '2026-06-13' }),
      conflict({ id: 'b', start: '2026-06-13', end: '2026-06-17' }),
    ];
    const counts = countDailyOccupancy(conflicts, 2026, 6);

    expect(counts.get('2026-06-13')).toBe(2);
  });

  it('uses highlightStart for initial month when provided', () => {
    const month = getInitialCalendarMonth(
      [conflict({ id: 'a', start: '2026-05-01', end: '2026-05-05' })],
      '2026-06-13',
    );
    expect(month).toEqual({ year: 2026, month: 6 });
  });

  it('builds week blocks for conflicts spanning the month', () => {
    const { weekBlocks, weekCount } = buildRentalOccupancyWeekBlocks(
      [conflict({ id: 'a', start: '2026-06-11', end: '2026-06-16', leaderName: '이서윤' })],
      2026,
      6,
    );

    expect(weekCount).toBeGreaterThan(0);
    const allBlocks = weekBlocks.flat();
    expect(allBlocks.length).toBeGreaterThan(0);
    expect(allBlocks[0]).toMatchObject({
      confirmedTripId: 'a',
      leaderName: '이서윤',
      excluded: false,
    });
  });
});
