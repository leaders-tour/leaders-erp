import { formatConfirmationTravelerLine, normalizeConfirmationAccommodationLine } from '@tour/validation';
import type { ConfirmationDocumentSnapshot, ConfirmationTraveler } from '../model/types';

export function formatTravelersForDisplay(travelers: ConfirmationTraveler[]): string {
  return travelers
    .map((traveler) => formatConfirmationTravelerLine(traveler))
    .filter(Boolean)
    .join('\n');
}

export function formatAccommodationForDisplay(lines: string[]): string {
  return lines
    .map((line, index) => `${index + 1}. ${normalizeConfirmationAccommodationLine(line)}`)
    .join('\n');
}

export function fallbackText(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 0 ? text : '-';
}

export function snapshotToDocumentData(snapshot: ConfirmationDocumentSnapshot) {
  return {
    ...snapshot,
    travelersText: formatTravelersForDisplay(snapshot.travelers),
    accommodationText: formatAccommodationForDisplay(snapshot.accommodationLines),
  };
}

export type ConfirmationDocumentData = ReturnType<typeof snapshotToDocumentData>;
