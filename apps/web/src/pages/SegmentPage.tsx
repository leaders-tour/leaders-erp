import { gql, useQuery } from '@apollo/client';
import { Button, Card, Input, Table, Td, Textarea, Th } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MealOption } from '../generated/graphql';
import {
  calculateMovementIntensityByHours,
  getMovementIntensityMeta,
} from '../features/estimate/model/movement-intensity';
import { formatLocationNameInline, includesLocationNameKeyword } from '../features/location/display';
import type { FacilityAvailability } from '../features/location/hooks';
import {
  useSegmentCrud,
  type ConnectionSourceType,
  type FlightTimeBandValue,
  type SegmentRow,
  type SegmentTimeSlotFormInput,
  type SegmentVersionFormInput,
  type SegmentVersionKindValue,
  type SegmentVersionLodgingOverrideFormInput,
  type SegmentVersionMealsOverrideFormInput,
} from '../features/segment/hooks';
import { RegionNameChip } from '../features/region/region-name-chip';
import { ConnectionSubNav } from '../features/segment/sub-nav';

const LOCATIONS_QUERY = gql`
  query SegmentLocations {
    locations {
      id
      regionId
      regionName
      name
      isFirstDayEligible
      isLastDayEligible
    }
  }
`;

const MULTI_DAY_BLOCKS_QUERY = gql`
  query SegmentMultiDayBlocks {
    multiDayBlocks(activeOnly: true) {
      id
      title
      regionId
      regionIds
      region {
        id
        name
      }
    }
  }
`;

const DEFAULT_SLOT_TIMES = ['08:00', '12:00', '18:00'] as const;
const TIME_SLOT_PASTE_HELPER_PLACEHOLDER = {
  timeCellText: '08:00\n12:00\n-\n18:00',
  scheduleCellText: '출발지 출발\n이동 중 점심식사\n도착지 도착 후 일정 진행\n숙소 체크인 또는 자유시간',
} as const;
const FACILITY_OPTIONS: Array<{ value: FacilityAvailability; label: string }> = [
  { value: 'YES', label: 'O' },
  { value: 'LIMITED', label: '제한' },
  { value: 'NO', label: 'X' },
];
const MEAL_OPTIONS: Array<{ value: MealOption; label: string }> = [
  { value: MealOption.CampMeal, label: '캠프식' },
  { value: MealOption.HotelBreakfast, label: '호텔조식' },
  { value: MealOption.LocalMeal, label: '현지식' },
  { value: MealOption.LocalRestaurant, label: '현지식당' },
  { value: MealOption.ShabuShabu, label: '샤브샤브' },
  { value: MealOption.PorkParty, label: '삼겹살파티' },
  { value: MealOption.Horhog, label: '허르헉' },
  { value: MealOption.Shashlik, label: '샤슬릭' },
];
const SEGMENT_FLIGHT_OUT_TIME_BAND_OPTIONS: Array<{ value: FlightTimeBandValue; label: string }> = [
  { value: 'EVENING_18_21', label: '18:00 ~ 21:00' },
];

type TimeSlotPasteHelperValue = {
  timeCellText: string;
  scheduleCellText: string;
};

interface LocationRow {
  id: string;
  regionId: string;
  regionName: string;
  name: string[];
  isFirstDayEligible: boolean;
  isLastDayEligible: boolean;
}

interface MultiDayBlockRow {
  id: string;
  title: string;
  regionId: string;
  regionIds: string[];
  region: {
    id: string;
    name: string;
  };
}

interface SegmentFormState {
  sourceType: ConnectionSourceType;
  fromLocationId: string;
  fromMultiDayBlockId: string;
  toLocationId: string;
  averageDistanceKm: string;
  averageTravelHours: string;
  isLongDistance: boolean;
  timeSlots: SegmentTimeSlotFormInput[];
  earlyTimeSlots: SegmentTimeSlotFormInput[];
  extendTimeSlots: SegmentTimeSlotFormInput[];
  earlyExtendTimeSlots: SegmentTimeSlotFormInput[];
  earlySameAsBasic: boolean;
  versions: SegmentVersionDraft[];
}

interface SegmentVersionDraft {
  clientId: string;
  name: string;
  averageDistanceKm: string;
  averageTravelHours: string;
  isLongDistance: boolean;
  kind: Exclude<SegmentVersionKindValue, 'DEFAULT'>;
  startDate: string;
  endDate: string;
  flightOutTimeBand: '' | FlightTimeBandValue;
  lodgingOverride: SegmentVersionLodgingOverrideFormInput;
  mealsOverride: SegmentVersionMealsOverrideFormInput;
  timeSlots: SegmentTimeSlotFormInput[];
  earlyTimeSlots: SegmentTimeSlotFormInput[];
  extendTimeSlots: SegmentTimeSlotFormInput[];
  earlyExtendTimeSlots: SegmentTimeSlotFormInput[];
  earlySameAsBasic: boolean;
}

function createTimeSlot(startTime: string): SegmentTimeSlotFormInput {
  return {
    startTime,
    activities: [''],
  };
}

function createDefaultTimeSlots(): SegmentTimeSlotFormInput[] {
  return DEFAULT_SLOT_TIMES.map((time) => createTimeSlot(time));
}

function createEmptyPasteHelperValue(): TimeSlotPasteHelperValue {
  return {
    timeCellText: '',
    scheduleCellText: '',
  };
}

function createDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isPersistedVersionDraft(clientId: string): boolean {
  return !clientId.startsWith('draft-');
}

function createEmptyLodgingOverride(): SegmentVersionLodgingOverrideFormInput {
  return {
    isUnspecified: false,
    name: '',
    hasElectricity: 'YES',
    hasShower: 'YES',
    hasInternet: 'YES',
  };
}

function createFixedUnspecifiedLodgingOverride(): SegmentVersionLodgingOverrideFormInput {
  return {
    ...createEmptyLodgingOverride(),
    isUnspecified: true,
  };
}

function createEmptyMealsOverride(): SegmentVersionMealsOverrideFormInput {
  return {
    breakfast: null,
    lunch: null,
    dinner: null,
  };
}

function createVersionDraft(): SegmentVersionDraft {
  return {
    clientId: createDraftId(),
    name: '',
    averageDistanceKm: '',
    averageTravelHours: '',
    isLongDistance: false,
    kind: 'SEASON',
    startDate: '',
    endDate: '',
    flightOutTimeBand: '',
    lodgingOverride: createEmptyLodgingOverride(),
    mealsOverride: createEmptyMealsOverride(),
    timeSlots: createDefaultTimeSlots(),
    earlyTimeSlots: createDefaultTimeSlots(),
    extendTimeSlots: createDefaultTimeSlots(),
    earlyExtendTimeSlots: createDefaultTimeSlots(),
    earlySameAsBasic: false,
  };
}

function cloneTimeSlotDrafts(timeSlots: SegmentTimeSlotFormInput[]): SegmentTimeSlotFormInput[] {
  return timeSlots.map((slot) => ({
    startTime: slot.startTime,
    activities: [...slot.activities],
  }));
}

