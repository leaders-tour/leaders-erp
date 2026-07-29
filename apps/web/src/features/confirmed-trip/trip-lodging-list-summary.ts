import { isLodgingSettingDay } from '../plan/lodging-night';
import type { ConfirmedTripRow } from './hooks';

export interface TripLodgingListSummary {
  requiredNights: number | null;
  assignedNights: number;
  isComplete: boolean;
  hasAnyAssignment: boolean;
  progressLabel: string | null;
}

export function getTripLodgingListSummary(trip: ConfirmedTripRow): TripLodgingListSummary {
  const totalDays = trip.planVersion?.totalDays ?? null;
  const requiredNights = totalDays != null && totalDays > 1 ? totalDays - 1 : null;

  const assignedDayIndices = new Set<number>();
  for (const lodging of trip.lodgings) {
    if (!lodging.lodgingNameSnapshot.trim()) {
      continue;
    }
    if (totalDays != null && !isLodgingSettingDay(lodging.dayIndex, totalDays)) {
      continue;
    }
    assignedDayIndices.add(lodging.dayIndex);
  }

  const assignedNights = assignedDayIndices.size;
  const isComplete = requiredNights != null ? assignedNights >= requiredNights : assignedNights > 0;
  const progressLabel = requiredNights != null ? `${assignedNights}/${requiredNights}박` : null;

  return {
    requiredNights,
    assignedNights,
    isComplete,
    hasAnyAssignment: assignedNights > 0,
    progressLabel,
  };
}
