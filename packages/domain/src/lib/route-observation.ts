import { haversineMeters } from './visit-place-match';

export const ROUTE_OBS_DISTANCE_GAP_MS = 10 * 60_000;
export const ROUTE_OBS_HOLD_GAP_MS = 30 * 60_000;
export const ROUTE_OBS_JUMP_KMH = 200;
export const ROUTE_OBS_SIMPLIFY_M = 75;

export type RouteObservationStatus = 'AUTO' | 'HOLD';
export type RouteObservationHoldReason = 'GAP' | 'JUMP' | 'NO_PATH';

export interface LinkedVisitForPair {
  id: string;
  projectId: string;
  placeId: string;
  startedAt: string | Date;
  endedAt: string | Date;
}

export interface VisitObservationPair {
  from: LinkedVisitForPair;
  to: LinkedVisitForPair;
}

export interface ObservationGpsPoint {
  latitude: number;
  longitude: number;
  recordedAt: string | Date;
}

export interface ObservationPathPoint {
  lat: number;
  lng: number;
  at: string;
}

export interface ObservationPathMetrics {
  path: ObservationPathPoint[];
  distanceKm: number | null;
  maxGapMinutes: number;
  includeDistance: boolean;
  includeElapsed: boolean;
  status: RouteObservationStatus;
  holdReason: RouteObservationHoldReason | null;
}

export interface RouteObservationStatRow {
  status: RouteObservationStatus;
  includeElapsed: boolean;
  includeDistance: boolean;
  elapsedMs: number;
  distanceKm: number | null;
}

export interface RouteObservationStats {
  observationCount: number;
  usableCount: number;
  medianElapsedMinutes: number | null;
  minElapsedMinutes: number | null;
  maxElapsedMinutes: number | null;
  medianDistanceKm: number | null;
}

export type CatalogRouteMeasureSource = 'observed' | 'manual';
export type CatalogRouteEstimateMode = 'AUTO' | 'MANUAL';

export interface CatalogRouteDisplayStats {
  distanceKm: number | null;
  distanceSource: CatalogRouteMeasureSource | null;
  elapsedMinutes: number | null;
  elapsedSource: CatalogRouteMeasureSource | null;
}

export interface CatalogRoutePlannedStats {
  distanceKm: number | null;
  distanceSource: CatalogRouteMeasureSource | null;
  baseElapsedMinutes: number | null;
  elapsedMinutes: number | null;
  elapsedSource: CatalogRouteMeasureSource | null;
  bufferMinutes: number;
  estimateMode: CatalogRouteEstimateMode;
}

export function catalogRouteDisplayStats(input: {
  medianDistanceKm?: number | null;
  medianElapsedMinutes?: number | null;
  averageDistanceKm?: number | null;
  averageTravelHours?: number | null;
}): CatalogRouteDisplayStats {
  const distanceKm = input.medianDistanceKm ?? input.averageDistanceKm ?? null;
  const distanceSource =
    input.medianDistanceKm != null ? 'observed' : input.averageDistanceKm != null ? 'manual' : null;
  const elapsedMinutes =
    input.medianElapsedMinutes ?? (input.averageTravelHours != null ? input.averageTravelHours * 60 : null);
  const elapsedSource =
    input.medianElapsedMinutes != null ? 'observed' : input.averageTravelHours != null ? 'manual' : null;
  return { distanceKm, distanceSource, elapsedMinutes, elapsedSource };
}

export function catalogRoutePlannedStats(input: {
  estimateMode?: CatalogRouteEstimateMode | null;
  bufferMinutes?: number | null;
  medianDistanceKm?: number | null;
  medianElapsedMinutes?: number | null;
  averageDistanceKm?: number | null;
  averageTravelHours?: number | null;
}): CatalogRoutePlannedStats {
  const estimateMode: CatalogRouteEstimateMode = input.estimateMode === 'MANUAL' ? 'MANUAL' : 'AUTO';
  const bufferMinutes = Math.max(0, Math.round(input.bufferMinutes ?? 0));
  const display = catalogRouteDisplayStats(input);
  const distanceKm = estimateMode === 'MANUAL' ? (input.averageDistanceKm ?? display.distanceKm) : display.distanceKm;
  const distanceSource =
    estimateMode === 'MANUAL'
      ? input.averageDistanceKm != null
        ? 'manual'
        : display.distanceSource
      : display.distanceSource;
  const baseElapsedMinutes =
    estimateMode === 'MANUAL'
      ? input.averageTravelHours != null
        ? input.averageTravelHours * 60
        : display.elapsedMinutes
      : display.elapsedMinutes;
  const elapsedSource =
    estimateMode === 'MANUAL'
      ? input.averageTravelHours != null
        ? 'manual'
        : display.elapsedSource
      : display.elapsedSource;
  return {
    distanceKm,
    distanceSource,
    baseElapsedMinutes,
    elapsedMinutes: baseElapsedMinutes != null ? baseElapsedMinutes + bufferMinutes : null,
    elapsedSource,
    bufferMinutes,
    estimateMode,
  };
}

