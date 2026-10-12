import { describe, expect, it } from 'vitest';
import { isBusinessPlace, looksLikeAdminName, mapPlaceResult, rankNearbyCandidates } from './google-place-name';

describe('rankNearbyCandidates', () => {
  const origin = { lat: 44.5777, lng: 105.7202 };
  const camp = { name: 'Mandala Miracle', address: null, lat: 44.5782, lng: 105.7203 };
  const resort = { name: 'Zaisan Resort', address: null, lat: 44.5815, lng: 105.7200 };

  it('picks a much closer establishment over a farther lodging', () => {
    expect(rankNearbyCandidates(origin, [resort], [camp, resort])[0]?.name).toBe('Mandala Miracle');
  });

  it('keeps the preferred type first when it is about as close', () => {
    const shop = { name: '편의점', address: null, lat: 44.5778, lng: 105.7202 };
    expect(rankNearbyCandidates(origin, [camp], [shop, camp])[0]?.name).toBe('Mandala Miracle');
  });
});

describe('looksLikeAdminName', () => {
  it('treats district labels as admin names', () => {
    expect(looksLikeAdminName('Nalaikh District')).toBe(true);
    expect(looksLikeAdminName('Energy Hills Resort')).toBe(false);
  });
});

describe('isBusinessPlace', () => {
  it('keeps lodging and drops locality-only rows', () => {
    expect(isBusinessPlace({ name: 'Energy Hills Resort', types: ['lodging', 'establishment'] })).toBe(true);
    expect(isBusinessPlace({ name: 'Nalaikh', types: ['locality', 'political'] })).toBe(false);
  });
});

describe('mapPlaceResult', () => {
  it('keeps a business name and coordinates', () => {
    expect(
      mapPlaceResult({
        name: ' 미니사막 A캠프 ',
        vicinity: 'Mongolia',
        lat: 47.85,
        lng: 106.91,
        types: ['lodging'],
      }),
    ).toEqual({
      name: '미니사막 A캠프',
      address: 'Mongolia',
      lat: 47.85,
      lng: 106.91,
    });
  });

  it('prefers vicinity then formatted address', () => {
    expect(
      mapPlaceResult({
        name: '캠프',
        formattedAddress: 'Ulaanbaatar',
        lat: 1,
        lng: 2,
      })?.address,
    ).toBe('Ulaanbaatar');
  });

  it('drops administrative areas even when coords exist', () => {
    expect(
      mapPlaceResult({
        name: 'Nalaikh District',
        lat: 47.77,
        lng: 107.25,
        types: ['locality', 'political'],
      }),
    ).toBeNull();
  });

  it('drops rows without a name or coords', () => {
    expect(mapPlaceResult({ name: '', lat: 1, lng: 2 })).toBeNull();
    expect(mapPlaceResult({ name: '캠프', lat: null, lng: 2 })).toBeNull();
    expect(mapPlaceResult({ name: '캠프', lat: Number.NaN, lng: 2 })).toBeNull();
  });
});
