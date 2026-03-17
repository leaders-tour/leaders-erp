import { describe, expect, it } from 'vitest';
import { locationProfileCreateSchema } from '../../../../../packages/validation/src/location.schema';
import { segmentCreateSchema } from '../../../../../packages/validation/src/segment.schema';

describe('location first-day validation', () => {
  it('allows locations without first-day schedules when first-day eligibility is false', () => {
    const result = locationProfileCreateSchema.safeParse({
      regionId: 'region-1',
      name: ['울란바토르'],
      isFirstDayEligible: false,
      isLastDayEligible: false,
      lodging: {
        isUnspecified: false,
        name: '여행자 캠프',
        hasElectricity: 'YES',
        hasShower: 'YES',
        hasInternet: 'YES',
      },
      meals: {
        breakfast: null,
        lunch: null,
        dinner: null,
      },
    });

    expect(result.success).toBe(true);
  });

  it('requires both first-day schedules when first-day eligibility is true', () => {
    const result = locationProfileCreateSchema.safeParse({
      regionId: 'region-1',
      name: ['울란바토르'],
      isFirstDayEligible: true,
      isLastDayEligible: false,
      firstDayTimeSlots: [{ startTime: '08:00', activities: ['1일차 기본'] }],
      lodging: {
        isUnspecified: false,
        name: '여행자 캠프',
        hasElectricity: 'YES',
        hasShower: 'YES',
        hasInternet: 'YES',
      },
      meals: {
        breakfast: null,
        lunch: null,
        dinner: null,
      },
    });

    expect(result.success).toBe(false);
  });
});

describe('segment variant validation shape', () => {
  it('accepts early/extend/earlyExtend time slot arrays', () => {
    const result = segmentCreateSchema.safeParse({
      regionId: 'region-1',
      fromLocationId: 'loc-a',
      toLocationId: 'loc-b',
      averageDistanceKm: 10,
      averageTravelHours: 1,
      isLongDistance: false,
      timeSlots: [{ startTime: '08:00', activities: ['기본'] }],
      earlyTimeSlots: [{ startTime: '05:00', activities: ['얼리'] }],
      extendTimeSlots: [{ startTime: '20:00', activities: ['연장'] }],
      earlyExtendTimeSlots: [{ startTime: '05:00', activities: ['얼리+연장'] }],
      versions: [
        {
          name: 'Direct',
          averageDistanceKm: 10,
          averageTravelHours: 1,
          isLongDistance: false,
          timeSlots: [{ startTime: '08:00', activities: ['기본'] }],
          earlyTimeSlots: [{ startTime: '05:00', activities: ['얼리'] }],
          extendTimeSlots: [{ startTime: '20:00', activities: ['연장'] }],
          earlyExtendTimeSlots: [{ startTime: '05:00', activities: ['얼리+연장'] }],
          isDefault: true,
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
