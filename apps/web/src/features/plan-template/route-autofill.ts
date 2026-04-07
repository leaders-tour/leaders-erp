import { pickDefaultLocationMealSet, pickFirstDayMealSetByProfile } from '@tour/domain';
import type { MealOption, VariantType } from '../../generated/graphql';
import { formatLocationNameMultiline, toFacilityLabel, toMealLabel } from '../location/display';
import { getBaseLodgingText } from '../lodging-selection/model';
import { buildEmptyPlanRow, buildPlaceholderPlanRows, type TemplatePlanRow } from './editor-utils';

export type SegmentScheduleVariant = 'basic' | 'early' | 'extend' | 'earlyExtend';
export type SegmentVersionKindValue = 'DEFAULT' | 'SEASON' | 'FLIGHT';
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

interface SegmentVersionLodgingOverrideOption {
  isUnspecified: boolean;
  name: string;
  hasElectricity: 'YES' | 'LIMITED' | 'NO';
  hasShower: 'YES' | 'LIMITED' | 'NO';
  hasInternet: 'YES' | 'LIMITED' | 'NO';
}

interface SegmentVersionMealsOverrideOption {
  breakfast: MealOption | null;
  lunch: MealOption | null;
  dinner: MealOption | null;
}

export interface LocationVersionOption {
  id: string;
  versionNumber: number;
  label: string;
  firstDayAverageDistanceKm?: number | null;
  firstDayAverageTravelHours?: number | null;
  firstDayMovementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5' | null;
  lodgings: Array<{
    id: string;
    name: string;
    hasElectricity: 'YES' | 'LIMITED' | 'NO';
    hasShower: 'YES' | 'LIMITED' | 'NO';
    hasInternet: 'YES' | 'LIMITED' | 'NO';
  }>;
  mealSets: Array<{
    id: string;
    setName: string;
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
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5';
  isLongDistance: boolean;
  kind: SegmentVersionKindValue;
  startDate?: string | null;
  endDate?: string | null;
  flightOutTimeBand?: 'EVENING_18_21' | null;
  lodgingOverride?: SegmentVersionLodgingOverrideOption | null;
  mealsOverride?: SegmentVersionMealsOverrideOption | null;
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
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5';
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
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5';
  isLongDistance: boolean;
  kind: SegmentVersionKindValue;
  startDate?: string | null;
  endDate?: string | null;
  flightOutTimeBand?: 'EVENING_18_21' | null;
  lodgingOverride?: SegmentVersionLodgingOverrideOption | null;
  mealsOverride?: SegmentVersionMealsOverrideOption | null;
  sortOrder: number;
  isDefault: boolean;
  scheduleTimeBlocks: TimeBlockOption[];
  earlyScheduleTimeBlocks: TimeBlockOption[];
  extendScheduleTimeBlocks: TimeBlockOption[];
  earlyExtendScheduleTimeBlocks: TimeBlockOption[];
}

export interface MultiDayBlockDayOption {
  id: string;
  dayOrder: number;
  displayLocationId?: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5';
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
}

export interface MultiDayBlockOption {
  id: string;
  regionId: string;
  regionIds: string[];
  locationId: string;
  isNightTrain?: boolean;
  name: string;
  title: string;
  isActive: boolean;
  sortOrder: number;
  days: MultiDayBlockDayOption[];
}

export interface MultiDayBlockConnectionVersionOption {
  id: string;
  multiDayBlockConnectionId: string;
  name: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5';
  isLongDistance: boolean;
  sortOrder: number;
  isDefault: boolean;
  scheduleTimeBlocks: TimeBlockOption[];
  earlyScheduleTimeBlocks: TimeBlockOption[];
  extendScheduleTimeBlocks: TimeBlockOption[];
  earlyExtendScheduleTimeBlocks: TimeBlockOption[];
}

export interface MultiDayBlockConnectionOption {
  id: string;
  regionId: string;
  fromMultiDayBlockId: string;
  toLocationId: string;
  defaultVersionId?: string | null;
  averageDistanceKm: number;
  averageTravelHours: number;
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5';
  isLongDistance?: boolean;
  scheduleTimeBlocks: TimeBlockOption[];
  earlyScheduleTimeBlocks: TimeBlockOption[];
  extendScheduleTimeBlocks: TimeBlockOption[];
  earlyExtendScheduleTimeBlocks: TimeBlockOption[];
  versions?: MultiDayBlockConnectionVersionOption[];
}

interface ResolvedMultiDayBlockConnectionVersionOption {
  id: string;
  multiDayBlockConnectionId: string;
  name: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5';
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
  multiDayBlockConnectionId?: string;
  multiDayBlockConnectionVersionId?: string;
}

/** 내부 정본: 연속 일정 블록 선택. API 호환용 legacy 필드명은 buildRouteStopsFromSelections에서 처리 */
export interface MultiDayBlockRouteSelection {
  kind: 'MULTI_DAY_BLOCK';
  multiDayBlockId: string;
  stayLength: number;
  locationId: string;
  locationVersionId: string;
}

/** @deprecated 내부에서는 MultiDayBlockRouteSelection 사용. 복원 fallback 시에만 참고 */
export interface OvernightStayRouteSelection {
  kind: 'OVERNIGHT_STAY';
  overnightStayId: string;
  stayLength: number;
  locationId: string;
  locationVersionId: string;
}

export type RouteSelection = LocationRouteSelection | MultiDayBlockRouteSelection;
export interface TemplateVariantFlags {
  useEarlyFirstDay?: boolean;
  useExtendLastDay?: boolean;
}

function hasEarlyVariant(variantType: VariantType | undefined): boolean {
  return variantType === 'early' || variantType === 'earlyExtend';
}

function hasExtendVariant(variantType: VariantType | undefined): boolean {
  return variantType === 'extend' || variantType === 'earlyExtend';
}

function resolveTemplateVariantFlags(input: {
  variantType?: VariantType;
  useEarlyFirstDay?: boolean;
  useExtendLastDay?: boolean;
}): Required<TemplateVariantFlags> {
  return {
    useEarlyFirstDay: input.useEarlyFirstDay ?? hasEarlyVariant(input.variantType),
    useExtendLastDay: input.useExtendLastDay ?? hasExtendVariant(input.variantType),
  };
}

function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function formatDistance(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function normalizeDateOnly(value: string): string | undefined {
  const dateText = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? dateText : undefined;
}

function isWithinInclusiveDateRange(targetDate: string, startDate?: string | null, endDate?: string | null): boolean {
  const normalizedStartDate = startDate ? normalizeDateOnly(startDate) : undefined;
  const normalizedEndDate = endDate ? normalizeDateOnly(endDate) : undefined;
  if (!normalizedStartDate || !normalizedEndDate) {
    return false;
  }
  return normalizedStartDate <= targetDate && targetDate <= normalizedEndDate;
}

function parseTimeToMinutes(value: string | null | undefined): number | null {
  const trimmed = value?.trim() ?? '';
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function matchesTimeBand(
  time: string | null | undefined,
  band: ResolvedSegmentVersionOption['flightOutTimeBand'],
): boolean {
  if (!band) {
    return true;
  }

  const minutes = parseTimeToMinutes(time);
  if (minutes === null) {
    return false;
  }

  return band === 'EVENING_18_21' && minutes >= 18 * 60 && minutes <= 21 * 60;
}

export function getRouteDateForDayIndex(startDate: string, dayIndex: number): string | undefined {
  const normalizedStartDate = normalizeDateOnly(startDate);
  if (!normalizedStartDate || dayIndex < 1) {
    return undefined;
  }

  const [yearText, monthText, dayText] = normalizedStartDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined;
  }

  const nextDate = new Date(Date.UTC(year, month - 1, day));
  nextDate.setUTCDate(nextDate.getUTCDate() + (dayIndex - 1));

  const yyyy = nextDate.getUTCFullYear();
  const mm = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(nextDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getOrderedTimeBlocks(timeBlocks: TimeBlockOption[]): TimeBlockOption[] {
  return timeBlocks.slice().sort((a, b) => a.orderIndex - b.orderIndex);
}

function mergeTimeBlockActivities(blocks: TimeBlockOption[]): TimeBlockOption['activities'] {
  const mergedActivities = new Map<string, TimeBlockOption['activities'][number]>();

  blocks.forEach((block) => {
    block.activities
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .forEach((activity) => {
        const key = activity.description.trim() || activity.id;
        if (!mergedActivities.has(key)) {
          mergedActivities.set(key, {
            id: activity.id,
            description: activity.description,
            orderIndex: mergedActivities.size,
          });
        }
      });
  });

  return Array.from(mergedActivities.values());
}

function mergeTimeBlocksForEarlyExtend(
  explicitBlocks: TimeBlockOption[],
  earlyBlocks: TimeBlockOption[],
  extendBlocks: TimeBlockOption[],
): TimeBlockOption[] {
  if (explicitBlocks.length > 0) {
    return explicitBlocks;
  }

  const groupedByStartTime = new Map<string, TimeBlockOption[]>();
  [...getOrderedTimeBlocks(earlyBlocks), ...getOrderedTimeBlocks(extendBlocks)].forEach((block) => {
    const key = block.startTime.trim() || `__empty__:${block.id}`;
    const group = groupedByStartTime.get(key);
    if (group) {
      group.push(block);
      return;
    }
    groupedByStartTime.set(key, [block]);
  });

  return Array.from(groupedByStartTime.entries())
    .map(([startTime, blocks], index) => ({
      id: `merged-early-extend-${index}`,
      startTime: startTime.startsWith('__empty__:') ? '' : startTime,
      orderIndex: index,
      activities: mergeTimeBlockActivities(blocks),
    }))
    .sort((left, right) => {
      const leftMinutes = parseTimeToMinutes(left.startTime);
      const rightMinutes = parseTimeToMinutes(right.startTime);
      if (leftMinutes !== null && rightMinutes !== null && leftMinutes !== rightMinutes) {
        return leftMinutes - rightMinutes;
      }
      if (leftMinutes !== null) {
        return -1;
      }
      if (rightMinutes !== null) {
        return 1;
      }
      return left.orderIndex - right.orderIndex;
    })
    .map((block, blockIndex) => ({
      ...block,
      orderIndex: blockIndex,
      activities: block.activities.map((activity, activityIndex) => ({
        ...activity,
        orderIndex: activityIndex,
      })),
    }));
}

function toTimeCellFromTimeBlocks(
  timeBlocks: TimeBlockOption[],
  options?: {
    firstStartTimeOverride?: string;
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
      const startTime =
        (isFirst && options?.firstStartTimeOverride?.trim()) || timeBlock.startTime;
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
    name: '기본',
    averageDistanceKm: segment.averageDistanceKm,
    averageTravelHours: segment.averageTravelHours,
    movementIntensity: segment.movementIntensity ?? 'LEVEL_1',
    isLongDistance: segment.isLongDistance ?? false,
    kind: 'DEFAULT',
    startDate: undefined,
    endDate: undefined,
    flightOutTimeBand: null,
    lodgingOverride: null,
    mealsOverride: null,
    sortOrder: 0,
    isDefault: true,
    scheduleTimeBlocks: segment.scheduleTimeBlocks,
    earlyScheduleTimeBlocks: segment.earlyScheduleTimeBlocks,
    extendScheduleTimeBlocks: segment.extendScheduleTimeBlocks,
    earlyExtendScheduleTimeBlocks: segment.earlyExtendScheduleTimeBlocks,
  };
}

function buildLegacyDirectMultiDayBlockConnectionVersion(
  connection: MultiDayBlockConnectionOption,
): ResolvedMultiDayBlockConnectionVersionOption {
  return {
    id: `${connection.id}::direct`,
    multiDayBlockConnectionId: connection.id,
    name: '기본',
    averageDistanceKm: connection.averageDistanceKm,
    averageTravelHours: connection.averageTravelHours,
    movementIntensity: connection.movementIntensity ?? 'LEVEL_1',
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
    return mergeTimeBlocksForEarlyExtend(
      segmentVersion.earlyExtendScheduleTimeBlocks ?? [],
      segmentVersion.earlyScheduleTimeBlocks ?? [],
      segmentVersion.extendScheduleTimeBlocks ?? [],
    );
  }
  return segmentVersion.scheduleTimeBlocks ?? [];
}

function getMultiDayBlockConnectionScheduleTimeBlocks(
  connectionVersion: ResolvedMultiDayBlockConnectionVersionOption | undefined,
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

function buildMealsCellText(fields: {
  breakfast: MealOption | null;
  lunch: MealOption | null;
  dinner: MealOption | null;
}): string {
  return [toMealLabel(fields.breakfast), toMealLabel(fields.lunch), toMealLabel(fields.dinner)]
    .filter((line) => line.length > 0)
    .join('\n');
}

export function buildSegmentVersionOverrideLodgingText(
  lodgingOverride: SegmentVersionLodgingOverrideOption | null | undefined,
): string {
  if (!lodgingOverride) {
    return '';
  }

  return getBaseLodgingText(
    {
      lodgings: [
        {
          name: lodgingOverride.name,
          hasElectricity: lodgingOverride.hasElectricity,
          hasShower: lodgingOverride.hasShower,
          hasInternet: lodgingOverride.hasInternet,
        },
      ],
    },
    toFacilityLabel,
  );
}

export function buildSegmentVersionOverrideMealText(
  mealsOverride: SegmentVersionMealsOverrideOption | null | undefined,
): string {
  if (!mealsOverride) {
    return '';
  }

  return buildMealsCellText(mealsOverride);
}

function resolveRouteRowLodgingText(input: {
  locationVersion: LocationVersionOption | undefined;
  segmentVersion: ResolvedSegmentVersionOption | undefined;
}): string {
  const { locationVersion, segmentVersion } = input;
  if (segmentVersion?.kind === 'FLIGHT' && segmentVersion.lodgingOverride) {
    return buildSegmentVersionOverrideLodgingText(segmentVersion.lodgingOverride);
  }
  return getBaseLodgingText(locationVersion, toFacilityLabel);
}

function resolveRouteRowMealText(input: {
  locationVersion: LocationVersionOption | undefined;
  segmentVersion: ResolvedSegmentVersionOption | undefined;
}): string {
  const { locationVersion, segmentVersion } = input;
  if (segmentVersion?.kind === 'FLIGHT' && segmentVersion.mealsOverride) {
    return buildSegmentVersionOverrideMealText(segmentVersion.mealsOverride);
  }
  const set = pickDefaultLocationMealSet(locationVersion?.mealSets ?? []);
  return buildMealsCellText({
    breakfast: (set?.breakfast ?? null) as MealOption | null,
    lunch: (set?.lunch ?? null) as MealOption | null,
    dinner: (set?.dinner ?? null) as MealOption | null,
  });
}

function getMultiDayBlockDay(
  multiDayBlock: MultiDayBlockOption | undefined,
  dayOrder: number,
): MultiDayBlockDayOption | undefined {
  return multiDayBlock?.days.find((day) => day.dayOrder === dayOrder);
}

function getMultiDayBlockLength(
  multiDayBlock: MultiDayBlockOption | undefined,
  fallbackLength = 2,
): number {
  const dayCount = multiDayBlock?.days.length ?? fallbackLength;
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
  | { kind: 'MULTI_DAY_BLOCK'; multiDayBlockId: string; locationId: string } {
  const lastStop = selectedRoute[selectedRoute.length - 1];
  if (!lastStop) {
    return { kind: 'LOCATION', locationId: startLocationId };
  }
  if (lastStop.kind === 'MULTI_DAY_BLOCK') {
    return {
      kind: 'MULTI_DAY_BLOCK',
      multiDayBlockId: lastStop.multiDayBlockId,
      locationId: lastStop.locationId,
    };
  }
  return { kind: 'LOCATION', locationId: lastStop.locationId };
}

export function getRouteSelectionDaySpan(selection: RouteSelection): number {
  return selection.kind === 'MULTI_DAY_BLOCK' ? selection.stayLength : 1;
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
  return version.label;
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

export function resolveSegmentVersionForDate(
  segment: SegmentOption | undefined,
  targetDate: string | undefined,
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

  const normalizedTargetDate = targetDate ? normalizeDateOnly(targetDate) : undefined;
  if (normalizedTargetDate) {
    const matchedByDate = versions.find(
      (version) =>
        version.isDefault !== true &&
        version.kind === 'SEASON' &&
        isWithinInclusiveDateRange(normalizedTargetDate, version.startDate, version.endDate),
    );
    if (matchedByDate) {
      return matchedByDate;
    }
  }

  return resolveSegmentVersion(segment, undefined);
}

export function resolveSegmentVersionForContext(input: {
  segment: SegmentOption | undefined;
  targetDate?: string;
  segmentVersionId?: string;
  flightOutTime?: string;
  isLastRouteLeg?: boolean;
}): ResolvedSegmentVersionOption | undefined {
  const { segment, targetDate, segmentVersionId, flightOutTime, isLastRouteLeg } = input;
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

  if (isLastRouteLeg && flightOutTime?.trim()) {
    const matchedByFlightOutTimeBand = versions.find(
      (version) =>
        version.isDefault !== true &&
        version.kind === 'FLIGHT' &&
        version.flightOutTimeBand &&
        matchesTimeBand(flightOutTime, version.flightOutTimeBand),
    );
    if (matchedByFlightOutTimeBand) {
      return matchedByFlightOutTimeBand;
    }
  }

  return resolveSegmentVersionForDate(segment, targetDate, undefined);
}

export function formatSegmentVersionLabel(version: Pick<ResolvedSegmentVersionOption, 'name'>): string {
  return version.name.trim() || '기본';
}

export function getMultiDayBlockConnectionVersions(
  connection: MultiDayBlockConnectionOption | undefined,
): ResolvedMultiDayBlockConnectionVersionOption[] {
  if (!connection) {
    return [];
  }

  if (!connection.versions || connection.versions.length === 0) {
    return [buildLegacyDirectMultiDayBlockConnectionVersion(connection)];
  }

  return connection.versions.slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getDefaultMultiDayBlockConnectionVersionId(
  connection: MultiDayBlockConnectionOption | undefined,
): string {
  if (!connection) {
    return '';
  }

  return (
    connection.defaultVersionId ??
    getMultiDayBlockConnectionVersions(connection).find((version) => version.isDefault)?.id ??
    getMultiDayBlockConnectionVersions(connection)[0]?.id ??
    ''
  );
}

export function resolveMultiDayBlockConnectionVersion(
  connection: MultiDayBlockConnectionOption | undefined,
  multiDayBlockConnectionVersionId?: string,
): ResolvedMultiDayBlockConnectionVersionOption | undefined {
  const versions = getMultiDayBlockConnectionVersions(connection);
  if (versions.length === 0) {
    return undefined;
  }

  if (multiDayBlockConnectionVersionId) {
    const matched = versions.find((version) => version.id === multiDayBlockConnectionVersionId);
    if (matched) {
      return matched;
    }
  }

  const defaultVersionId = getDefaultMultiDayBlockConnectionVersionId(connection);
  return versions.find((version) => version.id === defaultVersionId) ?? versions[0];
}

export function formatMultiDayBlockConnectionVersionLabel(
  version: Pick<ResolvedMultiDayBlockConnectionVersionOption, 'name'>,
): string {
  return version.name.trim() || '기본';
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

export function findMultiDayBlock(
  filteredMultiDayBlocks: MultiDayBlockOption[],
  multiDayBlockId: string,
): MultiDayBlockOption | undefined {
  return filteredMultiDayBlocks.find((multiDayBlock) => multiDayBlock.id === multiDayBlockId);
}

export function findMultiDayBlockConnection(
  filteredMultiDayBlockConnections: MultiDayBlockConnectionOption[],
  fromMultiDayBlockId: string,
  toLocationId: string,
): MultiDayBlockConnectionOption | undefined {
  return filteredMultiDayBlockConnections.find(
    (connection) => connection.fromMultiDayBlockId === fromMultiDayBlockId && connection.toLocationId === toLocationId,
  );
}

export function buildFirstDayOptions(filteredLocations: LocationOption[]): LocationOption[] {
  return filteredLocations.filter((location) => location.isFirstDayEligible);
}

export function resolveSegmentScheduleVariant(input: {
  variantType?: VariantType;
  useEarlyFirstDay?: boolean;
  useExtendLastDay?: boolean;
  fromDayIndex: number;
  toDayIndex: number;
  totalDays: number;
}): SegmentScheduleVariant {
  const { useEarlyFirstDay, useExtendLastDay } = resolveTemplateVariantFlags(input);
  const sourceContextIsEarly = input.fromDayIndex === 1 && useEarlyFirstDay;
  const targetContextIsExtend = input.toDayIndex === input.totalDays && useExtendLastDay;

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
  targetDate?: string,
): boolean {
  const segmentVersion = resolveSegmentVersionForDate(segment, targetDate, segmentVersionId);
  return getSegmentScheduleTimeBlocks(segmentVersion, variant).length > 0;
}

function hasMultiDayBlockConnectionScheduleForVariant(
  connection: MultiDayBlockConnectionOption | undefined,
  multiDayBlockConnectionVersionId: string | undefined,
  variant: SegmentScheduleVariant,
): boolean {
  const connectionVersion = resolveMultiDayBlockConnectionVersion(connection, multiDayBlockConnectionVersionId);
  return getMultiDayBlockConnectionScheduleTimeBlocks(connectionVersion, variant).length > 0;
}

export function buildNextOptions(input: {
  filteredLocations: LocationOption[];
  filteredSegments: SegmentOption[];
  filteredMultiDayBlockConnections?: MultiDayBlockConnectionOption[];
  startLocationId: string;
  selectedRoute: RouteSelection[];
  totalDays: number;
  variantType?: VariantType;
  useEarlyFirstDay?: boolean;
  useExtendLastDay?: boolean;
  targetDate?: string;
}): LocationOption[] {
  const {
    filteredLocations,
    filteredSegments,
    filteredMultiDayBlockConnections = [],
    selectedRoute,
    startLocationId,
    totalDays,
    variantType,
    useEarlyFirstDay,
    useExtendLastDay,
    targetDate,
  } = input;
  const usedDays = 1 + getConsumedRouteDayCount(selectedRoute);
  if (usedDays >= totalDays) {
    return [];
  }

  const nextDayIndex = usedDays + 1;
  const requiredVariant = resolveSegmentScheduleVariant({
    variantType,
    useEarlyFirstDay,
    useExtendLastDay,
    fromDayIndex: nextDayIndex - 1,
    toDayIndex: nextDayIndex,
    totalDays,
  });
  const isLastDay = nextDayIndex === totalDays;
  const context = getCurrentContext(selectedRoute, startLocationId);

  if (context.kind === 'MULTI_DAY_BLOCK') {
    const toIds = filteredMultiDayBlockConnections
      .filter((connection) => connection.fromMultiDayBlockId === context.multiDayBlockId)
      .filter((connection) => hasMultiDayBlockConnectionScheduleForVariant(connection, undefined, requiredVariant))
      .map((connection) => connection.toLocationId);

    return filteredLocations.filter((location) => toIds.includes(location.id) && (!isLastDay || location.isLastDayEligible));
  }

  const toIds = filteredSegments
    .filter((segment) => segment.fromLocationId === context.locationId)
    .filter((segment) => hasScheduleForVariant(segment, undefined, requiredVariant, targetDate))
    .map((segment) => segment.toLocationId);

  return filteredLocations.filter((location) => toIds.includes(location.id) && (!isLastDay || location.isLastDayEligible));
}

export function buildMultiDayBlockOptions(input: {
  filteredMultiDayBlocks: MultiDayBlockOption[];
  filteredSegments: SegmentOption[];
  startLocationId: string;
  selectedRoute: RouteSelection[];
  totalDays: number;
}): MultiDayBlockOption[] {
  const { filteredMultiDayBlocks, filteredSegments, startLocationId, selectedRoute, totalDays } = input;
  const usedDays = 1 + getConsumedRouteDayCount(selectedRoute);
  const context = getCurrentContext(selectedRoute, startLocationId);
  if (context.kind === 'MULTI_DAY_BLOCK') {
    return [];
  }

  return filteredMultiDayBlocks.filter(
    (multiDayBlock) =>
      multiDayBlock.isActive &&
      totalDays - usedDays >= getMultiDayBlockLength(multiDayBlock),
  );
}

function buildMultiDayBlockRows(input: {
  multiDayBlock: MultiDayBlockOption | undefined;
  location: LocationOption | undefined;
  locationVersionId: string;
  startingDayIndex: number;
  totalDays: number;
  getDefaultVersionIdForLocation?: (locationId: string) => string | undefined;
  locationById?: Map<string, LocationOption>;
}): TemplatePlanRow[] {
  const {
    multiDayBlock,
    location,
    locationVersionId,
    startingDayIndex,
    totalDays,
    getDefaultVersionIdForLocation,
    locationById,
  } = input;
  const rows: TemplatePlanRow[] = [];
  const orderedDays = (multiDayBlock?.days ?? []).slice().sort((left, right) => left.dayOrder - right.dayOrder);

  orderedDays.forEach((multiDayBlockDay) => {
    const dayIndex = startingDayIndex + multiDayBlockDay.dayOrder - 1;
    if (dayIndex > totalDays) {
      return;
    }
    const displayLocationId = multiDayBlockDay.displayLocationId ?? multiDayBlock?.locationId;
    const rowLocationId = displayLocationId ?? multiDayBlock?.locationId;
    const rowLocationVersionId =
      (rowLocationId && getDefaultVersionIdForLocation?.(rowLocationId)) ??
      (rowLocationId && locationById?.get(rowLocationId)?.defaultVersionId) ??
      (rowLocationId && locationById?.get(rowLocationId)?.variations?.[0]?.id) ??
      locationVersionId;
    const rowLocation = rowLocationId ? locationById?.get(rowLocationId) : location;
    rows.push({
      rowType: 'MAIN',
      overnightStayId: multiDayBlock?.id,
      overnightStayDayOrder: multiDayBlockDay.dayOrder,
      multiDayBlockId: multiDayBlock?.id,
      multiDayBlockDayOrder: multiDayBlockDay.dayOrder,
      locationId: rowLocationId,
      locationVersionId: rowLocationVersionId,
      dateCellText: `${dayIndex}일차`,
      destinationCellText: formatRouteDestinationCellText({
        locationName: rowLocation?.name ?? location?.name ?? multiDayBlock?.title ?? multiDayBlock?.locationId ?? '블록',
        averageTravelHours: multiDayBlockDay?.averageTravelHours,
        averageDistanceKm: multiDayBlockDay?.averageDistanceKm,
      }),
      movementIntensity: multiDayBlockDay?.movementIntensity,
      timeCellText: multiDayBlockDay?.timeCellText ?? '',
      scheduleCellText: multiDayBlockDay?.scheduleCellText ?? '',
      lodgingCellText: multiDayBlockDay?.lodgingCellText ?? '',
      mealCellText: multiDayBlockDay?.mealCellText ?? '',
    });
  });

  return rows;
}

export function buildAutoRowsFromRoute(input: {
  startLocationId: string;
  startLocationVersionId: string;
  selectedRoute: RouteSelection[];
  filteredSegments: SegmentOption[];
  filteredMultiDayBlocks?: MultiDayBlockOption[];
  filteredMultiDayBlockConnections?: MultiDayBlockConnectionOption[];
  locationById: Map<string, LocationOption>;
  locationVersionById: Map<string, LocationVersionOption>;
  totalDays: number;
  variantType?: VariantType;
  useEarlyFirstDay?: boolean;
  useExtendLastDay?: boolean;
  travelStartDate?: string;
  flightOutTime?: string;
  firstDayTimeOverride?: string;
}): TemplatePlanRow[] {
  const {
    startLocationId,
    startLocationVersionId,
    selectedRoute,
    filteredSegments,
    filteredMultiDayBlocks = [],
    filteredMultiDayBlockConnections = [],
    locationById,
    locationVersionById,
    totalDays,
    variantType,
    useEarlyFirstDay,
    useExtendLastDay,
    travelStartDate,
    flightOutTime,
    firstDayTimeOverride,
  } = input;
  const safeTotalDays = Math.max(2, totalDays);

  if (!startLocationId || !startLocationVersionId) {
    return buildPlaceholderPlanRows(safeTotalDays);
  }

  const rows: TemplatePlanRow[] = [];
  const startLocation = locationById.get(startLocationId);
  const startVersion = locationVersionById.get(startLocationVersionId);
  const resolvedFlags = resolveTemplateVariantFlags({ variantType, useEarlyFirstDay, useExtendLastDay });
  const firstDayProfile: LocationTimeBlockProfile = resolvedFlags.useEarlyFirstDay ? 'FIRST_DAY_EARLY' : 'FIRST_DAY';

  rows.push({
    rowType: 'MAIN',
    locationId: startLocationId,
    locationVersionId: startLocationVersionId,
    dateCellText: '1일차',
    destinationCellText: formatRouteDestinationCellText({
      locationName: startLocation?.name ?? startLocationId,
      averageTravelHours: startVersion?.firstDayAverageTravelHours,
      averageDistanceKm: startVersion?.firstDayAverageDistanceKm,
    }),
    movementIntensity: startVersion?.firstDayMovementIntensity ?? null,
    timeCellText: toTimeCellFromTimeBlocks(getLocationTimeBlocks(startVersion, firstDayProfile), {
      firstStartTimeOverride: firstDayTimeOverride,
    }),
    scheduleCellText: toScheduleCellFromTimeBlocks(getLocationTimeBlocks(startVersion, firstDayProfile)),
    lodgingCellText: getBaseLodgingText(startVersion, toFacilityLabel),
    mealCellText: (() => {
      const set = pickFirstDayMealSetByProfile(startVersion?.mealSets ?? [], firstDayProfile);
      return buildMealsCellText({
        breakfast: (set?.breakfast ?? null) as MealOption | null,
        lunch: (set?.lunch ?? null) as MealOption | null,
        dinner: (set?.dinner ?? null) as MealOption | null,
      });
    })(),
  });

  let previousContext: { kind: 'LOCATION'; locationId: string } | { kind: 'MULTI_DAY_BLOCK'; multiDayBlockId: string; locationId: string } = {
    kind: 'LOCATION',
    locationId: startLocationId,
  };
  let nextDayIndex = 2;

  for (const stop of selectedRoute) {
    if (nextDayIndex > safeTotalDays) {
      break;
    }

    if (stop.kind === 'MULTI_DAY_BLOCK') {
      const multiDayBlock = findMultiDayBlock(filteredMultiDayBlocks, stop.multiDayBlockId);
      const location = locationById.get(stop.locationId);
      const multiDayBlockRows = buildMultiDayBlockRows({
        multiDayBlock,
        location,
        locationVersionId: stop.locationVersionId,
        startingDayIndex: nextDayIndex,
        totalDays: safeTotalDays,
        locationById,
      });
      rows.push(...multiDayBlockRows);
      nextDayIndex += multiDayBlockRows.length;
      previousContext = {
        kind: 'MULTI_DAY_BLOCK',
        multiDayBlockId: stop.multiDayBlockId,
        locationId: stop.locationId,
      };
      continue;
    }

    const location = locationById.get(stop.locationId);
    const locationVersion = locationVersionById.get(stop.locationVersionId);
    const variant = resolveSegmentScheduleVariant({
      variantType,
      useEarlyFirstDay,
      useExtendLastDay,
      fromDayIndex: nextDayIndex - 1,
      toDayIndex: nextDayIndex,
      totalDays: safeTotalDays,
    });

    if (previousContext.kind === 'MULTI_DAY_BLOCK') {
      const connection =
        (stop.multiDayBlockConnectionId
          ? filteredMultiDayBlockConnections.find((item) => item.id === stop.multiDayBlockConnectionId)
          : undefined) ??
        findMultiDayBlockConnection(filteredMultiDayBlockConnections, previousContext.multiDayBlockId, stop.locationId);
      const connectionVersion = resolveMultiDayBlockConnectionVersion(connection, stop.multiDayBlockConnectionVersionId);
      rows.push({
        rowType: 'MAIN',
        multiDayBlockConnectionId: connection?.id,
        multiDayBlockConnectionVersionId: connectionVersion?.id,
        locationId: stop.locationId,
        locationVersionId: stop.locationVersionId,
        dateCellText: `${nextDayIndex}일차`,
        destinationCellText: formatRouteDestinationCellText({
          locationName: location?.name ?? stop.locationId,
          averageTravelHours: connectionVersion?.averageTravelHours,
          averageDistanceKm: connectionVersion?.averageDistanceKm,
        }),
        movementIntensity: connectionVersion?.movementIntensity,
        timeCellText: toTimeCellFromTimeBlocks(getMultiDayBlockConnectionScheduleTimeBlocks(connectionVersion, variant)),
        scheduleCellText: toScheduleCellFromTimeBlocks(getMultiDayBlockConnectionScheduleTimeBlocks(connectionVersion, variant)),
        lodgingCellText: getBaseLodgingText(locationVersion, toFacilityLabel),
        mealCellText: (() => {
          const set = pickDefaultLocationMealSet(locationVersion?.mealSets ?? []);
          return buildMealsCellText({
            breakfast: (set?.breakfast ?? null) as MealOption | null,
            lunch: (set?.lunch ?? null) as MealOption | null,
            dinner: (set?.dinner ?? null) as MealOption | null,
          });
        })(),
      });
    } else {
      const segment =
        (stop.segmentId ? filteredSegments.find((item) => item.id === stop.segmentId) : undefined) ??
        findSegment(filteredSegments, previousContext.locationId, stop.locationId);
      const segmentVersion = resolveSegmentVersionForContext({
        segment,
        targetDate: travelStartDate ? getRouteDateForDayIndex(travelStartDate, nextDayIndex) : undefined,
        segmentVersionId: stop.segmentVersionId,
        flightOutTime,
        isLastRouteLeg: nextDayIndex === safeTotalDays,
      });
      rows.push({
        rowType: 'MAIN',
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
        movementIntensity: segmentVersion?.movementIntensity,
        timeCellText: toTimeCellFromTimeBlocks(getSegmentScheduleTimeBlocks(segmentVersion, variant)),
        scheduleCellText: toScheduleCellFromTimeBlocks(getSegmentScheduleTimeBlocks(segmentVersion, variant)),
        lodgingCellText: resolveRouteRowLodgingText({ locationVersion, segmentVersion }),
        mealCellText: resolveRouteRowMealText({ locationVersion, segmentVersion }),
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
    | 'multiDayBlockId'
    | 'multiDayBlockDayOrder'
    | 'multiDayBlockConnectionId'
    | 'multiDayBlockConnectionVersionId'
    | 'locationId'
    | 'locationVersionId'
  >
> {
  const routeStops: Array<
    Pick<
      TemplatePlanRow,
      | 'segmentId'
      | 'segmentVersionId'
      | 'multiDayBlockId'
      | 'multiDayBlockDayOrder'
      | 'multiDayBlockConnectionId'
      | 'multiDayBlockConnectionVersionId'
      | 'locationId'
      | 'locationVersionId'
    >
  > = [{ locationId: input.startLocationId, locationVersionId: input.startLocationVersionId }];

  input.selectedRoute.forEach((stop) => {
    if (stop.kind === 'MULTI_DAY_BLOCK') {
      const blockId = stop.multiDayBlockId;
      routeStops.push({
        multiDayBlockId: blockId,
        multiDayBlockDayOrder: 1,
        locationId: stop.locationId,
        locationVersionId: stop.locationVersionId,
      });
      for (let dayOrder = 2; dayOrder <= stop.stayLength; dayOrder += 1) {
        routeStops.push({
          multiDayBlockId: blockId,
          multiDayBlockDayOrder: dayOrder,
          locationId: stop.locationId,
          locationVersionId: stop.locationVersionId,
        });
      }
      return;
    }

    routeStops.push({
      segmentId: stop.segmentId,
      segmentVersionId: stop.segmentVersionId,
      multiDayBlockConnectionId: stop.multiDayBlockConnectionId,
      multiDayBlockConnectionVersionId: stop.multiDayBlockConnectionVersionId,
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
      multiDayBlockId: routeStop?.multiDayBlockId || row.multiDayBlockId,
      multiDayBlockDayOrder: routeStop?.multiDayBlockDayOrder ?? row.multiDayBlockDayOrder,
      multiDayBlockConnectionId: routeStop?.multiDayBlockConnectionId || row.multiDayBlockConnectionId,
      multiDayBlockConnectionVersionId:
        routeStop?.multiDayBlockConnectionVersionId || row.multiDayBlockConnectionVersionId,
      locationId: row.locationId ?? routeStop?.locationId ?? undefined,
      locationVersionId: row.locationVersionId ?? routeStop?.locationVersionId ?? undefined,
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
    multiDayBlockId?: string | null;
    multiDayBlockDayOrder?: number | null;
    multiDayBlockConnectionId?: string | null;
    multiDayBlockConnectionVersionId?: string | null;
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

    const blockId = stop.multiDayBlockId ?? stop.overnightStayId;
    const dayOrder = stop.multiDayBlockDayOrder ?? stop.overnightStayDayOrder;
    if (blockId && dayOrder === 1) {
      let stayLength = 1;
      let nextIndex = index + 1;
      while ((stops[nextIndex]?.multiDayBlockId ?? stops[nextIndex]?.overnightStayId) === blockId) {
        stayLength += 1;
        nextIndex += 1;
      }
      const lastBlockStop = stops[Math.max(nextIndex - 1, index)] ?? stop;
      route.push({
        kind: 'MULTI_DAY_BLOCK',
        multiDayBlockId: blockId,
        stayLength,
        locationId: lastBlockStop.locationId ?? stop.locationId ?? '',
        locationVersionId: lastBlockStop.locationVersionId ?? stop.locationVersionId ?? '',
      });
      index += Math.max(stayLength - 1, 0);
      continue;
    }

    if (blockId && dayOrder != null && dayOrder > 1) {
      continue;
    }

    route.push({
      kind: 'LOCATION',
      locationId: stop.locationId ?? '',
      locationVersionId: stop.locationVersionId ?? '',
      segmentId: stop.segmentId ?? undefined,
      segmentVersionId: stop.segmentVersionId ?? undefined,
      multiDayBlockConnectionId: stop.multiDayBlockConnectionId ?? undefined,
      multiDayBlockConnectionVersionId: stop.multiDayBlockConnectionVersionId ?? undefined,
    });
  }

  return route;
}
