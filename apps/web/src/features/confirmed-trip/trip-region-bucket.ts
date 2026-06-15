import type { ConfirmedTripRow } from './hooks';

/** [`REGION_COLOR_RULES`](../guide/trip-color.ts) 키워드 순 — 긴 키워드를 먼저 검사 */
const REGION_KEYWORD_ORDER: readonly string[] = ['홉스골', '자브항', '고비', '중부'];

export type TripRegionBucket = (typeof REGION_KEYWORD_ORDER)[number] | 'OTHER';

export const TRIP_REGION_FILTER_OPTIONS: Array<{ value: TripRegionBucket | 'ALL'; label: string }> = [
  { value: 'ALL', label: '전체' },
  ...REGION_KEYWORD_ORDER.map((k) => ({ value: k as TripRegionBucket, label: k })),
  { value: 'OTHER', label: '미분류' },
];

export function parseAggRegionsParam(raw: string | null): TripRegionBucket[] {
  if (!raw?.trim()) return [];
  const valid = new Set<string>([...REGION_KEYWORD_ORDER, 'OTHER']);
  const seen = new Set<TripRegionBucket>();
  const result: TripRegionBucket[] = [];
  for (const token of raw.split(',')) {
    const t = token.trim();
    if (!t || !valid.has(t)) continue;
    const v = t as TripRegionBucket;
    if (seen.has(v)) continue;
    seen.add(v);
    result.push(v);
  }
  return result;
}

function bucketFromText(text: string): TripRegionBucket | null {
  const normalized = text.replace(/\s+/g, '');
  for (const keyword of REGION_KEYWORD_ORDER) {
    if (normalized.includes(keyword)) {
      return keyword as TripRegionBucket;
    }
  }
  return null;
}

/** 플랜 지역명 + 목적지를 이어 붙인 검색용 문자열 */
function getCombinedRegionSearchText(trip: ConfirmedTripRow): string {
  const parts: string[] = [];
  const name = trip.planVersion?.regionSet?.name?.trim() ?? trip.plan?.regionSet?.name?.trim();
  if (name) parts.push(name);
  const dest = trip.destination?.trim();
  if (dest) parts.push(dest);
  return parts.join('');
}

/** 문장 안에 실제로 들어 있는 지역 키워드 전부 (예: "홉스골중부" → 홉스골, 중부) */
function collectAllBucketsInText(text: string): TripRegionBucket[] {
  const normalized = text.replace(/\s+/g, '');
  const found: TripRegionBucket[] = [];
  for (const keyword of REGION_KEYWORD_ORDER) {
    if (normalized.includes(keyword)) {
      found.push(keyword as TripRegionBucket);
    }
  }
  return found;
}

/**
 * 지역 필터 일치 여부. 복합 여행지명(홉스골중부 등)은 포함된 키워드만큼 여러 버킷에 동시에 속합니다.
 */
export function tripMatchesAggRegion(trip: ConfirmedTripRow, aggRegion: TripRegionBucket | 'ALL'): boolean {
  if (aggRegion === 'ALL') return true;
  const buckets = collectAllBucketsInText(getCombinedRegionSearchText(trip));
  if (aggRegion === 'OTHER') return buckets.length === 0;
  return buckets.includes(aggRegion);
}

/** 선택된 지역 중 하나라도 일치하면 통과(다중 선택 = OR). 빈 배열이면 필터 없음. */
export function tripMatchesAggRegions(trip: ConfirmedTripRow, regions: TripRegionBucket[]): boolean {
  if (regions.length === 0) return true;
  return regions.some((r) => tripMatchesAggRegion(trip, r));
}

/**
 * 혼합 규칙: plan.regionSet.name → destination 키워드 → 미분류.
 * 단일 대표 버킷(첫 매칭) — 목록에 여러 태그가 없을 때 표시용.
 */
export function getTripRegionBucket(trip: ConfirmedTripRow): TripRegionBucket {
  const regionName = trip.planVersion?.regionSet?.name?.trim() ?? trip.plan?.regionSet?.name?.trim();
  if (regionName) {
    const fromName = bucketFromText(regionName);
    if (fromName) return fromName;
  }
  const dest = trip.destination?.trim() ?? '';
  if (dest) {
    const fromDest = bucketFromText(dest);
    if (fromDest) return fromDest;
  }
  return 'OTHER';
}
