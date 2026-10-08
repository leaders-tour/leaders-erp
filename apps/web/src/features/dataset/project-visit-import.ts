import type { CatalogPlaceType, CatalogVisitJudgmentType } from './labels';
import { visitToPlaceDraft, type PlaceVisitDraftSource } from './place-visit-draft';

export const REUSE_BASE_DISTANCE_M = 150;
export const LODGING_ACCOMMODATION_MAX_DISTANCE_M = 300;

export interface CatalogPlaceMatchSource {
  id: string;
  name: string;
  placeType: CatalogPlaceType;
  latitude: number | null;
  longitude: number | null;
  parentPlaceId: string | null;
  regionId: string | null;
  country: string;
  accommodationId: string | null;
}

export interface NearbyPlaceMatch {
  place: CatalogPlaceMatchSource;
  distanceM: number;
}

export interface ProjectVisitImportVisit {
  id: string;
  startedAt: string;
  centerLatitude: number;
  centerLongitude: number;
  durationMs: number;
  radiusMeters: number;
  pinType: string | null;
  description: string | null;
}

export interface ProjectVisitImportSuggestion {
  visitId: string;
  startedAt: string;
  latitude: number;
  longitude: number;
  visitRadiusM: number;
  visitJudgmentType: CatalogVisitJudgmentType;
  visitMinStayMinutes: number | null;
  name: string;
  placeType: CatalogPlaceType;
  parentPlaceId: string | null;
  parentDistanceM: number | null;
  regionId: string | null;
  country: string | null;
  accommodationId: string | null;
  accommodationDistanceM: number | null;
  reusePlaceId: string | null;
  reusePlaceName: string | null;
  reuseDistanceM: number | null;
}

export interface ProjectVisitImportRow extends ProjectVisitImportSuggestion {
  enabled: boolean;
  reuseEnabled: boolean;
}

export interface ImportRouteDraft {
  fromVisitId: string;
  toVisitId: string;
  fromPlaceId: string;
  toPlaceId: string;
  name: string;
}

export interface ExistingRouteRef {
  fromPlaceId: string;
  toPlaceId: string;
}

export interface ReverseGeocodeName {
  name: string | null;
  country: string | null;
}

export function haversineMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earthRadiusM = 6_371_000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function reuseDistanceLimitM(visitRadiusM: number): number {
  return Math.max(REUSE_BASE_DISTANCE_M, visitRadiusM);
}

const LODGING_DURATION_MS = 10 * 60 * 60_000;

export function visitToBulkPlaceDraft(source: PlaceVisitDraftSource) {
  const draft = visitToPlaceDraft(source);
  if (!source.pinType?.trim()) {
    return {
      ...draft,
      placeType: source.durationMs >= LODGING_DURATION_MS ? ('LODGING' as const) : ('EXPERIENCE' as const),
    };
  }
  return draft;
}

function withCoords(places: CatalogPlaceMatchSource[]): Array<
  CatalogPlaceMatchSource & { latitude: number; longitude: number }
> {
  return places.filter(
    (place): place is CatalogPlaceMatchSource & { latitude: number; longitude: number } =>
      place.latitude != null && place.longitude != null,
  );
}

export function findNearbyPlace(
  latitude: number,
  longitude: number,
  places: CatalogPlaceMatchSource[],
  visitRadiusM: number,
): NearbyPlaceMatch | null {
  const limit = reuseDistanceLimitM(visitRadiusM);
  let best: NearbyPlaceMatch | null = null;
  for (const place of withCoords(places)) {
    if (place.placeType === 'AREA') continue;
    const distanceM = haversineMeters({ latitude, longitude }, place);
    if (distanceM > limit) continue;
    if (!best || distanceM < best.distanceM) {
      best = { place, distanceM };
    }
  }
  return best;
}

export function findNearestArea(
  latitude: number,
  longitude: number,
  places: CatalogPlaceMatchSource[],
): NearbyPlaceMatch | null {
  let best: NearbyPlaceMatch | null = null;
  for (const place of withCoords(places)) {
    if (place.placeType !== 'AREA') continue;
    const distanceM = haversineMeters({ latitude, longitude }, place);
    if (!best || distanceM < best.distanceM) {
      best = { place, distanceM };
    }
  }
  return best;
}

export function findNearbyLodgingAccommodation(
  latitude: number,
  longitude: number,
  places: CatalogPlaceMatchSource[],
): NearbyPlaceMatch | null {
  let best: NearbyPlaceMatch | null = null;
  for (const place of withCoords(places)) {
    if (place.placeType !== 'LODGING' || !place.accommodationId) continue;
    const distanceM = haversineMeters({ latitude, longitude }, place);
    if (distanceM > LODGING_ACCOMMODATION_MAX_DISTANCE_M) continue;
    if (!best || distanceM < best.distanceM) {
      best = { place, distanceM };
    }
  }
  return best;
}

