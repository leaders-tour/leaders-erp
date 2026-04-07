import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { DomainError } from '../../lib/errors';
import { SegmentService } from './segment.service';

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
