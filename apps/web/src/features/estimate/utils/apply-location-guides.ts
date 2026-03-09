import type { EstimateLocationGuideRow } from '../hooks/use-estimate-location-guides';
import type { EstimateDocumentData } from '../model/types';

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

export function applyLocationGuides(baseData: EstimateDocumentData, guideRows: EstimateLocationGuideRow[]): EstimateDocumentData {
  const guideByLocationId = new Map(
    guideRows
      .filter((guide): guide is EstimateLocationGuideRow & { locationId: string } => typeof guide.locationId === 'string' && guide.locationId.length > 0)
      .map((guide) => [guide.locationId, guide]),
  );

  const orderedLocationIds: string[] = [];
  const seenLocationIds = new Set<string>();
  const stopLocationNameById = new Map<string, string>();

  for (const planStop of baseData.planStops) {
    const locationId = planStop.locationId;
    if (typeof locationId !== 'string' || locationId.length === 0 || seenLocationIds.has(locationId)) {
      continue;
    }

    seenLocationIds.add(locationId);
    orderedLocationIds.push(locationId);

    const parsedName = parseStopDestinationText(planStop.destinationCellText);
    if (parsedName) {
      stopLocationNameById.set(locationId, parsedName);
    }
  }

  const page3Blocks = orderedLocationIds
    .map((locationId) => {
      const guide = guideByLocationId.get(locationId);
      if (!guide) {
        return null;
      }

      return {
        locationId,
        locationName: guide.location?.name?.trim() || stopLocationNameById.get(locationId) || guide.title,
        title: guide.title,
        description: guide.description,
        imageUrls: guide.imageUrls.slice(0, 2),
      };
    })
    .filter((block): block is NonNullable<typeof block> => block !== null);

  return {
    ...baseData,
    page3Blocks,
  };
}
