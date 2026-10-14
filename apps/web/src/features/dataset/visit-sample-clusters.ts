import { findVisitPlaceCandidates, VISIT_PLACE_BASE_M } from '@tour/domain';
import { resolveCatalogRegionId, type CatalogRegionNameSource } from './catalog-region-match';
import { looksLikeAdminName } from './google-place-name';
import type { CatalogPlaceType, CatalogVisitJudgmentType } from './labels';
import {
  findNearestArea,
  haversineMeters,
  visitToBulkPlaceDraft,
  type CatalogPlaceMatchSource,
} from './project-visit-import';

export const CLUSTER_LINK_M = 120;
export const CLUSTER_ATTACH_MAX_M = 250;
export const CLUSTER_MERGE_MAX_SPREAD_M = 400;
export const CLUSTER_MAX_SPREAD_M = 600;
export const EXISTING_PLACE_BASE_M = VISIT_PLACE_BASE_M;
export const SUGGESTED_RADIUS_MIN_M = 30;
export const SUGGESTED_RADIUS_MAX_M = 300;
export const LODGING_DURATION_MS = 10 * 60 * 60_000;
export const PASS_DURATION_MS = 10 * 60_000;

export type SampleClusterKind = 'new_place' | 'existing_fix' | 'review';
export type SampleClusterReviewReason = 'too_wide' | 'overlap';
export type SampleClusterConfidence = 'enough' | 'medium' | 'single';

export interface VisitSampleSource {
  id: string;
  projectId: string;
  projectName: string;
  centerLatitude: number;
  centerLongitude: number;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  radiusMeters: number;
  pinType: string | null;
  description: string | null;
}

export interface ClusterPlaceSource extends CatalogPlaceMatchSource {
  code?: string;
  visitRadiusM?: number | null;
  internalNote?: string | null;
}

export interface SampleClusterVisit {
  id: string;
  projectId: string;
  projectName: string;
  latitude: number;
  longitude: number;
  durationMs: number;
  radiusMeters: number;
  pinType: string | null;
  description: string | null;
  startedAt: string;
}

export interface SampleClusterNearbyPlace {
  id: string;
  name: string;
  code: string;
  distanceM: number;
  latitude: number;
  longitude: number;
  visitRadiusM: number | null;
  internalNote: string | null;
}

export interface SampleCluster {
  id: string;
  kind: SampleClusterKind;
  reviewReason: SampleClusterReviewReason | null;
  name: string;
  placeType: CatalogPlaceType;
  latitude: number;
  longitude: number;
  visitRadiusM: number;
  visitJudgmentType: CatalogVisitJudgmentType;
  visitMinStayMinutes: number | null;
  parentPlaceId: string | null;
  parentDistanceM: number | null;
  regionId: string | null;
  country: string | null;
  visitCount: number;
  projectCount: number;
  confidence: SampleClusterConfidence;
  durationMedianMs: number;
  spreadM: number;
  existingPlace: SampleClusterNearbyPlace | null;
  existingOffsetM: number | null;
  existingRadiusM: number | null;
  nearbyPlaces: SampleClusterNearbyPlace[];
  visits: SampleClusterVisit[];
}

const METERS_PER_DEG_LAT = 111_320;

export function medianNumber(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function percentileNumber(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * percentile;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low]!;
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (index - low);
}

export function suggestedVisitRadiusM(distancesFromCenterM: number[], visitRadiiM: number[]): number {
  const raw = percentileNumber(distancesFromCenterM, 0.9) + medianNumber(visitRadiiM);
  const clamped = Math.min(SUGGESTED_RADIUS_MAX_M, Math.max(SUGGESTED_RADIUS_MIN_M, raw));
  return Math.round(clamped / 10) * 10;
}

export function clusterConfidence(projectCount: number): SampleClusterConfidence {
  if (projectCount >= 3) return 'enough';
  if (projectCount === 2) return 'medium';
  return 'single';
}

export function appendSampleNote(
  existing: string | null | undefined,
  visitCount: number,
  projectCount: number,
  dateLabel: string,
): string {
  const note = `표본 방문 ${visitCount}회 / 프로젝트 ${projectCount}개 기준 (${dateLabel})`;
  const next = existing?.trim() ? `${existing.trim()}\n${note}` : note;
  return next.slice(0, 500);
}

export function findNearbyExistingPlaces(
  latitude: number,
  longitude: number,
  places: ClusterPlaceSource[],
): SampleClusterNearbyPlace[] {
  const byId = new Map(places.map((place) => [place.id, place]));
  return findVisitPlaceCandidates({ latitude, longitude }, places).flatMap((candidate) => {
    const place = byId.get(candidate.id);
    if (!place || place.latitude == null || place.longitude == null) return [];
    return [
      {
        id: candidate.id,
        name: candidate.name,
        code: candidate.code,
        distanceM: candidate.distanceM,
        latitude: place.latitude,
        longitude: place.longitude,
        visitRadiusM: candidate.visitRadiusM,
        internalNote: place.internalNote ?? null,
      },
    ];
  });
}

