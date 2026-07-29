import { isLodgingSettingDay } from '../plan/lodging-night';
import type { ConfirmedTripRow } from './hooks';

function getElapsedDaysFromStart(startDateStr: string, now = new Date()): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function getTripDayFromStartDate(startDateStr: string, now = new Date()): number {
  return getElapsedDaysFromStart(startDateStr, now) + 1;
}

export function getCurrentTripLodgingDayIndex(
  trip: ConfirmedTripRow,
  startDateStr: string,
  now = new Date(),
): number | null {
  const tripDay = getTripDayFromStartDate(startDateStr, now);
  if (tripDay < 1) return null;

  const totalDays = trip.planVersion?.totalDays ?? null;
  const nights = totalDays != null && totalDays > 1 ? totalDays - 1 : null;

  if (nights != null && totalDays != null) {
    if (tripDay > nights) return nights;
    if (isLodgingSettingDay(tripDay, totalDays)) return tripDay;
    return nights;
  }

  return tripDay;
}

export function getCurrentTripLodging(
  trip: ConfirmedTripRow,
  startDateStr: string,
  now = new Date(),
): ConfirmedTripRow['lodgings'][number] | null {
  const lodgingDayIndex = getCurrentTripLodgingDayIndex(trip, startDateStr, now);
  if (lodgingDayIndex == null) return null;

  const assigned = [...trip.lodgings]
    .filter((lodging) => lodging.lodgingNameSnapshot.trim())
    .sort((a, b) => a.dayIndex - b.dayIndex);

  const exact = assigned.find((lodging) => lodging.dayIndex === lodgingDayIndex);
  if (exact) return exact;

  return assigned.filter((lodging) => lodging.dayIndex <= lodgingDayIndex).at(-1) ?? null;
}
