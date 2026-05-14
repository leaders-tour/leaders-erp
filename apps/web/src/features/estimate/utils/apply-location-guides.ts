import {
  collectWaypointSegmentLabelsInCompositeName,
  guideLocationNameContainsAnchorToken,
  guideLocationNameHasNoWaypointInForm,
  normalizeGuideLocationNameLines,
  normalizeLocationAnchorToken,
  splitLocationNameLineIntoSlashParts,
} from '@tour/validation';
import type { EstimateLocationGuideRow } from '../hooks/use-estimate-location-guides';
import type { EstimateDocumentData, EstimateGuideBlock, EstimatePlanStopRow } from '../model/types';
import { formatLocationNameInline, formatLocationNameMultiline, normalizeLocationNameLines } from '../../location/display';

function parseStopDestinationText(value: string): string | null {
  return parseStopDestinationLabels(value)[0] ?? null;
}

function parseStopDestinationLabels(value: string): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];

  const addLabel = (raw: string): void => {
    const withoutParenthesis = raw.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    if (!withoutParenthesis) {
      return;
    }
    if (/^이동\b/u.test(withoutParenthesis)) {
      return;
    }

    const routeParts = withoutParenthesis
      .split('→')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    const candidate = routeParts.length > 1 ? (routeParts[routeParts.length - 1] ?? '') : withoutParenthesis;

    for (const part of splitLocationNameLineIntoSlashParts(candidate)) {
      const key = normalizeLocationAnchorToken(part);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      labels.push(part);
    }
  };

  for (const line of value
    .split('\n')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)) {
    for (const waypointPart of line.split(/\s*\(경유\)\s*/u)) {
      addLabel(waypointPart);
    }
  }

  return labels;
}

/** 하위 목적지명(한 줄) 기준 중복 제거 키 — 공백·대소문자 정규화(라틴 문자에 한함) */
export function normalizeGuideSubLocationDedupeKey(line: string): string {
  return line
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFC')
    .toLocaleLowerCase();
}

type GuideWithLoc = EstimateLocationGuideRow & { locationId: string };

/** GraphQL 포함 필드(`location`)와 스칼라(`locationId`) 중 하나만 올 경우에도 목적지 id를 복원한다 */
function resolveGuideAttachedLocationId(guide: EstimateLocationGuideRow): string | null {
  const raw = typeof guide.locationId === 'string' ? guide.locationId.trim() : '';
  if (raw.length > 0) {
    return raw;
  }
  const nested = typeof guide.location?.id === 'string' ? guide.location.id.trim() : '';
  return nested.length > 0 ? nested : null;
}

function attachResolvedLocation(guide: EstimateLocationGuideRow): GuideWithLoc | null {
  const id = resolveGuideAttachedLocationId(guide);
  if (!id) {
    return null;
  }
  return { ...guide, locationId: id };
}

/** locationId 매칭 실패 시 견적 일정표 ‘목적지’ 셀에서 뽑은 라벨로 가이드 Location 이름 앵커를 찾는다 */
function findGuideByParsedDestinationLabel(
  guideRows: EstimateLocationGuideRow[],
  parsedLabel: string,
): GuideWithLoc | null {
  const trimmed = parsedLabel.trim();
  if (!trimmed.length) {
    return null;
  }

  let withoutImage: GuideWithLoc | null = null;

  for (const raw of guideRows) {
    const g = attachResolvedLocation(raw);
    if (!g) {
      continue;
    }
    if (!guideLocationNameContainsAnchorToken(g.location?.name ?? [], trimmed)) {
      continue;
    }
    if (primaryGuideImageUrl(g)) {
      return g;
    }
    withoutImage ||= g;
  }
  return withoutImage;
}

function findGuideForPlanStop(
  planStop: Pick<EstimatePlanStopRow, 'destinationCellText' | 'locationId'>,
  guideByLocationId: Map<string, GuideWithLoc>,
  guideRows: EstimateLocationGuideRow[],
): GuideWithLoc | null {
  const fallbackLabel = parseStopDestinationText(planStop.destinationCellText) ?? undefined;

  const rawStopId =
    typeof planStop.locationId === 'string' ? planStop.locationId.trim() : '';

  if (rawStopId.length > 0) {
    const direct = guideByLocationId.get(rawStopId);
    if (direct) {
      return direct;
    }
    if (!fallbackLabel) {
      return null;
    }
    return findGuideByParsedDestinationLabel(guideRows, fallbackLabel);
  }

  return fallbackLabel ? findGuideByParsedDestinationLabel(guideRows, fallbackLabel) : null;
}

