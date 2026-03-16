import type { MealOption } from '../../generated/graphql';
import { toFacilityLabel, toMealLabel } from '../location/display';
import { getBaseLodgingText } from '../lodging-selection/model';
import { buildEmptyPlanRow, buildPlaceholderPlanRows, type TemplatePlanRow } from './editor-utils';

export interface RouteSelection {
  locationId: string;
  locationVersionId: string;
  segmentId?: string;
  segmentVersionId?: string;
}

export interface LocationVersionOption {
  id: string;
  versionNumber: number;
  label: string;
  lodgings: Array<{
    id: string;
    name: string;
    hasElectricity: 'YES' | 'LIMITED' | 'NO';
    hasShower: 'YES' | 'LIMITED' | 'NO';
    hasInternet: 'YES' | 'LIMITED' | 'NO';
  }>;
  mealSets: Array<{
    id: string;
    breakfast: MealOption | null;
    lunch: MealOption | null;
    dinner: MealOption | null;
  }>;
  timeBlocks: Array<{
    id: string;
    startTime: string;
    orderIndex: number;
    activities: Array<{
      id: string;
      description: string;
      orderIndex: number;
    }>;
  }>;
}

export interface LocationOption {
  id: string;
  regionId: string;
  name: string;
  defaultVersionId: string | null;
  variations: LocationVersionOption[];
}

export interface SegmentVersionOption {
  id: string;
  segmentId: string;
  name: string;
  kind: 'DIRECT' | 'VIA';
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  sortOrder: number;
  isDefault: boolean;
  viaLocations: Array<{
    id: string;
    locationId: string;
    orderIndex: number;
  }>;
  scheduleTimeBlocks: Array<{
    id: string;
    startTime: string;
    orderIndex: number;
    activities: Array<{
      id: string;
      description: string;
      orderIndex: number;
    }>;
  }>;
}

export interface SegmentOption {
  id: string;
  regionId: string;
  fromLocationId: string;
  toLocationId: string;
  defaultVersionId?: string | null;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance?: boolean;
  scheduleTimeBlocks: Array<{
    id: string;
    startTime: string;
    orderIndex: number;
    activities: Array<{
      id: string;
      description: string;
      orderIndex: number;
    }>;
  }>;
  versions?: SegmentVersionOption[];
}

interface ResolvedSegmentVersionOption {
  id: string;
  segmentId: string;
  name: string;
  kind: 'DIRECT' | 'VIA';
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  sortOrder: number;
  isDefault: boolean;
  viaLocations: Array<{
    id: string;
    locationId: string;
    orderIndex: number;
  }>;
  scheduleTimeBlocks: Array<{
    id: string;
    startTime: string;
    orderIndex: number;
    activities: Array<{
      id: string;
      description: string;
      orderIndex: number;
    }>;
  }>;
}

export function formatLocationVersion(version: Pick<LocationVersionOption, 'label' | 'versionNumber'> | undefined): string {
  if (!version) {
    return '버전 미정';
  }
  return `${version.label} (v${version.versionNumber})`;
}

function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function formatDistance(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

export function formatRouteDestinationCellText(input: {
  locationName: string;
  averageTravelHours?: number | null;
  averageDistanceKm?: number | null;
}): string {
  const travelLine =
    typeof input.averageTravelHours === 'number' && input.averageTravelHours > 0
      ? `이동 ${formatHours(input.averageTravelHours)}시간`
      : '이동 미정';
  const distanceLine =
    typeof input.averageDistanceKm === 'number' && input.averageDistanceKm > 0
      ? `(${formatDistance(input.averageDistanceKm)} km)`
      : '(거리 미정)';

  return [input.locationName, travelLine, distanceLine].join('\n');
}

function toTimeCell(version: LocationVersionOption | undefined): string {
  if (!version || version.timeBlocks.length === 0) {
    return '';
  }

  return version.timeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((timeBlock) => {
      const orderedActivities = timeBlock.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex);
      if (orderedActivities.length <= 1) {
        return [timeBlock.startTime];
      }
      return [timeBlock.startTime, ...orderedActivities.slice(1).map(() => '-')];
    })
    .join('\n');
}

function toScheduleCell(version: LocationVersionOption | undefined): string {
  if (!version || version.timeBlocks.length === 0) {
    return '';
  }

  return version.timeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((timeBlock) => {
      const orderedActivities = timeBlock.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex);
      if (orderedActivities.length === 0) {
        return ['(일정 없음)'];
      }
      return orderedActivities.map((activity) => activity.description);
    })
    .join('\n');
}

