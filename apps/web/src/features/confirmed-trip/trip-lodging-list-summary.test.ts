import { describe, expect, it } from 'vitest';
import type { ConfirmedTripRow } from './hooks';
import { getTripLodgingListSummary } from './trip-lodging-list-summary';

function tripWithLodgings(
  totalDays: number | null,
  lodgings: Array<{ dayIndex: number; lodgingNameSnapshot: string }>,
): ConfirmedTripRow {
  return {
    planVersion: totalDays != null ? { totalDays } : null,
    lodgings: lodgings.map((lodging, index) => ({
      id: `l-${index}`,
      dayIndex: lodging.dayIndex,
      lodgingNameSnapshot: lodging.lodgingNameSnapshot,
      roomCount: 1,
      accommodation: null,
    })),
  } as unknown as ConfirmedTripRow;
}

describe('getTripLodgingListSummary', () => {
  it('requires totalDays - 1 nights for a multi-day trip', () => {
    const summary = getTripLodgingListSummary(tripWithLodgings(5, []));
    expect(summary.requiredNights).toBe(4);
    expect(summary.assignedNights).toBe(0);
    expect(summary.isComplete).toBe(false);
    expect(summary.progressLabel).toBe('0/4박');
  });

  it('marks complete when all lodging nights are assigned', () => {
    const summary = getTripLodgingListSummary(
      tripWithLodgings(5, [
        { dayIndex: 1, lodgingNameSnapshot: '호텔 A' },
        { dayIndex: 2, lodgingNameSnapshot: '호텔 A' },
        { dayIndex: 3, lodgingNameSnapshot: '게르 B' },
        { dayIndex: 4, lodgingNameSnapshot: '게르 B' },
      ]),
    );
    expect(summary.isComplete).toBe(true);
    expect(summary.progressLabel).toBe('4/4박');
  });

  it('ignores last travel day lodging when counting assignments', () => {
    const summary = getTripLodgingListSummary(
      tripWithLodgings(5, [
        { dayIndex: 1, lodgingNameSnapshot: '호텔 A' },
        { dayIndex: 2, lodgingNameSnapshot: '호텔 A' },
        { dayIndex: 3, lodgingNameSnapshot: '호텔 A' },
        { dayIndex: 5, lodgingNameSnapshot: '마지막일' },
      ]),
    );
    expect(summary.assignedNights).toBe(3);
    expect(summary.isComplete).toBe(false);
  });
});