function buildSingleGuideBlocksFromDestinationLabels(
  labels: readonly string[],
  singleGuideByNormalizedKey: Map<string, GuideWithLoc>,
): EstimateGuideBlock[] {
  const blocks: EstimateGuideBlock[] = [];

  for (const label of labels) {
    const key = normalizeLocationAnchorToken(label);
    const guide = key.length ? singleGuideByNormalizedKey.get(key) : undefined;
    const url = guide != null ? primaryGuideImageUrl(guide) : undefined;
    if (!guide || !url) {
      continue;
    }
    blocks.push({
      locationId: guide.locationId,
      locationName: formatLocationNameMultiline([label]),
      title: guide.title,
      description: guide.description,
      imageUrls: [url],
    });
  }

  return blocks;
}

function primaryGuideImageUrl(guide: EstimateLocationGuideRow): string | undefined {
  const urls = guide.imageUrls;
  if (!Array.isArray(urls)) {
    return undefined;
  }
  const u = urls[0];
  return typeof u === 'string' && u.trim().length > 0 ? u : undefined;
}

function buildSingleDestinationGuideLookup(guideRows: EstimateLocationGuideRow[]): Map<string, GuideWithLoc> {
  const byNorm = new Map<string, GuideWithLoc>();
  for (const raw of guideRows) {
    const resolved = attachResolvedLocation(raw);
    if (!resolved) {
      continue;
    }
    if (!guideLocationNameHasNoWaypointInForm(resolved.location?.name)) {
      continue;
    }
    const lines = normalizeGuideLocationNameLines(resolved.location?.name);
    if (lines.length !== 1) {
      continue;
    }
    const parts = splitLocationNameLineIntoSlashParts(lines[0]!);
    if (parts.length !== 1) {
      continue;
    }
    const key = normalizeLocationAnchorToken(parts[0]!);
    if (!key.length) {
      continue;
    }
    if (!byNorm.has(key)) {
      byNorm.set(key, resolved);
    }
  }
  return byNorm;
}

type LegacySegmentPiece = {
  segment: string;
  compositeSlotUrl: string | undefined;
};

/**
 * `appendLegacyGuideBlocksForStop`과 동일한 순서·urlBase 규칙으로 세그먼트를 펼친다.
 * 슬래시 줄에 이미지가 일부만 있어 병합 1장이 되는 경우는 레거시 전용이라 여기서 별도 표시한다.
 */
function peekLegacySegmentPieces(guide: GuideWithLoc): { pieces: LegacySegmentPiece[]; hasMergedPartialSlashLine: boolean } {
  const rawImageUrls = Array.isArray(guide.imageUrls) ? guide.imageUrls : [];
  const urlAt = (index: number): string | undefined => {
    const u = rawImageUrls[index];
    return typeof u === 'string' && u.trim().length > 0 ? u : undefined;
  };

  const nameLines = normalizeLocationNameLines(guide.location?.name);
  const pieces: LegacySegmentPiece[] = [];
  let hasMergedPartialSlashLine = false;

  let urlBase = 0;
  for (const lineRaw of nameLines) {
    const line = lineRaw.trim();
    if (!line.length) {
      continue;
    }
    const segments = splitLocationNameLineIntoSlashParts(line);
    if (segments.length === 0) {
      continue;
    }

    if (segments.length === 1) {
      const segment = segments[0]!;
      pieces.push({ segment, compositeSlotUrl: urlAt(urlBase) });
      urlBase += 1;
      continue;
    }

    const allSlotsFilled = segments.every((_, j) => urlAt(urlBase + j) !== undefined);

    if (allSlotsFilled) {
      for (let j = 0; j < segments.length; j += 1) {
        pieces.push({ segment: segments[j]!, compositeSlotUrl: urlAt(urlBase + j)! });
      }
      urlBase += segments.length;
      continue;
    }

    hasMergedPartialSlashLine = true;
    const mergedUrl = urlAt(urlBase);
    urlBase += 1;
    for (let j = 0; j < segments.length; j += 1) {
      pieces.push({ segment: segments[j]!, compositeSlotUrl: j === 0 ? mergedUrl : undefined });
    }
  }

  return { pieces, hasMergedPartialSlashLine };
}

