import { describe, expect, it } from 'vitest';
import { haversineMeters } from './project-visit-import';
import {
  CLUSTER_LINK_M,
  appendSampleNote,
  clusterVisitSamples,
  suggestedVisitRadiusM,
  type ClusterPlaceSource,
  type VisitSampleSource,
} from './visit-sample-clusters';

const BASE = { latitude: 43.2, longitude: 103.5 };

function offsetPoint(northM: number, eastM = 0) {
  const dLat = northM / 111_320;
  const dLng = eastM / (111_320 * Math.cos((BASE.latitude * Math.PI) / 180));
  return {
    latitude: BASE.latitude + dLat,
    longitude: BASE.longitude + dLng,
  };
}

function sample(
  overrides: Partial<VisitSampleSource> & Pick<VisitSampleSource, 'id' | 'projectId'>,
): VisitSampleSource {
  return {
    projectName: overrides.projectName ?? overrides.projectId,
    centerLatitude: BASE.latitude,
    centerLongitude: BASE.longitude,
    startedAt: '2026-09-10T01:00:00.000Z',
    endedAt: '2026-09-10T02:00:00.000Z',
    durationMs: 45 * 60_000,
    radiusMeters: 40,
    pinType: 'attraction',
    description: 'A캠프',
    ...overrides,
  };
}

function place(
  overrides: Partial<ClusterPlaceSource> & { id: string; name: string },
): ClusterPlaceSource {
  return {
    placeType: 'EXPERIENCE',
    latitude: BASE.latitude,
    longitude: BASE.longitude,
    parentPlaceId: null,
    regionId: null,
    country: '몽골',
    accommodationId: null,
    visitRadiusM: 100,
    code: overrides.code ?? overrides.id,
    ...overrides,
  };
}