function toSegmentTimeCell(segmentVersion: ResolvedSegmentVersionOption | undefined): string {
  if (!segmentVersion || segmentVersion.scheduleTimeBlocks.length === 0) {
    return '';
  }

  return segmentVersion.scheduleTimeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((timeBlock) => {
      const orderedActivities = timeBlock.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex);
      if (orderedActivities.length <= 1) {
        return [timeBlock.startTime];
      }
      return [timeBlock.startTime, ...orderedActivities.slice(1).map(() => '-')];
    })
    .join('\n');
}

function toSegmentScheduleCell(segmentVersion: ResolvedSegmentVersionOption | undefined): string {
  if (!segmentVersion || segmentVersion.scheduleTimeBlocks.length === 0) {
    return '';
  }

  return segmentVersion.scheduleTimeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((timeBlock) => {
      const orderedActivities = timeBlock.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex);
      if (orderedActivities.length === 0) {
        return ['(일정 없음)'];
      }
      return orderedActivities.map((activity) => activity.description);
    })
    .join('\n');
}

function toLodgingCell(version: LocationVersionOption | undefined): string {
  return getBaseLodgingText(version, toFacilityLabel);
}

function toMealCell(version: LocationVersionOption | undefined): string {
  const mealSet = version?.mealSets[0];
  return [`아침 ${toMealLabel(mealSet?.breakfast)}`, `점심 ${toMealLabel(mealSet?.lunch)}`, `저녁 ${toMealLabel(mealSet?.dinner)}`].join(
    '\n',
  );
}

function buildLegacyDirectVersion(segment: SegmentOption): ResolvedSegmentVersionOption {
  return {
    id: `${segment.id}::direct`,
    segmentId: segment.id,
    name: 'Direct',
    kind: 'DIRECT',
    averageDistanceKm: segment.averageDistanceKm,
    averageTravelHours: segment.averageTravelHours,
    isLongDistance: segment.isLongDistance ?? false,
    sortOrder: 0,
    isDefault: true,
    viaLocations: [],
    scheduleTimeBlocks: segment.scheduleTimeBlocks,
  };
}