/** 세그먼트 순서 유지 · 단일 가이드 우선, 없으면 합성 가이드 슬롯 URL */
function buildHybridWaypointBlocksFromPieces(input: {
  compositeGuide: GuideWithLoc;
  pieces: LegacySegmentPiece[];
  singleGuideByNormalizedKey: Map<string, GuideWithLoc>;
  effectiveStopLocationId: string;
}): EstimateGuideBlock[] {
  const { compositeGuide, pieces, singleGuideByNormalizedKey, effectiveStopLocationId } = input;
  const blocks: EstimateGuideBlock[] = [];

  for (const piece of pieces) {
    const key = normalizeLocationAnchorToken(piece.segment);
    const sg = key.length ? singleGuideByNormalizedKey.get(key) : undefined;
    const urlFromSingle = sg != null ? primaryGuideImageUrl(sg) : undefined;
    const url = urlFromSingle ?? piece.compositeSlotUrl;

    if (!url) {
      continue;
    }

    if (sg != null && urlFromSingle) {
      blocks.push({
        locationId: sg.locationId,
        locationName: formatLocationNameMultiline([piece.segment]),
        title: sg.title,
        description: sg.description,
        imageUrls: [urlFromSingle],
      });
    } else {
      blocks.push({
        locationId: effectiveStopLocationId,
        locationName: formatLocationNameMultiline([piece.segment]),
        title: compositeGuide.title,
        description: compositeGuide.description,
        imageUrls: [url],
      });
    }
  }

  return blocks;
}

/**
 * 단일 줄·단일 목적지만 있는 가이드가 아니거나, 줄·조각 순서 라벨이 없으면 null.
 * 모든 라벨에 대해 매칭 단일 목적지 가이드 및 대표 이미지(URL)가 없으면 null.
 */
export function tryComposePage3GuideBlocksFromSingleGuides(
  compositeGuide: GuideWithLoc,
  singleGuideByNormalizedKey: Map<string, GuideWithLoc>,
  /** 줄·조각이 하나뿐인 조합 결과에만 플랜 스톱 `locationId`를 그대로 쓸 때 (경유·다줄 등은 각 sg locationId 유지) */
  blockLocationIdWhenSingleCompose?: string | null,
): EstimateGuideBlock[] | null {
  const labels = collectWaypointSegmentLabelsInCompositeName(compositeGuide.location?.name);
  if (labels.length === 0) {
    return null;
  }

  const singleSegmentCompose = labels.length === 1;
  const trimmedFallback =
    typeof blockLocationIdWhenSingleCompose === 'string' && blockLocationIdWhenSingleCompose.trim().length > 0
      ? blockLocationIdWhenSingleCompose.trim()
      : null;

  const blocks: EstimateGuideBlock[] = [];
  for (const label of labels) {
    const key = normalizeLocationAnchorToken(label);
    const sg = singleGuideByNormalizedKey.get(key);
    const url = sg != null ? primaryGuideImageUrl(sg) : undefined;
    if (!sg || !url) {
      return null;
    }
    blocks.push({
      locationId: singleSegmentCompose && trimmedFallback ? trimmedFallback : sg.locationId,
      locationName: formatLocationNameMultiline([label]),
      title: sg.title,
      description: sg.description,
      imageUrls: [url],
    });
  }
  return blocks;
}

