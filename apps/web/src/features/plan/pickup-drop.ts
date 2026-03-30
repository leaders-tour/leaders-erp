import { VariantType } from '../../generated/graphql';

export type PickupDropPlaceType = 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';

export interface TransportGroupLike {
  teamName: string;
  headcount: number;
  flightInDate: string | null | undefined;
  flightInTime: string | null | undefined;
  flightOutDate: string | null | undefined;
  flightOutTime: string | null | undefined;
  pickupDate: string | null | undefined;
  pickupTime: string | null | undefined;
  pickupPlaceType: PickupDropPlaceType | string | null | undefined;
  pickupPlaceCustomText: string | null | undefined;
  dropDate: string | null | undefined;
  dropTime: string | null | undefined;
  dropPlaceType: PickupDropPlaceType | string | null | undefined;
  dropPlaceCustomText: string | null | undefined;
}

export const DEFAULT_PICKUP_DROP_PLACE_TYPE: PickupDropPlaceType = 'AIRPORT';

export const PICKUP_DROP_PLACE_OPTIONS: Array<{ value: PickupDropPlaceType; label: string }> = [
  { value: 'AIRPORT', label: '공항' },
  { value: 'OZ_HOUSE', label: '오즈하우스' },
  { value: 'ULAANBAATAR', label: '울란바토르' },
  { value: 'CUSTOM', label: '직접입력' },
];

function toDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const dateOnly = new Date(`${trimmed}T00:00:00.000Z`);
    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateShort(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) {
    return '-';
  }

  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}`;
}

function formatDateInput(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

function shiftDate(value: string | null | undefined, days: number): string | null {
  const date = toDate(value);
  if (!date) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + days);
  return formatDateInput(date);
}

export function parseTimeToMinutes(value: string | null | undefined): number | null {
  const trimmed = value?.trim() ?? '';
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatMinutesAsTime(minutes: number): string | null {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) {
    return null;
  }

  const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minute = String(minutes % 60).padStart(2, '0');
  return `${hour}:${minute}`;
}

function roundMinutesToHalfHour(minutes: number): number {
  const remainder = minutes % 60;

  if (remainder === 0 || remainder === 30) {
    return minutes;
  }

  if (remainder < 15) {
    return minutes - remainder;
  }

  if (remainder < 30) {
    return minutes + (30 - remainder);
  }

  if (remainder < 45) {
    return minutes - (remainder - 30);
  }

  return minutes + (60 - remainder);
}

function shouldUsePreviousDayLateNightDrop(minutes: number): boolean {
  return minutes > 2 * 60 && minutes < 6 * 60;
}

/** 울란바토르 마지막일 기본 투어 종료 시각(드랍 상한 계산에 사용). */
export const DEFAULT_TRAVEL_END_TIME = '19:00';

function isEarlyMorningOutForDropExtension(minutes: number): boolean {
  return minutes - 3 * 60 < 0 || shouldUsePreviousDayLateNightDrop(minutes);
}

function computeLegacyDropScheduleFromFlightOut(
  normalizedFlightOutDate: string,
  flightOutTime: string | null | undefined,
): { date: string; time: string } {
  const minutes = parseTimeToMinutes(flightOutTime);
  if (minutes === null) {
    return { date: normalizedFlightOutDate, time: '19:00' };
  }

  if (isEarlyMorningOutForDropExtension(minutes)) {
    return {
      date: shiftDate(normalizedFlightOutDate, -1) ?? normalizedFlightOutDate,
      time: '23:00',
    };
  }

  return {
    date: normalizedFlightOutDate,
    time: formatMinutesAsTime(roundMinutesToHalfHour(minutes - 3 * 60)) ?? '19:00',
  };
}

export function getRecommendedPickupTime(flightInTime: string | null | undefined): string {
  const minutes = parseTimeToMinutes(flightInTime);
  if (minutes !== null && minutes < 4 * 60) {
    return '04:00';
  }
  if (minutes !== null && minutes === 4 * 60 + 30) {
    return '04:30';
  }
  if (minutes !== null && minutes >= 4 * 60 && minutes <= 5 * 60) {
    return '05:00';
  }
  return '08:00';
}

export function getRecommendedPickupSchedule(
  flightInDate: string | null | undefined,
  flightInTime: string | null | undefined,
  travelStartDate?: string | null | undefined,
): { date: string; time: string } {
  const normalizedIn = flightInDate?.trim() ?? '';
  if (normalizedIn.length === 0) {
    return {
      date: '',
      time: getRecommendedPickupTime(flightInTime),
    };
  }

  const normalizedStart = travelStartDate?.trim() ?? '';
  const time = getRecommendedPickupTime(flightInTime);
  if (normalizedStart.length === 0 || normalizedIn >= normalizedStart) {
    return { date: normalizedIn, time };
  }

  return { date: normalizedStart, time };
}

export function isEarlyPickupTime(value: string | null | undefined): boolean {
  const minutes = parseTimeToMinutes(value);
  return minutes !== null && minutes >= 4 * 60 && minutes <= 5 * 60;
}

export function isExtendDropTime(value: string | null | undefined): boolean {
  const minutes = parseTimeToMinutes(value);
  return minutes !== null && minutes >= 21 * 60 && minutes <= 23 * 60 + 30;
}

export function resolveAutoVariantType(
  currentVariantType: VariantType,
  groups: Array<Pick<TransportGroupLike, 'pickupTime' | 'dropTime'>>,
): VariantType {
  const hasEarlyPickup = groups.some((group) => isEarlyPickupTime(group.pickupTime));
  const hasLateDrop = groups.some((group) => isExtendDropTime(group.dropTime));

  if (hasEarlyPickup && hasLateDrop) {
    return VariantType.EarlyExtend;
  }
  if (hasEarlyPickup) {
    return VariantType.Early;
  }
  if (hasLateDrop) {
    return VariantType.Extend;
  }
  if (currentVariantType === VariantType.Afternoon) {
    return currentVariantType;
  }
  return VariantType.Basic;
}

export function getRecommendedDropTime(flightOutTime: string | null | undefined): string {
  const minutes = parseTimeToMinutes(flightOutTime);
  if (minutes === null) {
    return '19:00';
  }

  if (isEarlyMorningOutForDropExtension(minutes)) {
    return '23:00';
  }

  return formatMinutesAsTime(roundMinutesToHalfHour(minutes - 3 * 60)) ?? '19:00';
}

export function getRecommendedDropSchedule(
  flightOutDate: string | null | undefined,
  flightOutTime: string | null | undefined,
  travelEndDate?: string | null | undefined,
): { date: string; time: string } {
  const normalizedDate = flightOutDate?.trim() ?? '';
  if (normalizedDate.length === 0) {
    return {
      date: '',
      time: getRecommendedDropTime(flightOutTime),
    };
  }

  const normalizedEnd = travelEndDate?.trim() ?? '';
  if (normalizedEnd.length === 0 || normalizedDate <= normalizedEnd) {
    return computeLegacyDropScheduleFromFlightOut(normalizedDate, flightOutTime);
  }

  const minutes = parseTimeToMinutes(flightOutTime);
  if (minutes === null) {
    return { date: normalizedEnd, time: '19:00' };
  }

  if (isEarlyMorningOutForDropExtension(minutes)) {
    return { date: normalizedEnd, time: '23:00' };
  }

  const endMinutes = parseTimeToMinutes(DEFAULT_TRAVEL_END_TIME);
  const baseDropMinutes = (endMinutes ?? 19 * 60) - 3 * 60;
  return {
    date: normalizedEnd,
    time: formatMinutesAsTime(roundMinutesToHalfHour(baseDropMinutes)) ?? '16:00',
  };
}

export function resolvePickupDropPlaceLabel(
  placeType: PickupDropPlaceType | string | null | undefined,
  customText: string | null | undefined,
): string | null {
  if (!placeType) {
    return null;
  }

  if (placeType === 'AIRPORT') {
    return '공항';
  }
  if (placeType === 'OZ_HOUSE') {
    return '오즈하우스';
  }
  if (placeType === 'ULAANBAATAR') {
    return '울란바토르';
  }
  if (placeType === 'CUSTOM') {
    const trimmed = customText?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

export function normalizePickupDropCustomText(
  placeType: PickupDropPlaceType | string | null | undefined,
  customText: string | null | undefined,
): string | undefined {
  if (placeType !== 'CUSTOM') {
    return undefined;
  }

  const trimmed = customText?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
}

export function formatPickupDropDisplay(
  date: string | null | undefined,
  time: string | null | undefined,
  placeType: PickupDropPlaceType | string | null | undefined,
  customText: string | null | undefined,
): string {
  const normalizedTime = time?.trim() ?? '';
  const placeLabel = resolvePickupDropPlaceLabel(placeType, customText);

  if (!date || normalizedTime.length === 0 || !placeLabel) {
    return '-';
  }

  return `${formatDateShort(date)} - ${normalizedTime} ${placeLabel}`;
}

export function formatFlightDisplay(date: string | null | undefined, time: string | null | undefined): string {
  const normalizedTime = time?.trim() ?? '';
  if (!date || normalizedTime.length === 0) {
    return '-';
  }

  return `${formatDateShort(date)} - ${normalizedTime}`;
}

export function formatTransportGroupLabel(teamName: string | null | undefined, headcount: number | null | undefined): string {
  const normalizedName = teamName?.trim() ?? '';
  const safeHeadcount = Number.isFinite(headcount) ? Math.max(0, Number(headcount)) : 0;

  if (normalizedName.length === 0 && safeHeadcount === 0) {
    return '';
  }

  if (normalizedName.length === 0) {
    return `${safeHeadcount}인)`;
  }

  return `${normalizedName} ${safeHeadcount}인)`;
}

export function formatTransportFlightLines(
  groups: Array<Pick<TransportGroupLike, 'teamName' | 'headcount' | 'flightInDate' | 'flightInTime' | 'flightOutDate' | 'flightOutTime'>>,
  direction: 'IN' | 'OUT',
): string {
  const shouldShowLabel = groups.length > 1;
  const lines = groups
    .map((group) => {
      const display =
        direction === 'IN'
          ? formatFlightDisplay(group.flightInDate, group.flightInTime)
          : formatFlightDisplay(group.flightOutDate, group.flightOutTime);

      if (display === '-') {
        return '';
      }

      const label = shouldShowLabel ? formatTransportGroupLabel(group.teamName, group.headcount) : '';
      return label ? `${label} ${display}` : display;
    })
    .filter((value) => value.length > 0);

  return lines.length > 0 ? lines.join('\n') : '-';
}

export function formatTransportPickupDropLines(
  groups: TransportGroupLike[],
  direction: 'pickup' | 'drop',
): string {
  const shouldShowLabel = groups.length > 1;
  const lines = groups
    .map((group) => {
      const display =
        direction === 'pickup'
          ? formatPickupDropDisplay(
              group.pickupDate,
              group.pickupTime,
              group.pickupPlaceType,
              group.pickupPlaceCustomText,
            )
          : formatPickupDropDisplay(
              group.dropDate,
              group.dropTime,
              group.dropPlaceType,
              group.dropPlaceCustomText,
            );

      if (display === '-') {
        return '';
      }

      const label = shouldShowLabel ? formatTransportGroupLabel(group.teamName, group.headcount) : '';
      return label ? `${label} ${display}` : display;
    })
    .filter((value) => value.length > 0);

  return lines.length > 0 ? lines.join('\n') : '-';
}