export function clusterVisitSamples(
  samples: VisitSampleSource[],
  places: ClusterPlaceSource[],
  regions: readonly CatalogRegionNameSource[] = [],
): SampleCluster[] {
  const groups = mergeOverlappingGroups(groupNearbyVisits(samples));
  return groups
    .map((group) => buildCluster(group, places, regions))
    .sort((left, right) => {
      if (right.projectCount !== left.projectCount) return right.projectCount - left.projectCount;
      return right.visitCount - left.visitCount;
    });
}

function groupNearbyVisits(samples: VisitSampleSource[]): VisitSampleSource[][] {
  if (samples.length === 0) return [];

  const parent = samples.map((_, index) => index);
  const find = (index: number): number => {
    if (parent[index] !== index) parent[index] = find(parent[index]!);
    return parent[index]!;
  };
  const union = (left: number, right: number) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
  };

  const cells = new Map<string, number[]>();
  const cellSizeM = CLUSTER_LINK_M;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index]!;
    const key = cellKey(sample.centerLatitude, sample.centerLongitude, cellSizeM);
    const bucket = cells.get(key);
    if (bucket) bucket.push(index);
    else cells.set(key, [index]);
  }

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index]!;
    const latCell = Math.floor((sample.centerLatitude * METERS_PER_DEG_LAT) / cellSizeM);
    const lngCell = Math.floor(
      (sample.centerLongitude * METERS_PER_DEG_LAT * Math.cos((sample.centerLatitude * Math.PI) / 180)) /
        cellSizeM,
    );
    for (let dLat = -1; dLat <= 1; dLat += 1) {
      for (let dLng = -1; dLng <= 1; dLng += 1) {
        const neighbors = cells.get(`${latCell + dLat}:${lngCell + dLng}`) ?? [];
        for (const otherIndex of neighbors) {
          if (otherIndex <= index) continue;
          const other = samples[otherIndex]!;
          if (
            haversineMeters(
              { latitude: sample.centerLatitude, longitude: sample.centerLongitude },
              { latitude: other.centerLatitude, longitude: other.centerLongitude },
            ) <= CLUSTER_LINK_M
          ) {
            union(index, otherIndex);
          }
        }
      }
    }
  }

  const groups = new Map<number, VisitSampleSource[]>();
  for (let index = 0; index < samples.length; index += 1) {
    const root = find(index);
    const group = groups.get(root);
    if (group) group.push(samples[index]!);
    else groups.set(root, [samples[index]!]);
  }
  return [...groups.values()];
}

interface GroupFootprint {
  latitude: number;
  longitude: number;
  visitRadiusM: number;
  projectIds: Set<string>;
}

function groupFootprint(samples: VisitSampleSource[]): GroupFootprint {
  const latitude = medianNumber(samples.map((sample) => sample.centerLatitude));
  const longitude = medianNumber(samples.map((sample) => sample.centerLongitude));
  const distances = samples.map((sample) =>
    haversineMeters({ latitude, longitude }, { latitude: sample.centerLatitude, longitude: sample.centerLongitude }),
  );
  return {
    latitude,
    longitude,
    visitRadiusM: suggestedVisitRadiusM(distances, samples.map((sample) => sample.radiusMeters)),
    projectIds: new Set(samples.map((sample) => sample.projectId)),
  };
}

/**
 * 120m 사슬로는 끊겼지만 한 묶음의 중심이 다른 묶음의 제안 반경 안에 있으면 같은 장소로 본다.
 * 같은 프로젝트가 양쪽에 모두 있으면 그 팀이 두 지점을 따로 들른 것이므로 합치지 않는다.
 */
function mergeOverlappingGroups(groups: VisitSampleSource[][]): VisitSampleSource[][] {
  const next = groups.map((group) => [...group]);
  const footprints = next.map(groupFootprint);
  const maxLatDelta = CLUSTER_ATTACH_MAX_M / METERS_PER_DEG_LAT;

  for (;;) {
    let best: { left: number; right: number; distanceM: number } | null = null;
    for (let left = 0; left < next.length; left += 1) {
      const leftPrint = footprints[left]!;
      for (let right = left + 1; right < next.length; right += 1) {
        const rightPrint = footprints[right]!;
        if (Math.abs(leftPrint.latitude - rightPrint.latitude) > maxLatDelta) continue;
        const distanceM = haversineMeters(leftPrint, rightPrint);
        const attachM = Math.min(CLUSTER_ATTACH_MAX_M, Math.max(leftPrint.visitRadiusM, rightPrint.visitRadiusM));
        if (distanceM > attachM) continue;
        if (best && distanceM >= best.distanceM) continue;
        if ([...rightPrint.projectIds].some((projectId) => leftPrint.projectIds.has(projectId))) continue;
        if (clusterSpreadM([...next[left]!, ...next[right]!]) > CLUSTER_MERGE_MAX_SPREAD_M) continue;
        best = { left, right, distanceM };
      }
    }
    if (!best) return next;
    next[best.left] = [...next[best.left]!, ...next[best.right]!];
    footprints[best.left] = groupFootprint(next[best.left]!);
    next.splice(best.right, 1);
    footprints.splice(best.right, 1);
  }
}

