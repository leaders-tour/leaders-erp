import { describe, expect, it } from 'vitest';
import { segmentCreateSchema, type SegmentCreateInput } from '@tour/validation';

function createTimeSlots() {
  return [{ startTime: '09:00', activities: ['기본 이동'] }];
}

function buildInput(
  versions: NonNullable<SegmentCreateInput['versions']>,
): SegmentCreateInput {
  return {
    regionId: 'region-1',
    fromLocationId: 'loc-a',
    toLocationId: 'loc-b',
    averageDistanceKm: 100,
    averageTravelHours: 2,
    isLongDistance: false,
    timeSlots: createTimeSlots(),
    versions,
  };
}

function createDefaultVersion() {
  return {
    name: '기본',
    averageDistanceKm: 100,
    averageTravelHours: 2,
    isLongDistance: false,
    kind: 'DEFAULT' as const,
    timeSlots: createTimeSlots(),
    isDefault: true,
  };
}

describe('segment version contract', () => {
  it('accepts default, season, and flight versions together when each uses only its own condition', () => {
    const result = segmentCreateSchema.safeParse(
      buildInput([
        createDefaultVersion(),
        {
          name: '겨울 시즌',
          averageDistanceKm: 110,
          averageTravelHours: 2.5,
          isLongDistance: false,
          kind: 'SEASON',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          timeSlots: createTimeSlots(),
          isDefault: false,
        },
        {
          name: '야간 출국',
          averageDistanceKm: 120,
          averageTravelHours: 3,
          isLongDistance: false,
          kind: 'FLIGHT',
          flightOutTimeBand: 'EVENING_18_21',
          timeSlots: createTimeSlots(),
          isDefault: false,
        },
      ]),
    );

    expect(result.success).toBe(true);
  });

  it('rejects a season version without a full date range and rejects a mixed flight field', () => {
    const result = segmentCreateSchema.safeParse(
      buildInput([
        createDefaultVersion(),
        {
          name: '잘못된 시즌',
          averageDistanceKm: 110,
          averageTravelHours: 2.5,
          isLongDistance: false,
          kind: 'SEASON',
          startDate: '2026-01-01',
          flightOutTimeBand: 'EVENING_18_21',
          timeSlots: createTimeSlots(),
          isDefault: false,
        },
      ]),
    );

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
      expect.arrayContaining(['versions.1.endDate', 'versions.1.flightOutTimeBand']),
    );
  });

  it('rejects a flight version with date fields or without a time band', () => {
    const result = segmentCreateSchema.safeParse(
      buildInput([
        createDefaultVersion(),
        {
          name: '잘못된 항공',
          averageDistanceKm: 120,
          averageTravelHours: 3,
          isLongDistance: false,
          kind: 'FLIGHT',
          startDate: '2026-02-01',
          endDate: '2026-02-28',
          timeSlots: createTimeSlots(),
          isDefault: false,
        },
      ]),
    );

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
      expect.arrayContaining(['versions.1.startDate', 'versions.1.flightOutTimeBand']),
    );
  });

  it('rejects duplicate flight time bands only among flight versions', () => {
    const result = segmentCreateSchema.safeParse(
      buildInput([
        createDefaultVersion(),
        {
          name: '야간 출국 A',
          averageDistanceKm: 120,
          averageTravelHours: 3,
          isLongDistance: false,
          kind: 'FLIGHT',
          flightOutTimeBand: 'EVENING_18_21',
          timeSlots: createTimeSlots(),
          isDefault: false,
        },
        {
          name: '야간 출국 B',
          averageDistanceKm: 130,
          averageTravelHours: 3.5,
          isLongDistance: false,
          kind: 'FLIGHT',
          flightOutTimeBand: 'EVENING_18_21',
          timeSlots: createTimeSlots(),
          isDefault: false,
        },
      ]),
    );

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))).toContain(
      'versions.2.flightOutTimeBand',
    );
  });

  it('rejects overlapping date ranges only among season versions', () => {
    const result = segmentCreateSchema.safeParse(
      buildInput([
        createDefaultVersion(),
        {
          name: '1월 시즌',
          averageDistanceKm: 110,
          averageTravelHours: 2.5,
          isLongDistance: false,
          kind: 'SEASON',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          timeSlots: createTimeSlots(),
          isDefault: false,
        },
        {
          name: '1월 말 시즌',
          averageDistanceKm: 112,
          averageTravelHours: 2.7,
          isLongDistance: false,
          kind: 'SEASON',
          startDate: '2026-01-20',
          endDate: '2026-02-10',
          timeSlots: createTimeSlots(),
          isDefault: false,
        },
        {
          name: '야간 출국',
          averageDistanceKm: 120,
          averageTravelHours: 3,
          isLongDistance: false,
          kind: 'FLIGHT',
          flightOutTimeBand: 'EVENING_18_21',
          timeSlots: createTimeSlots(),
          isDefault: false,
        },
      ]),
    );

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toContain(
      'season versions must not have overlapping date ranges',
    );
  });
});
