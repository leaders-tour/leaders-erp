import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  buildGuideMapPathLayerKey,
  buildGuidePathPolylineOptions,
  canDrawGuidePath,
  clipGuidePathToViewport,
  GUIDE_PATH_ARROW_REPEAT,
  prepareGuidePathForMap,
  resolveGuidePathRenderBudget,
  simplifyGuideMapPath,
} from './guide-location-map-utils';

beforeAll(() => {
  vi.stubGlobal('google', {
    maps: {
      SymbolPath: {
        FORWARD_CLOSED_ARROW: 0,
      },
    },
  });
});

describe('buildGuidePathPolylineOptions', () => {
  it('keeps arrows only on the focused path with a relaxed repeat', () => {
    const options = buildGuidePathPolylineOptions({
      color: '#4f46e5',
      focused: true,
      dimmed: false,
    });

    expect(options.icons).toHaveLength(1);
    expect(options.icons?.[0]?.repeat).toBe(GUIDE_PATH_ARROW_REPEAT);
    expect(GUIDE_PATH_ARROW_REPEAT).toBe('280px');
  });

  it('draws other paths as a stroke only', () => {
    expect(
      buildGuidePathPolylineOptions({
        color: '#4f46e5',
        focused: false,
        dimmed: false,
      }).icons,
    ).toEqual([]);
    expect(
      buildGuidePathPolylineOptions({
        color: '#4f46e5',
        focused: false,
        dimmed: true,
      }).icons,
    ).toEqual([]);
  });
});

describe('buildGuideMapPathLayerKey', () => {
  it('identifies a layer by ends and count instead of every coordinate', () => {
    const key = buildGuideMapPathLayerKey([
      {
        guideId: 'guide-1',
        color: '#4f46e5',
        focused: true,
        dimmed: false,
        path: [
          { lat: 47.8, lng: 107.4 },
          { lat: 47.81, lng: 107.41 },
          { lat: 47.82, lng: 107.53 },
        ],
      },
    ]);

    expect(key).toBe('guide-1:#4f46e5:1:0:3:47.800000,107.400000:47.820000,107.530000');
    expect(key).not.toContain('47.810000');
  });
});

describe('simplifyGuideMapPath', () => {
  it('keeps endpoints and drops nearby duplicates', () => {
    const simplified = simplifyGuideMapPath(
      [
        { lat: 47.8, lng: 107.4 },
        { lat: 47.80001, lng: 107.40001 },
        { lat: 47.9, lng: 107.5 },
      ],
      { minDistanceMeters: 75 },
    );

    expect(simplified).toEqual([
      { lat: 47.8, lng: 107.4 },
      { lat: 47.9, lng: 107.5 },
    ]);
  });

  it('caps the number of vertices for long tracks', () => {
    const path = Array.from({ length: 400 }, (_, index) => ({
      lat: 47.8 + index * 0.01,
      lng: 107.4 + index * 0.01,
    }));
    const simplified = simplifyGuideMapPath(path, { minDistanceMeters: 1, maxPoints: 20 });

    expect(simplified).toHaveLength(20);
    expect(simplified[0]).toEqual(path[0]);
    expect(simplified[simplified.length - 1]).toEqual(path[path.length - 1]);
  });
});

describe('prepareGuidePathForMap', () => {
  it('keeps a coarse overview at country zoom', () => {
    expect(resolveGuidePathRenderBudget(6).maxPoints).toBe(800);
    const path = Array.from({ length: 400 }, (_, index) => ({
      lat: 47.8 + index * 0.01,
      lng: 107.4 + index * 0.01,
    }));
    const prepared = prepareGuidePathForMap(path, { zoom: 6 });
    expect(prepared.length).toBeLessThanOrEqual(800);
    expect(prepared[0]).toEqual(path[0]);
    expect(prepared[prepared.length - 1]).toEqual(path[path.length - 1]);
  });

  it('clips to the viewport when zoomed in', () => {
    const path = [
      { lat: 47.8, lng: 106.8 },
      { lat: 47.85, lng: 106.9 },
      { lat: 44.5, lng: 105.7 },
      { lat: 43.5, lng: 104.2 },
    ];
    const clipped = clipGuidePathToViewport(path, {
      south: 47.7,
      west: 106.7,
      north: 47.95,
      east: 107.1,
    });
    expect(clipped.map((point) => point.lat)).toEqual([47.8, 47.85, 44.5]);
  });
});

describe('canDrawGuidePath', () => {
  it('requires at least two points', () => {
    expect(canDrawGuidePath([])).toBe(false);
    expect(canDrawGuidePath([{ lat: 47.8, lng: 107.4 }])).toBe(false);
    expect(
      canDrawGuidePath([
        { lat: 47.8, lng: 107.4 },
        { lat: 47.81, lng: 107.41 },
      ]),
    ).toBe(true);
  });
});