describe('clusterVisitSamples', () => {
  it('groups the same location from 3 projects into one cluster', () => {
    const clusters = clusterVisitSamples(
      [
        sample({ id: 'v1', projectId: 'p1', description: 'A캠프' }),
        sample({ id: 'v2', projectId: 'p2', description: 'A캠프' }),
        sample({ id: 'v3', projectId: 'p3', description: 'A캠프' }),
      ],
      [],
    );

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.visitCount).toBe(3);
    expect(clusters[0]?.projectCount).toBe(3);
    expect(clusters[0]?.confidence).toBe('enough');
    expect(clusters[0]?.kind).toBe('new_place');
    expect(clusters[0]?.name).toBe('A캠프');
    expect(clusters[0]?.placeType).toBe('EXPERIENCE');
  });

  it('keeps the median coordinate when one sample is offset', () => {
    const outlier = offsetPoint(100);
    const clusters = clusterVisitSamples(
      [
        sample({ id: 'v1', projectId: 'p1' }),
        sample({ id: 'v2', projectId: 'p2' }),
        sample({ id: 'v3', projectId: 'p3' }),
        sample({ id: 'v4', projectId: 'p4' }),
        sample({ id: 'v5', projectId: 'p5' }),
        sample({
          id: 'v6',
          projectId: 'p6',
          centerLatitude: outlier.latitude,
          centerLongitude: outlier.longitude,
        }),
      ],
      [],
    );

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.latitude).toBeCloseTo(BASE.latitude, 6);
    expect(clusters[0]?.longitude).toBeCloseTo(BASE.longitude, 6);
    expect(
      haversineMeters(
        { latitude: clusters[0]!.latitude, longitude: clusters[0]!.longitude },
        BASE,
      ),
    ).toBeLessThan(5);
    expect(haversineMeters({ latitude: outlier.latitude, longitude: outlier.longitude }, BASE)).toBeLessThan(
      CLUSTER_LINK_M,
    );
  });

  it('attaches a lone visit that sits inside the neighbor suggested radius', () => {
    const near = offsetPoint(30);
    const lone = offsetPoint(-160, 40);
    const clusters = clusterVisitSamples(
      [
        sample({ id: 'v1', projectId: 'p1', radiusMeters: 120 }),
        sample({ id: 'v2', projectId: 'p2', radiusMeters: 120, centerLatitude: near.latitude, centerLongitude: near.longitude }),
        sample({ id: 'v3', projectId: 'p3', radiusMeters: 200, centerLatitude: lone.latitude, centerLongitude: lone.longitude }),
      ],
      [],
    );

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.visitCount).toBe(3);
    expect(clusters[0]?.projectCount).toBe(3);
  });

  it('keeps two spots apart when the same project visited both', () => {
    const other = offsetPoint(200);
    const clusters = clusterVisitSamples(
      [
        sample({ id: 'v1', projectId: 'p1', radiusMeters: 250 }),
        sample({ id: 'v2', projectId: 'p1', radiusMeters: 250, centerLatitude: other.latitude, centerLongitude: other.longitude }),
      ],
      [],
    );

    expect(clusters).toHaveLength(2);
  });

  it('does not attach groups beyond 250m even with large visit radii', () => {
    const other = offsetPoint(280);
    const clusters = clusterVisitSamples(
      [
        sample({ id: 'v1', projectId: 'p1', radiusMeters: 300 }),
        sample({ id: 'v2', projectId: 'p2', radiusMeters: 300, centerLatitude: other.latitude, centerLongitude: other.longitude }),
      ],
      [],
    );

    expect(clusters).toHaveLength(2);
  });

  it('marks a single nearby catalog place as an existing fix candidate', () => {
    const clusters = clusterVisitSamples(
      [sample({ id: 'v1', projectId: 'p1' }), sample({ id: 'v2', projectId: 'p2' })],
      [place({ id: 'pl-1', name: 'ATV 체험장', code: 'PL-003', visitRadiusM: 100 })],
    );

    expect(clusters[0]?.kind).toBe('existing_fix');
    expect(clusters[0]?.existingPlace?.id).toBe('pl-1');
    expect(clusters[0]?.existingOffsetM).toBe(0);
    expect(clusters[0]?.existingRadiusM).toBe(100);
  });

  it('marks overlapping nearby places as review', () => {
    const nearby = offsetPoint(40);
    const clusters = clusterVisitSamples(
      [sample({ id: 'v1', projectId: 'p1' }), sample({ id: 'v2', projectId: 'p2' })],
      [
        place({ id: 'pl-camp', name: 'A캠프', code: 'PL-001' }),
        place({
          id: 'pl-gate',
          name: 'A캠프 출입구',
          code: 'PL-007',
          placeType: 'GATE',
          latitude: nearby.latitude,
          longitude: nearby.longitude,
        }),
      ],
    );

    expect(clusters[0]?.kind).toBe('review');
    expect(clusters[0]?.reviewReason).toBe('overlap');
    expect(clusters[0]?.nearbyPlaces).toHaveLength(2);
  });

  it('marks a 600m+ chain as too wide', () => {
    const samples = Array.from({ length: 7 }, (_, index) => {
      const point = offsetPoint(index * 110);
      return sample({
        id: `v${index + 1}`,
        projectId: `p${index + 1}`,
        centerLatitude: point.latitude,
        centerLongitude: point.longitude,
      });
    });
    const clusters = clusterVisitSamples(samples, []);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.spreadM).toBeGreaterThan(600);
    expect(clusters[0]?.kind).toBe('review');
    expect(clusters[0]?.reviewReason).toBe('too_wide');
  });

  it('does not attach a parent area more than 10km away', () => {
    const clusters = clusterVisitSamples(
      [sample({ id: 'v1', projectId: 'p1' })],
      [
        place({
          id: 'area-far',
          name: '미니사막',
          placeType: 'AREA',
          latitude: 45,
          longitude: 105,
        }),
      ],
    );

    expect(clusters[0]?.parentPlaceId).toBeNull();
    expect(clusters[0]?.parentDistanceM).toBeNull();
  });

  it('attaches a parent area within 10km', () => {
    const areaPoint = offsetPoint(2000);
    const clusters = clusterVisitSamples(
      [sample({ id: 'v1', projectId: 'p1' })],
      [
        place({
          id: 'area-near',
          name: '고비',
          placeType: 'AREA',
          latitude: areaPoint.latitude,
          longitude: areaPoint.longitude,
          regionId: 'region-1',
        }),
      ],
    );

    expect(clusters[0]?.parentPlaceId).toBe('area-near');
    expect(clusters[0]?.regionId).toBe('region-1');
    expect(clusters[0]?.parentDistanceM).toBeGreaterThan(1000);
    expect(clusters[0]?.parentDistanceM).toBeLessThan(3000);
  });

  it('uses lodging when most samples stay overnight', () => {
    const clusters = clusterVisitSamples(
      [
        sample({ id: 'v1', projectId: 'p1', durationMs: 11 * 60 * 60_000, pinType: null }),
        sample({ id: 'v2', projectId: 'p2', durationMs: 12 * 60 * 60_000, pinType: null }),
        sample({ id: 'v3', projectId: 'p3', durationMs: 40 * 60_000, pinType: 'attraction' }),
      ],
      [],
    );

    expect(clusters[0]?.placeType).toBe('LODGING');
    expect(clusters[0]?.visitJudgmentType).toBe('STAY');
  });
});

describe('suggestedVisitRadiusM', () => {
  it('clamps and rounds to 10 meters', () => {
    expect(suggestedVisitRadiusM([5, 8, 10], [20, 22, 24])).toBe(30);
    expect(suggestedVisitRadiusM([200, 220, 400], [80, 90, 100])).toBe(300);
    expect(suggestedVisitRadiusM([12, 14, 16], [33, 35, 37])).toBe(50);
  });
});

describe('appendSampleNote', () => {
  it('appends a sample note and keeps the 500-character limit', () => {
    expect(appendSampleNote(null, 8, 3, '2026-10-12')).toBe(
      '표본 방문 8회 / 프로젝트 3개 기준 (2026-10-12)',
    );
    expect(appendSampleNote('기존 메모', 2, 2, '2026-10-12')).toContain('기존 메모');
    expect(appendSampleNote('x'.repeat(490), 1, 1, '2026-10-12').length).toBe(500);
  });
});
