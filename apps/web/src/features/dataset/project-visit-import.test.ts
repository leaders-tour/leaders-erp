import { describe, expect, it } from 'vitest';
import {
  blockedImportRows,
  buildPlaceCreateInput,
  findNearbyLodgingAccommodation,
  findNearbyPlace,
  findNearestArea,
  haversineMeters,
  pickNameFromGeocodeResults,
  planImportRoutes,
  suggestImportRow,
  toImportRow,
  visitToBulkPlaceDraft,
  type CatalogPlaceMatchSource,
  type ProjectVisitImportVisit,
} from './project-visit-import';

function place(overrides: Partial<CatalogPlaceMatchSource> & { id: string; name: string }): CatalogPlaceMatchSource {
  return {
    placeType: 'EXPERIENCE',
    latitude: 47.8512,
    longitude: 106.912,
    parentPlaceId: null,
    regionId: null,
    country: '몽골',
    accommodationId: null,
    ...overrides,
  };
}

function visit(overrides: Partial<ProjectVisitImportVisit> = {}): ProjectVisitImportVisit {
  return {
    id: 'visit-1',
    startedAt: '2026-09-28T02:00:00.000Z',
    centerLatitude: 47.8512,
    centerLongitude: 106.912,
    durationMs: 45 * 60_000,
    radiusMeters: 80,
    pinType: null,
    description: null,
    ...overrides,
  };
}

describe('visitToBulkPlaceDraft', () => {
  it('defaults a missing pin type to experience when the stay is under 10 hours', () => {
    const draft = visitToBulkPlaceDraft({
      centerLatitude: 47.85,
      centerLongitude: 106.91,
      durationMs: 45 * 60_000,
      radiusMeters: 80,
      pinType: null,
      description: null,
    });
    expect(draft.placeType).toBe('EXPERIENCE');
    expect(draft.visitJudgmentType).toBe('STAY');
  });

  it('defaults a missing pin type to lodging when the stay is 10 hours or longer', () => {
    expect(
      visitToBulkPlaceDraft({
        centerLatitude: 47.85,
        centerLongitude: 106.91,
        durationMs: 10 * 60 * 60_000,
        radiusMeters: 80,
        pinType: null,
        description: null,
      }).placeType,
    ).toBe('LODGING');
  });

  it('keeps lodging when the visit pin says lodging', () => {
    expect(
      visitToBulkPlaceDraft({
        centerLatitude: 47.85,
        centerLongitude: 106.91,
        durationMs: 45 * 60_000,
        radiusMeters: 80,
        pinType: 'lodging',
        description: 'A캠프',
      }).placeType,
    ).toBe('LODGING');
  });
});

describe('nearby matching', () => {
  it('reuses the closest non-area place inside 150m', () => {
    const near = place({ id: 'p-near', name: '수흐바타르 광장', latitude: 47.8513, longitude: 106.9121 });
    const far = place({ id: 'p-far', name: '멀리', latitude: 47.9, longitude: 106.95 });
    const match = findNearbyPlace(47.8512, 106.912, [near, far], 80);
    expect(match?.place.id).toBe('p-near');
    expect(match?.distanceM).toBeLessThan(150);
  });

  it('does not reuse an area as a catalog place', () => {
    const area = place({
      id: 'area-1',
      name: '울란바토르',
      placeType: 'AREA',
      latitude: 47.8512,
      longitude: 106.912,
    });
    expect(findNearbyPlace(47.8512, 106.912, [area], 80)).toBeNull();
  });

  it('picks the nearest area only within 10km', () => {
    const ub = place({
      id: 'area-ub',
      name: '울란바토르',
      placeType: 'AREA',
      latitude: 47.92,
      longitude: 106.92,
    });
    const desert = place({
      id: 'area-desert',
      name: '미니사막',
      placeType: 'AREA',
      latitude: 44.2,
      longitude: 103.7,
    });
    expect(findNearestArea(47.85, 106.91, [ub, desert])?.place.id).toBe('area-ub');
    expect(findNearestArea(45.0, 105.0, [ub, desert])).toBeNull();
  });

  it('does not suggest a parent area 400km away', () => {
    const desert = place({
      id: 'area-desert',
      name: '미니사막',
      placeType: 'AREA',
      latitude: 44.2,
      longitude: 103.7,
    });
    const suggestion = suggestImportRow(
      visit({
        centerLatitude: 47.85,
        centerLongitude: 106.91,
        description: 'Tsagaan Suvarga',
      }),
      [desert],
    );
    expect(suggestion.parentPlaceId).toBeNull();
    expect(suggestion.parentDistanceM).toBeNull();
    expect(suggestion.regionId).toBeNull();
  });

  it('assigns 중부 from GPS when catalog regions are available', () => {
    const suggestion = suggestImportRow(
      visit({
        centerLatitude: 47.7588,
        centerLongitude: 102.8129,
        description: '우기 호수',
      }),
      [],
      [{ id: 'crg_central', name: '중부', status: 'ACTIVE' }],
    );
    expect(suggestion.parentPlaceId).toBeNull();
    expect(suggestion.regionId).toBe('crg_central');
  });

  it('suggests lodging accommodation only within 300m', () => {
    const lodge = place({
      id: 'lodge-1',
      name: '캠프',
      placeType: 'LODGING',
      latitude: 47.8514,
      longitude: 106.9122,
      accommodationId: 'acc-1',
    });
    expect(findNearbyLodgingAccommodation(47.8512, 106.912, [lodge])?.place.accommodationId).toBe('acc-1');
    expect(
      findNearbyLodgingAccommodation(47.86, 106.93, [lodge]),
    ).toBeNull();
  });
});

