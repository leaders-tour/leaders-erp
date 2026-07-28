import type { EstimateTransportGroup } from '../estimate/model/types';
import { getRecommendedDropSchedule, getRecommendedPickupSchedule } from './pickup-drop';

export const DEFAULT_TRAVEL_SYNC_FLIGHT_IN_TIME = '02:45';
export const DEFAULT_TRAVEL_SYNC_FLIGHT_OUT_TIME = '18:15';

export interface TransportGroupTravelSyncDraft extends EstimateTransportGroup {
  hasEditedPickup: boolean;
  hasEditedDrop: boolean;
  hasEditedFlightIn: boolean;
  hasEditedFlightOut: boolean;
}

export interface TransportGroupTravelDates {
  travelStartDate: string;
  travelEndDate: string;
}

function resolveSyncedPickupDate(
  flightInDate: string,
  flightInTime: string,
  travelStartDate: string,
): string {
  const recommended = getRecommendedPickupSchedule(flightInDate, flightInTime, travelStartDate);
  if (recommended.date.trim()) {
    return recommended.date;
  }
  return travelStartDate.trim();
}

function resolveSyncedDropDate(
  flightOutDate: string,
  flightOutTime: string,
  travelEndDate: string,
): string {
  const recommended = getRecommendedDropSchedule(flightOutDate, flightOutTime, travelEndDate);
  if (recommended.date.trim()) {
    return recommended.date;
  }
  return travelEndDate.trim();
}

function applyDateOnlyTravelSync(
  group: TransportGroupTravelSyncDraft,
  dates: TransportGroupTravelDates,
): TransportGroupTravelSyncDraft {
  const travelStartDate = dates.travelStartDate.trim();
  const travelEndDate = dates.travelEndDate.trim();
  const nextGroup: TransportGroupTravelSyncDraft = { ...group };
  const flightInUnspecified = !group.flightInDate.trim() && !group.flightInTime.trim();
  const flightOutUnspecified = !group.flightOutDate.trim() && !group.flightOutTime.trim();

  if (!group.hasEditedFlightIn && travelStartDate) {
    nextGroup.flightInDate = travelStartDate;
    if (flightInUnspecified && !nextGroup.flightInTime.trim()) {
      nextGroup.flightInTime = DEFAULT_TRAVEL_SYNC_FLIGHT_IN_TIME;
    }
  }

  if (!group.hasEditedFlightOut && travelEndDate) {
    nextGroup.flightOutDate = travelEndDate;
    if (flightOutUnspecified && !nextGroup.flightOutTime.trim()) {
      nextGroup.flightOutTime = DEFAULT_TRAVEL_SYNC_FLIGHT_OUT_TIME;
    }
  }

  if (!group.hasEditedPickup && travelStartDate) {
    nextGroup.pickupDate = resolveSyncedPickupDate(
      nextGroup.flightInDate,
      nextGroup.flightInTime,
      travelStartDate,
    );
    if (!nextGroup.pickupTime.trim()) {
      const recommendedPickup = getRecommendedPickupSchedule(
        nextGroup.flightInDate,
        nextGroup.flightInTime,
        travelStartDate,
      );
      if (recommendedPickup.time.trim()) {
        nextGroup.pickupTime = recommendedPickup.time;
      }
    }
  }

  if (!group.hasEditedDrop && travelEndDate) {
    nextGroup.dropDate = resolveSyncedDropDate(
      nextGroup.flightOutDate,
      nextGroup.flightOutTime,
      travelEndDate,
    );
    if (!nextGroup.dropTime.trim()) {
      const recommendedDrop = getRecommendedDropSchedule(
        nextGroup.flightOutDate,
        nextGroup.flightOutTime,
        travelEndDate,
      );
      if (recommendedDrop.time.trim()) {
        nextGroup.dropTime = recommendedDrop.time;
      }
    }
  }

  return nextGroup;
}

export function hasAnyTransportManualPin(group: TransportGroupTravelSyncDraft): boolean {
  return (
    group.hasEditedFlightIn ||
    group.hasEditedFlightOut ||
    group.hasEditedPickup ||
    group.hasEditedDrop
  );
}

export function applyTransportGroupTravelDateSync(
  group: TransportGroupTravelSyncDraft,
  dates: TransportGroupTravelDates,
  options?: { clearManualPins?: boolean },
): TransportGroupTravelSyncDraft {
  const baseGroup: TransportGroupTravelSyncDraft = options?.clearManualPins
    ? {
        ...group,
        hasEditedFlightIn: false,
        hasEditedFlightOut: false,
        hasEditedPickup: false,
        hasEditedDrop: false,
      }
    : group;

  return applyDateOnlyTravelSync(baseGroup, dates);
}

export function isTransportGroupTravelLinked(
  group: TransportGroupTravelSyncDraft,
  dates: TransportGroupTravelDates,
): boolean {
  const travelStartDate = dates.travelStartDate.trim();
  const travelEndDate = dates.travelEndDate.trim();
  if (!travelStartDate || !travelEndDate) {
    return false;
  }

  if (hasAnyTransportManualPin(group)) {
    return false;
  }

  const synced = applyTransportGroupTravelDateSync(group, dates);
  return (
    synced.flightInDate === group.flightInDate &&
    synced.flightOutDate === group.flightOutDate &&
    synced.pickupDate === group.pickupDate &&
    synced.dropDate === group.dropDate
  );
}
