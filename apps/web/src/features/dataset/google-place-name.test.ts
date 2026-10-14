import { describe, expect, it } from 'vitest';
import {
  isBusinessPlace,
  looksLikeAdminName,
  mapPlaceResult,
  nameLanguageScore,
  rankNearbyCandidates,
  toKoreanPlaceName,
} from './google-place-name';

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

  it('prefers a nearby Korean name over a slightly closer foreign name', () => {
    const japanese = { name: '遊牧民ゲル', address: null, lat: 44.5777, lng: 105.7202 };
    const korean = { name: '바양작', address: null, lat: 44.5781, lng: 105.7203 };
    expect(rankNearbyCandidates(origin, [], [japanese, korean])[0]?.name).toBe('바양작');
  });

  it('prefers Elsen Tasarkhai over a closer Japanese dune label', () => {
    const cluster = { lat: 47.33203, lng: 103.67262 };
    const burd = {
      name: toKoreanPlaceName('ブルド砂丘'),
      address: null,
      lat: 47.3338,
      lng: 103.6734,
    };
    const elsen = { name: toKoreanPlaceName('엘승타사르해'), address: null, lat: 47.3365, lng: 103.676 };
    const mini = { name: '미니사막', address: null, lat: 47.341, lng: 103.68 };
    expect(burd.name).toBe('엘승타사르헤');
    expect(rankNearbyCandidates(cluster, [], [burd, elsen, mini])[0]?.name).toBe('엘승타사르헤');
  });
});

describe('toKoreanPlaceName', () => {
  it('maps well-known destinations to Korean names', () => {
    expect(toKoreanPlaceName('Kharkhorin')).toBe('하르허린');
    expect(toKoreanPlaceName('Bayanzag')).toBe('바양작');
    expect(toKoreanPlaceName('ブルド砂丘')).toBe('엘승타사르헤');
    expect(toKoreanPlaceName('Elsen Tasarkhai')).toBe('엘승타사르헤');
    expect(toKoreanPlaceName('엘승타사르해')).toBe('엘승타사르헤');
    expect(toKoreanPlaceName('Bichigt Khad Tourist Camp')).toBe('비칙트 하드');
    expect(toKoreanPlaceName('미니사막 A캠프')).toBe('미니사막 A캠프');
    expect(toKoreanPlaceName('Mandala Restaurant')).toBe('Mandala Restaurant');
  });
});

describe('nameLanguageScore', () => {
  it('ranks Hangul above Latin, Cyrillic, and Japanese', () => {
    expect(nameLanguageScore('하르허린')).toBeGreaterThan(nameLanguageScore('Kharkhorin'));
    expect(nameLanguageScore('Kharkhorin')).toBeGreaterThan(nameLanguageScore('Хархорин'));
    expect(nameLanguageScore('Хархорин')).toBeGreaterThan(nameLanguageScore('ブルド砂丘'));
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
      placeId: null,
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