function appendLegacyGuideBlocksForStop(opts: {
  guide: GuideWithLoc;
  locationId: string;
  stopParsedLabel: string | undefined;
  seenSubLocationKeys: Set<string>;
  page3Blocks: EstimateGuideBlock[];
}): void {
  const { guide, locationId, stopParsedLabel, seenSubLocationKeys, page3Blocks } = opts;

  const rawImageUrls = Array.isArray(guide.imageUrls) ? guide.imageUrls : [];
  /** `imageUrls`는 출력 줄·슬래시 세그먼트 순과 맞춰 평평하게 인덱싱된다. */
  const urlAt = (index: number): string | undefined => {
    const u = rawImageUrls[index];
    return typeof u === 'string' && u.trim().length > 0 ? u : undefined;
  };

  const nameLines = normalizeLocationNameLines(guide.location?.name);

  if (nameLines.length === 0) {
    const url = urlAt(0);
    if (!url) {
      return;
    }
    const label =
      formatLocationNameMultiline(guide.location?.name) || stopParsedLabel || guide.title;
    const dedupeKey = normalizeGuideSubLocationDedupeKey(
      formatLocationNameInline(guide.location?.name) || guide.title || label,
    );
    if (seenSubLocationKeys.has(dedupeKey)) {
      return;
    }
    seenSubLocationKeys.add(dedupeKey);
    page3Blocks.push({
      locationId,
      locationName: label,
      title: guide.title,
      description: guide.description,
      imageUrls: [url],
    });
    return;
  }

  let urlBase = 0;
  for (const lineRaw of nameLines) {
    const line = lineRaw.trim();
    if (!line.length) {
      continue;
    }
    const segments = splitLocationNameLineIntoSlashParts(line);
    if (segments.length === 0) {
      continue;
    }

    if (segments.length === 1) {
      const segment = segments[0]!;
      const url = urlAt(urlBase);
      urlBase += 1;
      if (!url) {
        continue;
      }
      const dedupeKey = normalizeGuideSubLocationDedupeKey(segment);
      if (seenSubLocationKeys.has(dedupeKey)) {
        continue;
      }
      seenSubLocationKeys.add(dedupeKey);
      page3Blocks.push({
        locationId,
        locationName: formatLocationNameMultiline([segment]),
        title: guide.title,
        description: guide.description,
        imageUrls: [url],
      });
      continue;
    }

    /** 한 줄 내 경유: 세그먼트 수만큼 연속 슬롯이 모두 있으면 분리 페이지, 아니면 기존처럼 줄 전체 한 장 */
    const allSlotsFilled = segments.every((_, j) => urlAt(urlBase + j) !== undefined);

    if (allSlotsFilled) {
      for (let j = 0; j < segments.length; j += 1) {
        const segment = segments[j]!;
        const url = urlAt(urlBase + j)!;
        const dedupeKey = normalizeGuideSubLocationDedupeKey(segment);
        if (seenSubLocationKeys.has(dedupeKey)) {
          continue;
        }
        seenSubLocationKeys.add(dedupeKey);
        page3Blocks.push({
          locationId,
          locationName: formatLocationNameMultiline([segment]),
          title: guide.title,
          description: guide.description,
          imageUrls: [url],
        });
      }
      urlBase += segments.length;
      continue;
    }

    const mergedUrl = urlAt(urlBase);
    urlBase += 1;
    if (!mergedUrl) {
      continue;
    }
    const mergedDedupeKey = normalizeGuideSubLocationDedupeKey(line);
    if (seenSubLocationKeys.has(mergedDedupeKey)) {
      continue;
    }
    seenSubLocationKeys.add(mergedDedupeKey);
    page3Blocks.push({
      locationId,
      locationName: formatLocationNameMultiline([line]),
      title: guide.title,
      description: guide.description,
      imageUrls: [mergedUrl],
    });
  }
}

