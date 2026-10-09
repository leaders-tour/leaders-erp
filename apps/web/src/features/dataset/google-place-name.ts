export type GooglePlaceLookupError = 'unavailable' | 'empty';

export interface GooglePlaceNameCandidate {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
}

export interface PlaceResultLike {
  name?: string;
  vicinity?: string;
  formattedAddress?: string;
  lat?: number | null;
  lng?: number | null;
  types?: string[] | null;
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
  return { name, address, lat: input.lat, lng: input.lng };
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

export async function nearbyGooglePlaceNames(input: {
  lat: number;
  lng: number;
  lodgingOnly: boolean;
}): Promise<{ ok: true; places: GooglePlaceNameCandidate[] } | { ok: false; error: GooglePlaceLookupError }> {
  const service = getPlacesService();
  if (!service) return { ok: false, error: 'unavailable' };

  const location = { lat: input.lat, lng: input.lng };
  try {
    const rankedTypes = input.lodgingOnly ? ['lodging', 'establishment'] : ['establishment'];
    let places: GooglePlaceNameCandidate[] = [];
    for (const type of rankedTypes) {
      places = toCandidates(await nearbyByDistance(service, location, type)).slice(0, NEARBY_LIMIT);
      if (places.length > 0) break;
    }
    if (places.length === 0) {
      places = toCandidates(await nearbySearch(service, { location, radius: NEARBY_RADIUS_M })).slice(0, NEARBY_LIMIT);
    }
    if (places.length === 0) return { ok: false, error: 'empty' };
    return { ok: true, places };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
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
