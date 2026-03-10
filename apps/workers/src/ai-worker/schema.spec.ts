import { describe, expect, it } from 'vitest';
import { cafeLeadNeedsSchema } from '@tour/validation';

describe('cafeLeadNeedsSchema', () => {
  it('accepts a valid parsed AI payload', () => {
    const parsed = cafeLeadNeedsSchema.parse({
      departureDate: '2026-07-10',
      returnDate: '2026-07-15',
      durationNights: 5,
      durationDays: 6,
      travelerCount: 4,
      travelerType: 'family',
      destinations: ['고비사막', '테를지'],
      budget: '1인당 200만원 전후',
      interests: ['사막', '별보기'],
      specialRequests: ['아이 동반'],
      urgency: '보통',
      leadScore: 82,
    });

    expect(parsed.travelerType).toBe('family');
  });

  it('rejects invalid travelerType', () => {
    expect(() =>
      cafeLeadNeedsSchema.parse({
        departureDate: null,
        returnDate: null,
        durationNights: null,
        durationDays: null,
        travelerCount: null,
        travelerType: 'group',
        destinations: [],
        budget: null,
        interests: [],
        specialRequests: [],
        urgency: null,
        leadScore: 50,
      }),
    ).toThrow();
  });
});
