export type VisitRegion = 'GOBI' | 'CENTRAL' | 'KHUVSGUL' | 'TERELJ' | 'ULAANBAATAR';
export type VisitRegionFilter = VisitRegion | 'OTHER';

export interface VisitRegionBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  latMaxExclusive?: boolean;
  lngMaxExclusive?: boolean;
}

export const VISIT_REGION_BOUNDS: Record<VisitRegion, VisitRegionBounds> = {
  ULAANBAATAR: { minLat: 47.75, maxLat: 48.05, minLng: 106.6, maxLng: 107.25, lngMaxExclusive: true },
  TERELJ: { minLat: 47.75, maxLat: 48.4, minLng: 107.25, maxLng: 108.0 },
  GOBI: { minLat: 42.5, maxLat: 46.6, minLng: 100, maxLng: 111, latMaxExclusive: true },
  CENTRAL: { minLat: 46.6, maxLat: 49.0, minLng: 99, maxLng: 106.6, latMaxExclusive: true },
  KHUVSGUL: { minLat: 49.0, maxLat: 52.0, minLng: 98, maxLng: 102.5 },
};

export const VISIT_REGION_ORDER: readonly VisitRegion[] = [
  'ULAANBAATAR',
  'TERELJ',
  'GOBI',
  'CENTRAL',
  'KHUVSGUL',
];

export const VISIT_REGION_FILTER_ORDER: readonly VisitRegionFilter[] = [
  'GOBI',
  'CENTRAL',
  'KHUVSGUL',
  'TERELJ',
  'ULAANBAATAR',
  'OTHER',
];

export const VISIT_REGION_LABEL: Record<VisitRegion, string> = {
  GOBI: '고비',
  CENTRAL: '중부',
  KHUVSGUL: '홉스골',
  TERELJ: '테를지',
  ULAANBAATAR: '울란바토르',
};

export const VISIT_REGION_FILTER_LABEL: Record<VisitRegionFilter, string> = {
  ...VISIT_REGION_LABEL,
  OTHER: '그외',
};

function inRange(value: number, min: number, max: number, maxExclusive?: boolean): boolean {
  if (value < min) return false;
  return maxExclusive ? value < max : value <= max;
}

function inBounds(latitude: number, longitude: number, bounds: VisitRegionBounds): boolean {
  return (
    inRange(latitude, bounds.minLat, bounds.maxLat, bounds.latMaxExclusive) &&
    inRange(longitude, bounds.minLng, bounds.maxLng, bounds.lngMaxExclusive)
  );
}

export function classifyVisitRegion(latitude: number, longitude: number): VisitRegion | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  for (const region of VISIT_REGION_ORDER) {
    if (inBounds(latitude, longitude, VISIT_REGION_BOUNDS[region])) return region;
  }
  return null;
}

export function visitMatchesSelectedRegions(
  latitude: number,
  longitude: number,
  selected: readonly VisitRegionFilter[],
): boolean {
  if (selected.length === 0) return true;
  const region = classifyVisitRegion(latitude, longitude);
  if (region) return selected.includes(region);
  return selected.includes('OTHER');
}
