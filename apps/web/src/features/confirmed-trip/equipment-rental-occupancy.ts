import {
  getTripEndDate,
  getTripLeaderName,
  getTripStartDate,
  type ConfirmedTripRow,
} from './hooks';
import type { RentalOccupancyConflict } from './rental-occupancy-calendar';

export type EquipmentRentalFilter = 'drone' | 'starlink' | 'powerbank';

const EQUIPMENT_RENTAL_FILTERS = new Set<EquipmentRentalFilter>(['drone', 'starlink', 'powerbank']);

export function isEquipmentRentalFilter(value: string): value is EquipmentRentalFilter {
  return EQUIPMENT_RENTAL_FILTERS.has(value as EquipmentRentalFilter);
}

/** 드론/스타링크/파워뱅크 중 정확히 하나만 선택됐을 때 해당 필터를 반환 */
export function getSingleEquipmentRentalFilter(filters: readonly string[]): EquipmentRentalFilter | null {
  const selected = filters.filter(isEquipmentRentalFilter);
  return selected.length === 1 ? selected[0]! : null;
}

export function tripUsesEquipmentFilter(trip: ConfirmedTripRow, filter: EquipmentRentalFilter): boolean {
  if (filter === 'drone') return Boolean(trip.rentalDrone);
  if (filter === 'starlink') return Boolean(trip.rentalStarlink);
  return Boolean(trip.rentalPowerbank);
}

export function buildEquipmentRentalConflicts(
  trips: readonly ConfirmedTripRow[],
  filter: EquipmentRentalFilter,
): RentalOccupancyConflict[] {
  return trips.flatMap((trip) => {
    if (trip.status !== 'ACTIVE') return [];
    if (!tripUsesEquipmentFilter(trip, filter)) return [];

    const start = getTripStartDate(trip);
    const end = getTripEndDate(trip);
    if (!start || !end) return [];

    return [
      {
        confirmedTripId: trip.id,
        excluded: false,
        leaderName: getTripLeaderName(trip),
        travelStartDate: start,
        travelEndDate: end,
      },
    ];
  });
}

export function getEquipmentStockTotal(
  stock: { drone: number; starlink: number; powerbank: number },
  filter: EquipmentRentalFilter,
): number {
  if (filter === 'drone') return stock.drone;
  if (filter === 'starlink') return stock.starlink;
  return stock.powerbank;
}
