export type ExternalTransferDirection = 'PICKUP' | 'DROP';

export type ExternalTransferPresetCode =
  | 'DROP_ULAANBAATAR_AIRPORT'
  | 'DROP_TERELJ_AIRPORT'
  | 'DROP_OZHOUSE_AIRPORT'
  | 'PICKUP_AIRPORT_OZHOUSE'
  | 'PICKUP_AIRPORT_ULAANBAATAR'
  | 'PICKUP_AIRPORT_TERELJ'
  | 'CUSTOM';

export interface ExternalTransfer {
  direction: ExternalTransferDirection;
  presetCode: ExternalTransferPresetCode;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  departurePlace: string;
  arrivalPlace: string;
  selectedTeamOrderIndexes: number[];
  unitPriceKrw: number;
}

export interface ExternalTransferTeamLike {
  orderIndex?: number;
  teamName: string;
  flightInDate: string | null | undefined;
  flightInTime: string | null | undefined;
  flightOutDate: string | null | undefined;
  flightOutTime: string | null | undefined;
}

export interface ExternalTransferPresetOption {
  code: ExternalTransferPresetCode;
  label: string;
  description: string;
  direction: ExternalTransferDirection;
  departurePlace: string;
  arrivalPlace: string;
  unitPriceKrw: number;
}

