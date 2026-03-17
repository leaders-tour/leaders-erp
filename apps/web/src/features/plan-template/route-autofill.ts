import type { MealOption, VariantType } from '../../generated/graphql';
import { toFacilityLabel, toMealLabel } from '../location/display';
import { getBaseLodgingText } from '../lodging-selection/model';
import { buildEmptyPlanRow, buildPlaceholderPlanRows, type TemplatePlanRow } from './editor-utils';

export type SegmentScheduleVariant = 'basic' | 'early' | 'extend' | 'earlyExtend';
type LocationTimeBlockProfile = 'FIRST_DAY' | 'FIRST_DAY_EARLY';

export interface RouteSelection {
  locationId: string;
  locationVersionId: string;
  segmentId?: string;
  segmentVersionId?: string;
}

interface TimeBlockOption {
  id: string;
  startTime: string;
  orderIndex: number;
  activities: Array<{
    id: string;
    description: string;
    orderIndex: number;
  }>;
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
  firstDayTimeBlocks: TimeBlockOption[];
  firstDayEarlyTimeBlocks: TimeBlockOption[];
}

export interface LocationOption {
  id: string;
  regionId: string;
  name: string;
  defaultVersionId: string | null;
  isFirstDayEligible: boolean;
  isLastDayEligible: boolean;
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
  scheduleTimeBlocks: TimeBlockOption[];
  earlyScheduleTimeBlocks: TimeBlockOption[];
  extendScheduleTimeBlocks: TimeBlockOption[];
  earlyExtendScheduleTimeBlocks: TimeBlockOption[];
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
  scheduleTimeBlocks: TimeBlockOption[];
  earlyScheduleTimeBlocks: TimeBlockOption[];
  extendScheduleTimeBlocks: TimeBlockOption[];
  earlyExtendScheduleTimeBlocks: TimeBlockOption[];
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
  scheduleTimeBlocks: TimeBlockOption[];
  earlyScheduleTimeBlocks: TimeBlockOption[];
  extendScheduleTimeBlocks: TimeBlockOption[];
  earlyExtendScheduleTimeBlocks: TimeBlockOption[];
}

function hasEarlyVariant(variantType: VariantType | undefined): boolean {
  return variantType === 'early' || variantType === 'earlyExtend';
}

function hasExtendVariant(variantType: VariantType | undefined): boolean {
  return variantType === 'extend' || variantType === 'earlyExtend';
}

function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function formatDistance(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function getOrderedTimeBlocks(timeBlocks: TimeBlockOption[]): TimeBlockOption[] {
  return timeBlocks.slice().sort((a, b) => a.orderIndex - b.orderIndex);
}

function toTimeCellFromTimeBlocks(
  timeBlocks: TimeBlockOption[],
  options?: {
    firstStartTimeOverride?: string;
    lastStartTimeOverride?: string;
  },
): string {
  if (timeBlocks.length === 0) {
    return '';
  }

  const orderedTimeBlocks = getOrderedTimeBlocks(timeBlocks);

  return orderedTimeBlocks
    .flatMap((timeBlock, index) => {
      const orderedActivities = timeBlock.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex);
      const isFirst = index === 0;
      const isLast = index === orderedTimeBlocks.length - 1;
      const startTime =
        (isFirst && options?.firstStartTimeOverride?.trim()) ||
        (isLast && options?.lastStartTimeOverride?.trim()) ||
        timeBlock.startTime;
      if (orderedActivities.length <= 1) {
        return [startTime];
      }
      return [startTime, ...orderedActivities.slice(1).map(() => '-')];
    })
    .join('\n');
}

function toScheduleCellFromTimeBlocks(timeBlocks: TimeBlockOption[]): string {
  if (timeBlocks.length === 0) {
    return '';
  }

  return getOrderedTimeBlocks(timeBlocks)
    .flatMap((timeBlock) => {
      const orderedActivities = timeBlock.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex);
      if (orderedActivities.length === 0) {
        return ['(일정 없음)'];
      }
      return orderedActivities.map((activity) => activity.description);
    })
    .join('\n');
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
    earlyScheduleTimeBlocks: segment.earlyScheduleTimeBlocks,
    extendScheduleTimeBlocks: segment.extendScheduleTimeBlocks,
    earlyExtendScheduleTimeBlocks: segment.earlyExtendScheduleTimeBlocks,
  };
}

function getLocationTimeBlocks(
  version: LocationVersionOption | undefined,
  profile: LocationTimeBlockProfile,
): TimeBlockOption[] {
  if (!version) {
    return [];
  }

  if (profile === 'FIRST_DAY') {
    return version.firstDayTimeBlocks ?? [];
  }
  if (profile === 'FIRST_DAY_EARLY') {
    return version.firstDayEarlyTimeBlocks ?? [];
  }
  return version.firstDayTimeBlocks ?? [];
}

function getSegmentScheduleTimeBlocks(
  segmentVersion: ResolvedSegmentVersionOption | undefined,
  variant: SegmentScheduleVariant,
): TimeBlockOption[] {
  if (!segmentVersion) {
    return [];
  }

  if (variant === 'early') {
    return segmentVersion.earlyScheduleTimeBlocks ?? [];
  }
  if (variant === 'extend') {
    return segmentVersion.extendScheduleTimeBlocks ?? [];
  }
  if (variant === 'earlyExtend') {
    return segmentVersion.earlyExtendScheduleTimeBlocks ?? [];
  }
  return segmentVersion.scheduleTimeBlocks ?? [];
}

