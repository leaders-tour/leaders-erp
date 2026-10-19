import { describe, expect, it } from 'vitest';
import {
  measureObservationPath,
  medianNumber,
  observationElapsedMs,
  pairConfirmedVisits,
  shouldPreserveHeldObservation,
  summarizeRouteObservations,
  catalogRouteDisplayStats,
  catalogRoutePlannedStats,
  shouldPreserveObservationIncludes,
} from './route-observation';

describe('pairConfirmedVisits', () => {
  it('pairs adjacent visits in the same project and skips the same place', () => {
    const pairs = pairConfirmedVisits([
      { id: 'a', projectId: 'p1', placeId: 'gate', startedAt: '2026-08-01T01:00:00.000Z', endedAt: '2026-08-01T01:10:00.000Z' },
      { id: 'b', projectId: 'p1', placeId: 'gate', startedAt: '2026-08-01T02:00:00.000Z', endedAt: '2026-08-01T02:05:00.000Z' },
      { id: 'c', projectId: 'p1', placeId: 'atv', startedAt: '2026-08-01T03:00:00.000Z', endedAt: '2026-08-01T04:00:00.000Z' },
      { id: 'd', projectId: 'p2', placeId: 'other', startedAt: '2026-08-01T03:30:00.000Z', endedAt: '2026-08-01T03:40:00.000Z' },
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.from.id).toBe('b');
    expect(pairs[0]?.to.id).toBe('c');
  });
});

describe('observationElapsedMs', () => {
  it('uses departure end to arrival start and never goes negative', () => {
    expect(
      observationElapsedMs('2026-08-01T01:10:00.000Z', '2026-08-01T01:42:00.000Z'),
    ).toBe(32 * 60_000);
    expect(
      observationElapsedMs('2026-08-01T02:00:00.000Z', '2026-08-01T01:50:00.000Z'),
    ).toBe(0);
  });
});

describe('measureObservationPath', () => {
  it('keeps time and drops distance when the path is too thin', () => {
    const metrics = measureObservationPath([
      { latitude: 47.2, longitude: 102.8, recordedAt: '2026-08-01T01:10:00.000Z' },
    ]);
    expect(metrics.status).toBe('AUTO');
    expect(metrics.includeElapsed).toBe(true);
    expect(metrics.includeDistance).toBe(false);
    expect(metrics.distanceKm).toBeNull();
  });

  it('holds a jump faster than 200km/h', () => {
    const metrics = measureObservationPath([
      { latitude: 47.2, longitude: 102.8, recordedAt: '2026-08-01T01:00:00.000Z' },
      { latitude: 48.2, longitude: 103.8, recordedAt: '2026-08-01T01:01:00.000Z' },
    ]);
    expect(metrics.status).toBe('HOLD');
    expect(metrics.holdReason).toBe('JUMP');
    expect(metrics.includeElapsed).toBe(false);
  });

  it('holds a gap of 30 minutes or more', () => {
    const metrics = measureObservationPath([
      { latitude: 47.2, longitude: 102.8, recordedAt: '2026-08-01T01:00:00.000Z' },
      { latitude: 47.21, longitude: 102.81, recordedAt: '2026-08-01T01:40:00.000Z' },
    ]);
    expect(metrics.status).toBe('HOLD');
    expect(metrics.holdReason).toBe('GAP');
  });

  it('excludes distance when the gap is 10 minutes or more', () => {
    const metrics = measureObservationPath([
      { latitude: 47.2, longitude: 102.8, recordedAt: '2026-08-01T01:00:00.000Z' },
      { latitude: 47.205, longitude: 102.805, recordedAt: '2026-08-01T01:12:00.000Z' },
    ]);
    expect(metrics.status).toBe('AUTO');
    expect(metrics.includeDistance).toBe(false);
    expect(metrics.includeElapsed).toBe(true);
    expect(metrics.distanceKm).toBeNull();
  });
});

describe('summarizeRouteObservations', () => {
  it('uses the median of usable elapsed minutes', () => {
    const stats = summarizeRouteObservations(
      [28, 30, 31, 32, 32, 34, 36, 39].map((minutes) => ({
        status: 'AUTO' as const,
        includeElapsed: true,
        includeDistance: true,
        elapsedMs: minutes * 60_000,
        distanceKm: 12.4,
      })),
    );
    expect(stats.usableCount).toBe(8);
    expect(stats.medianElapsedMinutes).toBe(32);
    expect(stats.minElapsedMinutes).toBe(28);
    expect(stats.maxElapsedMinutes).toBe(39);
    expect(stats.medianDistanceKm).toBe(12.4);
  });

  it('excludes held rows from usable stats', () => {
    const stats = summarizeRouteObservations([
      { status: 'AUTO', includeElapsed: true, includeDistance: false, elapsedMs: 30 * 60_000, distanceKm: null },
      { status: 'HOLD', includeElapsed: false, includeDistance: false, elapsedMs: 90 * 60_000, distanceKm: null },
    ]);
    expect(stats.observationCount).toBe(2);
    expect(stats.usableCount).toBe(1);
    expect(stats.medianElapsedMinutes).toBe(30);
    expect(stats.medianDistanceKm).toBeNull();
  });
});

describe('catalogRouteDisplayStats', () => {
  it('prefers observed medians over manual averages', () => {
    expect(
      catalogRouteDisplayStats({
        medianDistanceKm: 12.4,
        medianElapsedMinutes: 32,
        averageDistanceKm: 240,
        averageTravelHours: 4,
      }),
    ).toEqual({
      distanceKm: 12.4,
      distanceSource: 'observed',
      elapsedMinutes: 32,
      elapsedSource: 'observed',
    });
  });

  it('falls back to manual averages when there is no usable observation', () => {
    expect(
      catalogRouteDisplayStats({
        medianDistanceKm: null,
        medianElapsedMinutes: null,
        averageDistanceKm: 240,
        averageTravelHours: 4,
      }),
    ).toEqual({
      distanceKm: 240,
      distanceSource: 'manual',
      elapsedMinutes: 240,
      elapsedSource: 'manual',
    });
  });
});

describe('medianNumber', () => {
  it('averages the two middle values for an even list', () => {
    expect(medianNumber([1, 2, 3, 4])).toBe(2.5);
  });
});

describe('catalogRoutePlannedStats', () => {
  it('adds buffer to observed elapsed time without changing distance', () => {
    expect(
      catalogRoutePlannedStats({
        estimateMode: 'AUTO',
        bufferMinutes: 5,
        medianDistanceKm: 12.4,
        medianElapsedMinutes: 32,
        averageDistanceKm: 240,
        averageTravelHours: 4,
      }),
    ).toEqual({
      distanceKm: 12.4,
      distanceSource: 'observed',
      baseElapsedMinutes: 32,
      elapsedMinutes: 37,
      elapsedSource: 'observed',
      bufferMinutes: 5,
      estimateMode: 'AUTO',
    });
  });

  it('locks manual values even when observations exist', () => {
    expect(
      catalogRoutePlannedStats({
        estimateMode: 'MANUAL',
        bufferMinutes: 10,
        medianDistanceKm: 12.4,
        medianElapsedMinutes: 32,
        averageDistanceKm: 240,
        averageTravelHours: 4,
      }),
    ).toEqual({
      distanceKm: 240,
      distanceSource: 'manual',
      baseElapsedMinutes: 240,
      elapsedMinutes: 250,
      elapsedSource: 'manual',
      bufferMinutes: 10,
      estimateMode: 'MANUAL',
    });
  });
});

describe('shouldPreserveHeldObservation', () => {
  it('keeps HOLD rows', () => {
    expect(shouldPreserveHeldObservation('HOLD')).toBe(true);
    expect(shouldPreserveHeldObservation('AUTO')).toBe(false);
  });
});

describe('shouldPreserveObservationIncludes', () => {
  it('keeps operator include overrides on AUTO rows', () => {
    expect(shouldPreserveObservationIncludes({ status: 'AUTO', manualIncludeOverride: true })).toBe(true);
    expect(shouldPreserveObservationIncludes({ status: 'AUTO', manualIncludeOverride: false })).toBe(false);
  });
});
