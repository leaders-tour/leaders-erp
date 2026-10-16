import type { CatalogPlaceType, CatalogVisitJudgmentType } from './labels';

const PASS_DURATION_MS = 10 * 60_000;
const MIN_RADIUS_M = 25;

export interface PlaceVisitDraftSource {
  centerLatitude: number;
  centerLongitude: number;
  durationMs: number;
  radiusMeters: number;
  pinType: string | null;
  description: string | null;
}

export interface PlaceVisitDraft {
  latitude: number;
  longitude: number;
  visitRadiusM: number;
  visitJudgmentType: CatalogVisitJudgmentType;
  visitMinStayMinutes: number | null;
  placeType: CatalogPlaceType;
  name: string;
}

export interface PlaceVisitDraftFilters {
  guideId: string;
  date: string;
  projectId?: string | null;
}

function normalizePinType(pinType: string | null): string {
  return pinType?.trim().toLowerCase() ?? '';
}

export function visitToPlaceDraft(source: PlaceVisitDraftSource): PlaceVisitDraft {
  const pinType = normalizePinType(source.pinType);
  const durationMin = source.durationMs / 60_000;
  const isPass = source.durationMs < PASS_DURATION_MS || pinType === 'transport';

  return {
    latitude: source.centerLatitude,
    longitude: source.centerLongitude,
    visitRadiusM: Math.max(MIN_RADIUS_M, Math.round(source.radiusMeters)),
    visitJudgmentType: isPass ? 'PASS' : 'STAY',
    visitMinStayMinutes: isPass ? null : Math.min(10, Math.max(3, Math.floor(durationMin / 10))),
    placeType: placeTypeFromPin(pinType),
    name: source.description?.trim() ?? '',
  };
}

function placeTypeFromPin(pinType: string): CatalogPlaceType {
  if (pinType === 'lodging' || pinType === 'accommodation') return 'LODGING';
  if (pinType === 'attraction') return 'EXPERIENCE';
  if (pinType === 'shopping') return 'MART';
  if (pinType === 'meal') return 'RESTAURANT';
  if (pinType === 'transport') return 'GATE';
  return 'LODGING';
}

export function buildPlaceCreatePathFromVisit(
  source: PlaceVisitDraftSource,
  filters: PlaceVisitDraftFilters,
): string {
  const params = new URLSearchParams();
  params.set('fromVisit', '1');
  params.set('lat', String(source.centerLatitude));
  params.set('lng', String(source.centerLongitude));
  params.set('radius', String(source.radiusMeters));
  params.set('durationMs', String(source.durationMs));
  if (source.pinType?.trim()) params.set('pinType', source.pinType.trim());
  if (source.description?.trim()) params.set('description', source.description.trim());
  params.set('guideId', filters.guideId);
  params.set('date', filters.date);
  if (filters.projectId) params.set('projectId', filters.projectId);
  return `/dataset/places/new?${params.toString()}`;
}

export function parsePlaceVisitQuery(searchParams: URLSearchParams): PlaceVisitDraftSource | null {
  if (searchParams.get('fromVisit') !== '1') return null;
  const latitude = Number(searchParams.get('lat'));
  const longitude = Number(searchParams.get('lng'));
  const radiusMeters = Number(searchParams.get('radius'));
  const durationMs = Number(searchParams.get('durationMs'));
  if (![latitude, longitude, radiusMeters, durationMs].every(Number.isFinite)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return {
    centerLatitude: latitude,
    centerLongitude: longitude,
    radiusMeters,
    durationMs,
    pinType: searchParams.get('pinType'),
    description: searchParams.get('description'),
  };
}
