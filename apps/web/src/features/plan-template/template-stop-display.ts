import { formatLocationNameMultiline } from '../location/display';
import { formatLocationVersion, type LocationOption, type LocationVersionOption } from './route-autofill';

/** 일차별 planRows / GraphQL planStop과 함께 쓰는 표시용 스냅샷 */
export interface TemplateStopDisplaySource {
  location?: { name: string[] } | null;
  locationVersion?: { id: string; label: string; versionNumber: number } | null;
}

/** 저장된 목적지 셀에서 장소 이름만 추출(이동·거리 줄 제외). */
export function destinationCellTextToLocationName(destinationCellText: string | undefined): string | undefined {
  if (!destinationCellText?.trim()) {
    return undefined;
  }
  const lines = destinationCellText.split('\n');
  const nameLines: string[] = [];
  for (const line of lines) {
    if (line.trim().startsWith('이동 ')) {
      break;
    }
    nameLines.push(line);
  }
  const name = nameLines.join('\n').trim();
  return name || destinationCellText.trim();
}

export function resolveTemplateStopDisplayName(
  locationId: string,
  dayIndex: number,
  locationById: Map<string, LocationOption>,
  planRows: Array<{ destinationCellText: string }>,
  templateStop?: TemplateStopDisplaySource | null,
): string {
  const locName = locationById.get(locationId)?.name;
  if (locName != null && formatLocationNameMultiline(locName).length > 0) {
    return formatLocationNameMultiline(locName);
  }
  const apiName = templateStop?.location?.name;
  if (apiName != null && formatLocationNameMultiline(apiName).length > 0) {
    return formatLocationNameMultiline(apiName);
  }
  const fallback = destinationCellTextToLocationName(planRows[dayIndex - 1]?.destinationCellText);
  if (fallback) {
    return formatLocationNameMultiline(fallback);
  }
  return formatLocationNameMultiline(locationId);
}

export function resolveTemplateStopVersionParenthetical(
  locationId: string,
  locationVersionId: string | undefined,
  locationById: Map<string, LocationOption>,
  locationVersionById: Map<string, LocationVersionOption>,
  templateStop?: TemplateStopDisplaySource | null,
): string {
  if (locationById.has(locationId)) {
    return ` (${formatLocationVersion(locationVersionId ? locationVersionById.get(locationVersionId) : undefined)})`;
  }
  const api = templateStop?.locationVersion;
  if (api) {
    return ` (${formatLocationVersion({ label: api.label, versionNumber: api.versionNumber })})`;
  }
  return '';
}
