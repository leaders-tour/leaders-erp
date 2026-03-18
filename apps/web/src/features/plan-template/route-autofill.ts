import type { MealOption, VariantType } from '../../generated/graphql';
import { formatLocationNameMultiline, toFacilityLabel, toMealLabel } from '../location/display';
import { getBaseLodgingText } from '../lodging-selection/model';
import { buildEmptyPlanRow, buildPlaceholderPlanRows, type TemplatePlanRow } from './editor-utils';

export type SegmentScheduleVariant = 'basic' | 'early' | 'extend' | 'earlyExtend';
type LocationTimeBlockProfile = 'FIRST_DAY' | 'FIRST_DAY_EARLY';

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
  name: string[];
  defaultVersionId: string | null;
  isFirstDayEligible: boolean;
  isLastDayEligible: boolean;
  variations: LocationVersionOption[];
}

export interface SegmentVersionOption {
  id: string;
  segmentId: string;
  name: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  sortOrder: number;
  isDefault: boolean;
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
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  sortOrder: number;
  isDefault: boolean;
  scheduleTimeBlocks: TimeBlockOption[];
  earlyScheduleTimeBlocks: TimeBlockOption[];
  extendScheduleTimeBlocks: TimeBlockOption[];
  earlyExtendScheduleTimeBlocks: TimeBlockOption[];
}

export interface OvernightStayDayOption {
  id: string;
  dayOrder: number;
  averageDistanceKm: number;
  averageTravelHours: number;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
}

export interface OvernightStayOption {
  id: string;
  regionId: string;
  locationId: string;
  name: string;
  title: string;
  isActive: boolean;
  sortOrder: number;
  days: OvernightStayDayOption[];
}

export interface OvernightStayConnectionVersionOption {
  id: string;
  overnightStayConnectionId: string;
  name: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  sortOrder: number;
  isDefault: boolean;
  scheduleTimeBlocks: TimeBlockOption[];
  earlyScheduleTimeBlocks: TimeBlockOption[];
  extendScheduleTimeBlocks: TimeBlockOption[];
  earlyExtendScheduleTimeBlocks: TimeBlockOption[];
}

export interface OvernightStayConnectionOption {
  id: string;
  regionId: string;
  fromOvernightStayId: string;
  toLocationId: string;
  defaultVersionId?: string | null;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance?: boolean;
  scheduleTimeBlocks: TimeBlockOption[];
  earlyScheduleTimeBlocks: TimeBlockOption[];
  extendScheduleTimeBlocks: TimeBlockOption[];
  earlyExtendScheduleTimeBlocks: TimeBlockOption[];
  versions?: OvernightStayConnectionVersionOption[];
}

interface ResolvedOvernightStayConnectionVersionOption {
  id: string;
  overnightStayConnectionId: string;
  name: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  sortOrder: number;
  isDefault: boolean;
  scheduleTimeBlocks: TimeBlockOption[];
  earlyScheduleTimeBlocks: TimeBlockOption[];
  extendScheduleTimeBlocks: TimeBlockOption[];
  earlyExtendScheduleTimeBlocks: TimeBlockOption[];
}

export interface LocationRouteSelection {
  kind: 'LOCATION';
  locationId: string;
  locationVersionId: string;
  segmentId?: string;
  segmentVersionId?: string;
  overnightStayConnectionId?: string;
  overnightStayConnectionVersionId?: string;
}

export interface OvernightStayRouteSelection {
  kind: 'OVERNIGHT_STAY';
  overnightStayId: string;
  stayLength: number;
  locationId: string;
  locationVersionId: string;
}

export type RouteSelection = LocationRouteSelection | OvernightStayRouteSelection;

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
    averageDistanceKm: segment.averageDistanceKm,
    averageTravelHours: segment.averageTravelHours,
    isLongDistance: segment.isLongDistance ?? false,
    sortOrder: 0,
    isDefault: true,
    scheduleTimeBlocks: segment.scheduleTimeBlocks,
    earlyScheduleTimeBlocks: segment.earlyScheduleTimeBlocks,
    extendScheduleTimeBlocks: segment.extendScheduleTimeBlocks,
    earlyExtendScheduleTimeBlocks: segment.earlyExtendScheduleTimeBlocks,
  };
}

