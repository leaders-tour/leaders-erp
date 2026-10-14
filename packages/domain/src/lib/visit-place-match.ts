export const VISIT_PLACE_BASE_M = 150;

export type VisitLinkStatus = 'AUTO' | 'REVIEW' | 'UNLINKED' | 'MANUAL';
export type VisitLinkReviewReason = 'OVERLAP' | 'NONE';

export interface VisitMatchPlace {
  id: string;
  name: string;
  code?: string;
  placeType: string;
  latitude: number | null;
  longitude: number | null;
  visitRadiusM?: number | null;
}

export interface VisitPlaceCandidate {
  id: string;
  name: string;
  code: string;
  distanceM: number;
  visitRadiusM: number | null;
}

export interface VisitLinkMatch {
  status: Exclude<VisitLinkStatus, 'MANUAL'>;
  placeId: string | null;
  distanceM: number | null;
  reviewReason: VisitLinkReviewReason | null;
  candidates: VisitPlaceCandidate[];
}

const METERS_PER_DEG_LAT = 111_320;

export function haversineMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const latMidRad = ((from.latitude + to.latitude) / 2) * (Math.PI / 180);
  const dLat = (from.latitude - to.latitude) * METERS_PER_DEG_LAT;
  const dLng = (from.longitude - to.longitude) * METERS_PER_DEG_LAT * Math.cos(latMidRad);
  return Math.hypot(dLat, dLng);
}

export function visitPlaceMatchLimitM(visitRadiusM: number | null | undefined): number {
  return Math.max(VISIT_PLACE_BASE_M, visitRadiusM ?? 0);
}

export function findVisitPlaceCandidates(
  point: { latitude: number; longitude: number },
  places: readonly VisitMatchPlace[],
): VisitPlaceCandidate[] {
  const nearby: VisitPlaceCandidate[] = [];
  for (const place of places) {
    if (place.placeType === 'AREA' || place.latitude == null || place.longitude == null) continue;
    const distanceM = haversineMeters(point, { latitude: place.latitude, longitude: place.longitude });
    const limit = visitPlaceMatchLimitM(place.visitRadiusM);
    if (distanceM > limit) continue;
    nearby.push({
      id: place.id,
      name: place.name,
      code: place.code ?? '',
      distanceM: Math.round(distanceM),
      visitRadiusM: place.visitRadiusM ?? null,
    });
  }
  return nearby.sort((left, right) => left.distanceM - right.distanceM);
}

export function matchVisitToPlaces(
  point: { latitude: number; longitude: number },
  places: readonly VisitMatchPlace[],
): VisitLinkMatch {
  const candidates = findVisitPlaceCandidates(point, places);
  if (candidates.length === 0) {
    return {
      status: 'UNLINKED',
      placeId: null,
      distanceM: null,
      reviewReason: 'NONE',
      candidates,
    };
  }
  if (candidates.length === 1) {
    const only = candidates[0]!;
    return {
      status: 'AUTO',
      placeId: only.id,
      distanceM: only.distanceM,
      reviewReason: null,
      candidates,
    };
  }
  return {
    status: 'REVIEW',
    placeId: null,
    distanceM: null,
    reviewReason: 'OVERLAP',
    candidates,
  };
}

export function shouldPreserveManualVisitLink(status: VisitLinkStatus | null | undefined): boolean {
  return status === 'MANUAL';
}