export function suggestImportRow(
  visit: ProjectVisitImportVisit,
  places: CatalogPlaceMatchSource[],
): ProjectVisitImportSuggestion {
  const draft = visitToBulkPlaceDraft(visit);
  const reuse = findNearbyPlace(draft.latitude, draft.longitude, places, draft.visitRadiusM);
  const area = findNearestArea(draft.latitude, draft.longitude, places);
  const lodging =
    draft.placeType === 'LODGING'
      ? findNearbyLodgingAccommodation(draft.latitude, draft.longitude, places)
      : null;

  return {
    visitId: visit.id,
    startedAt: visit.startedAt,
    latitude: draft.latitude,
    longitude: draft.longitude,
    visitRadiusM: draft.visitRadiusM,
    visitJudgmentType: draft.visitJudgmentType,
    visitMinStayMinutes: draft.visitMinStayMinutes,
    name: draft.name || reuse?.place.name || '',
    placeType: draft.placeType,
    parentPlaceId: area?.place.id ?? null,
    parentDistanceM: area ? Math.round(area.distanceM) : null,
    regionId: area?.place.regionId ?? null,
    country: area?.place.country || null,
    accommodationId: lodging?.place.accommodationId ?? null,
    accommodationDistanceM: lodging ? Math.round(lodging.distanceM) : null,
    reusePlaceId: reuse?.place.id ?? null,
    reusePlaceName: reuse?.place.name ?? null,
    reuseDistanceM: reuse ? Math.round(reuse.distanceM) : null,
  };
}

export function toImportRow(suggestion: ProjectVisitImportSuggestion): ProjectVisitImportRow {
  return {
    ...suggestion,
    enabled: true,
    reuseEnabled: Boolean(suggestion.reusePlaceId),
  };
}

export function isImportRowReady(row: ProjectVisitImportRow): boolean {
  if (!row.enabled) return false;
  if (row.reuseEnabled && row.reusePlaceId) return true;
  return Boolean(row.name.trim());
}

export function blockedImportRows(rows: ProjectVisitImportRow[]): ProjectVisitImportRow[] {
  return rows.filter((row) => row.enabled && !isImportRowReady(row));
}

export function buildPlaceCreateInput(row: ProjectVisitImportRow) {
  return {
    name: row.name.trim(),
    placeType: row.placeType,
    country: row.country?.trim() || null,
    regionId: row.regionId || null,
    parentPlaceId: row.placeType === 'AREA' ? null : row.parentPlaceId || null,
    latitude: row.latitude,
    longitude: row.longitude,
    accommodationId: row.placeType === 'LODGING' ? row.accommodationId || null : null,
    visitJudgmentType: row.visitJudgmentType,
    visitMinStayMinutes: row.visitJudgmentType === 'STAY' ? row.visitMinStayMinutes : null,
    visitRadiusM: row.visitRadiusM,
  };
}

export function planImportRoutes(
  resolved: Array<{ visitId: string; startedAt: string; name: string; placeId: string }>,
  existingRoutes: ExistingRouteRef[],
): ImportRouteDraft[] {
  const ordered = [...resolved].sort((left, right) => left.startedAt.localeCompare(right.startedAt));
  const drafts: ImportRouteDraft[] = [];
  const seen = new Set(existingRoutes.map((route) => `${route.fromPlaceId}->${route.toPlaceId}`));

  for (let index = 1; index < ordered.length; index += 1) {
    const from = ordered[index - 1];
    const to = ordered[index];
    if (!from || !to || from.placeId === to.placeId) continue;
    const key = `${from.placeId}->${to.placeId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    drafts.push({
      fromVisitId: from.visitId,
      toVisitId: to.visitId,
      fromPlaceId: from.placeId,
      toPlaceId: to.placeId,
      name: `${from.name} → ${to.name}`,
    });
  }

  return drafts;
}

export function pickNameFromGeocodeResults(
  results: Array<{
    types?: string[];
    formatted_address?: string;
    address_components?: Array<{ long_name: string; types: string[] }>;
  }>,
): ReverseGeocodeName {
  if (results.length === 0) return { name: null, country: null };

  const country =
    results
      .flatMap((result) => result.address_components ?? [])
      .find((component) => component.types.includes('country'))?.long_name ?? null;

  const preferredTypes = [
    'establishment',
    'point_of_interest',
    'lodging',
    'tourist_attraction',
    'park',
    'natural_feature',
    'locality',
    'administrative_area_level_2',
  ];

  const preferred = results.find((result) =>
    (result.types ?? []).some((type) => preferredTypes.includes(type)),
  );
  const chosen = preferred ?? results[0];
  if (!chosen) return { name: null, country };
  const locality =
    chosen.address_components?.find((component) =>
      component.types.some((type) => type === 'locality' || type === 'establishment'),
    )?.long_name ?? null;
  const formatted = chosen.formatted_address?.split(',')[0]?.trim() ?? null;

  return {
    name: locality || formatted,
    country,
  };
}