export function pairConfirmedVisits(visits: readonly LinkedVisitForPair[]): VisitObservationPair[] {
  const byProject = new Map<string, LinkedVisitForPair[]>();
  for (const visit of visits) {
    if (!visit.placeId) continue;
    const list = byProject.get(visit.projectId) ?? [];
    list.push(visit);
    byProject.set(visit.projectId, list);
  }

  const pairs: VisitObservationPair[] = [];
  for (const list of byProject.values()) {
    const ordered = list
      .slice()
      .sort((left, right) => new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime());
    for (let index = 1; index < ordered.length; index += 1) {
      const from = ordered[index - 1]!;
      const to = ordered[index]!;
      if (from.placeId === to.placeId) continue;
      pairs.push({ from, to });
    }
  }
  return pairs;
}

export function observationElapsedMs(fromEndedAt: string | Date, toStartedAt: string | Date): number {
  return Math.max(0, new Date(toStartedAt).getTime() - new Date(fromEndedAt).getTime());
}

export function simplifyObservationPath(
  points: readonly ObservationGpsPoint[],
  minDistanceM = ROUTE_OBS_SIMPLIFY_M,
): ObservationPathPoint[] {
  const source = points
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .map(toPathPoint);
  if (source.length <= 2) return source;

  const thinned: ObservationPathPoint[] = [source[0]!];
  for (let index = 1; index < source.length - 1; index += 1) {
    const point = source[index]!;
    const last = thinned[thinned.length - 1]!;
    if (haversineMeters(fromPathPoint(last), fromPathPoint(point)) >= minDistanceM) {
      thinned.push(point);
    }
  }
  const end = source[source.length - 1]!;
  const last = thinned[thinned.length - 1]!;
  if (last.lat !== end.lat || last.lng !== end.lng || last.at !== end.at) {
    thinned.push(end);
  }
  return thinned;
}

export function measureObservationPath(points: readonly ObservationGpsPoint[]): ObservationPathMetrics {
  const sorted = points
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .slice()
    .sort((left, right) => new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime());
  const path = simplifyObservationPath(sorted);

  if (sorted.length < 2) {
    return {
      path,
      distanceKm: null,
      maxGapMinutes: 0,
      includeDistance: false,
      includeElapsed: true,
      status: 'AUTO',
      holdReason: null,
    };
  }

  let distanceM = 0;
  let maxGapMs = 0;
  let hasJump = false;
  for (let index = 1; index < sorted.length; index += 1) {
    const prev = sorted[index - 1]!;
    const curr = sorted[index]!;
    const gapMs = new Date(curr.recordedAt).getTime() - new Date(prev.recordedAt).getTime();
    const stepM = haversineMeters(prev, curr);
    if (gapMs > maxGapMs) maxGapMs = gapMs;
    distanceM += stepM;
    if (gapMs > 0) {
      const kmh = stepM / 1000 / (gapMs / 3_600_000);
      if (kmh > ROUTE_OBS_JUMP_KMH) hasJump = true;
    }
  }

  const maxGapMinutes = Math.round(maxGapMs / 60_000);
  if (hasJump) {
    return {
      path,
      distanceKm: null,
      maxGapMinutes,
      includeDistance: false,
      includeElapsed: false,
      status: 'HOLD',
      holdReason: 'JUMP',
    };
  }
  if (maxGapMs >= ROUTE_OBS_HOLD_GAP_MS) {
    return {
      path,
      distanceKm: null,
      maxGapMinutes,
      includeDistance: false,
      includeElapsed: false,
      status: 'HOLD',
      holdReason: 'GAP',
    };
  }

  const includeDistance = maxGapMs < ROUTE_OBS_DISTANCE_GAP_MS;
  return {
    path,
    distanceKm: includeDistance ? Math.round((distanceM / 1000) * 10) / 10 : null,
    maxGapMinutes,
    includeDistance,
    includeElapsed: true,
    status: 'AUTO',
    holdReason: null,
  };
}

export function medianNumber(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

export function summarizeRouteObservations(rows: readonly RouteObservationStatRow[]): RouteObservationStats {
  const usable = rows.filter((row) => row.status === 'AUTO');
  const elapsed = usable.filter((row) => row.includeElapsed).map((row) => row.elapsedMs / 60_000);
  const distances = usable
    .filter((row) => row.includeDistance && row.distanceKm != null)
    .map((row) => row.distanceKm as number);
  return {
    observationCount: rows.length,
    usableCount: usable.length,
    medianElapsedMinutes: medianNumber(elapsed),
    minElapsedMinutes: elapsed.length > 0 ? Math.min(...elapsed) : null,
    maxElapsedMinutes: elapsed.length > 0 ? Math.max(...elapsed) : null,
    medianDistanceKm: medianNumber(distances),
  };
}

export function shouldPreserveHeldObservation(status: string | null | undefined): boolean {
  return status === 'HOLD';
}

export function shouldPreserveObservationIncludes(row: {
  status?: string | null;
  manualIncludeOverride?: boolean | null;
} | null | undefined): boolean {
  if (!row) return false;
  return shouldPreserveHeldObservation(row.status) || Boolean(row.manualIncludeOverride);
}

function toPathPoint(point: ObservationGpsPoint): ObservationPathPoint {
  return {
    lat: point.latitude,
    lng: point.longitude,
    at: new Date(point.recordedAt).toISOString(),
  };
}

function fromPathPoint(point: ObservationPathPoint): { latitude: number; longitude: number } {
  return { latitude: point.lat, longitude: point.lng };
}