interface DateTimeParts {
  date: string;
  time: string;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const EXTERNAL_TRANSFER_PRESET_OPTIONS: ExternalTransferPresetOption[] = [
  {
    code: 'DROP_ULAANBAATAR_AIRPORT',
    label: '드랍 · 울란바토르 → 공항',
    description: 'OUT 기준 출발 -4시간 30분 / 도착 -3시간',
    direction: 'DROP',
    departurePlace: '울란바토르',
    arrivalPlace: '공항',
    unitPriceKrw: 100000,
  },
  {
    code: 'DROP_TERELJ_AIRPORT',
    label: '드랍 · 테를지 → 공항',
    description: 'OUT 기준 출발 -4시간 30분 / 도착 -3시간',
    direction: 'DROP',
    departurePlace: '테를지',
    arrivalPlace: '공항',
    unitPriceKrw: 150000,
  },
  {
    code: 'DROP_OZHOUSE_AIRPORT',
    label: '드랍 · 오즈하우스 → 공항',
    description: 'OUT 기준 출발 -4시간 30분 / 도착 -3시간',
    direction: 'DROP',
    departurePlace: '오즈하우스',
    arrivalPlace: '공항',
    unitPriceKrw: 60000,
  },
  {
    code: 'PICKUP_AIRPORT_OZHOUSE',
    label: '픽업 · 공항 → 오즈하우스',
    description: 'IN +1시간 후 다음 00/30으로 올림, 도착은 +1시간',
    direction: 'PICKUP',
    departurePlace: '공항',
    arrivalPlace: '오즈하우스',
    unitPriceKrw: 60000,
  },
  {
    code: 'PICKUP_AIRPORT_ULAANBAATAR',
    label: '픽업 · 공항 → 울란바토르',
    description: 'IN +1시간 후 다음 00/30으로 올림, 도착은 +1시간',
    direction: 'PICKUP',
    departurePlace: '공항',
    arrivalPlace: '울란바토르',
    unitPriceKrw: 100000,
  },
  {
    code: 'PICKUP_AIRPORT_TERELJ',
    label: '픽업 · 공항 → 테를지',
    description: 'IN +1시간 후 다음 00/30으로 올림, 도착은 +1시간',
    direction: 'PICKUP',
    departurePlace: '공항',
    arrivalPlace: '테를지',
    unitPriceKrw: 150000,
  },
  {
    code: 'CUSTOM',
    label: '수동입력',
    description: '방향, 날짜, 시간, 장소, 금액을 직접 입력',
    direction: 'PICKUP',
    departurePlace: '',
    arrivalPlace: '',
    unitPriceKrw: 0,
  },
];

function parseIsoDate(value: string | null | undefined): { year: number; month: number; day: number } | null {
  const trimmed = value?.trim() ?? '';
  const match = ISO_DATE_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  return { year, month, day };
}

function parseTime(value: string | null | undefined): { hour: number; minute: number } | null {
  const trimmed = value?.trim() ?? '';
  const match = TIME_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function toUtcDate(date: string | null | undefined, time: string | null | undefined): Date | null {
  const parsedDate = parseIsoDate(date);
  const parsedTime = parseTime(time);
  if (!parsedDate || !parsedTime) {
    return null;
  }

  return new Date(Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day, parsedTime.hour, parsedTime.minute, 0, 0));
}

function formatIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function formatTime(date: Date): string {
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

function toDateTimeParts(date: Date): DateTimeParts {
  return {
    date: formatIsoDate(date),
    time: formatTime(date),
  };
}

function shiftUtcDateTime(date: string | null | undefined, time: string | null | undefined, offsetMinutes: number): DateTimeParts | null {
  const base = toUtcDate(date, time);
  if (!base) {
    return null;
  }

  return toDateTimeParts(new Date(base.getTime() + offsetMinutes * 60_000));
}

function ceilToHalfHour(date: Date): Date {
  const next = new Date(date.getTime());
  const minutes = next.getUTCMinutes();

  if (minutes === 0 || minutes === 30) {
    next.setUTCSeconds(0, 0);
    return next;
  }

  if (minutes >= 1 && minutes <= 29) {
    next.setUTCMinutes(30, 0, 0);
    return next;
  }

  next.setUTCHours(next.getUTCHours() + 1, 0, 0, 0);
  return next;
}

export function getExternalTransferPresetOption(code: ExternalTransferPresetCode): ExternalTransferPresetOption {
  const matched = EXTERNAL_TRANSFER_PRESET_OPTIONS.find((option) => option.code === code);
  return matched ?? EXTERNAL_TRANSFER_PRESET_OPTIONS[EXTERNAL_TRANSFER_PRESET_OPTIONS.length - 1]!;
}

export function buildEmptyExternalTransfer(): ExternalTransfer {
  return {
    direction: 'PICKUP',
    presetCode: 'CUSTOM',
    travelDate: '',
    departureTime: '',
    arrivalTime: '',
    departurePlace: '',
    arrivalPlace: '',
    selectedTeamOrderIndexes: [],
    unitPriceKrw: 0,
  };
}

export function buildExternalTransferFromPreset(
  presetCode: ExternalTransferPresetCode,
  teamOrderIndex: number | null,
  teams: ExternalTransferTeamLike[],
): ExternalTransfer {
  const preset = getExternalTransferPresetOption(presetCode);
  const selectedTeamOrderIndexes = typeof teamOrderIndex === 'number' && teamOrderIndex >= 0 ? [teamOrderIndex] : [];
  const team = typeof teamOrderIndex === 'number' ? teams[teamOrderIndex] : undefined;

  const base: ExternalTransfer = {
    direction: preset.direction,
    presetCode,
    travelDate: '',
    departureTime: '',
    arrivalTime: '',
    departurePlace: preset.departurePlace,
    arrivalPlace: preset.arrivalPlace,
    selectedTeamOrderIndexes,
    unitPriceKrw: preset.unitPriceKrw,
  };

  if (!team) {
    return base;
  }

  if (
    presetCode === 'DROP_ULAANBAATAR_AIRPORT' ||
    presetCode === 'DROP_TERELJ_AIRPORT' ||
    presetCode === 'DROP_OZHOUSE_AIRPORT'
  ) {
    const departure = shiftUtcDateTime(team.flightOutDate, team.flightOutTime, -270);
    const arrival = shiftUtcDateTime(team.flightOutDate, team.flightOutTime, -180);
    if (!departure || !arrival) {
      return base;
    }

    return {
      ...base,
      travelDate: departure.date,
      departureTime: departure.time,
      arrivalTime: arrival.time,
    };
  }

  if (
    presetCode === 'PICKUP_AIRPORT_OZHOUSE' ||
    presetCode === 'PICKUP_AIRPORT_ULAANBAATAR' ||
    presetCode === 'PICKUP_AIRPORT_TERELJ'
  ) {
    const baseDateTime = toUtcDate(team.flightInDate, team.flightInTime);
    if (!baseDateTime) {
      return base;
    }

    const roundedDeparture = ceilToHalfHour(new Date(baseDateTime.getTime() + 60 * 60_000));
    const arrival = new Date(roundedDeparture.getTime() + 60 * 60_000);

    return {
      ...base,
      travelDate: formatIsoDate(roundedDeparture),
      departureTime: formatTime(roundedDeparture),
      arrivalTime: formatTime(arrival),
    };
  }

  return base;
}

export function applyExternalTransferPresetToSelection(
  previous: ExternalTransfer,
  presetCode: ExternalTransferPresetCode,
  teams: ExternalTransferTeamLike[],
): ExternalTransfer {
  const selectedTeamOrderIndexes = previous.selectedTeamOrderIndexes.length > 0 ? previous.selectedTeamOrderIndexes : [];
  const firstTeamOrderIndex = selectedTeamOrderIndexes[0] ?? 0;
  const presetTransfer = buildExternalTransferFromPreset(
    presetCode,
    teams[firstTeamOrderIndex] ? firstTeamOrderIndex : null,
    teams,
  );

  return {
    ...presetTransfer,
    selectedTeamOrderIndexes,
    direction: presetCode === 'CUSTOM' ? previous.direction : presetTransfer.direction,
  };
}

export function syncExternalTransferWithSelectedTeams(
  transfer: ExternalTransfer,
  teams: ExternalTransferTeamLike[],
): ExternalTransfer {
  if (transfer.presetCode === 'CUSTOM') {
    return transfer;
  }

  const nextSelectedTeamOrderIndexes = transfer.selectedTeamOrderIndexes
    .filter((teamOrderIndex) => Number.isInteger(teamOrderIndex) && teamOrderIndex >= 0 && teamOrderIndex < teams.length)
    .sort((left, right) => left - right);
  const firstTeamOrderIndex = nextSelectedTeamOrderIndexes[0];
  const presetTransfer = buildExternalTransferFromPreset(
    transfer.presetCode,
    typeof firstTeamOrderIndex === 'number' ? firstTeamOrderIndex : null,
    teams,
  );

  return {
    ...transfer,
    ...presetTransfer,
    selectedTeamOrderIndexes: nextSelectedTeamOrderIndexes,
  };
}

export function isExternalTransferComplete(transfer: ExternalTransfer): boolean {
  return (
    transfer.travelDate.trim().length > 0 &&
    transfer.departureTime.trim().length > 0 &&
    transfer.arrivalTime.trim().length > 0 &&
    transfer.departurePlace.trim().length > 0 &&
    transfer.arrivalPlace.trim().length > 0 &&
    transfer.selectedTeamOrderIndexes.length > 0 &&
    Number.isInteger(transfer.unitPriceKrw) &&
    transfer.unitPriceKrw >= 0
  );
}

export function formatExternalTransferLine(transfer: ExternalTransfer, teamName: string): string {
  const parsed = parseIsoDate(transfer.travelDate);
  const dateLabel = parsed
    ? `${String(parsed.month).padStart(2, '0')}/${String(parsed.day).padStart(2, '0')}`
    : '--/--';
  return `${teamName} ${dateLabel} ${transfer.departureTime} ${transfer.departurePlace} > ${transfer.arrivalTime} ${transfer.arrivalPlace}`;
}

export function buildExternalTransferDirectionText(
  transfers: ExternalTransfer[] | null | undefined,
  teams: ExternalTransferTeamLike[] | null | undefined,
  direction: ExternalTransferDirection,
): string {
  if (!transfers || !teams || transfers.length === 0 || teams.length === 0) {
    return '-';
  }

  const lines = transfers.flatMap((transfer) => {
    if (transfer.direction !== direction) {
      return [];
    }

    return transfer.selectedTeamOrderIndexes
      .slice()
      .sort((left, right) => left - right)
      .map((teamOrderIndex) => {
        const team = teams[teamOrderIndex];
        if (!team) {
          return null;
        }

        return formatExternalTransferLine(transfer, team.teamName || `${teamOrderIndex + 1}번 팀`);
      })
      .filter((value): value is string => typeof value === 'string');
  });

  return lines.length > 0 ? lines.join('\n') : '-';
}

export function buildDerivedExternalTransferManualAdjustments(
  transfers: ExternalTransfer[] | null | undefined,
  teams: ExternalTransferTeamLike[] | null | undefined,
): Array<{ description: string; amountKrw: number }> {
  if (!transfers || !teams || transfers.length === 0 || teams.length === 0) {
    return [];
  }

  return transfers
    .filter((transfer) => isExternalTransferComplete(transfer))
    .map((transfer) => {
      const teamLabels = transfer.selectedTeamOrderIndexes
        .map((teamOrderIndex) => teams[teamOrderIndex]?.teamName || `${teamOrderIndex + 1}번 팀`)
        .join(', ');
      const routeLabel = `${transfer.departurePlace}→${transfer.arrivalPlace}`;
      return {
        description: `실투어 외 ${transfer.direction === 'PICKUP' ? '픽업' : '드랍'}(${routeLabel}) ${teamLabels}`,
        amountKrw: transfer.unitPriceKrw * transfer.selectedTeamOrderIndexes.length,
      };
    });
}
