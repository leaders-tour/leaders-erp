export type GooglePlaceLookupError = 'unavailable' | 'empty';

export interface GooglePlaceNameCandidate {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  placeId?: string | null;
}

export interface PlaceResultLike {
  name?: string;
  vicinity?: string;
  formattedAddress?: string;
  lat?: number | null;
  lng?: number | null;
  types?: string[] | null;
  placeId?: string | null;
}

const KOREAN_PLACE_ALIASES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /kharkhorin|karakorum|хархорин/i, name: '하르허린' },
  { pattern: /bayanzag|flaming\s*cliffs|ブルド/i, name: '바양작' },
  { pattern: /tsagaan\s*suvarga|white\s*stupa|цагаан\s*суварга/i, name: '차강 소브라가' },
  { pattern: /yolyn\s*am|yoliin\s*am|ёлын\s*ам/i, name: '욜린암' },
  { pattern: /khongoryn|khongor\s*els|singing\s*dune/i, name: '홍고린 엘스' },
  { pattern: /baga\s*gazr|baga\s*gazriin|бага\s*газрын/i, name: '바가 가즈링 촐로' },
  { pattern: /\bugii\b|\bogii\b|өгий/i, name: '우기 호수' },
  { pattern: /elsen\s*tasarkhai|mini\s*gobi|엘센/i, name: '엘센 타사르하이' },
  { pattern: /khustain|hustai|хустайн/i, name: '후스태' },
  { pattern: /tsenkher|цэнхэр/i, name: '쳉헤르' },
  { pattern: /terkhiin|terkh\b|тэрхийн/i, name: '테르힝 차강 노르' },
  { pattern: /\bkhorgo\b|хорго/i, name: '호르고' },
  { pattern: /terelj|тэрэлж/i, name: '테를지' },
  { pattern: /ulaanbaatar|ulan\s*bator|улаанбаатар/i, name: '울란바토르' },
  { pattern: /khuvsgul|hovsgol|khövsgöl|хөвсгөл/i, name: '홉스골' },
  { pattern: /\bhatgal\b|хатгал/i, name: '하트갈' },
  { pattern: /bichigt\s*khad|бичигт/i, name: '비칙트 하드' },
];

export function hasHangul(name: string): boolean {
  return /[가-힣]/.test(name);
}

/** 한국어 > 라틴 문자 > 키릴 > 그외(일본어 등). 구글 기본 이름이 현지어일 때 고르는 점수. */
export function nameLanguageScore(name: string): number {
  const value = name.trim();
  if (!value) return 0;
  if (hasHangul(value)) return 3;
  const hasLatin = /[A-Za-z]/.test(value);
  const hasCjk = /[\u3040-\u30ff\u4e00-\u9fff]/.test(value);
  const hasCyrillic = /[\u0400-\u04FF]/.test(value);
  if (hasLatin && !hasCjk) return 2;
  if (hasCyrillic) return 1;
  return 0;
}

export function toKoreanPlaceName(name: string): string {
  const value = name.trim();
  if (!value || hasHangul(value)) return value;
  const alias = KOREAN_PLACE_ALIASES.find((item) => item.pattern.test(value));
  return alias?.name ?? value;
}

const NEARBY_RADIUS_M = 2000;
const NEARBY_LIMIT = 8;
const QUERY_LIMIT = 5;
const ADMIN_TYPES = new Set([
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
  'administrative_area_level_4',
  'administrative_area_level_5',
  'archipelago',
  'colloquial_area',
  'continent',
  'country',
  'floor',
  'geocode',
  'intersection',
  'locality',
  'neighborhood',
  'plus_code',
  'political',
  'post_box',
  'postal_code',
  'postal_code_prefix',
  'postal_town',
  'route',
  'street_address',
  'street_number',
  'sublocality',
  'sublocality_level_1',
  'sublocality_level_2',
  'sublocality_level_3',
  'subpremise',
]);

export function looksLikeAdminName(name: string): boolean {
  const value = name.trim();
  if (!value) return true;
  return /\b(district|province|prefecture|municipality|aimag|soum|сум|дүүрэг)\b/i.test(value);
}

export function isBusinessPlace(input: { name?: string; types?: string[] | null }): boolean {
  const name = input.name?.trim() ?? '';
  if (!name || looksLikeAdminName(name)) return false;
  const types = input.types ?? [];
  if (types.length === 0) return true;
  return types.some((type) => !ADMIN_TYPES.has(type));
}

