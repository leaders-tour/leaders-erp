import { describe, expect, it } from 'vitest';
import {
  buildPlaceCreatePathFromVisit,
  parsePlaceVisitQuery,
  visitToPlaceDraft,
  type PlaceVisitDraftSource,
} from './place-visit-draft';

function source(overrides: Partial<PlaceVisitDraftSource> = {}): PlaceVisitDraftSource {
  return {
    centerLatitude: 47.8512,
    centerLongitude: 106.912,
    durationMs: 45 * 60_000,
    radiusMeters: 80,
    pinType: 'lodging',
    description: 'A캠프',
    ...overrides,
  };
}

describe('visitToPlaceDraft', () => {
  it('maps a long lodging stay to stay-type lodging', () => {
    expect(visitToPlaceDraft(source())).toEqual({
      latitude: 47.8512,
      longitude: 106.912,
      visitRadiusM: 80,
      visitJudgmentType: 'STAY',
      visitMinStayMinutes: 4,
      placeType: 'LODGING',
      name: 'A캠프',
    });
  });

  it('treats a stay shorter than 10 minutes as pass-through', () => {
    const draft = visitToPlaceDraft(source({ durationMs: 9 * 60_000, pinType: 'attraction' }));
    expect(draft.visitJudgmentType).toBe('PASS');
    expect(draft.visitMinStayMinutes).toBeNull();
    expect(draft.placeType).toBe('EXPERIENCE');
  });

  it('treats transport pins as a gate pass even when the stay is long', () => {
    const draft = visitToPlaceDraft(source({ pinType: 'transport', durationMs: 40 * 60_000 }));
    expect(draft.placeType).toBe('GATE');
    expect(draft.visitJudgmentType).toBe('PASS');
    expect(draft.visitMinStayMinutes).toBeNull();
  });

  it('raises a tiny observed radius to 25m', () => {
    expect(visitToPlaceDraft(source({ radiusMeters: 8.2 })).visitRadiusM).toBe(25);
  });

  it('caps stay minutes at 10', () => {
    expect(visitToPlaceDraft(source({ durationMs: 180 * 60_000 })).visitMinStayMinutes).toBe(10);
  });

  it('maps meal and shopping pin types', () => {
    expect(visitToPlaceDraft(source({ pinType: 'meal' })).placeType).toBe('RESTAURANT');
    expect(visitToPlaceDraft(source({ pinType: 'shopping' })).placeType).toBe('MART');
  });
});

describe('place visit query', () => {
  it('round-trips raw visit fields through the create path', () => {
    const href = buildPlaceCreatePathFromVisit(source(), {
      guideId: 'guide-1',
      date: '2026-09-28',
      projectId: 'proj-1',
    });
    const parsed = parsePlaceVisitQuery(new URLSearchParams(href.split('?')[1]));
    expect(parsed).toEqual({
      centerLatitude: 47.8512,
      centerLongitude: 106.912,
      durationMs: 45 * 60_000,
      radiusMeters: 80,
      pinType: 'lodging',
      description: 'A캠프',
    });
    expect(href).toContain('/dataset/places/new?');
    expect(href).toContain('guideId=guide-1');
  });

  it('returns null when fromVisit is missing', () => {
    expect(parsePlaceVisitQuery(new URLSearchParams('lat=1&lng=2'))).toBeNull();
  });
});
