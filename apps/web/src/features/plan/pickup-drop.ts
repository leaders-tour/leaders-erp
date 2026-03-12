export type PickupDropPlaceType = 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';

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

export function getRecommendedPickupTime(flightInTime: string | null | undefined): string {
  const minutes = parseTimeToMinutes(flightInTime);
  if (minutes !== null && minutes < 4 * 60) {
    return '04:00';
  }
  return '08:00';
}

export function getRecommendedDropTime(flightOutTime: string | null | undefined): string {
  const minutes = parseTimeToMinutes(flightOutTime);
  if (minutes === null || minutes - 3 * 60 < 0) {
    return '19:00';
  }

  return formatMinutesAsTime(minutes - 3 * 60) ?? '19:00';
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
