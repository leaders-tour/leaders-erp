export const CONFIRMATION_MEETING_PLACE_AIRPORT = '출국게이트 우측 버거킹 앞';
export const CONFIRMATION_MEETING_PLACE_ULAANBAATAR = '울란바토르 희망 장소';

/** @deprecated Use CONFIRMATION_MEETING_PLACE_AIRPORT */
export const CONFIRMATION_MEETING_PLACE_DEFAULT = CONFIRMATION_MEETING_PLACE_AIRPORT;

export function resolveConfirmationMeetingPlaceFromPickupText(pickupText: string): string {
  const normalized = pickupText.trim();
  if (normalized.length === 0 || normalized === '-') {
    return CONFIRMATION_MEETING_PLACE_AIRPORT;
  }

  const lines = normalized.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
  const hasAirport = lines.some((line) => line.includes('공항'));
  const hasUlaanbaatar = lines.some((line) => line.includes('울란바토르'));

  const meetingLines: string[] = [];
  if (hasAirport) {
    meetingLines.push(CONFIRMATION_MEETING_PLACE_AIRPORT);
  }
  if (hasUlaanbaatar) {
    meetingLines.push(CONFIRMATION_MEETING_PLACE_ULAANBAATAR);
  }

  if (meetingLines.length === 0) {
    return CONFIRMATION_MEETING_PLACE_AIRPORT;
  }

  return meetingLines.join('\n');
}
