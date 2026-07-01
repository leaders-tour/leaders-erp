import {
  buildExternalTransferDirectionText as buildExternalTransferDirectionTextFromDomain,
  formatExternalTransferLine as formatExternalTransferLineFromDomain,
  type CustomerDocumentExternalTransfer,
} from '@tour/domain';
import { parseTimeToMinutes } from './pickup-drop';

export type ExternalTransferDirection = 'PICKUP' | 'DROP';

export type ExternalTransferPresetCode =
  | 'DROP_ULAANBAATAR_AIRPORT'
  | 'DROP_TERELJ_AIRPORT'
  | 'DROP_OZHOUSE_AIRPORT'
  | 'PICKUP_AIRPORT_OZHOUSE'
  | 'PICKUP_AIRPORT_ULAANBAATAR'
  | 'PICKUP_AIRPORT_TERELJ'
  | 'CUSTOM';

export interface ExternalTransfer extends CustomerDocumentExternalTransfer {
  presetCode: ExternalTransferPresetCode;
}

export interface ExternalTransferTeamLike {
  orderIndex?: number;
  teamName: string;
  headcount?: number;
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
    label: '울란바토르 → 공항',
    description: 'OUT 기준 출발 -4시간 30분 / 도착 -3시간',
    direction: 'DROP',
    departurePlace: '울란바토르',
    arrivalPlace: '공항',
  },
  {
    code: 'DROP_TERELJ_AIRPORT',
    label: '테를지 → 공항',
    description: 'OUT 기준 출발 -4시간 30분 / 도착 -3시간',
    direction: 'DROP',
    departurePlace: '테를지',
    arrivalPlace: '공항',
  },
  {
    code: 'DROP_OZHOUSE_AIRPORT',
    label: '오즈하우스 → 공항',
    description: 'OUT 기준 출발 -4시간 30분 / 도착 -3시간',
    direction: 'DROP',
    departurePlace: '오즈하우스',
    arrivalPlace: '공항',
  },
  {
    code: 'PICKUP_AIRPORT_OZHOUSE',
    label: '공항 → 오즈하우스',
    description: 'IN +1시간 후 다음 00/30으로 올림(04:30 IN은 04:30 동일), 도착은 +1시간',
    direction: 'PICKUP',
    departurePlace: '공항',
    arrivalPlace: '오즈하우스',
  },
  {
    code: 'PICKUP_AIRPORT_ULAANBAATAR',
    label: '공항 → 울란바토르',
    description: 'IN +1시간 후 다음 00/30으로 올림(04:30 IN은 04:30 동일), 도착은 +1시간',
    direction: 'PICKUP',
    departurePlace: '공항',
    arrivalPlace: '울란바토르',
  },
  {
    code: 'PICKUP_AIRPORT_TERELJ',
    label: '공항 → 테를지',
    description: 'IN +1시간 후 다음 00/30으로 올림(04:30 IN은 04:30 동일), 도착은 +1시간',
    direction: 'PICKUP',
    departurePlace: '공항',
    arrivalPlace: '테를지',
  },
  {
    code: 'CUSTOM',
    label: '수동입력',
    description: '방향, 날짜, 시간, 장소를 직접 입력',
    direction: 'PICKUP',
    departurePlace: '',
    arrivalPlace: '',
  },
];

