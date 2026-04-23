import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { segmentBulkCreateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { SegmentService } from './segment.service';

const baseBulkInput = {
  toLocationId: 'to-1',
  averageDistanceKm: 100,
  averageTravelHours: 2,
  isLongDistance: false,
  timeSlots: [{ startTime: '08:00', activities: ['이동'] }],
};

function createService() {
  return new SegmentService({} as PrismaClient);
}

function createVersion(kind: 'DEFAULT' | 'SEASON' | 'FLIGHT') {
  return {
    name: '테스트 버전',
    averageDistanceKm: 100,
    averageTravelHours: 2,
    movementIntensity: 'LEVEL_1',
    isLongDistance: false,
    kind,
    startDate: null,
    endDate: null,
    flightOutTimeBand: kind === 'FLIGHT' ? 'EVENING_18_21' : null,
    lodgingOverride: null,
    mealsOverride: null,
    isDefault: kind === 'DEFAULT',
    timeSlotsByVariant: {
      basic: [{ startTime: '08:00', activities: ['이동'] }],
    },
  };
}

describe('SegmentService required variant schedules', () => {
  it('does not require early or extend schedules for flight versions', () => {
    const service = createService();
    const version = createVersion('FLIGHT');

    expect(() =>
      (service as any).assertRequiredVariantSchedules(version, ['basic', 'early', 'extend']),
    ).not.toThrow();
  });

  it('still requires early schedules for non-flight versions', () => {
    const service = createService();
    const version = createVersion('SEASON');

    expect(() =>
      (service as any).assertRequiredVariantSchedules(version, ['basic', 'early']),
    ).toThrowError(new DomainError('VALIDATION_FAILED', 'Segment version "테스트 버전" requires early schedules'));
  });
});

describe('segmentBulkCreateSchema', () => {
  it('accepts multiple unique fromLocationIds', () => {
    const result = segmentBulkCreateSchema.safeParse({
      ...baseBulkInput,
      fromLocationIds: ['from-1', 'from-2', 'from-3'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects duplicate fromLocationIds', () => {
    const result = segmentBulkCreateSchema.safeParse({
      ...baseBulkInput,
      fromLocationIds: ['from-1', 'from-1'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'fromLocationIds must not contain duplicates')).toBe(true);
    }
  });

  it('rejects fromLocationIds containing toLocationId', () => {
    const result = segmentBulkCreateSchema.safeParse({
      ...baseBulkInput,
      fromLocationIds: ['from-1', 'to-1'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'fromLocationIds must not include toLocationId')).toBe(true);
    }
  });

  it('rejects empty fromLocationIds', () => {
    const result = segmentBulkCreateSchema.safeParse({
      ...baseBulkInput,
      fromLocationIds: [],
    });
    expect(result.success).toBe(false);
  });
});
