import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  buildGuideMapPathLayerKey,
  buildGuidePathPolylineOptions,
  canDrawGuidePath,
  GUIDE_PATH_ARROW_REPEAT,
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
