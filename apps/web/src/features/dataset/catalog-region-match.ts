import { VISIT_REGION_LABEL, classifyVisitRegion } from '@tour/domain';

export interface CatalogRegionNameSource {
  id: string;
  name: string;
  status?: string | null;
}

export function matchCatalogRegionByVisit(
  latitude: number,
  longitude: number,
  regions: readonly CatalogRegionNameSource[],
): string | null {
  const visitRegion = classifyVisitRegion(latitude, longitude);
  if (!visitRegion) return null;
  const label = VISIT_REGION_LABEL[visitRegion];
  const match = regions.find((region) => region.status !== 'INACTIVE' && region.name === label);
  return match?.id ?? null;
}

export function resolveCatalogRegionId(args: {
  latitude: number;
  longitude: number;
  parentRegionId?: string | null;
  regions: readonly CatalogRegionNameSource[];
}): string | null {
  if (args.parentRegionId) return args.parentRegionId;
  return matchCatalogRegionByVisit(args.latitude, args.longitude, args.regions);
}
