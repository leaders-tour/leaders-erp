import type { MealOption } from '../../generated/graphql';
import { toFacilityLabel, toMealLabel } from '../location/display';
import { getBaseLodgingText } from '../lodging-selection/model';
import { buildEmptyPlanRow, buildPlaceholderPlanRows, type TemplatePlanRow } from './editor-utils';

export interface RouteSelection {
  locationId: string;
  locationVersionId: string;
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

export interface SegmentOption {
  id: string;
  regionId: string;
  fromLocationId: string;
  toLocationId: string;
  averageDistanceKm: number;
  averageTravelHours: number;
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

function toSegmentTimeCell(segment: SegmentOption | undefined): string {
  if (!segment || segment.scheduleTimeBlocks.length === 0) {
    return '';
  }

  return segment.scheduleTimeBlocks
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

function toSegmentScheduleCell(segment: SegmentOption | undefined): string {
  if (!segment || segment.scheduleTimeBlocks.length === 0) {
    return '';
  }

  return segment.scheduleTimeBlocks
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

export function getDefaultVersionId(location: LocationOption | undefined): string {
  if (!location) {
    return '';
  }
  return location.defaultVersionId ?? location.variations[0]?.id ?? '';
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
    const segment = filteredSegments.find((item) => item.fromLocationId === fromId && item.toLocationId === toStop.locationId);
    const toLocation = locationById.get(toStop.locationId);
    const toVersion = locationVersionById.get(toStop.locationVersionId);

    const destinationCellText = formatRouteDestinationCellText({
      locationName: toLocation?.name ?? toStop.locationId,
      averageTravelHours: segment?.averageTravelHours,
      averageDistanceKm: segment?.averageDistanceKm,
    });

    return {
      segmentId: segment?.id,
      locationId: toStop.locationId,
      locationVersionId: toStop.locationVersionId,
      dateCellText: `${dayIndex}일차`,
      destinationCellText,
      timeCellText: dayIndex === 1 ? toTimeCell(toVersion) : toSegmentTimeCell(segment),
      scheduleCellText: dayIndex === 1 ? toScheduleCell(toVersion) : toSegmentScheduleCell(segment),
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
  const routeStops: Array<Pick<RouteSelection, 'locationId' | 'locationVersionId'>> = [
    { locationId: startLocationId, locationVersionId: startLocationVersionId },
    ...selectedRoute,
  ];

  return planRows.map((row, index) => {
    const routeStop = routeStops[index];
    return {
      dayIndex: index + 1,
      segmentId: index === 0 ? undefined : row.segmentId,
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