export function getSegmentVersions(segment: SegmentOption | undefined): ResolvedSegmentVersionOption[] {
  if (!segment) {
    return [];
  }

  if (!segment.versions || segment.versions.length === 0) {
    return [buildLegacyDirectVersion(segment)];
  }

  return segment.versions.slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getDefaultSegmentVersionId(segment: SegmentOption | undefined): string {
  if (!segment) {
    return '';
  }

  return (
    segment.defaultVersionId ??
    getSegmentVersions(segment).find((version) => version.isDefault)?.id ??
    getSegmentVersions(segment)[0]?.id ??
    ''
  );
}

export function resolveSegmentVersion(
  segment: SegmentOption | undefined,
  segmentVersionId?: string,
): ResolvedSegmentVersionOption | undefined {
  const versions = getSegmentVersions(segment);
  if (versions.length === 0) {
    return undefined;
  }

  if (segmentVersionId) {
    const matched = versions.find((version) => version.id === segmentVersionId);
    if (matched) {
      return matched;
    }
  }

  const defaultVersionId = getDefaultSegmentVersionId(segment);
  return versions.find((version) => version.id === defaultVersionId) ?? versions[0];
}

export function formatSegmentVersionLabel(
  version: Pick<ResolvedSegmentVersionOption, 'name' | 'kind' | 'viaLocations'>,
  locationById?: Map<string, Pick<LocationOption, 'id' | 'name'>>,
): string {
  if (version.kind === 'DIRECT') {
    return version.name || 'Direct';
  }

  if (version.name.trim().length > 0) {
    return version.name;
  }

  const viaNames = version.viaLocations.map((viaLocation) => locationById?.get(viaLocation.locationId)?.name ?? viaLocation.locationId);
  return viaNames.length > 0 ? `Via ${viaNames.join(' → ')}` : 'Via';
}

export function getDefaultVersionId(location: LocationOption | undefined): string {
  if (!location) {
    return '';
  }
  return location.defaultVersionId ?? location.variations[0]?.id ?? '';
}

export function findSegment(
  filteredSegments: SegmentOption[],
  fromLocationId: string,
  toLocationId: string,
): SegmentOption | undefined {
  return filteredSegments.find((segment) => segment.fromLocationId === fromLocationId && segment.toLocationId === toLocationId);
}

export function buildNextOptions(input: {
  filteredLocations: LocationOption[];
  filteredSegments: SegmentOption[];
  startLocationId: string;
  selectedRoute: RouteSelection[];
  totalDays: number;
}): LocationOption[] {
  const { filteredLocations, filteredSegments, selectedRoute, startLocationId, totalDays } = input;
  if (selectedRoute.length >= totalDays - 1) {
    return [];
  }

  const fromId = selectedRoute.length === 0 ? startLocationId : selectedRoute[selectedRoute.length - 1]?.locationId;
  if (!fromId) {
    return [];
  }

  const toIds = filteredSegments.filter((segment) => segment.fromLocationId === fromId).map((segment) => segment.toLocationId);
  return filteredLocations.filter((location) => toIds.includes(location.id));
}

export function buildAutoRowsFromRoute(input: {
  startLocationId: string;
  startLocationVersionId: string;
  selectedRoute: RouteSelection[];
  filteredSegments: SegmentOption[];
  locationById: Map<string, LocationOption>;
  locationVersionById: Map<string, LocationVersionOption>;
  totalDays: number;
}): TemplatePlanRow[] {
  const {
    startLocationId,
    startLocationVersionId,
    selectedRoute,
    filteredSegments,
    locationById,
    locationVersionById,
    totalDays,
  } = input;
  const safeTotalDays = Math.max(2, totalDays);

  if (!startLocationId || !startLocationVersionId) {
    return buildPlaceholderPlanRows(safeTotalDays);
  }

  const orderedStops: RouteSelection[] = [
    { locationId: startLocationId, locationVersionId: startLocationVersionId },
    ...selectedRoute.slice(0, safeTotalDays - 1),
  ];

  const rows: TemplatePlanRow[] = orderedStops.map((toStop, index) => {
    const dayIndex = index + 1;
    const fromId = index === 0 ? '' : orderedStops[index - 1]?.locationId ?? '';
    const segment = index === 0 ? undefined : findSegment(filteredSegments, fromId, toStop.locationId);
    const segmentVersion = index === 0 ? undefined : resolveSegmentVersion(segment, toStop.segmentVersionId);
    const toLocation = locationById.get(toStop.locationId);
    const toVersion = locationVersionById.get(toStop.locationVersionId);

    const destinationCellText = formatRouteDestinationCellText({
      locationName: toLocation?.name ?? toStop.locationId,
      averageTravelHours: segmentVersion?.averageTravelHours,
      averageDistanceKm: segmentVersion?.averageDistanceKm,
    });

    return {
      segmentId: segment?.id,
      segmentVersionId: segmentVersion?.id,
      locationId: toStop.locationId,
      locationVersionId: toStop.locationVersionId,
      dateCellText: `${dayIndex}일차`,
      destinationCellText,
      timeCellText: dayIndex === 1 ? toTimeCell(toVersion) : toSegmentTimeCell(segmentVersion),
      scheduleCellText: dayIndex === 1 ? toScheduleCell(toVersion) : toSegmentScheduleCell(segmentVersion),
      lodgingCellText: toLodgingCell(toVersion),
      mealCellText: toMealCell(toVersion),
    };
  });

  while (rows.length < safeTotalDays) {
    rows.push(buildEmptyPlanRow(rows.length + 1));
  }

  return rows;
}

export function buildTemplateStopsFromRouteAndRows(input: {
  startLocationId: string;
  startLocationVersionId: string;
  selectedRoute: RouteSelection[];
  planRows: TemplatePlanRow[];
}) {
  const { startLocationId, startLocationVersionId, selectedRoute, planRows } = input;
  const routeStops: Array<Pick<RouteSelection, 'locationId' | 'locationVersionId' | 'segmentId' | 'segmentVersionId'>> = [
    { locationId: startLocationId, locationVersionId: startLocationVersionId },
    ...selectedRoute,
  ];

  return planRows.map((row, index) => {
    const routeStop = routeStops[index];
    return {
      dayIndex: index + 1,
      segmentId: index === 0 ? undefined : routeStop?.segmentId || row.segmentId,
      segmentVersionId: index === 0 ? undefined : routeStop?.segmentVersionId || row.segmentVersionId,
      locationId: routeStop?.locationId || row.locationId || undefined,
      locationVersionId: routeStop?.locationVersionId || row.locationVersionId || undefined,
      dateCellText: row.dateCellText,
      destinationCellText: row.destinationCellText,
      timeCellText: row.timeCellText,
      scheduleCellText: row.scheduleCellText,
      lodgingCellText: row.lodgingCellText,
      mealCellText: row.mealCellText,
    };
  });
}