export function mapPlaceResult(input: PlaceResultLike): GooglePlaceNameCandidate | null {
  const name = input.name?.trim();
  if (!name || input.lat == null || input.lng == null) return null;
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return null;
  if (!isBusinessPlace({ name, types: input.types })) return null;
  const address = input.vicinity?.trim() || input.formattedAddress?.trim() || null;
  return { name: toKoreanPlaceName(name), address, lat: input.lat, lng: input.lng, placeId: input.placeId ?? null };
}

function fromGooglePlace(row: google.maps.places.PlaceResult): GooglePlaceNameCandidate | null {
  const location = row.geometry?.location;
  return mapPlaceResult({
    name: row.name,
    vicinity: row.vicinity,
    formattedAddress: row.formatted_address,
    lat: location?.lat() ?? null,
    lng: location?.lng() ?? null,
    types: row.types,
    placeId: row.place_id,
  });
}

function uniqueCandidates(rows: GooglePlaceNameCandidate[]): GooglePlaceNameCandidate[] {
  const seen = new Set<string>();
  const next: GooglePlaceNameCandidate[] = [];
  for (const row of rows) {
    const key = `${row.name}|${row.lat.toFixed(5)}|${row.lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(row);
  }
  return next;
}

function getPlacesService(): google.maps.places.PlacesService | null {
  if (typeof google === 'undefined' || !google.maps?.places?.PlacesService) return null;
  if (typeof document === 'undefined') return null;
  return new google.maps.places.PlacesService(document.createElement('div'));
}

function nearbySearch(
  service: google.maps.places.PlacesService,
  request: google.maps.places.PlaceSearchRequest,
): Promise<google.maps.places.PlaceResult[]> {
  return new Promise((resolve, reject) => {
    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve([]);
        return;
      }
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
        reject(new Error(status));
        return;
      }
      resolve(results);
    });
  });
}

function findPlaceFromQuery(
  service: google.maps.places.PlacesService,
  request: google.maps.places.FindPlaceFromQueryRequest,
): Promise<google.maps.places.PlaceResult[]> {
  return new Promise((resolve, reject) => {
    service.findPlaceFromQuery(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve([]);
        return;
      }
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
        reject(new Error(status));
        return;
      }
      resolve(results);
    });
  });
}

function textSearch(
  service: google.maps.places.PlacesService,
  request: google.maps.places.TextSearchRequest,
): Promise<google.maps.places.PlaceResult[]> {
  return new Promise((resolve, reject) => {
    service.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve([]);
        return;
      }
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
        reject(new Error(status));
        return;
      }
      resolve(results);
    });
  });
}

function getDetails(
  service: google.maps.places.PlacesService,
  request: google.maps.places.PlaceDetailsRequest,
): Promise<google.maps.places.PlaceResult | null> {
  return new Promise((resolve, reject) => {
    service.getDetails(request, (result, status) => {
      if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve(null);
        return;
      }
      if (status !== google.maps.places.PlacesServiceStatus.OK || !result) {
        reject(new Error(status));
        return;
      }
      resolve(result);
    });
  });
}

function toCandidates(results: google.maps.places.PlaceResult[]): GooglePlaceNameCandidate[] {
  return uniqueCandidates(results.map(fromGooglePlace).filter((row): row is GooglePlaceNameCandidate => row != null));
}

async function nearbyByDistance(
  service: google.maps.places.PlacesService,
  location: google.maps.LatLngLiteral,
  type: string,
): Promise<google.maps.places.PlaceResult[]> {
  return nearbySearch(service, {
    location,
    rankBy: google.maps.places.RankBy.DISTANCE,
    type,
  });
}

export type NearbyPlaceKind = 'lodging' | 'restaurant' | 'any';

const NEARBY_KIND_TYPE: Record<NearbyPlaceKind, string | null> = {
  lodging: 'lodging',
  restaurant: 'restaurant',
  any: null,
};
const PREFERRED_TYPE_SLACK_M = 100;
const LANGUAGE_SLACK_M = 80;

function distanceM(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

/**
 * 구글에 숙소 유형으로 등록되지 않은 캠프가 많아서, 유형 검색 결과만 쓰면 멀리 있는 다른 숙소가 먼저 잡힌다.
 * 실제 거리순으로 정렬하되, 원하는 유형은 가장 가까운 후보보다 100m 이내로만 멀면 앞에 둔다.
 */
export function rankNearbyCandidates(
  origin: { lat: number; lng: number },
  preferred: GooglePlaceNameCandidate[],
  others: GooglePlaceNameCandidate[],
): GooglePlaceNameCandidate[] {
  const preferredKeys = new Set(preferred.map((row) => `${row.name}|${row.lat.toFixed(5)}|${row.lng.toFixed(5)}`));
  const rows = uniqueCandidates([...preferred, ...others]).map((row) => ({
    row,
    distance: distanceM(origin, row),
    preferred: preferredKeys.has(`${row.name}|${row.lat.toFixed(5)}|${row.lng.toFixed(5)}`),
  }));
  if (rows.length === 0) return [];
  const nearest = Math.min(...rows.map((item) => item.distance));
  const boosted = (item: (typeof rows)[number]) =>
    item.preferred && item.distance <= nearest + PREFERRED_TYPE_SLACK_M;
  return rows
    .sort((left, right) => {
      const leftBoost = boosted(left);
      if (leftBoost !== boosted(right)) return leftBoost ? -1 : 1;
      if (Math.abs(left.distance - right.distance) <= LANGUAGE_SLACK_M) {
        const languageDiff = nameLanguageScore(right.row.name) - nameLanguageScore(left.row.name);
        if (languageDiff !== 0) return languageDiff;
      }
      return left.distance - right.distance;
    })
    .map((item) => item.row);
}

export async function nearbyGooglePlaceNames(input: {
  lat: number;
  lng: number;
  kind?: NearbyPlaceKind;
}): Promise<{ ok: true; places: GooglePlaceNameCandidate[] } | { ok: false; error: GooglePlaceLookupError }> {
  const service = getPlacesService();
  if (!service) return { ok: false, error: 'unavailable' };

  const location = { lat: input.lat, lng: input.lng };
  try {
    const preferredType = NEARBY_KIND_TYPE[input.kind ?? 'any'];
    const preferred = preferredType ? toCandidates(await nearbyByDistance(service, location, preferredType)) : [];
    const others = toCandidates(await nearbyByDistance(service, location, 'establishment'));
    let places = rankNearbyCandidates(location, preferred, others).slice(0, NEARBY_LIMIT);
    if (places.length === 0) {
      places = toCandidates(await nearbySearch(service, { location, radius: NEARBY_RADIUS_M })).slice(0, NEARBY_LIMIT);
    }
    if (places.length === 0) return { ok: false, error: 'empty' };
    return { ok: true, places: await localizeCandidateNames(service, places) };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

async function localizeCandidateNames(
  service: google.maps.places.PlacesService,
  places: GooglePlaceNameCandidate[],
): Promise<GooglePlaceNameCandidate[]> {
  const next = [...places];
  for (let index = 0; index < Math.min(3, next.length); index += 1) {
    const current = next[index]!;
    if (!current.placeId || hasHangul(current.name)) continue;
    const result = await getDetails(service, {
      placeId: current.placeId,
      fields: ['name', 'formatted_address', 'vicinity', 'geometry', 'types'],
    });
    const localized = result ? fromGooglePlace(result) : null;
    if (!localized) continue;
    if (nameLanguageScore(localized.name) > nameLanguageScore(current.name)) {
      next[index] = { ...current, name: localized.name, address: localized.address ?? current.address };
    }
  }
  return next;
}

export async function getGooglePlaceById(
  placeId: string,
): Promise<{ ok: true; place: GooglePlaceNameCandidate } | { ok: false; error: GooglePlaceLookupError }> {
  const id = placeId.trim();
  if (!id) return { ok: false, error: 'empty' };
  const service = getPlacesService();
  if (!service) return { ok: false, error: 'unavailable' };

  try {
    const result = await getDetails(service, {
      placeId: id,
      fields: ['name', 'formatted_address', 'vicinity', 'geometry', 'types'],
    });
    const place = result ? fromGooglePlace(result) : null;
    if (!place) return { ok: false, error: 'empty' };
    return { ok: true, place };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

export async function findGooglePlaceNames(input: {
  query: string;
  bias?: { lat: number; lng: number } | null;
}): Promise<{ ok: true; places: GooglePlaceNameCandidate[] } | { ok: false; error: GooglePlaceLookupError }> {
  const query = input.query.trim();
  if (!query) return { ok: false, error: 'empty' };
  const service = getPlacesService();
  if (!service) return { ok: false, error: 'unavailable' };

  const request: google.maps.places.FindPlaceFromQueryRequest = {
    query,
    fields: ['name', 'formatted_address', 'geometry', 'types'],
  };
  if (input.bias) {
    request.locationBias = { center: input.bias, radius: 50_000 };
  }

  try {
    let places = toCandidates(await findPlaceFromQuery(service, request)).slice(0, QUERY_LIMIT);
    if (places.length === 0) {
      const textRequest: google.maps.places.TextSearchRequest = { query };
      if (input.bias) {
        textRequest.location = input.bias;
        textRequest.radius = 50_000;
      }
      places = toCandidates(await textSearch(service, textRequest)).slice(0, QUERY_LIMIT);
    }
    if (places.length === 0) return { ok: false, error: 'empty' };
    return { ok: true, places };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}
