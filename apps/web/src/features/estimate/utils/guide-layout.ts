import { ESTIMATE_GUIDE_IMAGES_PER_PAGE_DEFAULT } from '../model/constants';
import type { EstimateGuideImagesPerPage } from '../model/types';

export function normalizeEstimateGuideImagesPerPage(value: unknown): EstimateGuideImagesPerPage {
  if (value === 1 || value === 2 || value === 3) {
    return value;
  }
  return ESTIMATE_GUIDE_IMAGES_PER_PAGE_DEFAULT;
}

/** DB/스냅샷 등에서 페이지별 장수 배열 안전 파싱 */
export function normalizeEstimateGuidePageSplits(value: unknown): number[] | null {
  if (value == null) {
    return null;
  }
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  const out: number[] = [];
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isInteger(item) || item < 1 || item > 50) {
      return null;
    }
    out.push(item);
  }
  return out;
}

/** 빌더 입력: "3, 2, 2" 형태 → 양의 정수 배열, 빈 문자열이면 null */
export function parseEstimateGuidePageSplitsInput(text: string): number[] | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const parts = trimmed
    .split(/[,，\s]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) {
    return null;
  }
  const out: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      return null;
    }
    out.push(n);
  }
  return out;
}

export function formatEstimateGuidePageSplitsInput(splits: number[] | null | undefined): string {
  if (!Array.isArray(splits) || splits.length === 0) {
    return '';
  }
  return splits.join(', ');
}

/** 페이지당 안내 블록을 순서 유지하여 묶습니다. 빈 목록은 단일 빈 페이지 청크를 반환합니다. */
export function chunkEstimateGuidePages<T>(blocks: T[], perPage: EstimateGuideImagesPerPage): T[][] {
  const size = normalizeEstimateGuideImagesPerPage(perPage);
  if (blocks.length === 0) {
    return [[]];
  }
  const chunks: T[][] = [];
  for (let i = 0; i < blocks.length; i += size) {
    chunks.push(blocks.slice(i, i + size));
  }
  return chunks;
}

/** 균등하게 페이지당 3장일 때 안내 시트가 3장 이상 필요한 경우 */
export function estimateGuideSupportsThreePerPageChunks<T>(blocks: readonly T[]): boolean {
  return chunkEstimateGuidePages([...blocks], 3).length >= 3;
}

/** splits 적용 후 나머지 블록 처리. 저장 견적·PDF는 `lump` 유지, 빌더 미리보기는 `chunk-per-page`. */
export type GuideSplitRemainderStrategy = 'lump' | 'chunk-per-page';

export interface ChunkGuidePagesBySplitsOptions {
  perPage?: EstimateGuideImagesPerPage;
  remainderStrategy?: GuideSplitRemainderStrategy;
}

/**
 * 페이지별 장수 배열로 분할 (예 [3,2,2] → 첫 페이지 3장, 둘째 2장…).
 * `remainderStrategy`가 `lump`이면 지정 합이 짧을 때 나머지를 마지막 한 페이지에 붙입니다(저장 견적 기본).
 * `chunk-per-page`이면 명시 split은 `perPage`로 cap하고, 나머지는 `perPage` 균등 분할을 이어갑니다(빌더 미리보기).
 */
export function chunkGuidePagesBySplits<T>(
  blocks: T[],
  splits: number[],
  options: ChunkGuidePagesBySplitsOptions = {},
): T[][] {
  if (blocks.length === 0) {
    return [[]];
  }
  const perPage = normalizeEstimateGuideImagesPerPage(options.perPage);
  const remainderStrategy = options.remainderStrategy ?? 'lump';
  if (splits.length === 0) {
    return chunkEstimateGuidePages(blocks, perPage);
  }
  const chunks: T[][] = [];
  let offset = 0;
  for (const raw of splits) {
    if (offset >= blocks.length) {
      break;
    }
    const size = Math.max(0, Math.floor(raw));
    if (size <= 0) {
      continue;
    }
    const take =
      remainderStrategy === 'chunk-per-page'
        ? Math.min(size, perPage, blocks.length - offset)
        : Math.min(size, blocks.length - offset);
    chunks.push(blocks.slice(offset, offset + take));
    offset += take;
  }
  if (offset < blocks.length) {
    const remainder = blocks.slice(offset);
    if (remainderStrategy === 'chunk-per-page') {
      chunks.push(...chunkEstimateGuidePages(remainder, perPage));
    } else {
      chunks.push(remainder);
    }
  }
  return chunks.length > 0 ? chunks : [[]];
}
