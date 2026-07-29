import { describe, expect, it } from 'vitest';
import {
  CONFIRMATION_MEETING_PLACE_AIRPORT,
  CONFIRMATION_MEETING_PLACE_ULAANBAATAR,
  resolveConfirmationMeetingPlaceFromPickupText,
} from './confirmation-meeting-place';

describe('resolveConfirmationMeetingPlaceFromPickupText', () => {
  it('uses airport meeting place when pickup mentions 공항', () => {
    expect(resolveConfirmationMeetingPlaceFromPickupText('07/29 - 05:00 공항')).toBe(
      CONFIRMATION_MEETING_PLACE_AIRPORT,
    );
  });

  it('uses ulaanbaatar meeting place when pickup mentions 울란바토르', () => {
    expect(resolveConfirmationMeetingPlaceFromPickupText('07/29 - 04:00 울란바토르')).toBe(
      CONFIRMATION_MEETING_PLACE_ULAANBAATAR,
    );
  });

  it('joins both meeting places when multi-team pickup includes 공항 and 울란바토르', () => {
    expect(
      resolveConfirmationMeetingPlaceFromPickupText(
        'A팀 5인) 07/29 - 05:00 공항\nB팀 1인) 07/29 - 04:00 울란바토르',
      ),
    ).toBe(`${CONFIRMATION_MEETING_PLACE_AIRPORT}\n${CONFIRMATION_MEETING_PLACE_ULAANBAATAR}`);
  });

  it('falls back to airport meeting place for other pickup locations', () => {
    expect(resolveConfirmationMeetingPlaceFromPickupText('07/29 - 05:00 오즈하우스')).toBe(
      CONFIRMATION_MEETING_PLACE_AIRPORT,
    );
    expect(resolveConfirmationMeetingPlaceFromPickupText('-')).toBe(CONFIRMATION_MEETING_PLACE_AIRPORT);
    expect(resolveConfirmationMeetingPlaceFromPickupText('')).toBe(CONFIRMATION_MEETING_PLACE_AIRPORT);
  });
});
