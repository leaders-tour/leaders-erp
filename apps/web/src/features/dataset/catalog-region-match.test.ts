import { describe, expect, it } from 'vitest';
import { matchCatalogRegionByVisit, resolveCatalogRegionId } from './catalog-region-match';

const REGIONS = [
  { id: 'crg_central', name: '중부', status: 'ACTIVE' },
  { id: 'crg_gobi', name: '고비', status: 'ACTIVE' },
  { id: 'crg_khovsgol', name: '홉스골', status: 'ACTIVE' },
  { id: 'crg_zavkhan', name: '자브항', status: 'ACTIVE' },
];

describe('matchCatalogRegionByVisit', () => {
  it('maps Ugii / Bayanzag coordinates to 중부', () => {
    expect(matchCatalogRegionByVisit(47.7588, 102.8129, REGIONS)).toBe('crg_central');
    expect(matchCatalogRegionByVisit(47.332, 103.6726, REGIONS)).toBe('crg_central');
  });

  it('maps Gobi and Khuvsgul coordinates by catalog region name', () => {
    expect(matchCatalogRegionByVisit(43.77, 102.32, REGIONS)).toBe('crg_gobi');
    expect(matchCatalogRegionByVisit(50.44, 100.16, REGIONS)).toBe('crg_khovsgol');
  });

  it('does not invent a region when the catalog has no matching name', () => {
    expect(matchCatalogRegionByVisit(47.918, 106.917, REGIONS)).toBeNull();
  });
});

describe('resolveCatalogRegionId', () => {
  it('prefers the parent area region when present', () => {
    expect(
      resolveCatalogRegionId({
        latitude: 47.7588,
        longitude: 102.8129,
        parentRegionId: 'parent-region',
        regions: REGIONS,
      }),
    ).toBe('parent-region');
  });

  it('falls back to GPS name matching', () => {
    expect(
      resolveCatalogRegionId({
        latitude: 47.7588,
        longitude: 102.8129,
        parentRegionId: null,
        regions: REGIONS,
      }),
    ).toBe('crg_central');
  });
});