function buildLegacyDirectOvernightStayConnectionVersion(
  connection: OvernightStayConnectionOption,
): ResolvedOvernightStayConnectionVersionOption {
  return {
    id: `${connection.id}::direct`,
    overnightStayConnectionId: connection.id,
    name: 'Direct',
    averageDistanceKm: connection.averageDistanceKm,
    averageTravelHours: connection.averageTravelHours,
    isLongDistance: connection.isLongDistance ?? false,
    sortOrder: 0,
    isDefault: true,
    scheduleTimeBlocks: connection.scheduleTimeBlocks,
    earlyScheduleTimeBlocks: connection.earlyScheduleTimeBlocks,
    extendScheduleTimeBlocks: connection.extendScheduleTimeBlocks,
    earlyExtendScheduleTimeBlocks: connection.earlyExtendScheduleTimeBlocks,
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

function getOvernightStayConnectionScheduleTimeBlocks(
  connectionVersion: ResolvedOvernightStayConnectionVersionOption | undefined,
  variant: SegmentScheduleVariant,
): TimeBlockOption[] {
  if (!connectionVersion) {
    return [];
  }

  if (variant === 'early') {
    return connectionVersion.earlyScheduleTimeBlocks ?? [];
  }
  if (variant === 'extend') {
    return connectionVersion.extendScheduleTimeBlocks ?? [];
  }
  if (variant === 'earlyExtend') {
    return connectionVersion.earlyExtendScheduleTimeBlocks ?? [];
  }
  return connectionVersion.scheduleTimeBlocks ?? [];
}

function getOvernightStayDay(
  overnightStay: OvernightStayOption | undefined,
  dayOrder: number,
): OvernightStayDayOption | undefined {
  return overnightStay?.days.find((day) => day.dayOrder === dayOrder);
}

function getOvernightStayLength(
  overnightStay: OvernightStayOption | undefined,
  fallbackLength = 2,
): number {
  const dayCount = overnightStay?.days.length ?? fallbackLength;
  if (dayCount < 2) {
    return 2;
  }
  if (dayCount > 3) {
    return 3;
  }
  return dayCount;
}

function getCurrentContext(selectedRoute: RouteSelection[], startLocationId: string):
  | { kind: 'LOCATION'; locationId: string }
  | { kind: 'OVERNIGHT_STAY'; overnightStayId: string } {
  const lastStop = selectedRoute[selectedRoute.length - 1];
  if (!lastStop) {
    return { kind: 'LOCATION', locationId: startLocationId };
  }
  if (lastStop.kind === 'OVERNIGHT_STAY') {
    return { kind: 'OVERNIGHT_STAY', overnightStayId: lastStop.overnightStayId };
  }
  return { kind: 'LOCATION', locationId: lastStop.locationId };
}

export function getRouteSelectionDaySpan(selection: RouteSelection): number {
  return selection.kind === 'OVERNIGHT_STAY' ? selection.stayLength : 1;
}

export function getConsumedRouteDayCount(selectedRoute: RouteSelection[]): number {
  return selectedRoute.reduce((sum, stop) => sum + getRouteSelectionDaySpan(stop), 0);
}

export function getRouteStopStartDayIndex(selectedRoute: RouteSelection[], index: number): number {
  return (
    2 +
    selectedRoute.slice(0, index).reduce((sum, stop) => sum + getRouteSelectionDaySpan(stop), 0)
  );
}

export function getRouteStopEndDayIndex(selectedRoute: RouteSelection[], index: number): number {
  const startDayIndex = getRouteStopStartDayIndex(selectedRoute, index);
  return startDayIndex + getRouteSelectionDaySpan(selectedRoute[index]!) - 1;
}

export function trimRouteSelectionsToTotalDays(selectedRoute: RouteSelection[], totalDays: number): RouteSelection[] {
  const nextRoute: RouteSelection[] = [];
  let usedDays = 1;

  for (const stop of selectedRoute) {
    const daySpan = getRouteSelectionDaySpan(stop);
    if (usedDays + daySpan > totalDays) {
      break;
    }
    nextRoute.push(stop);
    usedDays += daySpan;
  }

  return nextRoute;
}

export function formatLocationVersion(version: Pick<LocationVersionOption, 'label' | 'versionNumber'> | undefined): string {
  if (!version) {
    return '버전 미정';
  }
  return `${version.label} (v${version.versionNumber})`;
}

export function formatRouteDestinationCellText(input: {
  locationName: string[] | string;
  averageTravelHours?: number | null;
  averageDistanceKm?: number | null;
}): string {
  const travelLine =
    typeof input.averageTravelHours === 'number' && input.averageTravelHours > 0
      ? `이동 ${formatHours(input.averageTravelHours)}시간`
      : '이동 미정';
  const distanceLine =
    typeof input.averageDistanceKm === 'number' && input.averageDistanceKm >= 0
      ? `(${formatDistance(input.averageDistanceKm)} km)`
      : '(거리 미정)';

  return [formatLocationNameMultiline(input.locationName), travelLine, distanceLine].join('\n');
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

export function formatSegmentVersionLabel(version: Pick<ResolvedSegmentVersionOption, 'name'>): string {
  return version.name.trim() || 'Direct';
}

export function getOvernightStayConnectionVersions(
  connection: OvernightStayConnectionOption | undefined,
): ResolvedOvernightStayConnectionVersionOption[] {
  if (!connection) {
    return [];
  }

  if (!connection.versions || connection.versions.length === 0) {
    return [buildLegacyDirectOvernightStayConnectionVersion(connection)];
  }

  return connection.versions.slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getDefaultOvernightStayConnectionVersionId(
  connection: OvernightStayConnectionOption | undefined,
): string {
  if (!connection) {
    return '';
  }

  return (
    connection.defaultVersionId ??
    getOvernightStayConnectionVersions(connection).find((version) => version.isDefault)?.id ??
    getOvernightStayConnectionVersions(connection)[0]?.id ??
    ''
  );
}

export function resolveOvernightStayConnectionVersion(
  connection: OvernightStayConnectionOption | undefined,
  overnightStayConnectionVersionId?: string,
): ResolvedOvernightStayConnectionVersionOption | undefined {
  const versions = getOvernightStayConnectionVersions(connection);
  if (versions.length === 0) {
    return undefined;
  }

  if (overnightStayConnectionVersionId) {
    const matched = versions.find((version) => version.id === overnightStayConnectionVersionId);
    if (matched) {
      return matched;
    }
  }

  const defaultVersionId = getDefaultOvernightStayConnectionVersionId(connection);
  return versions.find((version) => version.id === defaultVersionId) ?? versions[0];
}

export function formatOvernightStayConnectionVersionLabel(
  version: Pick<ResolvedOvernightStayConnectionVersionOption, 'name'>,
): string {
  return version.name.trim() || 'Direct';
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

export function findOvernightStay(
  filteredOvernightStays: OvernightStayOption[],
  overnightStayId: string,
): OvernightStayOption | undefined {
  return filteredOvernightStays.find((overnightStay) => overnightStay.id === overnightStayId);
}

export function findOvernightStayConnection(
  filteredOvernightStayConnections: OvernightStayConnectionOption[],
  fromOvernightStayId: string,
  toLocationId: string,
): OvernightStayConnectionOption | undefined {
  return filteredOvernightStayConnections.find(
    (connection) => connection.fromOvernightStayId === fromOvernightStayId && connection.toLocationId === toLocationId,
  );
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

function hasScheduleForVariant(
  segment: SegmentOption | undefined,
  segmentVersionId: string | undefined,
  variant: SegmentScheduleVariant,
): boolean {
  const segmentVersion = resolveSegmentVersion(segment, segmentVersionId);
  return getSegmentScheduleTimeBlocks(segmentVersion, variant).length > 0;
}

function hasOvernightStayConnectionScheduleForVariant(
  connection: OvernightStayConnectionOption | undefined,
  overnightStayConnectionVersionId: string | undefined,
  variant: SegmentScheduleVariant,
): boolean {
  const connectionVersion = resolveOvernightStayConnectionVersion(connection, overnightStayConnectionVersionId);
  return getOvernightStayConnectionScheduleTimeBlocks(connectionVersion, variant).length > 0;
}

export function buildNextOptions(input: {
  filteredLocations: LocationOption[];
  filteredSegments: SegmentOption[];
  filteredOvernightStayConnections?: OvernightStayConnectionOption[];
  startLocationId: string;
  selectedRoute: RouteSelection[];
  totalDays: number;
  variantType?: VariantType;
}): LocationOption[] {
  const {
    filteredLocations,
    filteredSegments,
    filteredOvernightStayConnections = [],
    selectedRoute,
    startLocationId,
    totalDays,
    variantType,
  } = input;
  const usedDays = 1 + getConsumedRouteDayCount(selectedRoute);
  if (usedDays >= totalDays) {
    return [];
  }

  const nextDayIndex = usedDays + 1;
  const requiredVariant = resolveSegmentScheduleVariant({
    variantType,
    fromDayIndex: nextDayIndex - 1,
    toDayIndex: nextDayIndex,
    totalDays,
  });
  const isLastDay = nextDayIndex === totalDays;
  const context = getCurrentContext(selectedRoute, startLocationId);

  if (context.kind === 'OVERNIGHT_STAY') {
    const toIds = filteredOvernightStayConnections
      .filter((connection) => connection.fromOvernightStayId === context.overnightStayId)
      .filter((connection) => hasOvernightStayConnectionScheduleForVariant(connection, undefined, requiredVariant))
      .map((connection) => connection.toLocationId);

    return filteredLocations.filter((location) => toIds.includes(location.id) && (!isLastDay || location.isLastDayEligible));
  }

  const toIds = filteredSegments
    .filter((segment) => segment.fromLocationId === context.locationId)
    .filter((segment) => hasScheduleForVariant(segment, undefined, requiredVariant))
    .map((segment) => segment.toLocationId);

  return filteredLocations.filter((location) => toIds.includes(location.id) && (!isLastDay || location.isLastDayEligible));
}

export function buildOvernightStayOptions(input: {
  filteredOvernightStays: OvernightStayOption[];
  filteredSegments: SegmentOption[];
  startLocationId: string;
  selectedRoute: RouteSelection[];
  totalDays: number;
}): OvernightStayOption[] {
  const { filteredOvernightStays, filteredSegments, startLocationId, selectedRoute, totalDays } = input;
  const usedDays = 1 + getConsumedRouteDayCount(selectedRoute);
  const context = getCurrentContext(selectedRoute, startLocationId);
  if (context.kind === 'OVERNIGHT_STAY') {
    return [];
  }

  const reachableLocationIds = new Set(
    filteredSegments.filter((segment) => segment.fromLocationId === context.locationId).map((segment) => segment.toLocationId),
  );

  return filteredOvernightStays.filter(
    (overnightStay) =>
      overnightStay.isActive &&
      totalDays - usedDays >= getOvernightStayLength(overnightStay) &&
      reachableLocationIds.has(overnightStay.locationId),
  );
}

function buildOvernightStayRows(input: {
  overnightStay: OvernightStayOption | undefined;
  location: LocationOption | undefined;
  locationVersionId: string;
  startingDayIndex: number;
  totalDays: number;
}): TemplatePlanRow[] {
  const { overnightStay, location, locationVersionId, startingDayIndex, totalDays } = input;
  const rows: TemplatePlanRow[] = [];
  const orderedDays = (overnightStay?.days ?? []).slice().sort((left, right) => left.dayOrder - right.dayOrder);

  orderedDays.forEach((overnightStayDay) => {
    const dayIndex = startingDayIndex + overnightStayDay.dayOrder - 1;
    if (dayIndex > totalDays) {
      return;
    }
    rows.push({
      overnightStayId: overnightStay?.id,
      overnightStayDayOrder: overnightStayDay.dayOrder,
      locationId: overnightStay?.locationId,
      locationVersionId,
      dateCellText: `${dayIndex}일차`,
      destinationCellText: formatRouteDestinationCellText({
        locationName: location?.name ?? overnightStay?.title ?? overnightStay?.locationId ?? '연박',
        averageTravelHours: overnightStayDay?.averageTravelHours,
        averageDistanceKm: overnightStayDay?.averageDistanceKm,
      }),
      timeCellText: overnightStayDay?.timeCellText ?? '',
      scheduleCellText: overnightStayDay?.scheduleCellText ?? '',
      lodgingCellText: overnightStayDay?.lodgingCellText ?? '',
      mealCellText: overnightStayDay?.mealCellText ?? '',
    });
  });

  return rows;
}

export function buildAutoRowsFromRoute(input: {
  startLocationId: string;
  startLocationVersionId: string;
  selectedRoute: RouteSelection[];
  filteredSegments: SegmentOption[];
  filteredOvernightStays?: OvernightStayOption[];
  filteredOvernightStayConnections?: OvernightStayConnectionOption[];
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
    filteredOvernightStays = [],
    filteredOvernightStayConnections = [],
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

  const rows: TemplatePlanRow[] = [];
  const startLocation = locationById.get(startLocationId);
  const startVersion = locationVersionById.get(startLocationVersionId);
  const firstDayProfile: LocationTimeBlockProfile = hasEarlyVariant(variantType) ? 'FIRST_DAY_EARLY' : 'FIRST_DAY';

  rows.push({
    locationId: startLocationId,
    locationVersionId: startLocationVersionId,
    dateCellText: '1일차',
    destinationCellText: formatRouteDestinationCellText({
      locationName: startLocation?.name ?? startLocationId,
    }),
    timeCellText: toTimeCellFromTimeBlocks(getLocationTimeBlocks(startVersion, firstDayProfile), {
      firstStartTimeOverride: firstDayTimeOverride,
    }),
    scheduleCellText: toScheduleCellFromTimeBlocks(getLocationTimeBlocks(startVersion, firstDayProfile)),
    lodgingCellText: getBaseLodgingText(startVersion, toFacilityLabel),
    mealCellText: [
      `아침 ${toMealLabel(startVersion?.mealSets[0]?.breakfast)}`,
      `점심 ${toMealLabel(startVersion?.mealSets[0]?.lunch)}`,
      `저녁 ${toMealLabel(startVersion?.mealSets[0]?.dinner)}`,
    ].join('\n'),
  });

  let previousContext: { kind: 'LOCATION'; locationId: string } | { kind: 'OVERNIGHT_STAY'; overnightStayId: string; locationId: string } = {
    kind: 'LOCATION',
    locationId: startLocationId,
  };
  let nextDayIndex = 2;

  for (const stop of selectedRoute) {
    if (nextDayIndex > safeTotalDays) {
      break;
    }

    if (stop.kind === 'OVERNIGHT_STAY') {
      const overnightStay = findOvernightStay(filteredOvernightStays, stop.overnightStayId);
      const location = locationById.get(stop.locationId);
      const overnightStayRows = buildOvernightStayRows({
        overnightStay,
        location,
        locationVersionId: stop.locationVersionId,
        startingDayIndex: nextDayIndex,
        totalDays: safeTotalDays,
      });
      rows.push(...overnightStayRows);
      nextDayIndex += overnightStayRows.length;
      previousContext = {
        kind: 'OVERNIGHT_STAY',
        overnightStayId: stop.overnightStayId,
        locationId: stop.locationId,
      };
      continue;
    }

    const location = locationById.get(stop.locationId);
    const locationVersion = locationVersionById.get(stop.locationVersionId);
    const isLastDay = nextDayIndex === safeTotalDays;
    const variant = resolveSegmentScheduleVariant({
      variantType,
      fromDayIndex: nextDayIndex - 1,
      toDayIndex: nextDayIndex,
      totalDays: safeTotalDays,
    });

    if (previousContext.kind === 'OVERNIGHT_STAY') {
      const connection =
        (stop.overnightStayConnectionId
          ? filteredOvernightStayConnections.find((item) => item.id === stop.overnightStayConnectionId)
          : undefined) ??
        findOvernightStayConnection(filteredOvernightStayConnections, previousContext.overnightStayId, stop.locationId);
      const connectionVersion = resolveOvernightStayConnectionVersion(connection, stop.overnightStayConnectionVersionId);
      rows.push({
        overnightStayConnectionId: connection?.id,
        overnightStayConnectionVersionId: connectionVersion?.id,
        locationId: stop.locationId,
        locationVersionId: stop.locationVersionId,
        dateCellText: `${nextDayIndex}일차`,
        destinationCellText: formatRouteDestinationCellText({
          locationName: location?.name ?? stop.locationId,
          averageTravelHours: connectionVersion?.averageTravelHours,
          averageDistanceKm: connectionVersion?.averageDistanceKm,
        }),
        timeCellText: toTimeCellFromTimeBlocks(getOvernightStayConnectionScheduleTimeBlocks(connectionVersion, variant), {
          lastStartTimeOverride: isLastDay ? lastDayTimeOverride : undefined,
        }),
        scheduleCellText: toScheduleCellFromTimeBlocks(getOvernightStayConnectionScheduleTimeBlocks(connectionVersion, variant)),
        lodgingCellText: getBaseLodgingText(locationVersion, toFacilityLabel),
        mealCellText: [
          `아침 ${toMealLabel(locationVersion?.mealSets[0]?.breakfast)}`,
          `점심 ${toMealLabel(locationVersion?.mealSets[0]?.lunch)}`,
          `저녁 ${toMealLabel(locationVersion?.mealSets[0]?.dinner)}`,
        ].join('\n'),
      });
    } else {
      const segment =
        (stop.segmentId ? filteredSegments.find((item) => item.id === stop.segmentId) : undefined) ??
        findSegment(filteredSegments, previousContext.locationId, stop.locationId);
      const segmentVersion = resolveSegmentVersion(segment, stop.segmentVersionId);
      rows.push({
        segmentId: segment?.id,
        segmentVersionId: segmentVersion?.id,
        locationId: stop.locationId,
        locationVersionId: stop.locationVersionId,
        dateCellText: `${nextDayIndex}일차`,
        destinationCellText: formatRouteDestinationCellText({
          locationName: location?.name ?? stop.locationId,
          averageTravelHours: segmentVersion?.averageTravelHours,
          averageDistanceKm: segmentVersion?.averageDistanceKm,
        }),
        timeCellText: toTimeCellFromTimeBlocks(getSegmentScheduleTimeBlocks(segmentVersion, variant), {
          lastStartTimeOverride: isLastDay ? lastDayTimeOverride : undefined,
        }),
        scheduleCellText: toScheduleCellFromTimeBlocks(getSegmentScheduleTimeBlocks(segmentVersion, variant)),
        lodgingCellText: getBaseLodgingText(locationVersion, toFacilityLabel),
        mealCellText: [
          `아침 ${toMealLabel(locationVersion?.mealSets[0]?.breakfast)}`,
          `점심 ${toMealLabel(locationVersion?.mealSets[0]?.lunch)}`,
          `저녁 ${toMealLabel(locationVersion?.mealSets[0]?.dinner)}`,
        ].join('\n'),
      });
    }

    previousContext = { kind: 'LOCATION', locationId: stop.locationId };
    nextDayIndex += 1;
  }

  while (rows.length < safeTotalDays) {
    rows.push(buildEmptyPlanRow(rows.length + 1));
  }

  return rows;
}

function buildRouteStopsFromSelections(input: {
  startLocationId: string;
  startLocationVersionId: string;
  selectedRoute: RouteSelection[];
}): Array<
  Pick<
    TemplatePlanRow,
    | 'segmentId'
    | 'segmentVersionId'
    | 'overnightStayId'
    | 'overnightStayDayOrder'
    | 'overnightStayConnectionId'
    | 'overnightStayConnectionVersionId'
    | 'locationId'
    | 'locationVersionId'
  >
> {
  const routeStops: Array<
    Pick<
      TemplatePlanRow,
      | 'segmentId'
      | 'segmentVersionId'
      | 'overnightStayId'
      | 'overnightStayDayOrder'
      | 'overnightStayConnectionId'
      | 'overnightStayConnectionVersionId'
      | 'locationId'
      | 'locationVersionId'
    >
  > = [{ locationId: input.startLocationId, locationVersionId: input.startLocationVersionId }];

  input.selectedRoute.forEach((stop) => {
    if (stop.kind === 'OVERNIGHT_STAY') {
      routeStops.push({
        overnightStayId: stop.overnightStayId,
        overnightStayDayOrder: 1,
        locationId: stop.locationId,
        locationVersionId: stop.locationVersionId,
      });
      for (let dayOrder = 2; dayOrder <= stop.stayLength; dayOrder += 1) {
        routeStops.push({
          overnightStayId: stop.overnightStayId,
          overnightStayDayOrder: dayOrder,
          locationId: stop.locationId,
          locationVersionId: stop.locationVersionId,
        });
      }
      return;
    }

    routeStops.push({
      segmentId: stop.segmentId,
      segmentVersionId: stop.segmentVersionId,
      overnightStayConnectionId: stop.overnightStayConnectionId,
      overnightStayConnectionVersionId: stop.overnightStayConnectionVersionId,
      locationId: stop.locationId,
      locationVersionId: stop.locationVersionId,
    });
  });

  return routeStops;
}

export function buildTemplateStopsFromRouteAndRows(input: {
  startLocationId: string;
  startLocationVersionId: string;
  selectedRoute: RouteSelection[];
  planRows: TemplatePlanRow[];
}) {
  const routeStops = buildRouteStopsFromSelections(input);

  return input.planRows.map((row, index) => {
    const routeStop = routeStops[index];
    return {
      dayIndex: index + 1,
      segmentId: routeStop?.segmentId || row.segmentId,
      segmentVersionId: routeStop?.segmentVersionId || row.segmentVersionId,
      overnightStayId: routeStop?.overnightStayId || row.overnightStayId,
      overnightStayDayOrder: routeStop?.overnightStayDayOrder || row.overnightStayDayOrder,
      overnightStayConnectionId: routeStop?.overnightStayConnectionId || row.overnightStayConnectionId,
      overnightStayConnectionVersionId:
        routeStop?.overnightStayConnectionVersionId || row.overnightStayConnectionVersionId,
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

export function buildSelectedRouteFromStops(
  stops: Array<{
    segmentId?: string | null;
    segmentVersionId?: string | null;
    overnightStayId?: string | null;
    overnightStayDayOrder?: number | null;
    overnightStayConnectionId?: string | null;
    overnightStayConnectionVersionId?: string | null;
    locationId?: string | null;
    locationVersionId?: string | null;
  }>,
): RouteSelection[] {
  const route: RouteSelection[] = [];

  for (let index = 0; index < stops.length; index += 1) {
    const stop = stops[index];
    if (!stop) {
      continue;
    }

    if (stop.overnightStayId && stop.overnightStayDayOrder === 1) {
      let stayLength = 1;
      let nextIndex = index + 1;
      while (stops[nextIndex]?.overnightStayId === stop.overnightStayId) {
        stayLength += 1;
        nextIndex += 1;
      }
      route.push({
        kind: 'OVERNIGHT_STAY',
        overnightStayId: stop.overnightStayId,
        stayLength,
        locationId: stop.locationId ?? '',
        locationVersionId: stop.locationVersionId ?? '',
      });
      index += Math.max(stayLength - 1, 0);
      continue;
    }

    if (stop.overnightStayId && stop.overnightStayDayOrder && stop.overnightStayDayOrder > 1) {
      continue;
    }

    route.push({
      kind: 'LOCATION',
      locationId: stop.locationId ?? '',
      locationVersionId: stop.locationVersionId ?? '',
      segmentId: stop.segmentId ?? undefined,
      segmentVersionId: stop.segmentVersionId ?? undefined,
      overnightStayConnectionId: stop.overnightStayConnectionId ?? undefined,
      overnightStayConnectionVersionId: stop.overnightStayConnectionVersionId ?? undefined,
    });
  }

  return route;
}
