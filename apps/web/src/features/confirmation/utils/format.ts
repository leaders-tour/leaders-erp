import {
  consolidateFormattedConfirmationAccommodationLines,
  formatConfirmationTravelerLine,
  splitConfirmationAccommodationDisplay,
} from '@tour/validation';
import type { ConfirmationDocumentSnapshot, ConfirmationTraveler } from '../model/types';

export function formatTravelersForDisplay(travelers: ConfirmationTraveler[]): string {
  return travelers
    .map((traveler) => formatConfirmationTravelerLine(traveler))
    .filter(Boolean)
    .join('\n');
}

export function formatAccommodationForDisplay(lines: string[]): string {
  return lines
    .map((line, index) => {
      const { name, spec } = splitConfirmationAccommodationDisplay(line);
      if (!name) {
        return '';
      }
      return spec ? `${index + 1}. ${name} ${spec}` : `${index + 1}. ${name}`;
    })
    .filter(Boolean)
    .join('\n');
}

export function fallbackText(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 0 ? text : '-';
}

export function snapshotToDocumentData(snapshot: ConfirmationDocumentSnapshot) {
  const accommodationLines = consolidateFormattedConfirmationAccommodationLines(snapshot.accommodationLines);

  return {
    ...snapshot,
    accommodationLines,
    travelersText: formatTravelersForDisplay(snapshot.travelers),
    accommodationText: formatAccommodationForDisplay(accommodationLines),
  };
}

export type ConfirmationDocumentData = ReturnType<typeof snapshotToDocumentData>;