export function formatLocationVersion(version: Pick<LocationVersionOption, 'label' | 'versionNumber'> | undefined): string {
  if (!version) {
    return '버전 미정';
  }
  return `${version.label} (v${version.versionNumber})`;
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

export function buildFirstDayOptions(filteredLocations: LocationOption[]): LocationOption[] {
  return filteredLocations.filter((location) => location.isFirstDayEligible);
}

export function resolveSegmentScheduleVariant(input: {
  variantType?: VariantType;
  fromDayIndex: number;
  toDayIndex: number;
  totalDays: number;
}): SegmentScheduleVariant {
  const sourceContextIsEarly = input.fromDayIndex === 1 && hasEarlyVariant(input.variantType);
  const targetContextIsExtend = input.toDayIndex === input.totalDays && hasExtendVariant(input.variantType);

  if (sourceContextIsEarly && targetContextIsExtend) {
    return 'earlyExtend';
  }
  if (sourceContextIsEarly) {
    return 'early';
  }
  if (targetContextIsExtend) {
    return 'extend';
  }
  return 'basic';
}

function hasScheduleForVariant(segment: SegmentOption | undefined, segmentVersionId: string | undefined, variant: SegmentScheduleVariant): boolean {
  const segmentVersion = resolveSegmentVersion(segment, segmentVersionId);
  return getSegmentScheduleTimeBlocks(segmentVersion, variant).length > 0;
}

export function buildNextOptions(input: {
  filteredLocations: LocationOption[];
  filteredSegments: SegmentOption[];
  startLocationId: string;
  selectedRoute: RouteSelection[];
  totalDays: number;
  variantType?: VariantType;
}): LocationOption[] {
  const { filteredLocations, filteredSegments, selectedRoute, startLocationId, totalDays, variantType } = input;
  if (selectedRoute.length >= totalDays - 1) {
    return [];
  }

  const fromId = selectedRoute.length === 0 ? startLocationId : selectedRoute[selectedRoute.length - 1]?.locationId;
  if (!fromId) {
    return [];
  }

  const nextDayIndex = selectedRoute.length + 2;
  const requiredVariant = resolveSegmentScheduleVariant({
    variantType,
    fromDayIndex: nextDayIndex - 1,
    toDayIndex: nextDayIndex,
    totalDays,
  });
  const isLastDay = nextDayIndex === totalDays;

  const toIds = filteredSegments
    .filter((segment) => segment.fromLocationId === fromId)
    .filter((segment) => hasScheduleForVariant(segment, undefined, requiredVariant))
    .map((segment) => segment.toLocationId);

  return filteredLocations.filter((location) => toIds.includes(location.id) && (!isLastDay || location.isLastDayEligible));
}

export function buildAutoRowsFromRoute(input: {
  startLocationId: string;
  startLocationVersionId: string;
  selectedRoute: RouteSelection[];
  filteredSegments: SegmentOption[];
  locationById: Map<string, LocationOption>;
  locationVersionById: Map<string, LocationVersionOption>;
  totalDays: number;
  variantType?: VariantType;
  firstDayTimeOverride?: string;
  lastDayTimeOverride?: string;
}): TemplatePlanRow[] {
  const {
    startLocationId,
    startLocationVersionId,
    selectedRoute,
    filteredSegments,
    locationById,
    locationVersionById,
    totalDays,
    variantType,
    firstDayTimeOverride,
    lastDayTimeOverride,
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
    const segmentVariant =
      index === 0
        ? 'basic'
        : resolveSegmentScheduleVariant({
            variantType,
            fromDayIndex: dayIndex - 1,
            toDayIndex: dayIndex,
            totalDays: safeTotalDays,
          });

    const destinationCellText = formatRouteDestinationCellText({
      locationName: toLocation?.name ?? toStop.locationId,
      averageTravelHours: segmentVersion?.averageTravelHours,
      averageDistanceKm: segmentVersion?.averageDistanceKm,
    });

    const firstDayProfile: LocationTimeBlockProfile = hasEarlyVariant(variantType) ? 'FIRST_DAY_EARLY' : 'FIRST_DAY';

    return {
      segmentId: segment?.id,
      segmentVersionId: segmentVersion?.id,
      locationId: toStop.locationId,
      locationVersionId: toStop.locationVersionId,
      dateCellText: `${dayIndex}일차`,
      destinationCellText,
      timeCellText:
        dayIndex === 1
          ? toTimeCellFromTimeBlocks(getLocationTimeBlocks(toVersion, firstDayProfile), {
              firstStartTimeOverride: firstDayTimeOverride,
            })
          : toTimeCellFromTimeBlocks(getSegmentScheduleTimeBlocks(segmentVersion, segmentVariant), {
              lastStartTimeOverride: dayIndex === safeTotalDays ? lastDayTimeOverride : undefined,
            }),
      scheduleCellText:
        dayIndex === 1
          ? toScheduleCellFromTimeBlocks(getLocationTimeBlocks(toVersion, firstDayProfile))
          : toScheduleCellFromTimeBlocks(getSegmentScheduleTimeBlocks(segmentVersion, segmentVariant)),
      lodgingCellText: getBaseLodgingText(toVersion, toFacilityLabel),
      mealCellText: [
        `아침 ${toMealLabel(toVersion?.mealSets[0]?.breakfast)}`,
        `점심 ${toMealLabel(toVersion?.mealSets[0]?.lunch)}`,
        `저녁 ${toMealLabel(toVersion?.mealSets[0]?.dinner)}`,
      ].join('\n'),
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
