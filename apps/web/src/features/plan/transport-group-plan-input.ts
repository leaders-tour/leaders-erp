import type { EstimateTransportGroup } from '../estimate/model/types';
import { normalizePickupDropCustomText } from './pickup-drop';

function toIsoDateTime(value: string): string {
  return `${value}T00:00:00.000Z`;
}

/** 시간만 입력된 경우 true (저장 불가). */
export function isFlightScheduleTimeOnly(flightDate: string | null | undefined, flightTime: string | null | undefined): boolean {
  const date = flightDate?.trim() ?? '';
  const time = flightTime?.trim() ?? '';
  return date.length === 0 && time.length > 0;
}

export function isTransportGroupFlightFieldsInvalid(
  group: Pick<EstimateTransportGroup, 'flightInDate' | 'flightInTime' | 'flightOutDate' | 'flightOutTime'>,
): boolean {
  return (
    isFlightScheduleTimeOnly(group.flightInDate, group.flightInTime)
    || isFlightScheduleTimeOnly(group.flightOutDate, group.flightOutTime)
  );
}

export function mapTransportGroupToPlanMutationInput(group: EstimateTransportGroup) {
  const flightInDate = group.flightInDate?.trim() ?? '';
  const flightInTime = group.flightInTime?.trim() ?? '';
  const flightOutDate = group.flightOutDate?.trim() ?? '';
  const flightOutTime = group.flightOutTime?.trim() ?? '';

  return {
    teamName: group.teamName.trim(),
    headcount: group.headcount,
    ...(flightInDate ? { flightInDate: toIsoDateTime(flightInDate) } : {}),
    ...(flightInTime ? { flightInTime } : {}),
    ...(flightOutDate ? { flightOutDate: toIsoDateTime(flightOutDate) } : {}),
    ...(flightOutTime ? { flightOutTime } : {}),
    pickupDate: group.pickupDate?.trim() ? toIsoDateTime(group.pickupDate.trim()) : undefined,
    pickupTime: group.pickupTime.trim() || undefined,
    pickupPlaceType: group.pickupPlaceType,
    pickupPlaceCustomText: normalizePickupDropCustomText(group.pickupPlaceType, group.pickupPlaceCustomText),
    dropDate: group.dropDate?.trim() ? toIsoDateTime(group.dropDate.trim()) : undefined,
    dropTime: group.dropTime.trim() || undefined,
    dropPlaceType: group.dropPlaceType,
    dropPlaceCustomText: normalizePickupDropCustomText(group.dropPlaceType, group.dropPlaceCustomText),
  };
}

export function primaryMetaFlightFields(primary: EstimateTransportGroup | undefined): {
  flightInTime?: string;
  flightOutTime?: string;
} {
  if (!primary) {
    return {};
  }

  const flightInTime = primary.flightInTime?.trim() ?? '';
  const flightOutTime = primary.flightOutTime?.trim() ?? '';

  return {
    ...(flightInTime ? { flightInTime } : {}),
    ...(flightOutTime ? { flightOutTime } : {}),
  };
}
