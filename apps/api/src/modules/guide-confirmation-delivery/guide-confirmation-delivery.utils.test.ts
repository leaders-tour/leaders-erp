import { describe, expect, it } from 'vitest';
import {
  buildGuideConfirmationPdfStoragePath,
  buildGuideConfirmationSummary,
} from './guide-confirmation-delivery.utils';

describe('guide-confirmation-delivery.utils', () => {
  it('builds per-guide pdf storage path', () => {
    expect(
      buildGuideConfirmationPdfStoragePath({
        authUserId: 'auth-1',
        confirmationDocumentId: 'doc-1',
        versionNumber: 3,
      }),
    ).toBe('auth-1/doc-1/v3.pdf');
  });

  it('builds guide-facing summary without internal memo fields', () => {
    const summary = buildGuideConfirmationSummary({
      leaderName: 'Kim',
      destination: 'Ulaanbaatar',
      headcountText: '8',
      travelPeriodText: '2026-08-01 ~ 2026-08-07',
      vehicleType: 'Starex',
      flightInText: 'In',
      flightOutText: 'Out',
      pickupText: 'Pickup',
      dropText: 'Drop',
      externalPickupDropText: '',
      specialNote: 'Note',
      rentalItemsText: '',
      eventNames: '',
      remark: '',
      balancePerPersonText: '100',
      guideName: 'Bold',
      meetingPlace: 'Hotel',
      travelers: [{ name: 'A' }],
      accommodationLines: ['Day1 hotel'],
      appendixPlanStops: [],
    });

    expect(summary.leaderName).toBe('Kim');
    expect(summary.destination).toBe('Ulaanbaatar');
    expect(summary).not.toHaveProperty('memo');
  });
});