function timeSlotsAreEqual(a: SegmentTimeSlotFormInput[], b: SegmentTimeSlotFormInput[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((slot, i) => {
    const other = b[i]!;
    if (slot.startTime !== other.startTime) return false;
    if (slot.activities.length !== other.activities.length) return false;
    return slot.activities.every((act, j) => act === other.activities[j]);
  });
}

function createVersionDraftFromPrevious(previous: SegmentVersionDraft | undefined): SegmentVersionDraft {
  if (!previous) {
    return createVersionDraft();
  }

  return {
    ...previous,
    clientId: createDraftId(),
    lodgingOverride: { ...previous.lodgingOverride },
    mealsOverride: { ...previous.mealsOverride },
    timeSlots: cloneTimeSlotDrafts(previous.timeSlots),
    earlyTimeSlots: cloneTimeSlotDrafts(previous.earlyTimeSlots),
    extendTimeSlots: cloneTimeSlotDrafts(previous.extendTimeSlots),
    earlyExtendTimeSlots: cloneTimeSlotDrafts(previous.earlyExtendTimeSlots),
    earlySameAsBasic: previous.earlySameAsBasic,
  };
}

function createVersionDraftFromPreviousWithKind(
  previous: SegmentVersionDraft | undefined,
  kind: SegmentVersionDraft['kind'],
): SegmentVersionDraft {
  const next = createVersionDraftFromPrevious(previous);
  if (kind === 'FLIGHT') {
    return {
      ...next,
      kind,
      flightOutTimeBand: 'EVENING_18_21',
      lodgingOverride: createFixedUnspecifiedLodgingOverride(),
    };
  }
  return {
    ...next,
    kind,
    flightOutTimeBand: '',
    lodgingOverride: createEmptyLodgingOverride(),
    mealsOverride: createEmptyMealsOverride(),
  };
}

function createVersionDraftFromBase(base: Pick<
  SegmentFormState,
  'averageDistanceKm' | 'averageTravelHours' | 'isLongDistance' | 'timeSlots' | 'earlyTimeSlots' | 'extendTimeSlots' | 'earlyExtendTimeSlots' | 'earlySameAsBasic'
>): SegmentVersionDraft {
  return {
    ...createVersionDraft(),
    averageDistanceKm: base.averageDistanceKm,
    averageTravelHours: base.averageTravelHours,
    isLongDistance: base.isLongDistance,
    timeSlots: cloneTimeSlotDrafts(base.timeSlots),
    earlyTimeSlots: cloneTimeSlotDrafts(base.earlyTimeSlots),
    extendTimeSlots: cloneTimeSlotDrafts(base.extendTimeSlots),
    earlyExtendTimeSlots: cloneTimeSlotDrafts(base.earlyExtendTimeSlots),
    earlySameAsBasic: base.earlySameAsBasic,
  };
}

function createVersionDraftFromBaseWithKind(
  base: Pick<
    SegmentFormState,
    'averageDistanceKm' | 'averageTravelHours' | 'isLongDistance' | 'timeSlots' | 'earlyTimeSlots' | 'extendTimeSlots' | 'earlyExtendTimeSlots' | 'earlySameAsBasic'
  >,
  kind: SegmentVersionDraft['kind'],
): SegmentVersionDraft {
  const draft = createVersionDraftFromBase(base);
  if (kind === 'FLIGHT') {
    return {
      ...draft,
      kind,
      flightOutTimeBand: 'EVENING_18_21',
      lodgingOverride: createFixedUnspecifiedLodgingOverride(),
    };
  }
  return {
    ...draft,
    kind,
  };
}

function replaceVersionDraftsByKind(
  allVersions: SegmentVersionDraft[],
  nextVersions: SegmentVersionDraft[],
  kind: SegmentVersionDraft['kind'],
): SegmentVersionDraft[] {
  const otherVersions = allVersions.filter((version) => version.kind !== kind);
  const normalizedNextVersions = kind === 'FLIGHT' ? nextVersions.slice(0, 1) : nextVersions;
  if (kind === 'SEASON') {
    return [...normalizedNextVersions, ...otherVersions];
  }
  return [...otherVersions, ...normalizedNextVersions];
}

function sanitizeLodgingOverride(
  value: SegmentVersionLodgingOverrideFormInput | null | undefined,
): SegmentVersionLodgingOverrideFormInput {
  return {
    isUnspecified: value?.isUnspecified ?? false,
    name: value?.name ?? '',
    hasElectricity: value?.hasElectricity ?? 'YES',
    hasShower: value?.hasShower ?? 'YES',
    hasInternet: value?.hasInternet ?? 'YES',
  };
}

function sanitizeFlightLodgingOverride(
  value: SegmentVersionLodgingOverrideFormInput | null | undefined,
): SegmentVersionLodgingOverrideFormInput {
  return {
    ...createFixedUnspecifiedLodgingOverride(),
    ...sanitizeLodgingOverride(value),
    isUnspecified: true,
    name: '',
  };
}

function sanitizeMealsOverride(
  value: SegmentVersionMealsOverrideFormInput | null | undefined,
): SegmentVersionMealsOverrideFormInput {
  return {
    breakfast: value?.breakfast ?? null,
    lunch: value?.lunch ?? null,
    dinner: value?.dinner ?? null,
  };
}

function hasLodgingOverrideValue(value: SegmentVersionLodgingOverrideFormInput): boolean {
  return value.isUnspecified || value.name.trim().length > 0;
}

function hasMealsOverrideValue(value: SegmentVersionMealsOverrideFormInput): boolean {
  return value.breakfast != null || value.lunch != null || value.dinner != null;
}

function toAlternativeVersionKind(kind: SegmentRow['versions'][number]['kind'] | null | undefined): SegmentVersionDraft['kind'] {
  return kind === 'FLIGHT' ? 'FLIGHT' : 'SEASON';
}

function getVersionKindLabel(kind: SegmentVersionDraft['kind'] | SegmentRow['versions'][number]['kind']): string {
  return kind === 'FLIGHT' ? '항공권버전' : '시즌버전';
}

function getFlightTimeBandLabel(value: FlightTimeBandValue | null | undefined): string {
  if (!value) {
    return '';
  }
  return SEGMENT_FLIGHT_OUT_TIME_BAND_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function createEmptyForm(): SegmentFormState {
  return {
    sourceType: 'LOCATION',
    fromLocationId: '',
    fromMultiDayBlockId: '',
    toLocationId: '',
    averageDistanceKm: '',
    averageTravelHours: '',
    isLongDistance: false,
    timeSlots: createDefaultTimeSlots(),
    earlyTimeSlots: createDefaultTimeSlots(),
    extendTimeSlots: createDefaultTimeSlots(),
    earlyExtendTimeSlots: createDefaultTimeSlots(),
    earlySameAsBasic: false,
    versions: [],
  };
}

function formatFromSourceLabel(input: {
  row: Pick<SegmentRow, 'sourceType' | 'fromLocationId' | 'fromMultiDayBlockTitle' | 'fromMultiDayBlockId'>;
  locationById: Map<string, LocationRow>;
}): string {
  if (input.row.sourceType === 'MULTI_DAY_BLOCK') {
    return input.row.fromMultiDayBlockTitle ?? input.row.fromMultiDayBlockId ?? '-';
  }
  return formatLocationNameInline(input.locationById.get(input.row.fromLocationId ?? '')?.name ?? [input.row.fromLocationId ?? '-']);
}

function buildFlightVersionName(fromLabel: string, toLabel: string): string {
  return `${fromLabel}-${toLabel} 항공권버전`;
}

function getNextSlotTime(timeSlots: SegmentTimeSlotFormInput[]): string {
  const last = timeSlots[timeSlots.length - 1];
  if (!last || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(last.startTime)) {
    return '';
  }

  const [hours = 0, minutes = 0] = last.startTime.split(':').map(Number);
  const nextTotalMinutes = (hours * 60 + minutes + 60) % (24 * 60);
  return `${String(Math.floor(nextTotalMinutes / 60)).padStart(2, '0')}:${String(nextTotalMinutes % 60).padStart(2, '0')}`;
}

function parseSegmentTimeSlots(timeCellText: string, scheduleCellText: string): SegmentTimeSlotFormInput[] {
  const timeLines = timeCellText.split(/\r?\n/);
  const scheduleLines = scheduleCellText.split(/\r?\n/);
  const lineCount = Math.max(timeLines.length, scheduleLines.length);
  const slots: SegmentTimeSlotFormInput[] = [];

  for (let index = 0; index < lineCount; index += 1) {
    const timeLine = timeLines[index]?.trim() ?? '';
    const scheduleLine = scheduleLines[index] ?? '';

    if (timeLine && timeLine !== '-') {
      slots.push({
        startTime: timeLine,
        activities: [scheduleLine],
      });
      continue;
    }

    const currentSlot = slots[slots.length - 1];
    if (!currentSlot) {
      if (scheduleLine.trim()) {
        slots.push({
          startTime: '',
          activities: [scheduleLine],
        });
      }
      continue;
    }

    currentSlot.activities.push(scheduleLine);
  }

  if (slots.length === 0) {
    return [createTimeSlot('')];
  }

  return slots.map((slot) => ({
    ...slot,
    activities: slot.activities.length > 0 ? slot.activities : [''],
  }));
}

function toFormTimeSlots(
  timeBlocks:
    | SegmentRow['scheduleTimeBlocks']
    | SegmentRow['earlyScheduleTimeBlocks']
    | SegmentRow['extendScheduleTimeBlocks']
    | SegmentRow['earlyExtendScheduleTimeBlocks']
    | SegmentRow['versions'][number]['scheduleTimeBlocks']
    | SegmentRow['versions'][number]['earlyScheduleTimeBlocks']
    | SegmentRow['versions'][number]['extendScheduleTimeBlocks']
    | SegmentRow['versions'][number]['earlyExtendScheduleTimeBlocks']
    | undefined,
): SegmentTimeSlotFormInput[] {
  if (!timeBlocks || timeBlocks.length === 0) {
    return createDefaultTimeSlots();
  }

  return timeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((timeBlock) => ({
      startTime: timeBlock.startTime,
      activities:
        timeBlock.activities.length > 0
          ? timeBlock.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex).map((activity) => activity.description)
          : [''],
    }));
}

function buildScheduleLines(
  timeBlocks:
    | SegmentRow['scheduleTimeBlocks']
    | SegmentRow['earlyScheduleTimeBlocks']
    | SegmentRow['extendScheduleTimeBlocks']
    | SegmentRow['earlyExtendScheduleTimeBlocks']
    | SegmentRow['versions'][number]['scheduleTimeBlocks']
    | SegmentRow['versions'][number]['earlyScheduleTimeBlocks']
    | SegmentRow['versions'][number]['extendScheduleTimeBlocks']
    | SegmentRow['versions'][number]['earlyExtendScheduleTimeBlocks']
    | undefined,
): Array<{ time: string; activity: string }> {
  if (!timeBlocks || timeBlocks.length === 0) {
    return [];
  }

  return timeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((timeBlock) => {
      const activities = timeBlock.activities
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((activity) => activity.description.trim())
        .filter((activity) => activity.length > 0);

      if (activities.length === 0) {
        return [{ time: timeBlock.startTime, activity: '-' }];
      }

      return activities.map((activity, index) => ({
        time: index === 0 ? timeBlock.startTime : '-',
        activity,
      }));
    });
}

function toVersionDrafts(segment: SegmentRow | undefined): SegmentVersionDraft[] {
  if (!segment || segment.versions.length === 0) {
    return [];
  }

  let hasFlightVersion = false;
  return segment.versions
    .filter((version) => !version.isDefault)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((version) => {
      if (version.kind !== 'FLIGHT') {
        return true;
      }
      if (hasFlightVersion) {
        return false;
      }
      hasFlightVersion = true;
      return true;
    })
    .map((version) => ({
      clientId: version.id,
      name: version.name,
      averageDistanceKm: String(version.averageDistanceKm),
      averageTravelHours: String(version.averageTravelHours),
      isLongDistance: version.isLongDistance,
      kind: toAlternativeVersionKind(version.kind),
      startDate: version.startDate?.slice(0, 10) ?? '',
      endDate: version.endDate?.slice(0, 10) ?? '',
      flightOutTimeBand: version.flightOutTimeBand ?? '',
      lodgingOverride: version.kind === 'FLIGHT' && version.lodgingOverride
        ? sanitizeFlightLodgingOverride(version.lodgingOverride)
        : createEmptyLodgingOverride(),
      mealsOverride: version.kind === 'FLIGHT' && version.mealsOverride
        ? sanitizeMealsOverride(version.mealsOverride)
        : createEmptyMealsOverride(),
      timeSlots: toFormTimeSlots(version.scheduleTimeBlocks),
      earlyTimeSlots: toFormTimeSlots(version.earlyScheduleTimeBlocks),
      extendTimeSlots: toFormTimeSlots(version.extendScheduleTimeBlocks),
      earlyExtendTimeSlots: toFormTimeSlots(version.earlyExtendScheduleTimeBlocks),
      earlySameAsBasic: timeSlotsAreEqual(
        toFormTimeSlots(version.scheduleTimeBlocks),
        toFormTimeSlots(version.earlyScheduleTimeBlocks),
      ),
    }));
}

function buildVariantTimeSlotInput(
  value: {
    timeSlots: SegmentTimeSlotFormInput[];
    earlyTimeSlots: SegmentTimeSlotFormInput[];
    extendTimeSlots: SegmentTimeSlotFormInput[];
    earlySameAsBasic?: boolean;
  },
  input: {
    includeEarly: boolean;
    includeExtend: boolean;
  },
): {
  timeSlots: SegmentTimeSlotFormInput[];
  earlyTimeSlots?: SegmentTimeSlotFormInput[];
  extendTimeSlots?: SegmentTimeSlotFormInput[];
} {
  const earlyTimeSlots = value.earlySameAsBasic ? cloneTimeSlotDrafts(value.timeSlots) : value.earlyTimeSlots;
  return {
    timeSlots: value.timeSlots,
    ...(input.includeEarly ? { earlyTimeSlots } : {}),
    ...(input.includeExtend ? { extendTimeSlots: value.extendTimeSlots } : {}),
  };
}

function isVersionDraftValid(
  version: SegmentVersionDraft,
  input: {
    allowFlightAlternative: boolean;
  },
): boolean {
  if (
    Number(version.averageDistanceKm) <= 0 ||
    Number(version.averageTravelHours) <= 0
  ) {
    return false;
  }

  if (version.kind === 'SEASON' && version.name.trim().length === 0) {
    return false;
  }

  if (version.kind === 'SEASON' && (!version.startDate || !version.endDate)) {
    return false;
  }

  if (version.kind === 'SEASON' && version.startDate && version.endDate && version.startDate > version.endDate) {
    return false;
  }

  if (version.kind === 'FLIGHT' && !input.allowFlightAlternative) {
    return false;
  }

  if (version.kind === 'FLIGHT' && !version.flightOutTimeBand) {
    return false;
  }

  if (
    version.kind === 'FLIGHT' &&
    hasLodgingOverrideValue(version.lodgingOverride) &&
    !version.lodgingOverride.isUnspecified &&
    version.lodgingOverride.name.trim().length === 0
  ) {
    return false;
  }

  return true;
}

function TimeSlotEditor(props: {
  title: string;
  description: string;
  value: SegmentTimeSlotFormInput[];
  onChange: (nextValue: SegmentTimeSlotFormInput[]) => void;
  /** 0보다 커질 때마다 입력도우미(붙여넣기 영역)를 비웁니다. 저장·생성 성공 후 부모가 증가시킵니다. */
  pasteHelperResetNonce?: number;
  headerRight?: React.ReactNode;
}): JSX.Element {
  const { title, description, value, onChange, pasteHelperResetNonce = 0, headerRight } = props;
  const [pasteHelper, setPasteHelper] = useState<TimeSlotPasteHelperValue>(createEmptyPasteHelperValue);

  useEffect(() => {
    if (pasteHelperResetNonce <= 0) {
      return;
    }
    setPasteHelper(createEmptyPasteHelperValue());
  }, [pasteHelperResetNonce]);

  const updateSlotTime = (slotIndex: number, startTime: string) => {
    const nextSlots = [...value];
    const slot = nextSlots[slotIndex];
    if (!slot) {
      return;
    }
    nextSlots[slotIndex] = { ...slot, startTime };
    onChange(nextSlots);
  };

  const updateActivity = (slotIndex: number, activityIndex: number, description: string) => {
    const nextSlots = [...value];
    const slot = nextSlots[slotIndex];
    if (!slot) {
      return;
    }
    const nextActivities = [...slot.activities];
    if (activityIndex < 0 || activityIndex >= nextActivities.length) {
      return;
    }
    nextActivities[activityIndex] = description;
    nextSlots[slotIndex] = { ...slot, activities: nextActivities };
    onChange(nextSlots);
  };

  const addTimeSlot = () => {
    onChange([...value, createTimeSlot(getNextSlotTime(value))]);
  };

  const addPresetBetween = (beforeTime: string, presetTime: string) => {
    const insertIndex = value.findIndex((slot) => slot.startTime === beforeTime);
    if (insertIndex < 0) {
      onChange([...value, createTimeSlot(presetTime)]);
      return;
    }
    onChange([...value.slice(0, insertIndex), createTimeSlot(presetTime), ...value.slice(insertIndex)]);
  };

  const removeTimeSlot = (slotIndex: number) => {
    if (value.length <= 1) {
      return;
    }
    onChange(value.filter((_, index) => index !== slotIndex));
  };

  const addActivity = (slotIndex: number) => {
    const nextSlots = [...value];
    const slot = nextSlots[slotIndex];
    if (!slot) {
      return;
    }
    nextSlots[slotIndex] = {
      ...slot,
      activities: [...slot.activities, ''],
    };
    onChange(nextSlots);
  };

  const removeActivity = (slotIndex: number, activityIndex: number) => {
    const nextSlots = [...value];
    const slot = nextSlots[slotIndex];
    if (!slot || slot.activities.length <= 1) {
      return;
    }
    nextSlots[slotIndex] = {
      ...slot,
      activities: slot.activities.filter((_, index) => index !== activityIndex),
    };
    onChange(nextSlots);
  };

  const updatePasteHelper = (key: keyof TimeSlotPasteHelperValue, nextValue: string) => {
    setPasteHelper((prev) => ({
      ...prev,
      [key]: nextValue,
    }));
  };

  const applyPasteHelper = () => {
    onChange(parseSegmentTimeSlots(pasteHelper.timeCellText, pasteHelper.scheduleCellText));
  };

  const clearPasteHelper = () => {
    setPasteHelper(createEmptyPasteHelperValue());
  };

  return (
    <div className="grid gap-3 self-start rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        {headerRight}
      </div>
      <div className="grid gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
        <div className="grid gap-1">
          <h4 className="text-sm font-semibold text-slate-800">입력도우미</h4>
          <p className="text-xs text-slate-500">미리캔버스에서 복사/붙여넣기 하세요!</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-slate-700">시간</span>
            <textarea
              value={pasteHelper.timeCellText}
              onChange={(event) => updatePasteHelper('timeCellText', event.target.value)}
              rows={8}
              className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder={TIME_SLOT_PASTE_HELPER_PLACEHOLDER.timeCellText}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-slate-700">일정</span>
            <textarea
              value={pasteHelper.scheduleCellText}
              onChange={(event) => updatePasteHelper('scheduleCellText', event.target.value)}
              rows={8}
              className="min-h-[168px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder={TIME_SLOT_PASTE_HELPER_PLACEHOLDER.scheduleCellText}
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">시간 칸의 `-`는 바로 위 시간에 이어지는 일정으로 인식됩니다.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={applyPasteHelper} className="whitespace-nowrap">
            붙여넣기 적용
          </Button>
          <Button type="button" variant="outline" onClick={clearPasteHelper} className="whitespace-nowrap">
            입력 비우기
          </Button>
        </div>
      </div>
      <div className="grid gap-4">
        {value.map((slot, slotIndex) => (
          <div key={slotIndex} className="grid gap-2">
            <div className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[max-content_minmax(0,1fr)]">
              <div className="grid gap-2 md:content-start">
                <div className="flex h-10 items-center">
                  <h4 className="text-sm font-semibold text-slate-800">출발 시간</h4>
                </div>
                <Input
                  className="w-[110px] border-slate-500 text-lg font-semibold"
                  value={slot.startTime}
                  onChange={(event) => updateSlotTime(slotIndex, event.target.value)}
                  placeholder="HH:mm"
                />
              </div>
              <div className="grid min-w-0 gap-2">
                <div className="flex h-10 items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-800">일정</h4>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeTimeSlot(slotIndex)}
                    disabled={value.length <= 1}
                    className="whitespace-nowrap"
                  >
                    삭제
                  </Button>
                </div>
                <div className="grid gap-2">
                  {slot.activities.map((activity, activityIndex) => (
                    <div key={`${slotIndex}-${activityIndex}`} className="flex min-w-0 items-center gap-2">
                      <Input
                        value={activity}
                        onChange={(event) => updateActivity(slotIndex, activityIndex, event.target.value)}
                        placeholder="활동 입력"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeActivity(slotIndex, activityIndex)}
                        disabled={slot.activities.length <= 1}
                        className="whitespace-nowrap"
                      >
                        X
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <Button type="button" variant="outline" onClick={() => addActivity(slotIndex)} className="whitespace-nowrap">
                    활동 추가
                  </Button>
                </div>
              </div>
            </div>

            {slot.startTime === '08:00' ? (
              <div className="overflow-x-auto">
                <Button type="button" variant="outline" onClick={() => addPresetBetween('12:00', '10:00')} className="whitespace-nowrap">
                  <span aria-hidden="true" className="mr-1">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </span>
                  시간 추가
                </Button>
              </div>
            ) : null}

            {slot.startTime === '12:00' ? (
              <div className="overflow-x-auto">
                <Button type="button" variant="outline" onClick={() => addPresetBetween('18:00', '15:00')} className="whitespace-nowrap">
                  <span aria-hidden="true" className="mr-1">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </span>
                  시간 추가
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div>
        <Button type="button" variant="outline" onClick={addTimeSlot} className="whitespace-nowrap">
          <span aria-hidden="true" className="mr-1">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          시간 추가
        </Button>
      </div>
    </div>
  );
}

function buildVersionInputs(
  form: SegmentFormState,
  input: {
    includeEarly: boolean;
    includeExtend: boolean;
    fixedFlightVersionName?: string;
  },
): SegmentVersionFormInput[] {
  return [
    {
      name: '기본',
      averageDistanceKm: Number(form.averageDistanceKm),
      averageTravelHours: Number(form.averageTravelHours),
      isLongDistance: form.isLongDistance,
      kind: 'DEFAULT',
      ...buildVariantTimeSlotInput(form, input),
      isDefault: true,
    },
    ...form.versions.map((version) => ({
      ...(isPersistedVersionDraft(version.clientId) ? { id: version.clientId } : {}),
      name: version.kind === 'FLIGHT' ? (input.fixedFlightVersionName ?? version.name.trim()) : version.name.trim(),
      averageDistanceKm: Number(version.averageDistanceKm),
      averageTravelHours: Number(version.averageTravelHours),
      isLongDistance: version.isLongDistance,
      kind: version.kind,
      ...(form.sourceType === 'LOCATION' && version.kind === 'SEASON' && version.startDate ? { startDate: version.startDate } : {}),
      ...(form.sourceType === 'LOCATION' && version.kind === 'SEASON' && version.endDate ? { endDate: version.endDate } : {}),
      ...(form.sourceType === 'LOCATION' && version.kind === 'FLIGHT' && version.flightOutTimeBand
        ? { flightOutTimeBand: version.flightOutTimeBand }
        : {}),
      ...(form.sourceType === 'LOCATION' && version.kind === 'FLIGHT'
        ? { lodgingOverride: sanitizeFlightLodgingOverride(version.lodgingOverride) }
        : {}),
      ...(form.sourceType === 'LOCATION' && version.kind === 'FLIGHT' && hasMealsOverrideValue(version.mealsOverride)
        ? { mealsOverride: sanitizeMealsOverride(version.mealsOverride) }
        : {}),
      ...buildVariantTimeSlotInput(version, {
        includeEarly: version.kind === 'FLIGHT' ? false : input.includeEarly,
        includeExtend: version.kind === 'FLIGHT' ? false : input.includeExtend,
      }),
      isDefault: false,
    })),
  ];
}

function LodgingOverrideEditor(props: {
  value: SegmentVersionLodgingOverrideFormInput;
  onChange: (nextValue: SegmentVersionLodgingOverrideFormInput) => void;
}): JSX.Element {
  const { value, onChange } = props;

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid gap-1">
        <h4 className="text-sm font-semibold text-slate-800">숙소 오버라이드</h4>
        <p className="text-xs text-slate-500">값을 입력하면 목적지 기본 숙소 대신 이 버전의 숙소 정보를 사용합니다.</p>
      </div>
      <div className="grid gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={value.isUnspecified}
            onChange={(event) => onChange({ ...value, isUnspecified: event.target.checked })}
          />
          숙소 미지정
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-slate-700">숙소명</span>
          <Textarea
            value={value.name}
            disabled={value.isUnspecified}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            placeholder="예: 여행자 캠프"
            rows={4}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              ['hasElectricity', '전기'],
              ['hasShower', '샤워'],
              ['hasInternet', '인터넷'],
            ] as const
          ).map(([field, label]) => (
            <div key={field} className="grid gap-2 text-sm">
              <span className="text-slate-700">{label}</span>
              <div className="flex flex-wrap gap-2">
                {FACILITY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={value[field] === option.value ? 'default' : 'outline'}
                    disabled={value.isUnspecified}
                    onClick={() => onChange({ ...value, [field]: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MealsOverrideEditor(props: {
  value: SegmentVersionMealsOverrideFormInput;
  onChange: (nextValue: SegmentVersionMealsOverrideFormInput) => void;
}): JSX.Element {
  const { value, onChange } = props;

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid gap-1">
        <h4 className="text-sm font-semibold text-slate-800">식사 오버라이드</h4>
        <p className="text-xs text-slate-500">값을 선택하면 목적지 기본 식사 대신 이 버전의 식사 구성을 사용합니다.</p>
      </div>
      <div className="grid gap-3">
        {(['breakfast', 'lunch', 'dinner'] as const).map((field) => {
          const label = field === 'breakfast' ? '아침' : field === 'lunch' ? '점심' : '저녁';
          return (
            <div key={field} className="grid gap-2 rounded-xl border border-slate-200 p-3 text-sm">
              <span className="text-slate-700">{label}</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={value[field] === null ? 'default' : 'outline'}
                  onClick={() => onChange({ ...value, [field]: null })}
                >
                  없음
                </Button>
                {MEAL_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={value[field] === option.value ? 'default' : 'outline'}
                    onClick={() => onChange({ ...value, [field]: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlternativeVersionEditor(props: {
  value: SegmentVersionDraft[];
  baseDraft: Pick<
    SegmentFormState,
    'averageDistanceKm' | 'averageTravelHours' | 'isLongDistance' | 'timeSlots' | 'earlyTimeSlots' | 'extendTimeSlots' | 'earlyExtendTimeSlots' | 'earlySameAsBasic'
  >;
  showDateRange: boolean;
  includeEarly: boolean;
  includeExtend: boolean;
  onChange: (nextValue: SegmentVersionDraft[]) => void;
  pasteHelperResetNonce?: number;
}): JSX.Element {
  const { value, baseDraft, showDateRange, includeEarly, includeExtend, onChange, pasteHelperResetNonce } = props;
  const updateVersion = (clientId: string, updater: (current: SegmentVersionDraft) => SegmentVersionDraft) => {
    onChange(value.map((item) => (item.clientId === clientId ? updater(item) : item)));
  };

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">시즌 버전 일정</h3>
          <p className="text-xs text-slate-500">같은 출발지/도착지에 대해 시즌 대안 버전을 추가합니다.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange([
              ...value,
              value.length === 0
                ? createVersionDraftFromBaseWithKind(baseDraft, 'SEASON')
                : createVersionDraftFromPreviousWithKind(value[value.length - 1], 'SEASON'),
            ])
          }
        >
          시즌 버전 추가
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          아직 시즌 버전이 없습니다.
        </div>
      ) : (
        value.map((version, index) => {
          return (
            <div key={version.clientId} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onChange(value.filter((item) => item.clientId !== version.clientId))}
              >
                삭제
              </Button>
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm">
                  <span className="text-slate-700">버전 이름</span>
                  <Input
                    value={version.name}
                    onChange={(event) => updateVersion(version.clientId, (item) => ({ ...item, name: event.target.value }))}
                    placeholder="예: 포토스팟 우선"
                  />
                </label>

                <div className="grid gap-2 text-sm">
                  <span className="text-slate-700">버전 종류</span>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    시즌버전
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="text-slate-700">평균 이동 시간(시간)</span>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={version.averageTravelHours}
                      onChange={(event) =>
                        updateVersion(version.clientId, (item) => ({ ...item, averageTravelHours: event.target.value }))
                      }
                      placeholder="예: 5.5"
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="text-slate-700">평균거리(km)</span>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={version.averageDistanceKm}
                      onChange={(event) =>
                        updateVersion(version.clientId, (item) => ({ ...item, averageDistanceKm: event.target.value }))
                      }
                      placeholder="예: 320"
                    />
                  </label>
                </div>

                {showDateRange && version.kind === 'SEASON' ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                      <span className="text-slate-700">적용 시작일</span>
                      <Input
                        type="date"
                        value={version.startDate}
                        onChange={(event) => updateVersion(version.clientId, (item) => ({ ...item, startDate: event.target.value }))}
                      />
                    </label>
                    <label className="grid gap-2 text-sm">
                      <span className="text-slate-700">적용 종료일</span>
                      <Input
                        type="date"
                        value={version.endDate}
                        onChange={(event) => updateVersion(version.clientId, (item) => ({ ...item, endDate: event.target.value }))}
                      />
                    </label>
                  </div>
                ) : null}

                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={version.isLongDistance}
                    onChange={(event) =>
                      updateVersion(version.clientId, (item) => ({ ...item, isLongDistance: event.target.checked }))
                    }
                  />
                  장거리 여행
                </label>
              </div>

              <div className="grid gap-6">
                <div className="grid items-start gap-6 xl:grid-cols-2">
                  <TimeSlotEditor
                    title="버전 일정"
                    description="선택된 시즌 대안 버전의 시간/일정 자동 채움에 사용됩니다."
                    value={version.timeSlots}
                    pasteHelperResetNonce={pasteHelperResetNonce}
                    onChange={(nextTimeSlots) => updateVersion(version.clientId, (item) => ({ ...item, timeSlots: nextTimeSlots }))}
                  />
                  {includeEarly ? (
                    version.earlySameAsBasic ? (
                      <div className="grid gap-3 self-start rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="grid gap-1">
                            <h3 className="text-sm font-semibold text-slate-800">버전 얼리 일정</h3>
                            <p className="text-xs text-slate-500">첫날 얼리 조건의 연결 자동 채움에 사용됩니다.</p>
                          </div>
                          <label className="flex shrink-0 items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={version.earlySameAsBasic}
                              onChange={(event) =>
                                updateVersion(version.clientId, (item) => ({ ...item, earlySameAsBasic: event.target.checked }))
                              }
                            />
                            기본과 동일
                          </label>
                        </div>
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                          기본 연결과 동일한 일정이 얼리에 적용됩니다.
                        </div>
                      </div>
                    ) : (
                      <TimeSlotEditor
                        title="버전 얼리 일정"
                        description="첫날 얼리 조건의 연결 자동 채움에 사용됩니다."
                        value={version.earlyTimeSlots}
                        pasteHelperResetNonce={pasteHelperResetNonce}
                        onChange={(nextTimeSlots) =>
                          updateVersion(version.clientId, (item) => ({ ...item, earlyTimeSlots: nextTimeSlots }))
                        }
                        headerRight={
                          <label className="flex shrink-0 items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={version.earlySameAsBasic}
                              onChange={(event) =>
                                updateVersion(version.clientId, (item) => ({ ...item, earlySameAsBasic: event.target.checked }))
                              }
                            />
                            기본과 동일
                          </label>
                        }
                      />
                    )
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                      얼리 조건이 가능한 출발지/도착지일 때 얼리 일정 입력 영역이 나타납니다.
                    </div>
                  )}
                </div>

                {includeExtend ? (
                  <div className="grid items-start gap-6 xl:grid-cols-2">
                    <TimeSlotEditor
                      title="버전 연장 일정"
                      description="마지막날 연장 조건의 연결 자동 채움에 사용됩니다."
                      value={version.extendTimeSlots}
                      pasteHelperResetNonce={pasteHelperResetNonce}
                      onChange={(nextTimeSlots) =>
                        updateVersion(version.clientId, (item) => ({ ...item, extendTimeSlots: nextTimeSlots }))
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function FlightAlternativeVersionPanel(props: {
  value: SegmentVersionDraft[];
  baseDraft: Pick<
    SegmentFormState,
    'averageDistanceKm' | 'averageTravelHours' | 'isLongDistance' | 'timeSlots' | 'earlyTimeSlots' | 'extendTimeSlots' | 'earlyExtendTimeSlots' | 'earlySameAsBasic'
  >;
  includeExtend: boolean;
  fixedName: string;
  onChange: (nextValue: SegmentVersionDraft[]) => void;
  pasteHelperResetNonce?: number;
}): JSX.Element | null {
  const { value, baseDraft, includeExtend, fixedName, onChange, pasteHelperResetNonce } = props;
  const currentValue = value[0] ?? createVersionDraftFromBaseWithKind(baseDraft, 'FLIGHT');
  const hasPersistedValue = value.length > 0;

  const updateVersion = (updater: (current: SegmentVersionDraft) => SegmentVersionDraft) => {
    onChange([updater(currentValue)]);
  };

  if (!includeExtend) {
    return null;
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
      <div className="grid gap-1">
        <h3 className="text-sm font-semibold text-slate-800">항공권 버전 일정</h3>
        <p className="text-xs text-slate-500">항공권이 6-9pm 일 때 일정을 기록해주세요!</p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-1">
          <div className="text-sm font-semibold text-slate-800">{fixedName}</div>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-2 text-sm">
            <span className="text-slate-700">평균 이동 시간(시간)</span>
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={currentValue.averageTravelHours}
              onChange={(event) =>
                updateVersion((item) => ({ ...item, averageTravelHours: event.target.value }))
              }
              placeholder="예: 5.5"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-700">평균거리(km)</span>
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={currentValue.averageDistanceKm}
              onChange={(event) =>
                updateVersion((item) => ({ ...item, averageDistanceKm: event.target.value }))
              }
              placeholder="예: 320"
            />
          </label>
        </div>

        <TimeSlotEditor
          title="버전 일정"
          description="선택된 항공권 대안 버전의 시간/일정 자동 채움에 사용됩니다."
          value={currentValue.timeSlots}
          pasteHelperResetNonce={pasteHelperResetNonce}
          onChange={(nextTimeSlots) => updateVersion((item) => ({ ...item, timeSlots: nextTimeSlots }))}
        />

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <MealsOverrideEditor
            value={currentValue.mealsOverride}
            onChange={(nextValue) => updateVersion((item) => ({ ...item, mealsOverride: nextValue }))}
          />
        </div>

        {hasPersistedValue ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange([])}
            >
              삭제
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface SegmentPageProps {
  mode?: 'all' | 'list' | 'create';
}

export function SegmentPage({ mode = 'all' }: SegmentPageProps): JSX.Element {
  const crud = useSegmentCrud();
  const location = useLocation();
  const { data: locationData, loading: locationsLoading } = useQuery<{ locations: LocationRow[] }>(LOCATIONS_QUERY);
  const { data: multiDayBlockData, loading: multiDayBlocksLoading } =
    useQuery<{ multiDayBlocks: MultiDayBlockRow[] }>(MULTI_DAY_BLOCKS_QUERY);

  const [form, setForm] = useState<SegmentFormState>(createEmptyForm);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SegmentFormState>(createEmptyForm);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [editFromSearch, setEditFromSearch] = useState('');
  const [editToSearch, setEditToSearch] = useState('');
  const [editFromOpen, setEditFromOpen] = useState(false);
  const [editToOpen, setEditToOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [createPasteHelperResetNonce, setCreatePasteHelperResetNonce] = useState(0);
  const [editPasteHelperResetNonce, setEditPasteHelperResetNonce] = useState(0);

  const locations = useMemo(() => locationData?.locations ?? [], [locationData]);
  const multiDayBlocks = useMemo(() => multiDayBlockData?.multiDayBlocks ?? [], [multiDayBlockData]);
  const regionNameById = useMemo(
    () => new Map(locations.map((item) => [item.regionId, item.regionName])),
    [locations],
  );
  const locationById = useMemo(() => new Map(locations.map((item) => [item.id, item])), [locations]);
  const multiDayBlockById = useMemo(() => new Map(multiDayBlocks.map((item) => [item.id, item])), [multiDayBlocks]);
  const getBlockRegionSummary = (block: MultiDayBlockRow): string => {
    const regionNames = Array.from(
      new Set(block.regionIds.map((regionId) => regionNameById.get(regionId) ?? block.region.name)),
    );
    return regionNames.join(', ');
  };
  const regions = useMemo(() => {
    return Array.from(new Set(crud.rows.map((row) => row.regionName))).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [crud.rows]);
  const filteredSegmentRows = useMemo(() => {
    const byRegion =
      selectedRegion === 'ALL' ? crud.rows : crud.rows.filter((row) => row.regionName === selectedRegion);
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      return byRegion;
    }
    return byRegion.filter((row) => {
      if (row.regionName.toLowerCase().includes(keyword)) {
        return true;
      }
      const from = row.sourceType === 'LOCATION' ? locationById.get(row.fromLocationId ?? '') : undefined;
      const fromBlockTitle = row.fromMultiDayBlockTitle?.toLowerCase() ?? '';
      const to = locationById.get(row.toLocationId);
      if (from && includesLocationNameKeyword(from.name, keyword)) {
        return true;
      }
      if (fromBlockTitle.includes(keyword)) {
        return true;
      }
      if (to && includesLocationNameKeyword(to.name, keyword)) {
        return true;
      }
      if (
        (row.fromLocationId ?? '').toLowerCase().includes(keyword) ||
        (row.fromMultiDayBlockId ?? '').toLowerCase().includes(keyword) ||
        row.toLocationId.toLowerCase().includes(keyword)
      ) {
        return true;
      }
      return row.versions.some((v) => {
        if (v.name.toLowerCase().includes(keyword)) {
          return true;
        }
        const start = v.startDate?.slice(0, 10) ?? '';
        const end = v.endDate?.slice(0, 10) ?? '';
        return start.includes(keyword) || end.includes(keyword);
      });
    });
  }, [crud.rows, selectedRegion, searchKeyword, locationById]);

  const filteredFromLocations = useMemo(() => {
    const keyword = fromSearch.trim().toLowerCase();
    if (!keyword) {
      return locations;
    }
    return locations.filter((item) => includesLocationNameKeyword(item.name, keyword));
  }, [locations, fromSearch]);

  const filteredFromMultiDayBlocks = useMemo(() => {
    const keyword = fromSearch.trim().toLowerCase();
    if (!keyword) {
      return multiDayBlocks;
    }
    return multiDayBlocks.filter((item) => item.title.toLowerCase().includes(keyword));
  }, [multiDayBlocks, fromSearch]);

  const filteredToLocations = useMemo(() => {
    const keyword = toSearch.trim().toLowerCase();
    if (!keyword) {
      return locations;
    }
    return locations.filter((item) => includesLocationNameKeyword(item.name, keyword));
  }, [locations, toSearch]);

  const selectedFromLocation = form.fromLocationId ? locationById.get(form.fromLocationId) : undefined;
  const selectedFromMultiDayBlock = form.fromMultiDayBlockId ? multiDayBlockById.get(form.fromMultiDayBlockId) : undefined;
  const selectedToLocation = form.toLocationId ? locationById.get(form.toLocationId) : undefined;
  const selectedEditFromLocation = editForm.fromLocationId ? locationById.get(editForm.fromLocationId) : undefined;
  const selectedEditFromMultiDayBlock = editForm.fromMultiDayBlockId ? multiDayBlockById.get(editForm.fromMultiDayBlockId) : undefined;
  const selectedEditToLocation = editForm.toLocationId ? locationById.get(editForm.toLocationId) : undefined;
  const createFromLabel =
    form.sourceType === 'LOCATION'
      ? formatLocationNameInline(selectedFromLocation?.name ?? [form.fromLocationId || '-'])
      : ((selectedFromMultiDayBlock?.title ?? form.fromMultiDayBlockId) || '-');
  const createToLabel = formatLocationNameInline(selectedToLocation?.name ?? [form.toLocationId || '-']);
  const editFromLabel =
    editForm.sourceType === 'LOCATION'
      ? formatLocationNameInline(selectedEditFromLocation?.name ?? [editForm.fromLocationId || '-'])
      : ((selectedEditFromMultiDayBlock?.title ?? editForm.fromMultiDayBlockId) || '-');
  const editToLabel = formatLocationNameInline(selectedEditToLocation?.name ?? [editForm.toLocationId || '-']);
  const createFlightVersionName = buildFlightVersionName(createFromLabel, createToLabel);
  const editFlightVersionName = buildFlightVersionName(editFromLabel, editToLabel);
  const includeCreateEarly = form.sourceType === 'LOCATION' && Boolean(selectedFromLocation?.isFirstDayEligible);
  const includeCreateExtend = Boolean(selectedToLocation?.isLastDayEligible);
  const includeEditEarly = editForm.sourceType === 'LOCATION' && Boolean(selectedEditFromLocation?.isFirstDayEligible);
  const includeEditExtend = Boolean(selectedEditToLocation?.isLastDayEligible);
  const createMovementIntensityMeta = useMemo(() => {
    const hours = Number(form.averageTravelHours);
    if (!Number.isFinite(hours) || hours < 0) {
      return null;
    }
    return getMovementIntensityMeta(calculateMovementIntensityByHours(hours));
  }, [form.averageTravelHours]);
  const editMovementIntensityMeta = useMemo(() => {
    const hours = Number(editForm.averageTravelHours);
    if (!Number.isFinite(hours) || hours < 0) {
      return null;
    }
    return getMovementIntensityMeta(calculateMovementIntensityByHours(hours));
  }, [editForm.averageTravelHours]);

  const hasCreateSource = form.sourceType === 'LOCATION' ? Boolean(selectedFromLocation) : Boolean(selectedFromMultiDayBlock);
  const hasEditSource = editForm.sourceType === 'LOCATION' ? Boolean(selectedEditFromLocation) : Boolean(selectedEditFromMultiDayBlock);
  const existingCreateConnectionMessage = useMemo(() => {
    if (!form.toLocationId) {
      return null;
    }
    if (form.sourceType === 'LOCATION') {
      if (!form.fromLocationId) {
        return null;
      }
      const exists = crud.rows.some(
        (row) =>
          row.sourceType === 'LOCATION' &&
          row.fromLocationId === form.fromLocationId &&
          row.toLocationId === form.toLocationId,
      );
      return exists ? '이미 같은 출발지와 도착지의 연결이 등록되어 있습니다. 기존 연결을 수정해주세요.' : null;
    }
    if (!form.fromMultiDayBlockId) {
      return null;
    }
    const exists = crud.rows.some(
      (row) =>
        row.sourceType === 'MULTI_DAY_BLOCK' &&
        row.fromMultiDayBlockId === form.fromMultiDayBlockId &&
        row.toLocationId === form.toLocationId,
    );
    return exists ? '이미 같은 출발 블록과 도착지의 연결이 등록되어 있습니다. 기존 연결을 수정해주세요.' : null;
  }, [crud.rows, form.fromLocationId, form.fromMultiDayBlockId, form.sourceType, form.toLocationId]);

  const canSubmit =
    hasCreateSource &&
    !!selectedToLocation &&
    !existingCreateConnectionMessage &&
    (form.sourceType === 'MULTI_DAY_BLOCK' || form.fromLocationId !== form.toLocationId) &&
    Number(form.averageDistanceKm) > 0 &&
    Number(form.averageTravelHours) > 0 &&
    form.versions.every((version) =>
      isVersionDraftValid(version, {
        allowFlightAlternative: includeCreateExtend,
      }),
    );

  const canUpdate =
    hasEditSource &&
    !!selectedEditToLocation &&
    (editForm.sourceType === 'MULTI_DAY_BLOCK' || editForm.fromLocationId !== editForm.toLocationId) &&
    Number(editForm.averageDistanceKm) > 0 &&
    Number(editForm.averageTravelHours) > 0 &&
    editForm.versions.every((version) =>
      isVersionDraftValid(version, {
        allowFlightAlternative: includeEditExtend,
      }),
    );
  const createSubmitGuideMessages = useMemo(() => {
    const messages: string[] = [];

    if (!hasCreateSource) {
      messages.push(form.sourceType === 'LOCATION' ? '출발지를 선택해주세요.' : '출발 블록을 선택해주세요.');
    }
    if (!selectedToLocation) {
      messages.push('도착지를 선택해주세요.');
    }
    if (form.sourceType === 'LOCATION' && form.fromLocationId && form.toLocationId && form.fromLocationId === form.toLocationId) {
      messages.push('출발지와 도착지는 서로 달라야 합니다.');
    }
    if (existingCreateConnectionMessage) {
      messages.push(existingCreateConnectionMessage);
    }
    if (!(Number(form.averageDistanceKm) > 0)) {
      messages.push('평균거리(km)를 0보다 크게 입력해주세요.');
    }
    if (!(Number(form.averageTravelHours) > 0)) {
      messages.push('평균 이동 시간(시간)을 0보다 크게 입력해주세요.');
    }

    form.versions.forEach((version, index) => {
      const versionLabel =
        version.kind === 'FLIGHT'
          ? '항공권 버전'
          : `시즌 버전 ${index + 1}`;

      if (version.kind === 'SEASON' && version.name.trim().length === 0) {
        messages.push(`${versionLabel}의 버전 이름을 입력해주세요.`);
      }
      if (!(Number(version.averageDistanceKm) > 0)) {
        messages.push(`${versionLabel}의 평균거리(km)를 0보다 크게 입력해주세요.`);
      }
      if (!(Number(version.averageTravelHours) > 0)) {
        messages.push(`${versionLabel}의 평균 이동 시간(시간)을 0보다 크게 입력해주세요.`);
      }
      if (version.kind === 'SEASON' && (!version.startDate || !version.endDate)) {
        messages.push(`${versionLabel}의 적용 시작일과 종료일을 모두 입력해주세요.`);
      }
      if (version.kind === 'SEASON' && version.startDate && version.endDate && version.startDate > version.endDate) {
        messages.push(`${versionLabel}의 적용 종료일은 시작일보다 빠를 수 없습니다.`);
      }
      if (version.kind === 'FLIGHT' && !includeCreateExtend) {
        messages.push('항공권 버전은 도착지가 마지막 일정 후보일 때만 추가할 수 있어요.');
      }
      if (version.kind === 'FLIGHT' && !version.flightOutTimeBand) {
        messages.push('항공권 버전의 항공권 OUT 시간대를 선택해주세요.');
      }
    });

    return Array.from(new Set(messages));
  }, [
    form.sourceType,
    form.fromLocationId,
    form.toLocationId,
    form.averageDistanceKm,
    form.averageTravelHours,
    form.versions,
    hasCreateSource,
    includeCreateExtend,
    existingCreateConnectionMessage,
    selectedToLocation,
  ]);
  const showCreateSection = mode !== 'list';
  const showListSection = mode !== 'create';
  const pageTitle = mode === 'create' ? '연결 생성' : mode === 'list' ? '연결 목록' : '연결 관리';
  const pageDescription =
    mode === 'create'
      ? '목적지 또는 블록에서 출발해 목적지로 도착하는 연결과 이동 일정을 생성합니다.'
      : mode === 'list'
        ? '등록된 목적지/블록 출발 연결과 연결별 이동 일정을 조회하고 수정합니다.'
        : '목적지/블록 출발 연결과 연결별 이동 일정을 함께 관리합니다.';

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <ConnectionSubNav pathname={location.pathname} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
            <p className="mt-1 text-sm text-slate-600">{pageDescription}</p>
          </div>
          {mode === 'list' ? (
            <Link
              to="/connections/create"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              연결 생성
            </Link>
          ) : null}
        </div>
      </header>

      {showCreateSection ? (
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">연결 생성</h2>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (
              !canSubmit ||
              !selectedToLocation ||
              (form.sourceType === 'LOCATION' ? !selectedFromLocation : !selectedFromMultiDayBlock)
            ) {
              return;
            }

            setSubmitting(true);
            try {
              setErrorMessage(null);
              await crud.createRow({
                sourceType: form.sourceType,
                ...(form.sourceType === 'LOCATION' ? { regionId: selectedFromLocation!.regionId } : {}),
                fromLocationId: form.sourceType === 'LOCATION' ? form.fromLocationId : undefined,
                fromMultiDayBlockId: form.sourceType === 'MULTI_DAY_BLOCK' ? form.fromMultiDayBlockId : undefined,
                toLocationId: form.toLocationId,
                averageDistanceKm: Number(form.averageDistanceKm),
                averageTravelHours: Number(form.averageTravelHours),
                isLongDistance: form.isLongDistance,
                ...buildVariantTimeSlotInput(form, {
                  includeEarly: includeCreateEarly,
                  includeExtend: includeCreateExtend,
                }),
                versions: buildVersionInputs(form, {
                  includeEarly: includeCreateEarly,
                  includeExtend: includeCreateExtend,
                  fixedFlightVersionName: createFlightVersionName,
                }),
              });
              setForm(createEmptyForm());
              setCreatePasteHelperResetNonce((n) => n + 1);
              setFromSearch('');
              setToSearch('');
              setFromOpen(false);
              setToOpen(false);
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : '연결 생성에 실패했습니다.');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
            <div className="grid gap-6">
              <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
                <div className="grid gap-2 text-sm">
                  <span className="text-slate-700">출발지 유형</span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={form.sourceType === 'LOCATION' ? 'default' : 'outline'}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, sourceType: 'LOCATION', fromMultiDayBlockId: '', fromLocationId: '' }));
                        setFromSearch('');
                        setFromOpen(false);
                      }}
                    >
                      목적지
                    </Button>
                    <Button
                      type="button"
                      variant={form.sourceType === 'MULTI_DAY_BLOCK' ? 'default' : 'outline'}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, sourceType: 'MULTI_DAY_BLOCK', fromLocationId: '', fromMultiDayBlockId: '' }));
                        setFromSearch('');
                        setFromOpen(false);
                      }}
                    >
                      블록
                    </Button>
                  </div>
                </div>
                <label className="grid gap-1 text-sm min-w-0">
                  <span className="text-slate-700">출발지</span>
                  <div className="relative">
                    <Input
                      value={fromSearch}
                      onFocus={() => setFromOpen(true)}
                      onBlur={() => setTimeout(() => setFromOpen(false), 120)}
                      onChange={(event) => {
                        setFromSearch(event.target.value);
                        setForm((prev) => ({
                          ...prev,
                          fromLocationId: prev.sourceType === 'LOCATION' ? '' : prev.fromLocationId,
                          fromMultiDayBlockId: prev.sourceType === 'MULTI_DAY_BLOCK' ? '' : prev.fromMultiDayBlockId,
                        }));
                        setFromOpen(true);
                      }}
                      placeholder={form.sourceType === 'LOCATION' ? '출발 목적지 검색 또는 선택' : '출발 블록 검색 또는 선택'}
                    />
                    {fromOpen ? (
                      <div className="absolute left-0 right-0 top-[44px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {(form.sourceType === 'LOCATION' ? filteredFromLocations.length === 0 : filteredFromMultiDayBlocks.length === 0) ? (
                          <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                        ) : (
                          form.sourceType === 'LOCATION'
                            ? filteredFromLocations.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setForm((prev) => ({ ...prev, fromLocationId: item.id }));
                                    setFromSearch(formatLocationNameInline(item.name));
                                    setFromOpen(false);
                                  }}
                                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                                >
                                  {formatLocationNameInline(item.name)} ({item.regionName})
                                </button>
                              ))
                            : filteredFromMultiDayBlocks.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setForm((prev) => ({ ...prev, fromMultiDayBlockId: item.id }));
                                    setFromSearch(item.title);
                                    setFromOpen(false);
                                  }}
                                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                                >
                                  {item.title} ({getBlockRegionSummary(item)})
                                </button>
                              ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </label>
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
                <label className="grid gap-1 text-sm min-w-0">
                  <span className="text-slate-700">도착지</span>
                  <div className="relative">
                    <Input
                      value={toSearch}
                      onFocus={() => setToOpen(true)}
                      onBlur={() => setTimeout(() => setToOpen(false), 120)}
                      onChange={(event) => {
                        setToSearch(event.target.value);
                        setForm((prev) => ({ ...prev, toLocationId: '' }));
                        setToOpen(true);
                      }}
                      placeholder="도착지 검색 또는 선택"
                    />
                    {toOpen ? (
                      <div className="absolute left-0 right-0 top-[44px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {filteredToLocations.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                        ) : (
                          filteredToLocations.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setForm((prev) => ({ ...prev, toLocationId: item.id }));
                                setToSearch(formatLocationNameInline(item.name));
                                setToOpen(false);
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                            >
                              {formatLocationNameInline(item.name)} ({item.regionName})
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </label>
                {existingCreateConnectionMessage ? (
                  <p className="text-sm text-red-600">{existingCreateConnectionMessage}</p>
                ) : null}
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
                <div className="grid gap-1">
                  <h3 className="text-sm font-semibold text-slate-800">이동 정보</h3>
                  <p className="text-xs text-slate-500">출발지와 도착지 사이의 평균 이동 거리와 시간입니다.</p>
                </div>
                <div className="grid gap-3">
                  <label className="grid gap-1 text-sm">
                    <span className="text-slate-700">평균 이동시간(시간)</span>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={form.averageTravelHours}
                      onChange={(event) => setForm((prev) => ({ ...prev, averageTravelHours: event.target.value }))}
                      inputMode="decimal"
                      placeholder="예: 3.5"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-slate-700">평균거리(km)</span>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={form.averageDistanceKm}
                      onChange={(event) => setForm((prev) => ({ ...prev, averageDistanceKm: event.target.value }))}
                      inputMode="decimal"
                      placeholder="예: 120.5"
                    />
                  </label>
                </div>
                <div className="text-sm text-slate-600">이동강도: {createMovementIntensityMeta ? createMovementIntensityMeta.label : '시간 입력 필요'}</div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 p-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isLongDistance}
                    onChange={(event) => setForm((prev) => ({ ...prev, isLongDistance: event.target.checked }))}
                  />
                  장거리 여행
                  <span className="text-xs text-slate-500">비용 추가 관련 존재, 정확한 기재 바람.</span>
                </label>
              </div>

              {(form.sourceType === 'LOCATION'
                ? selectedFromLocation?.regionId
                : selectedFromMultiDayBlock?.regionIds.some((regionId) => regionId === selectedToLocation?.regionId)
                  ? undefined
                  : selectedFromMultiDayBlock?.regionId) &&
              selectedToLocation &&
              (form.sourceType === 'LOCATION'
                ? selectedFromLocation?.regionId !== selectedToLocation.regionId
                : !selectedFromMultiDayBlock?.regionIds.some((regionId) => regionId === selectedToLocation.regionId)) ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-700">다른 지역 간 연결도 만들 수 있으며, 블록 연결의 저장 지역은 마지막 날 출발 지역 기준으로 자동 계산됩니다.</p>
                </div>
              ) : null}

              <div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!canSubmit || submitting || locationsLoading || multiDayBlocksLoading || crud.loading}
                >
                  {submitting ? '생성 중...' : '연결 생성'}
                </Button>
                {!canSubmit && createSubmitGuideMessages.length > 0 ? (
                  <div className="mt-3 grid gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="font-medium">연결 생성을 위해 아래 항목을 확인해주세요.</p>
                    <ul className="grid gap-1 pl-5 list-disc">
                      {createSubmitGuideMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-6">
              <div className="grid items-start gap-6 xl:grid-cols-2">
                <div>
                  <TimeSlotEditor
                    title="기본 연결"
                    description="기본 직결 버전의 시간/일정입니다."
                    value={form.timeSlots}
                    pasteHelperResetNonce={createPasteHelperResetNonce}
                    onChange={(nextTimeSlots) => setForm((prev) => ({ ...prev, timeSlots: nextTimeSlots }))}
                  />
                </div>
                <div>
                  {includeCreateEarly ? (
                    form.earlySameAsBasic ? (
                      <div className="grid gap-3 self-start rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="grid gap-1">
                            <h3 className="text-sm font-semibold text-slate-800">출발지가 얼리일 때</h3>
                            <p className="text-xs text-slate-500">첫날 얼리 조건의 연결 일정입니다.</p>
                          </div>
                          <label className="flex shrink-0 items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={form.earlySameAsBasic}
                              onChange={(event) => setForm((prev) => ({ ...prev, earlySameAsBasic: event.target.checked }))}
                            />
                            기본과 동일
                          </label>
                        </div>
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                          기본 연결과 동일한 일정이 얼리에 적용됩니다.
                        </div>
                      </div>
                    ) : (
                      <TimeSlotEditor
                        title="출발지가 얼리일 때"
                        description="첫날 얼리 조건의 연결 일정입니다."
                        value={form.earlyTimeSlots}
                        pasteHelperResetNonce={createPasteHelperResetNonce}
                        onChange={(nextTimeSlots) => setForm((prev) => ({ ...prev, earlyTimeSlots: nextTimeSlots }))}
                        headerRight={
                          <label className="flex shrink-0 items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={form.earlySameAsBasic}
                              onChange={(event) => setForm((prev) => ({ ...prev, earlySameAsBasic: event.target.checked }))}
                            />
                            기본과 동일
                          </label>
                        }
                      />
                    )
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                      얼리 조건이 가능한 출발지/도착지일 때 얼리 일정 입력 영역이 나타납니다.
                    </div>
                  )}
                </div>
                {includeCreateExtend ? (
                  <div>
                    <TimeSlotEditor
                      title="도착지가 연장일 때"
                      description="마지막날 연장 조건의 연결 일정입니다."
                      value={form.extendTimeSlots}
                      pasteHelperResetNonce={createPasteHelperResetNonce}
                      onChange={(nextTimeSlots) => setForm((prev) => ({ ...prev, extendTimeSlots: nextTimeSlots }))}
                    />
                  </div>
                ) : null}
                {includeCreateExtend ? (
                  <FlightAlternativeVersionPanel
                    value={form.versions.filter((version) => version.kind === 'FLIGHT')}
                    baseDraft={form}
                    includeExtend={includeCreateExtend}
                    fixedName={createFlightVersionName}
                    pasteHelperResetNonce={createPasteHelperResetNonce}
                    onChange={(nextVersions) =>
                      setForm((prev) => ({
                        ...prev,
                        versions: replaceVersionDraftsByKind(prev.versions, nextVersions, 'FLIGHT'),
                      }))
                    }
                  />
                ) : null}
              </div>

              <AlternativeVersionEditor
                value={form.versions.filter((version) => version.kind !== 'FLIGHT')}
                baseDraft={form}
                showDateRange={form.sourceType === 'LOCATION'}
                includeEarly={includeCreateEarly}
                includeExtend={includeCreateExtend}
                pasteHelperResetNonce={createPasteHelperResetNonce}
                onChange={(nextVersions) =>
                  setForm((prev) => ({
                    ...prev,
                    versions: replaceVersionDraftsByKind(prev.versions, nextVersions, 'SEASON'),
                  }))
                }
              />
            </div>
          </div>
        </form>
      </Card>
      ) : null}

      {showListSection ? (
      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="grid gap-3">
            <h2 className="text-lg font-semibold tracking-tight">연결 목록</h2>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant={selectedRegion === 'ALL' ? 'default' : 'outline'} onClick={() => setSelectedRegion('ALL')}>
                  전체
                </Button>
                {regions.map((regionName) => (
                  <Button
                    key={regionName}
                    type="button"
                    variant={selectedRegion === regionName ? 'default' : 'outline'}
                    onClick={() => setSelectedRegion(regionName)}
                  >
                    {regionName}
                  </Button>
                ))}
              </div>
              <div className="w-full md:w-[280px]">
                <Input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="출발지·도착지·지역 검색"
                />
              </div>
            </div>
          </div>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>지역</Th>
              <Th>출발지</Th>
              <Th>도착지</Th>
              <Th>평균거리(km)</Th>
              <Th>평균 이동 시간(시간)</Th>
              <Th>이동강도</Th>
              <Th>기본 일정</Th>
              <Th>버전</Th>
              <Th>장거리</Th>
              <Th>액션</Th>
            </tr>
          </thead>
          <tbody>
            {filteredSegmentRows.map((row) => {
              const scheduleLines = buildScheduleLines(row.scheduleTimeBlocks);

              return (
              <tr key={row.id}>
                <Td>
                  <RegionNameChip name={row.regionName} />
                </Td>
                <Td>{formatFromSourceLabel({ row, locationById })}</Td>
                <Td>{formatLocationNameInline(locationById.get(row.toLocationId)?.name ?? row.toLocationId)}</Td>
                <Td>{row.averageDistanceKm}km</Td>
                <Td>{row.averageTravelHours}h</Td>
                <Td>
                  {(() => {
                    const meta = getMovementIntensityMeta(calculateMovementIntensityByHours(row.averageTravelHours));
                    if (!meta) {
                      return '-';
                    }
                    return (
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: meta.backgroundColor,
                          borderColor: meta.borderColor,
                          color: meta.textColor,
                        }}
                      >
                        {meta.label}
                      </span>
                    );
                  })()}
                </Td>
                <Td>
                  {scheduleLines.length > 0 ? (
                    <div className="grid gap-1 text-sm">
                      {scheduleLines.map((line, index) => (
                        <div key={`${row.id}-schedule-${index}`} className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
                          <span className="font-medium text-slate-700">{line.time}</span>
                          <span className="whitespace-pre-wrap text-slate-600">{line.activity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">-</div>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {row.versions.length === 0 ? (
                      <span className="text-xs text-slate-500">기본</span>
                    ) : (
                      row.versions.map((version) => (
                        <span key={version.id} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                          {[
                            version.name.trim() || '기본',
                            version.isDefault ? '(기본버전)' : `(${getVersionKindLabel(version.kind)})`,
                            version.kind === 'SEASON' && version.startDate && version.endDate
                              ? `(${version.startDate.slice(0, 10)}~${version.endDate.slice(0, 10)})`
                              : null,
                            version.kind === 'FLIGHT' && version.flightOutTimeBand
                              ? `(${getFlightTimeBandLabel(version.flightOutTimeBand)})`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        </span>
                      ))
                    )}
                  </div>
                </Td>
                <Td>{row.isLongDistance ? 'Y' : 'N'}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setErrorMessage(null);
                        setEditingSegmentId(row.id);
                        const basicSlots = toFormTimeSlots(row.scheduleTimeBlocks);
                        const earlySlots = toFormTimeSlots(row.earlyScheduleTimeBlocks);
                        setEditForm({
                          sourceType: row.sourceType,
                          fromLocationId: row.fromLocationId ?? '',
                          fromMultiDayBlockId: row.fromMultiDayBlockId ?? '',
                          toLocationId: row.toLocationId,
                          averageDistanceKm: String(row.averageDistanceKm),
                          averageTravelHours: String(row.averageTravelHours),
                          isLongDistance: row.isLongDistance,
                          timeSlots: basicSlots,
                          earlyTimeSlots: earlySlots,
                          extendTimeSlots: toFormTimeSlots(row.extendScheduleTimeBlocks),
                          earlyExtendTimeSlots: toFormTimeSlots(row.earlyExtendScheduleTimeBlocks),
                          earlySameAsBasic: timeSlotsAreEqual(basicSlots, earlySlots),
                          versions: toVersionDrafts(row),
                        });
                        setEditFromSearch(formatFromSourceLabel({ row, locationById }));
                        setEditToSearch(formatLocationNameInline(locationById.get(row.toLocationId)?.name ?? row.toLocationId));
                        setEditFromOpen(false);
                        setEditToOpen(false);
                      }}
                    >
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      disabled={deletingId === row.id}
                      onClick={async () => {
                        if (!window.confirm('이 연결을 삭제할까요?')) {
                          return;
                        }

                        setDeletingId(row.id);
                        setErrorMessage(null);
                        try {
                          await crud.deleteRow(row.id);
                          if (editingSegmentId === row.id) {
                            setEditingSegmentId(null);
                          }
                        } catch (error) {
                          setErrorMessage(error instanceof Error ? error.message : '연결 삭제에 실패했습니다.');
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </Td>
              </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
      ) : null}

      {showListSection && editingSegmentId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setEditingSegmentId(null);
              setEditForm(createEmptyForm());
              setEditFromSearch('');
              setEditToSearch('');
              setEditFromOpen(false);
              setEditToOpen(false);
              setErrorMessage(null);
            }
          }}
        >
          <Card
            className="flex max-h-[90vh] w-full max-w-8xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-900">연결 수정</h2>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingSegmentId(null);
                  setEditForm(createEmptyForm());
                  setEditFromSearch('');
                  setEditToSearch('');
                  setEditFromOpen(false);
                  setEditToOpen(false);
                  setErrorMessage(null);
                }}
              >
                닫기
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                !canUpdate ||
                !selectedEditToLocation ||
                !editingSegmentId ||
                (editForm.sourceType === 'LOCATION' ? !selectedEditFromLocation : !selectedEditFromMultiDayBlock)
              ) {
                return;
              }

              setUpdating(true);
              try {
                setErrorMessage(null);
                await crud.updateRow(editingSegmentId, {
                  sourceType: editForm.sourceType,
                  ...(editForm.sourceType === 'LOCATION' ? { regionId: selectedEditFromLocation!.regionId } : {}),
                  fromLocationId: editForm.sourceType === 'LOCATION' ? editForm.fromLocationId : undefined,
                  fromMultiDayBlockId: editForm.sourceType === 'MULTI_DAY_BLOCK' ? editForm.fromMultiDayBlockId : undefined,
                  toLocationId: editForm.toLocationId,
                  averageDistanceKm: Number(editForm.averageDistanceKm),
                  averageTravelHours: Number(editForm.averageTravelHours),
                  isLongDistance: editForm.isLongDistance,
                  ...buildVariantTimeSlotInput(editForm, {
                    includeEarly: includeEditEarly,
                    includeExtend: includeEditExtend,
                  }),
                  versions: buildVersionInputs(editForm, {
                    includeEarly: includeEditEarly,
                    includeExtend: includeEditExtend,
                    fixedFlightVersionName: editFlightVersionName,
                  }),
                });
                setEditingSegmentId(null);
                setEditForm(createEmptyForm());
                setEditPasteHelperResetNonce((n) => n + 1);
                setEditFromSearch('');
                setEditToSearch('');
                setEditFromOpen(false);
                setEditToOpen(false);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : '연결 저장에 실패했습니다.');
              } finally {
                setUpdating(false);
              }
            }}
          >
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            <div className="grid items-start gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
              <div className="grid gap-4">
                <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-1">
                  <div className="grid gap-2 text-sm">
                    <span className="text-slate-700">출발지 유형</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={editForm.sourceType === 'LOCATION' ? 'default' : 'outline'}
                        onClick={() => {
                          setEditForm((prev) => ({ ...prev, sourceType: 'LOCATION', fromMultiDayBlockId: '', fromLocationId: '' }));
                          setEditFromSearch('');
                          setEditFromOpen(false);
                        }}
                      >
                        목적지
                      </Button>
                      <Button
                        type="button"
                        variant={editForm.sourceType === 'MULTI_DAY_BLOCK' ? 'default' : 'outline'}
                        onClick={() => {
                          setEditForm((prev) => ({ ...prev, sourceType: 'MULTI_DAY_BLOCK', fromLocationId: '', fromMultiDayBlockId: '' }));
                          setEditFromSearch('');
                          setEditFromOpen(false);
                        }}
                      >
                        블록
                      </Button>
                    </div>
                  </div>
                  <div className="relative grid gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">출발지</h3>
                    <Input
                      value={editFromSearch}
                      onFocus={() => setEditFromOpen(true)}
                      onBlur={() => setTimeout(() => setEditFromOpen(false), 120)}
                      onChange={(event) => {
                        setEditFromSearch(event.target.value);
                        setEditForm((prev) => ({
                          ...prev,
                          fromLocationId: prev.sourceType === 'LOCATION' ? '' : prev.fromLocationId,
                          fromMultiDayBlockId: prev.sourceType === 'MULTI_DAY_BLOCK' ? '' : prev.fromMultiDayBlockId,
                        }));
                        setEditFromOpen(true);
                      }}
                      placeholder={editForm.sourceType === 'LOCATION' ? '출발 목적지 검색 또는 선택' : '출발 블록 검색 또는 선택'}
                    />
                    {editFromOpen ? (
                      <div className="absolute left-0 right-0 top-[76px] z-[100] max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {(editForm.sourceType === 'LOCATION' ? filteredFromLocations.length === 0 : filteredFromMultiDayBlocks.length === 0) ? (
                          <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                        ) : (
                          editForm.sourceType === 'LOCATION'
                            ? filteredFromLocations.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setEditForm((prev) => ({ ...prev, fromLocationId: item.id }));
                                    setEditFromSearch(formatLocationNameInline(item.name));
                                    setEditFromOpen(false);
                                  }}
                                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                                >
                                  {formatLocationNameInline(item.name)} ({item.regionName})
                                </button>
                              ))
                            : filteredFromMultiDayBlocks.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setEditForm((prev) => ({ ...prev, fromMultiDayBlockId: item.id }));
                                    setEditFromSearch(item.title);
                                    setEditFromOpen(false);
                                  }}
                                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                                >
                                  {item.title} ({getBlockRegionSummary(item)})
                                </button>
                              ))
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="relative grid gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">도착지</h3>
                    <Input
                      value={editToSearch}
                      onFocus={() => setEditToOpen(true)}
                      onBlur={() => setTimeout(() => setEditToOpen(false), 120)}
                      onChange={(event) => {
                        setEditToSearch(event.target.value);
                        setEditForm((prev) => ({ ...prev, toLocationId: '' }));
                        setEditToOpen(true);
                      }}
                      placeholder="도착지 검색 또는 선택"
                    />
                    {editToOpen ? (
                      <div className="absolute left-0 right-0 top-[76px] z-[100] max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {filteredToLocations.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
                        ) : (
                          filteredToLocations.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setEditForm((prev) => ({ ...prev, toLocationId: item.id }));
                                setEditToSearch(formatLocationNameInline(item.name));
                                setEditToOpen(false);
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                            >
                              {formatLocationNameInline(item.name)} ({item.regionName})
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">평균 이동 시간(시간)</h3>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={editForm.averageTravelHours}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, averageTravelHours: event.target.value }))}
                      placeholder="예: 3.5"
                    />
                  </div>

                  <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">평균거리(km)</h3>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={editForm.averageDistanceKm}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, averageDistanceKm: event.target.value }))}
                      placeholder="예: 120.5"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">자동 계산 이동강도</span>
                  <span className="ml-2">
                    {editMovementIntensityMeta ? (
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: editMovementIntensityMeta.backgroundColor,
                          borderColor: editMovementIntensityMeta.borderColor,
                          color: editMovementIntensityMeta.textColor,
                        }}
                      >
                        {editMovementIntensityMeta.label}
                      </span>
                    ) : (
                      '-'
                    )}
                  </span>
                </div>

                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={editForm.isLongDistance}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, isLongDistance: event.target.checked }))}
                  />
                  장거리 여행
                  <span className="text-xs text-slate-500">비용 추가 관련 존재, 정확한 기재 바람.</span>
                </label>

                {(editForm.sourceType === 'LOCATION'
                  ? selectedEditFromLocation?.regionId
                  : selectedEditFromMultiDayBlock?.regionIds.some((regionId) => regionId === selectedEditToLocation?.regionId)
                    ? undefined
                    : selectedEditFromMultiDayBlock?.regionId) &&
                selectedEditToLocation &&
                (editForm.sourceType === 'LOCATION'
                  ? selectedEditFromLocation?.regionId !== selectedEditToLocation.regionId
                  : !selectedEditFromMultiDayBlock?.regionIds.some((regionId) => regionId === selectedEditToLocation.regionId)) ? (
                  <p className="text-sm text-blue-700">다른 지역 간 연결도 저장할 수 있으며, 블록 연결의 저장 지역은 마지막 날 출발 지역 기준으로 자동 계산됩니다.</p>
                ) : null}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!canUpdate || updating || locationsLoading || multiDayBlocksLoading || crud.loading}
                  >
                    {updating ? '저장 중...' : '수정 저장'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingSegmentId(null);
                      setEditForm(createEmptyForm());
                      setEditFromSearch('');
                      setEditToSearch('');
                      setEditFromOpen(false);
                      setEditToOpen(false);
                      setErrorMessage(null);
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="grid items-start gap-6 lg:grid-cols-2">
                  <TimeSlotEditor
                    title="기본 버전 일정"
                    description="기본 직결 버전의 시간/일정입니다."
                    value={editForm.timeSlots}
                    pasteHelperResetNonce={editPasteHelperResetNonce}
                    onChange={(nextTimeSlots) => setEditForm((prev) => ({ ...prev, timeSlots: nextTimeSlots }))}
                  />
                  {includeEditEarly ? (
                    editForm.earlySameAsBasic ? (
                      <div className="grid gap-3 self-start rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="grid gap-1">
                            <h3 className="text-sm font-semibold text-slate-800">기본 버전 얼리 일정</h3>
                            <p className="text-xs text-slate-500">첫날 얼리 조건의 연결 일정입니다.</p>
                          </div>
                          <label className="flex shrink-0 items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={editForm.earlySameAsBasic}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, earlySameAsBasic: event.target.checked }))}
                            />
                            기본과 동일
                          </label>
                        </div>
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                          기본 연결과 동일한 일정이 얼리에 적용됩니다.
                        </div>
                      </div>
                    ) : (
                      <TimeSlotEditor
                        title="기본 버전 얼리 일정"
                        description="첫날 얼리 조건의 연결 일정입니다."
                        value={editForm.earlyTimeSlots}
                        pasteHelperResetNonce={editPasteHelperResetNonce}
                        onChange={(nextTimeSlots) => setEditForm((prev) => ({ ...prev, earlyTimeSlots: nextTimeSlots }))}
                        headerRight={
                          <label className="flex shrink-0 items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={editForm.earlySameAsBasic}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, earlySameAsBasic: event.target.checked }))}
                            />
                            기본과 동일
                          </label>
                        }
                      />
                    )
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                      얼리 조건이 가능한 출발지/도착지일 때 얼리 일정 입력 영역이 나타납니다.
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">기본 버전은 상시 적용 버전으로 날짜 범위를 설정하지 않습니다.</p>
                {includeEditExtend ? (
                  <div>
                    <TimeSlotEditor
                      title="기본 버전 연장 일정"
                      description="마지막날 연장 조건의 연결 일정입니다."
                      value={editForm.extendTimeSlots}
                      pasteHelperResetNonce={editPasteHelperResetNonce}
                      onChange={(nextTimeSlots) => setEditForm((prev) => ({ ...prev, extendTimeSlots: nextTimeSlots }))}
                    />
                  </div>
                ) : null}
                {includeEditExtend ? (
                  <FlightAlternativeVersionPanel
                    value={editForm.versions.filter((version) => version.kind === 'FLIGHT')}
                    baseDraft={editForm}
                    includeExtend={includeEditExtend}
                    fixedName={editFlightVersionName}
                    pasteHelperResetNonce={editPasteHelperResetNonce}
                    onChange={(nextVersions) =>
                      setEditForm((prev) => ({
                        ...prev,
                        versions: replaceVersionDraftsByKind(prev.versions, nextVersions, 'FLIGHT'),
                      }))
                    }
                  />
                ) : null}

                <AlternativeVersionEditor
                  value={editForm.versions.filter((version) => version.kind !== 'FLIGHT')}
                  baseDraft={editForm}
                  showDateRange={editForm.sourceType === 'LOCATION'}
                  includeEarly={includeEditEarly}
                  includeExtend={includeEditExtend}
                  pasteHelperResetNonce={editPasteHelperResetNonce}
                  onChange={(nextVersions) =>
                    setEditForm((prev) => ({
                      ...prev,
                      versions: replaceVersionDraftsByKind(prev.versions, nextVersions, 'SEASON'),
                    }))
                  }
                />
              </div>
            </div>
          </form>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