function parseIsoDate(value: string | null | undefined): { year: number; month: number; day: number } | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return null;
  }

  // GraphQL DateTime은 보통 `YYYY-MM-DDTHH:mm:ss.sssZ` 로 직렬화되고, 빌더 로컬 상태는 `YYYY-MM-DD`만 쓴다.
  const datePart = trimmed.includes('T') ? (trimmed.split('T')[0] ?? '') : (trimmed.split(' ')[0] ?? '');
  const match = ISO_DATE_PATTERN.exec(datePart);
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

    const inMinutes = parseTimeToMinutes(team.flightInTime);
    if (inMinutes === 4 * 60 + 30) {
      const arrival = new Date(baseDateTime.getTime() + 60 * 60_000);
      return {
        ...base,
        travelDate: formatIsoDate(baseDateTime),
        departureTime: formatTime(baseDateTime),
        arrivalTime: formatTime(arrival),
      };
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
    .filter((teamOrderIndex, index, array) => array.indexOf(teamOrderIndex) === index)
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

export function syncExternalTransferTeamSelection(
  transfer: ExternalTransfer,
  teams: ExternalTransferTeamLike[],
): ExternalTransfer {
  return {
    ...transfer,
    selectedTeamOrderIndexes: transfer.selectedTeamOrderIndexes
      .filter((teamOrderIndex) => Number.isInteger(teamOrderIndex) && teamOrderIndex >= 0 && teamOrderIndex < teams.length)
      .filter((teamOrderIndex, index, array) => array.indexOf(teamOrderIndex) === index)
      .sort((left, right) => left - right),
  };
}

function normalizeExternalTransferTeamIndexes(selectedTeamOrderIndexes: number[]): number[] {
  return Array.from(new Set(selectedTeamOrderIndexes.filter((teamOrderIndex) => Number.isInteger(teamOrderIndex)))).sort(
    (left, right) => left - right,
  );
}

function getExternalTransferSignature(transfer: ExternalTransfer): string {
  return [
    transfer.direction,
    transfer.presetCode,
    transfer.travelDate.trim(),
    transfer.departureTime.trim(),
    transfer.arrivalTime.trim(),
    transfer.departurePlace.trim(),
    transfer.arrivalPlace.trim(),
    normalizeExternalTransferTeamIndexes(transfer.selectedTeamOrderIndexes).join(','),
  ].join('|');
}

export function normalizeExternalTransfers(transfers: ExternalTransfer[] | null | undefined): ExternalTransfer[] {
  if (!transfers || transfers.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  return transfers
    .map((transfer) => {
      const { __typename: _omitTypename, ...rest } = transfer as ExternalTransfer & { __typename?: string };
      return {
        ...rest,
        travelDate: rest.travelDate.trim(),
        departureTime: rest.departureTime.trim(),
        arrivalTime: rest.arrivalTime.trim(),
        departurePlace: rest.departurePlace.trim(),
        arrivalPlace: rest.arrivalPlace.trim(),
        selectedTeamOrderIndexes: normalizeExternalTransferTeamIndexes(rest.selectedTeamOrderIndexes),
      };
    })
    .filter((transfer) => {
      const signature = getExternalTransferSignature(transfer);
      if (seen.has(signature)) {
        return false;
      }
      seen.add(signature);
      return true;
    });
}

export function isExternalTransferComplete(transfer: ExternalTransfer): boolean {
  return (
    transfer.travelDate.trim().length > 0 &&
    transfer.departureTime.trim().length > 0 &&
    transfer.arrivalTime.trim().length > 0 &&
    transfer.departurePlace.trim().length > 0 &&
    transfer.arrivalPlace.trim().length > 0 &&
    transfer.selectedTeamOrderIndexes.length > 0
  );
}

export function formatExternalTransferLine(transfer: ExternalTransfer, teamName?: string | null): string {
  return formatExternalTransferLineFromDomain(transfer, teamName);
}

export function buildExternalTransferDirectionText(
  transfers: ExternalTransfer[] | null | undefined,
  teams: ExternalTransferTeamLike[] | null | undefined,
  direction: ExternalTransferDirection,
): string {
  return buildExternalTransferDirectionTextFromDomain(transfers, teams, direction);
}

/** 표시용: travelDate 문자열에서 YYYY-MM-DD 만 추출 (GraphQL DateTime·로컬 YYYY-MM-DD 모두 허용) */
export function externalTransferTravelDateIso(value: string | null | undefined): string | null {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return null;
  }
  return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
}

export interface ExternalTransferDetailRow {
  key: string;
  teamLabel: string;
  /** YYYY-MM-DD 또는 null — 상위에서 `Date` 표기로 변환 */
  dateIso: string | null;
  departureTime: string;
  departurePlace: string;
  arrivalTime: string;
  arrivalPlace: string;
}

/** 확정 상세 등에서 픽업/드랍을 여러 줄로 렌더링할 때 사용 (팀별 행 분리). */
export function listExternalTransferDetailRows(
  transfers: ExternalTransfer[] | null | undefined,
  teams: ExternalTransferTeamLike[] | null | undefined,
  direction: ExternalTransferDirection,
): ExternalTransferDetailRow[] {
  if (!transfers || transfers.length === 0) {
    return [];
  }

  const teamArr = teams ?? [];

  return transfers.flatMap((transfer, transferIdx) => {
    if (transfer.direction !== direction) {
      return [];
    }

    const normalizedIndexes = transfer.selectedTeamOrderIndexes
      .filter((teamOrderIndex) => Number.isInteger(teamOrderIndex) && teamOrderIndex >= 0)
      .sort((left, right) => left - right)
      .filter((teamOrderIndex, index, array) => array.indexOf(teamOrderIndex) === index);

    const orderIndexes =
      normalizedIndexes.length > 0
        ? normalizedIndexes
        : teamArr.length > 0
          ? teamArr.map((_, i) => i)
          : [0];

    return orderIndexes.map((teamOrderIndex, seq) => {
      const team = teamArr[teamOrderIndex];
      const trimmedName = team?.teamName?.trim();
      const teamLabel =
        trimmedName && trimmedName.length > 0 ? trimmedName : `${teamOrderIndex + 1}번 팀`;

      return {
        key: `${direction}-${transferIdx}-${teamOrderIndex}-${seq}`,
        teamLabel,
        dateIso: externalTransferTravelDateIso(transfer.travelDate),
        departureTime: transfer.departureTime,
        departurePlace: transfer.departurePlace,
        arrivalTime: transfer.arrivalTime,
        arrivalPlace: transfer.arrivalPlace,
      } satisfies ExternalTransferDetailRow;
    });
  });
}
