export type CustomerDocumentPickupDropPlaceType = 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';

export type CustomerDocumentTransportGroup = {
  teamName: string;
  headcount: number;
  flightInDate: string | Date | null | undefined;
  flightInTime: string | null | undefined;
  flightOutDate: string | Date | null | undefined;
  flightOutTime: string | null | undefined;
  pickupDate: string | Date | null | undefined;
  pickupTime: string | null | undefined;
  pickupPlaceType: CustomerDocumentPickupDropPlaceType | string | null | undefined;
  pickupPlaceCustomText: string | null | undefined;
  dropDate: string | Date | null | undefined;
  dropTime: string | null | undefined;
  dropPlaceType: CustomerDocumentPickupDropPlaceType | string | null | undefined;
  dropPlaceCustomText: string | null | undefined;
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
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

function formatDateShort(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) {
    return '-';
  }

  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function resolvePickupDropPlaceLabel(
  placeType: CustomerDocumentPickupDropPlaceType | string | null | undefined,
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

export function formatPickupDropDisplay(
  date: string | Date | null | undefined,
  time: string | null | undefined,
  placeType: CustomerDocumentPickupDropPlaceType | string | null | undefined,
  customText: string | null | undefined,
): string {
  const normalizedTime = time?.trim() ?? '';
  const placeLabel = resolvePickupDropPlaceLabel(placeType, customText);

  if (!date || normalizedTime.length === 0 || !placeLabel) {
    return '-';
  }

  return `${formatDateShort(date)} - ${normalizedTime} ${placeLabel}`;
}

function formatDateKoreanMonthDay(value: string | Date | null | undefined): string | null {
  const date = toDate(value);
  if (!date) {
    return null;
  }

  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
}

export function formatFlightDisplay(date: string | Date | null | undefined, time: string | null | undefined): string {
  const normalizedTime = time?.trim() ?? '';
  const koreanDate = formatDateKoreanMonthDay(date);

  if (!koreanDate) {
    return '-';
  }

  if (normalizedTime.length === 0) {
    return `${koreanDate} · 시간 미정`;
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
  groups: Array<
    Pick<
      CustomerDocumentTransportGroup,
      'teamName' | 'headcount' | 'flightInDate' | 'flightInTime' | 'flightOutDate' | 'flightOutTime'
    >
  >,
  direction: 'IN' | 'OUT',
): string {
  const shouldShowLabel = groups.length > 1;
  const lines = groups
    .map((group) => {
      const display =
        direction === 'IN'
          ? formatFlightDisplay(group.flightInDate, group.flightInTime)
          : formatFlightDisplay(group.flightOutDate, group.flightOutTime);

      const lineContent = display === '-' ? '항공권 미정' : display;

      const label = shouldShowLabel ? formatTransportGroupLabel(group.teamName, group.headcount) : '';
      return label ? `${label} ${lineContent}` : lineContent;
    })
    .filter((value) => value.length > 0);

  return lines.length > 0 ? lines.join('\n') : '항공권 미정';
}

export function formatTransportPickupDropLines(
  groups: CustomerDocumentTransportGroup[],
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
