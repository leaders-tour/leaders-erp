import type { EstimateLocationGuideRow } from '../hooks/use-estimate-location-guides';
import type { EstimateDocumentData } from '../model/types';
import { formatLocationNameInline, formatLocationNameMultiline, normalizeLocationNameLines } from '../../location/display';

function parseStopDestinationText(value: string): string | null {
  const line = value
    .split('\n')
    .map((part) => part.trim())
    .find((part) => part.length > 0);

  if (!line) {
    return null;
  }

  const withoutParenthesis = line.replace(/\([^)]*\)/g, '').trim();
  if (!withoutParenthesis) {
    return null;
  }

  const routeParts = withoutParenthesis
    .split('→')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const candidate = routeParts.length > 0 ? (routeParts[routeParts.length - 1] ?? '') : withoutParenthesis;

  return candidate.length > 0 ? candidate : null;
}

/** 하위 목적지명(한 줄) 기준 중복 제거 키 — 공백·대소문자 정규화(라틴 문자에 한함) */
export function normalizeGuideSubLocationDedupeKey(line: string): string {
  return line
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFC')
    .toLocaleLowerCase();
}

export function applyLocationGuides(baseData: EstimateDocumentData, guideRows: EstimateLocationGuideRow[]): EstimateDocumentData {
  const guideByLocationId = new Map(
    guideRows
      .filter((guide): guide is EstimateLocationGuideRow & { locationId: string } => typeof guide.locationId === 'string' && guide.locationId.length > 0)
      .map((guide) => [guide.locationId, guide]),
  );

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

    const locationId = planStop.locationId;
    if (typeof locationId !== 'string' || locationId.length === 0) {
      continue;
    }

    const guide = guideByLocationId.get(locationId);
    if (!guide) {
      continue;
    }

    const rawImageUrls = Array.isArray(guide.imageUrls) ? guide.imageUrls : [];
    /** 줄 인덱스와 1:1 — 빈 슬롯은 그대로 두고 인덱스를 밀지 않는다 (필터하면 뒤쪽 URL이 앞 줄에 붙는 버그). */
    const urlAt = (index: number): string | undefined => {
      const u = rawImageUrls[index];
      return typeof u === 'string' && u.trim().length > 0 ? u : undefined;
    };

    const nameLines = normalizeLocationNameLines(guide.location?.name);

    if (nameLines.length === 0) {
      const url = urlAt(0);
      if (!url) {
        continue;
      }
      const label =
        formatLocationNameMultiline(guide.location?.name) ||
        stopLocationNameById.get(locationId) ||
        guide.title;
      const dedupeKey = normalizeGuideSubLocationDedupeKey(
        formatLocationNameInline(guide.location?.name) || guide.title || label,
      );
      if (seenSubLocationKeys.has(dedupeKey)) {
        continue;
      }
      seenSubLocationKeys.add(dedupeKey);
      page3Blocks.push({
        locationId,
        locationName: label,
        title: guide.title,
        description: guide.description,
        imageUrls: [url],
      });
      continue;
    }

    for (let index = 0; index < nameLines.length; index += 1) {
      const line = nameLines[index] ?? '';
      const url = urlAt(index);
      if (!url) {
        continue;
      }
      const dedupeKey = normalizeGuideSubLocationDedupeKey(line);
      if (seenSubLocationKeys.has(dedupeKey)) {
        continue;
      }
      seenSubLocationKeys.add(dedupeKey);
      page3Blocks.push({
        locationId,
        locationName: formatLocationNameMultiline([line]),
        title: guide.title,
        description: guide.description,
        imageUrls: [url],
      });
    }
  }

  return {
    ...baseData,
    page3Blocks,
  };
}
