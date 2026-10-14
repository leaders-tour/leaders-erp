import { describe, expect, it } from 'vitest';
import {
  findVisitPlaceCandidates,
  matchVisitToPlaces,
  shouldPreserveManualVisitLink,
  VISIT_PLACE_BASE_M,
  type VisitMatchPlace,
} from './visit-place-match';

function place(overrides: Partial<VisitMatchPlace> & { id: string; name: string }): VisitMatchPlace {
  return {
    placeType: 'EXPERIENCE',
    latitude: 47.332,
    longitude: 103.6726,
    visitRadiusM: 300,
    ...overrides,
  };
}

const POINT = { latitude: 47.332, longitude: 103.6726 };

describe('matchVisitToPlaces', () => {
  it('marks a visit unlinked when no place is in range', () => {
    const match = matchVisitToPlaces(POINT, [
      place({ id: 'far', name: '먼 곳', latitude: 47.4, longitude: 103.8, visitRadiusM: 150 }),
    ]);
    expect(match.status).toBe('UNLINKED');
    expect(match.placeId).toBeNull();
    expect(match.reviewReason).toBe('NONE');
    expect(match.candidates).toHaveLength(0);
  });

  it('auto-links when exactly one place is in range', () => {
    const match = matchVisitToPlaces(POINT, [place({ id: 'bayanzag', name: '바양작', code: 'PL-010' })]);
    expect(match.status).toBe('AUTO');
    expect(match.placeId).toBe('bayanzag');
    expect(match.distanceM).toBe(0);
    expect(match.reviewReason).toBeNull();
  });

  it('marks review when two places overlap', () => {
    const match = matchVisitToPlaces(POINT, [
      place({ id: 'a', name: '바양작 1', visitRadiusM: 300 }),
      place({ id: 'b', name: '바양작 2', latitude: 47.3324, longitude: 103.6728, visitRadiusM: 300 }),
    ]);
    expect(match.status).toBe('REVIEW');
    expect(match.placeId).toBeNull();
    expect(match.reviewReason).toBe('OVERLAP');
    expect(match.candidates).toHaveLength(2);
  });

  it('ignores AREA parents even when they sit on the visit', () => {
    const candidates = findVisitPlaceCandidates(POINT, [
      place({ id: 'area', name: '바양작 목적지', placeType: 'AREA' }),
      place({ id: 'spot', name: '바양작', placeType: 'EXPERIENCE' }),
    ]);
    expect(candidates.map((item) => item.id)).toEqual(['spot']);
  });

  it('uses a 150m floor when the place has no visit radius', () => {
    const inside = matchVisitToPlaces(
      { latitude: 47.332, longitude: 103.6735 },
      [place({ id: 'near', name: '근처', visitRadiusM: null })],
    );
    expect(inside.status).toBe('AUTO');
    expect(VISIT_PLACE_BASE_M).toBe(150);
  });
});

describe('shouldPreserveManualVisitLink', () => {
  it('protects only manual confirmations from reanalysis', () => {
    expect(shouldPreserveManualVisitLink('MANUAL')).toBe(true);
    expect(shouldPreserveManualVisitLink('AUTO')).toBe(false);
    expect(shouldPreserveManualVisitLink('REVIEW')).toBe(false);
    expect(shouldPreserveManualVisitLink('UNLINKED')).toBe(false);
    expect(shouldPreserveManualVisitLink(null)).toBe(false);
  });
});