export function applyLocationGuides(baseData: EstimateDocumentData, guideRows: EstimateLocationGuideRow[]): EstimateDocumentData {
  const guideByLocationId = new Map<string, GuideWithLoc>();
  for (const raw of guideRows) {
    const g = attachResolvedLocation(raw);
    if (!g) {
      continue;
    }
    guideByLocationId.set(g.locationId, g);
  }

  const singleGuideLookup = buildSingleDestinationGuideLookup(guideRows);

  const stopLocationNameById = new Map<string, string>();

  for (const planStop of baseData.planStops) {
    const locationId = planStop.locationId;
    if (typeof locationId !== 'string' || locationId.length === 0) {
      continue;
    }

    const parsedName = parseStopDestinationText(planStop.destinationCellText);
    if (parsedName) {
      stopLocationNameById.set(locationId, parsedName);
    }
  }

  const page3Blocks: NonNullable<EstimateDocumentData['page3Blocks']> = [];
  const seenSubLocationKeys = new Set<string>();

  for (const planStop of baseData.planStops) {
    if (planStop.rowType === 'EXTERNAL_TRANSFER') {
      continue;
    }

    const stopLocationKey =
      typeof planStop.locationId === 'string' && planStop.locationId.trim().length > 0
        ? planStop.locationId.trim()
        : '';

    const directGuide = stopLocationKey.length > 0 ? guideByLocationId.get(stopLocationKey) : undefined;
    const destinationLabels = parseStopDestinationLabels(planStop.destinationCellText);
    if (!directGuide && destinationLabels.length >= 2) {
      const labelBlocks = buildSingleGuideBlocksFromDestinationLabels(destinationLabels, singleGuideLookup);
      if (labelBlocks.length > 0) {
        let added = 0;
        for (const block of labelBlocks) {
          const dedupeKey = normalizeGuideSubLocationDedupeKey(block.locationName);
          if (seenSubLocationKeys.has(dedupeKey)) {
            continue;
          }
          seenSubLocationKeys.add(dedupeKey);
          page3Blocks.push(block);
          added += 1;
        }
        if (added > 0) {
          continue;
        }
      }
    }

    const guide = findGuideForPlanStop(planStop, guideByLocationId, guideRows);
    if (!guide) {
      continue;
    }

    const resolvedStopLabel = parseStopDestinationText(planStop.destinationCellText) ?? undefined;
    const effectiveLocationId = stopLocationKey.length > 0 ? stopLocationKey : guide.locationId;

    const composedBlocks = tryComposePage3GuideBlocksFromSingleGuides(
      guide,
      singleGuideLookup,
      stopLocationKey.length > 0 ? stopLocationKey : null,
    );
    if (composedBlocks != null && composedBlocks.length > 0) {
      for (const block of composedBlocks) {
        const dedupeKey = normalizeGuideSubLocationDedupeKey(block.locationName);
        if (seenSubLocationKeys.has(dedupeKey)) {
          continue;
        }
        seenSubLocationKeys.add(dedupeKey);
        page3Blocks.push(block);
      }
      continue;
    }

    /** 전부 단일 조합 실패 후: 슬래시 병합(이미지 1장만)·다줄에서 합성 슬롯은 비는 경우 단일 목적지 가이드로 메운다 */
    const { pieces: legacyPieces, hasMergedPartialSlashLine } = peekLegacySegmentPieces(guide);
    const canHybridFill =
      !hasMergedPartialSlashLine && legacyPieces.length >= 2 && collectWaypointSegmentLabelsInCompositeName(guide.location?.name).length >= 2;

    if (canHybridFill) {
      const hybridBlocks = buildHybridWaypointBlocksFromPieces({
        compositeGuide: guide,
        pieces: legacyPieces,
        singleGuideByNormalizedKey: singleGuideLookup,
        effectiveStopLocationId: effectiveLocationId,
      });

      if (hybridBlocks.length > 0) {
        let added = 0;
        for (const block of hybridBlocks) {
          const dedupeKey = normalizeGuideSubLocationDedupeKey(block.locationName);
          if (seenSubLocationKeys.has(dedupeKey)) {
            continue;
          }
          seenSubLocationKeys.add(dedupeKey);
          page3Blocks.push(block);
          added += 1;
        }

        /** 하이브리드가 비어 있다면 레거시로 진행하지만, 블록이 하나라도 붙었다면 해당 스톱은 여기까지만 */
        if (added > 0) {
          continue;
        }
      }
    }

    appendLegacyGuideBlocksForStop({
      guide,
      locationId: effectiveLocationId,
      stopParsedLabel:
        stopLocationKey.length > 0 ? stopLocationNameById.get(stopLocationKey) : resolvedStopLabel,
      seenSubLocationKeys,
      page3Blocks,
    });
  }

  return {
    ...baseData,
    page3Blocks,
  };
}