describe('suggestImportRow', () => {
  it('fills judgment, nearest area, and reuse from existing places', () => {
    const places: CatalogPlaceMatchSource[] = [
      place({
        id: 'area-ub',
        name: '울란바토르',
        placeType: 'AREA',
        latitude: 47.92,
        longitude: 106.92,
        regionId: 'rg-1',
      }),
      place({ id: 'p-1', name: '광장', latitude: 47.85125, longitude: 106.91205 }),
    ];
    const suggestion = suggestImportRow(visit({ description: '점심' }), places);
    expect(suggestion.name).toBe('점심');
    expect(suggestion.placeType).toBe('EXPERIENCE');
    expect(suggestion.parentPlaceId).toBe('area-ub');
    expect(suggestion.reusePlaceId).toBe('p-1');
    expect(suggestion.reusePlaceName).toBe('광장');
    expect(suggestion.country).toBe('몽골');
  });

  it('ignores district labels from visit descriptions', () => {
    const suggestion = suggestImportRow(visit({ description: 'Nalaikh District' }), [
      place({ id: 'p-1', name: 'Energy Hills Resort', latitude: 47.85125, longitude: 106.91205 }),
    ]);
    expect(suggestion.name).toBe('Energy Hills Resort');
  });

  it('uses the reused place name when the visit has no description', () => {
    const suggestion = suggestImportRow(visit(), [
      place({ id: 'p-1', name: '광장', latitude: 47.85125, longitude: 106.91205 }),
    ]);
    expect(suggestion.name).toBe('광장');
  });

  it('treats a 10-hour stay without pin type as lodging and fills a nearby accommodation', () => {
    const suggestion = suggestImportRow(visit({ durationMs: 10 * 60 * 60_000 }), [
      place({
        id: 'lodge-1',
        name: '캠프',
        placeType: 'LODGING',
        latitude: 47.8514,
        longitude: 106.9122,
        accommodationId: 'acc-1',
      }),
    ]);
    expect(suggestion.placeType).toBe('LODGING');
    expect(suggestion.accommodationId).toBe('acc-1');
  });
});

describe('apply planning', () => {
  it('blocks enabled rows that have no name and are not reused', () => {
    const ready = toImportRow(suggestImportRow(visit({ description: 'A' }), []));
    const blocked = toImportRow(suggestImportRow(visit({ id: 'visit-2', description: null }), []));
    blocked.reuseEnabled = false;
    blocked.reusePlaceId = null;
    blocked.name = '';
    expect(blockedImportRows([ready, blocked]).map((row) => row.visitId)).toEqual(['visit-2']);
  });

  it('omits accommodation unless the row is lodging', () => {
    const row = toImportRow(suggestImportRow(visit({ pinType: 'attraction', description: '사원' }), []));
    row.accommodationId = 'acc-1';
    expect(buildPlaceCreateInput(row).accommodationId).toBeNull();
  });

  it('builds time-ordered routes and skips existing or same-place pairs', () => {
    const drafts = planImportRoutes(
      [
        { visitId: 'v2', startedAt: '2026-09-28T06:00:00.000Z', name: 'B', placeId: 'p-b' },
        { visitId: 'v1', startedAt: '2026-09-28T02:00:00.000Z', name: 'A', placeId: 'p-a' },
        { visitId: 'v3', startedAt: '2026-09-28T09:00:00.000Z', name: 'B again', placeId: 'p-b' },
        { visitId: 'v4', startedAt: '2026-09-28T12:00:00.000Z', name: 'C', placeId: 'p-c' },
      ],
      [{ fromPlaceId: 'p-a', toPlaceId: 'p-b' }],
    );
    expect(drafts).toEqual([
      {
        fromVisitId: 'v3',
        toVisitId: 'v4',
        fromPlaceId: 'p-b',
        toPlaceId: 'p-c',
        name: 'B again → C',
      },
    ]);
  });
});

describe('pickNameFromGeocodeResults', () => {
  it('prefers a point of interest and reads the country', () => {
    const picked = pickNameFromGeocodeResults([
      {
        types: ['plus_code'],
        formatted_address: '8Q67+XXX, Ulaanbaatar, Mongolia',
        address_components: [{ long_name: '몽골', types: ['country'] }],
      },
      {
        types: ['point_of_interest', 'establishment'],
        formatted_address: 'Sukhbaatar Square, Ulaanbaatar, Mongolia',
        address_components: [
          { long_name: 'Sukhbaatar Square', types: ['establishment'] },
          { long_name: '몽골', types: ['country'] },
        ],
      },
    ]);
    expect(picked.name).toBe('Sukhbaatar Square');
    expect(picked.country).toBe('몽골');
  });

  it('does not use a district reverse-geocode as the place name', () => {
    const picked = pickNameFromGeocodeResults([
      {
        types: ['locality', 'political'],
        formatted_address: 'Nalaikh District, Ulaanbaatar, Mongolia',
        address_components: [
          { long_name: 'Nalaikh District', types: ['locality', 'political'] },
          { long_name: '몽골', types: ['country'] },
        ],
      },
    ]);
    expect(picked.name).toBeNull();
    expect(picked.country).toBe('몽골');
  });
});

describe('haversineMeters', () => {
  it('returns about 0 for the same point', () => {
    expect(haversineMeters({ latitude: 47.85, longitude: 106.91 }, { latitude: 47.85, longitude: 106.91 })).toBe(0);
  });
});
