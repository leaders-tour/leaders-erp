import { describe, expect, it } from 'vitest';
import { classifyVisitRegion, visitMatchesSelectedRegions, visitRegionFromCatalogName } from './visit-region';

describe('classifyVisitRegion', () => {
  it('classifies representative places', () => {
    expect(classifyVisitRegion(47.918, 106.917)).toBe('ULAANBAATAR');
    expect(classifyVisitRegion(47.843, 106.766)).toBe('ULAANBAATAR');
    expect(classifyVisitRegion(47.99, 107.46)).toBe('TERELJ');
    expect(classifyVisitRegion(43.77, 102.32)).toBe('GOBI');
    expect(classifyVisitRegion(46.2, 106.1)).toBe('GOBI');
    expect(classifyVisitRegion(47.197, 102.72)).toBe('CENTRAL');
    expect(classifyVisitRegion(50.44, 100.16)).toBe('KHUVSGUL');
    expect(classifyVisitRegion(43.24, 76.95)).toBeNull();
    expect(classifyVisitRegion(33.49, 126.53)).toBeNull();
  });

  it('uses shared borders so 46.6 is central and 107.25 is terelj', () => {
    expect(classifyVisitRegion(46.6, 106.1)).toBe('CENTRAL');
    expect(classifyVisitRegion(46.599, 106.1)).toBe('GOBI');
    expect(classifyVisitRegion(47.9, 107.25)).toBe('TERELJ');
    expect(classifyVisitRegion(47.9, 107.249)).toBe('ULAANBAATAR');
    expect(classifyVisitRegion(49.0, 100.0)).toBe('KHUVSGUL');
    expect(classifyVisitRegion(48.999, 100.0)).toBe('CENTRAL');
  });
});

describe('visitRegionFromCatalogName', () => {
  it('maps catalog Korean names to GPS visit regions', () => {
    expect(visitRegionFromCatalogName('중부')).toBe('CENTRAL');
    expect(visitRegionFromCatalogName('고비')).toBe('GOBI');
    expect(visitRegionFromCatalogName('홉스골')).toBe('KHUVSGUL');
    expect(visitRegionFromCatalogName('없는 지역')).toBeNull();
  });
});

describe('visitMatchesSelectedRegions', () => {
  it('keeps every visit when no region is selected', () => {
    expect(visitMatchesSelectedRegions(43.77, 102.32, [])).toBe(true);
    expect(visitMatchesSelectedRegions(33.49, 126.53, [])).toBe(true);
  });

  it('keeps only visits in the selected regions', () => {
    expect(visitMatchesSelectedRegions(43.77, 102.32, ['GOBI'])).toBe(true);
    expect(visitMatchesSelectedRegions(47.918, 106.917, ['GOBI'])).toBe(false);
    expect(visitMatchesSelectedRegions(33.49, 126.53, ['OTHER'])).toBe(true);
    expect(visitMatchesSelectedRegions(43.77, 102.32, ['OTHER'])).toBe(false);
    expect(visitMatchesSelectedRegions(47.99, 107.46, ['GOBI', 'TERELJ'])).toBe(true);
  });
});
