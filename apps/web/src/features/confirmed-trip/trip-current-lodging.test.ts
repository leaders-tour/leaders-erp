import { describe, expect, it } from 'vitest';
import type { ConfirmedTripRow } from './hooks';
import {
  getCurrentTripLodging,
  getCurrentTripLodgingDayIndex,
  getTripDayFromStartDate,
} from './trip-current-lodging';

function tripWithLodgings(
  totalDays: number | null,
  lodgings: Array<{ dayIndex: number; lodgingNameSnapshot: string }>,
  startDate = '2026-07-01',
): { trip: ConfirmedTripRow; startDate: string } {
  return {
    startDate,
    trip: {
      planVersion: totalDays != null ? { totalDays } : null,
      lodgings: lodgings.map((lodging, index) => ({
        id: `l-${index}`,
        dayIndex: lodging.dayIndex,
        lodgingNameSnapshot: lodging.lodgingNameSnapshot,
        roomCount: 1,
        accommodation: null,
      })),
    } as unknown as ConfirmedTripRow,
  };
}

describe('trip-current-lodging', () => {
  it('maps calendar day to trip day', () => {
    expect(getTripDayFromStartDate('2026-07-01', new Date('2026-07-03'))).toBe(3);
  });

  it('uses current day lodging index during the trip', () => {
    const { trip, startDate } = tripWithLodgings(5, [
      { dayIndex: 1, lodgingNameSnapshot: '호텔 A' },
      { dayIndex: 2, lodgingNameSnapshot: '게르 B' },
      { dayIndex: 3, lodgingNameSnapshot: '게르 C' },
    ]);

    expect(getCurrentTripLodgingDayIndex(trip, startDate, new Date('2026-07-03'))).toBe(3);
    expect(getCurrentTripLodging(trip, startDate, new Date('2026-07-03'))?.lodgingNameSnapshot).toBe('게르 C');
  });

  it('uses last lodging night on the final travel day', () => {
    const { trip, startDate } = tripWithLodgings(5, [
      { dayIndex: 1, lodgingNameSnapshot: '호텔 A' },
      { dayIndex: 4, lodgingNameSnapshot: '게르 D' },
    ]);

    expect(getCurrentTripLodgingDayIndex(trip, startDate, new Date('2026-07-05'))).toBe(4);
    expect(getCurrentTripLodging(trip, startDate, new Date('2026-07-05'))?.lodgingNameSnapshot).toBe('게르 D');
  });
});