function cellKey(latitude: number, longitude: number, cellSizeM: number): string {
  const latCell = Math.floor((latitude * METERS_PER_DEG_LAT) / cellSizeM);
  const lngCell = Math.floor(
    (longitude * METERS_PER_DEG_LAT * Math.cos((latitude * Math.PI) / 180)) / cellSizeM,
  );
  return `${latCell}:${lngCell}`;
}

function buildCluster(
  samples: VisitSampleSource[],
  places: ClusterPlaceSource[],
  regions: readonly CatalogRegionNameSource[],
): SampleCluster {
  const { latitude, longitude, visitRadiusM } = groupFootprint(samples);
  const durationMedianMs = medianNumber(samples.map((sample) => sample.durationMs));
  const visitJudgmentType: CatalogVisitJudgmentType =
    durationMedianMs < PASS_DURATION_MS ? 'PASS' : 'STAY';
  const stayMinutes = Math.min(10, Math.max(1, Math.floor(percentileNumber(
    samples.map((sample) => sample.durationMs / 60_000),
    0.25,
  ))));
  const visitMinStayMinutes = visitJudgmentType === 'STAY' ? stayMinutes : null;
  const overnightCount = samples.filter((sample) => sample.durationMs >= LODGING_DURATION_MS).length;
  const placeType =
    overnightCount * 2 > samples.length ? ('LODGING' as const) : majorityPlaceType(samples);
  const name = majorityName(samples);
  const area = findNearestArea(latitude, longitude, places);
  const nearbyPlaces = findNearbyExistingPlaces(latitude, longitude, places);
  const spreadM = clusterSpreadM(samples);
  const tooWide = spreadM > CLUSTER_MAX_SPREAD_M;
  const kind: SampleClusterKind = tooWide
    ? 'review'
    : nearbyPlaces.length >= 2
      ? 'review'
      : nearbyPlaces.length === 1
        ? 'existing_fix'
        : 'new_place';
  const reviewReason: SampleClusterReviewReason | null = tooWide
    ? 'too_wide'
    : nearbyPlaces.length >= 2
      ? 'overlap'
      : null;
  const existingPlace = kind === 'existing_fix' ? nearbyPlaces[0] ?? null : null;
  const projectIds = new Set(samples.map((sample) => sample.projectId));
  const sortedIds = [...samples.map((sample) => sample.id)].sort();

  return {
    id: `c:${sortedIds[0]}:${sortedIds[sortedIds.length - 1]}:${sortedIds.length}`,
    kind,
    reviewReason,
    name,
    placeType,
    latitude,
    longitude,
    visitRadiusM,
    visitJudgmentType,
    visitMinStayMinutes,
    parentPlaceId: area?.place.id ?? null,
    parentDistanceM: area ? Math.round(area.distanceM) : null,
    regionId: resolveCatalogRegionId({
      latitude,
      longitude,
      parentRegionId: area?.place.regionId,
      regions,
    }),
    country: area?.place.country || null,
    visitCount: samples.length,
    projectCount: projectIds.size,
    confidence: clusterConfidence(projectIds.size),
    durationMedianMs,
    spreadM: Math.round(spreadM),
    existingPlace,
    existingOffsetM: existingPlace ? existingPlace.distanceM : null,
    existingRadiusM: existingPlace?.visitRadiusM ?? null,
    nearbyPlaces,
    visits: samples.map((sample) => ({
      id: sample.id,
      projectId: sample.projectId,
      projectName: sample.projectName,
      latitude: sample.centerLatitude,
      longitude: sample.centerLongitude,
      durationMs: sample.durationMs,
      radiusMeters: sample.radiusMeters,
      pinType: sample.pinType,
      description: sample.description,
      startedAt: sample.startedAt,
    })),
  };
}

function majorityPlaceType(samples: VisitSampleSource[]): CatalogPlaceType {
  const counts = new Map<CatalogPlaceType, number>();
  for (const sample of samples) {
    const placeType = visitToBulkPlaceDraft(sample).placeType;
    counts.set(placeType, (counts.get(placeType) ?? 0) + 1);
  }
  let best: CatalogPlaceType = 'EXPERIENCE';
  let bestCount = 0;
  for (const [placeType, count] of counts) {
    if (count > bestCount) {
      best = placeType;
      bestCount = count;
    }
  }
  return best;
}

function majorityName(samples: VisitSampleSource[]): string {
  const counts = new Map<string, number>();
  for (const sample of samples) {
    const name = sample.description?.trim() ?? '';
    if (!name || looksLikeAdminName(name)) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

function clusterSpreadM(samples: VisitSampleSource[]): number {
  let max = 0;
  for (let left = 0; left < samples.length; left += 1) {
    for (let right = left + 1; right < samples.length; right += 1) {
      max = Math.max(
        max,
        haversineMeters(
          { latitude: samples[left]!.centerLatitude, longitude: samples[left]!.centerLongitude },
          { latitude: samples[right]!.centerLatitude, longitude: samples[right]!.centerLongitude },
        ),
      );
    }
  }
  return max;
}
