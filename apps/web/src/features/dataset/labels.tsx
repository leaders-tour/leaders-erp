import {
  catalogRouteDisplayStats,
  catalogRoutePlannedStats,
  type CatalogRouteEstimateMode,
  type CatalogRouteMeasureSource,
} from '@tour/domain';
import { datasetTheme } from './theme';

export type CatalogPlaceType =
  | 'LODGING'
  | 'RESTAURANT'
  | 'EXPERIENCE'
  | 'MEETING'
  | 'GATE'
  | 'MART'
  | 'HOSPITAL'
  | 'AIRPORT'
  | 'OTHER'
  | 'AREA';
export type CatalogVisitJudgmentType = 'PASS' | 'STAY';
export type CatalogUsageStatus = 'ACTIVE' | 'INACTIVE';
export type CatalogElementComposition = 'SINGLE' | 'SET';
export type CatalogElementKind = 'MEETING' | 'TRANSFER' | 'MEAL' | 'EXPERIENCE' | 'MIXED';
export type CatalogBlockShape = 'DAY' | 'SET';
export type CatalogVisitLinkStatus = 'AUTO' | 'REVIEW' | 'UNLINKED' | 'MANUAL';
export type CatalogVisitLinkReviewReason = 'OVERLAP' | 'NONE';
export type CatalogVisitRegion = 'GOBI' | 'CENTRAL' | 'KHUVSGUL' | 'TERELJ' | 'ULAANBAATAR' | 'OTHER';
export type CatalogRouteObservationStatus = 'AUTO' | 'HOLD';
export type CatalogRouteObservationHoldReason = 'GAP' | 'JUMP' | 'NO_PATH';
export type { CatalogRouteEstimateMode };

export const ROUTE_ESTIMATE_MODE_LABEL: Record<CatalogRouteEstimateMode, string> = {
  AUTO: '자동 · 실측 우선',
  MANUAL: '수동 고정',
};

export const PLACE_TYPE_LABEL: Record<CatalogPlaceType, string> = {
  LODGING: '숙소',
  RESTAURANT: '식당',
  EXPERIENCE: '체험장',
  MEETING: '미팅 장소',
  GATE: '출입 지점',
  MART: '마트',
  HOSPITAL: '병원',
  AIRPORT: '공항',
  OTHER: '기타',
  AREA: '목적지',
};

export const CATALOG_PLACE_TYPES: CatalogPlaceType[] = [
  'LODGING',
  'RESTAURANT',
  'EXPERIENCE',
  'MEETING',
  'GATE',
  'MART',
  'HOSPITAL',
  'AIRPORT',
  'OTHER',
  'AREA',
];

export function catalogPlaceTypeLabel(
  placeType: CatalogPlaceType,
  otherTypeLabel?: string | null,
): string {
  if (placeType === 'OTHER') {
    const custom = otherTypeLabel?.trim();
    return custom ? `기타 · ${custom}` : '기타';
  }
  return PLACE_TYPE_LABEL[placeType];
}

export interface CatalogPlaceRegionRef {
  id: string;
  name: string;
}

export function catalogPlaceRegionIds(place: {
  regionId?: string | null;
  regionIds?: string[] | null;
  regions?: CatalogPlaceRegionRef[] | null;
}): string[] {
  if (place.regionIds && place.regionIds.length > 0) return place.regionIds;
  if (place.regions && place.regions.length > 0) return place.regions.map((row) => row.id);
  return place.regionId ? [place.regionId] : [];
}

export function catalogPlaceHasRegion(
  place: {
    regionId?: string | null;
    regionIds?: string[] | null;
    regions?: CatalogPlaceRegionRef[] | null;
  },
  regionId: string,
): boolean {
  return catalogPlaceRegionIds(place).includes(regionId);
}

export function catalogPlaceRegionNames(place: {
  region?: { name: string } | null;
  regions?: CatalogPlaceRegionRef[] | null;
}): string {
  if (place.regions && place.regions.length > 0) return place.regions.map((row) => row.name).join(' · ');
  return place.region?.name ?? '';
}

export function canLinkAccommodation(placeType: CatalogPlaceType): boolean {
  return placeType === 'LODGING' || placeType === 'RESTAURANT';
}

export function nearbyPlaceKind(placeType: CatalogPlaceType): 'lodging' | 'restaurant' | 'any' {
  if (placeType === 'LODGING') return 'lodging';
  if (placeType === 'RESTAURANT') return 'restaurant';
  return 'any';
}

export const ELEMENT_KIND_LABEL: Record<CatalogElementKind, string> = {
  MEETING: '미팅',
  TRANSFER: '이동',
  MEAL: '식사',
  EXPERIENCE: '체험',
  MIXED: '혼합',
};

export const STATUS_LABEL: Record<CatalogUsageStatus, string> = {
  ACTIVE: '사용 중',
  INACTIVE: '사용 안 함',
};

export const VISIT_JUDGMENT_TYPE_LABEL: Record<CatalogVisitJudgmentType, string> = {
  PASS: '통과형',
  STAY: '체류형',
};

export const VISIT_LINK_STATUS_LABEL: Record<CatalogVisitLinkStatus, string> = {
  AUTO: '자동 연결',
  REVIEW: '검토 필요',
  UNLINKED: '미연결',
  MANUAL: '수동 연결',
};

export const VISIT_LINK_REVIEW_REASON_LABEL: Record<CatalogVisitLinkReviewReason, string> = {
  OVERLAP: '장소 범위 겹침',
  NONE: '근처 등록 장소 없음',
};

