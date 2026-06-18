import { describe, expect, it } from 'vitest';
import {
  buildEquipmentRentalConflicts,
  getEquipmentStockTotal,
  getSingleEquipmentRentalFilter,
  tripUsesEquipmentFilter,
} from './equipment-rental-occupancy';
import type { ConfirmedTripRow } from './hooks';

function trip(partial: Partial<ConfirmedTripRow> & { id: string }): ConfirmedTripRow {
  return {
    id: partial.id,
    status: partial.status ?? 'ACTIVE',
    rentalDrone: partial.rentalDrone ?? false,
    rentalStarlink: partial.rentalStarlink ?? false,
    rentalPowerbank: partial.rentalPowerbank ?? false,
    travelStart: partial.travelStart ?? '2026-06-10',
    travelEnd: partial.travelEnd ?? '2026-06-14',
    user: { name: partial.user?.name ?? '테스트' },
    planVersion: partial.planVersion ?? {
      meta: {
        leaderName: '리더',
        travelStartDate: '2026-06-10',
        travelEndDate: '2026-06-14',
      },
    },
  } as ConfirmedTripRow;
}

describe('equipment-rental-occupancy', () => {
  it('returns a filter only when exactly one equipment type is selected', () => {
    expect(getSingleEquipmentRentalFilter([])).toBeNull();
    expect(getSingleEquipmentRentalFilter(['drone'])).toBe('drone');
    expect(getSingleEquipmentRentalFilter(['drone', 'pickup'])).toBe('drone');
    expect(getSingleEquipmentRentalFilter(['drone', 'starlink'])).toBeNull();
  });

  it('builds conflicts from active trips with the selected equipment flag', () => {
    const conflicts = buildEquipmentRentalConflicts(
      [
        trip({ id: 'a', rentalDrone: true }),
        trip({ id: 'b', rentalStarlink: true, status: 'ACTIVE' }),
        trip({ id: 'c', rentalDrone: true, status: 'CANCELLED' }),
      ],
      'drone',
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      confirmedTripId: 'a',
      travelStartDate: '2026-06-10',
      travelEndDate: '2026-06-14',
    });
  });

  it('maps stock totals by equipment filter', () => {
    expect(getEquipmentStockTotal({ drone: 10, starlink: 5, powerbank: 2 }, 'starlink')).toBe(5);
    expect(tripUsesEquipmentFilter(trip({ id: 'x', rentalPowerbank: true }), 'powerbank')).toBe(true);
  });
});