export const ROUTE_OBSERVATION_STATUS_LABEL: Record<CatalogRouteObservationStatus, string> = {
  AUTO: '자동',
  HOLD: '보류',
};

export const ROUTE_OBSERVATION_HOLD_REASON_LABEL: Record<CatalogRouteObservationHoldReason, string> = {
  GAP: '공백',
  JUMP: '점프',
  NO_PATH: '경로 없음',
};

export function formatCatalogRouteMinutes(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const minutes = Math.round(value);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
  }
  return `${minutes}분`;
}

export function formatCatalogRouteKm(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return Number.isInteger(value) ? `${value}km` : `${value.toFixed(1)}km`;
}

export function catalogRouteMeasureLabel(source: CatalogRouteMeasureSource | null): string {
  if (source === 'observed') return '실측';
  if (source === 'manual') return '수동';
  return '';
}

export function catalogRoutePlannedSummary(route: {
  estimateMode?: CatalogRouteEstimateMode | null;
  bufferMinutes?: number | null;
  medianDistanceKm?: number | null;
  medianElapsedMinutes?: number | null;
  averageDistanceKm?: number | null;
  averageTravelHours?: number | null;
}): { primary: string; detail: string } {
  const planned = catalogRoutePlannedStats(route);
  const source = catalogRouteMeasureLabel(planned.elapsedSource) || '미정';
  const buffer =
    planned.bufferMinutes > 0 && planned.baseElapsedMinutes != null
      ? `${formatCatalogRouteMinutes(planned.baseElapsedMinutes)} + ${planned.bufferMinutes}분`
      : source;
  return {
    primary: `${formatCatalogRouteKm(planned.distanceKm)} · ${formatCatalogRouteMinutes(planned.elapsedMinutes)}`,
    detail: planned.elapsedMinutes == null ? '예상값 미정' : `${ROUTE_ESTIMATE_MODE_LABEL[planned.estimateMode]} · ${buffer}`,
  };
}

export function catalogRouteMeasureSummary(route: {
  medianDistanceKm?: number | null;
  medianElapsedMinutes?: number | null;
  averageDistanceKm?: number | null;
  averageTravelHours?: number | null;
  usableCount?: number;
}): { primary: string; source: string } {
  const stats = catalogRouteDisplayStats(route);
  const primary = `${formatCatalogRouteKm(stats.distanceKm)} · ${formatCatalogRouteMinutes(stats.elapsedMinutes)}`;
  if (stats.distanceSource === 'observed' && stats.elapsedSource === 'observed') {
    const count = route.usableCount ?? 0;
    return { primary, source: count > 0 ? `실측 ${count}건` : '실측' };
  }
  if (stats.distanceSource === 'manual' && stats.elapsedSource === 'manual') {
    return { primary, source: '수동' };
  }
  if (!stats.distanceSource && !stats.elapsedSource) {
    return { primary, source: '' };
  }
  const distance = catalogRouteMeasureLabel(stats.distanceSource) || '없음';
  const elapsed = catalogRouteMeasureLabel(stats.elapsedSource) || '없음';
  return { primary, source: `거리 ${distance} · 시간 ${elapsed}` };
}

export function routeObservationHoldReasonLabel(
  status: CatalogRouteObservationStatus,
  reason: CatalogRouteObservationHoldReason | null,
): string {
  if (reason) return ROUTE_OBSERVATION_HOLD_REASON_LABEL[reason];
  if (status === 'HOLD') return '보류';
  return '—';
}

export function visitLinkReviewReasonLabel(
  status: CatalogVisitLinkStatus,
  reason: CatalogVisitLinkReviewReason | null,
): string {
  if (reason) return VISIT_LINK_REVIEW_REASON_LABEL[reason];
  if (status === 'REVIEW') return '검토 필요';
  if (status === 'UNLINKED') return '근처 등록 장소 없음';
  return '—';
}

export function defaultVisitJudgmentType(placeType: CatalogPlaceType): CatalogVisitJudgmentType {
  return placeType === 'GATE' ? 'PASS' : 'STAY';
}

export function StatusBadge({ status }: { status: CatalogUsageStatus }): JSX.Element {
  const active = status === 'ACTIVE';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/80' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function TypePill({
  label,
  tone = 'slate',
}: {
  label: string;
  tone?: 'slate' | 'violet' | 'sky' | 'amber';
}): JSX.Element {
  const toneClass =
    tone === 'violet'
      ? 'bg-[#EDE9FE] text-[#5B4BD6] ring-1 ring-inset ring-[#D9D2F8]'
      : tone === 'sky'
        ? 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100'
        : tone === 'amber'
          ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100'
          : 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200';
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass}`}>{label}</span>;
}

export function DatasetStubNotice({ message }: { message: string }): JSX.Element {
  return (
    <div
      className={`rounded-xl border border-[#D9D2F8] bg-[#F3F0FF] px-3 py-2 text-sm ${datasetTheme.selectionText}`}
      role="status"
    >
      {message}
    </div>
  );
}

export function DatasetPageFooter({ screenId }: { screenId: string }): JSX.Element {
  return (
    <p className="text-xs text-[#9A93C2]">
      {screenId} · 일정 데이터 관리 · 화면 검토안 v0.1 (실험)
    </p>
  );
}

export function MapLink({ href }: { href: string }): JSX.Element {
  return (
    <a className={`inline-flex items-center gap-1 text-sm font-medium ${datasetTheme.link}`} href={href} target="_blank" rel="noreferrer">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
          clipRule="evenodd"
        />
      </svg>
      지도 보기
    </a>
  );
}
