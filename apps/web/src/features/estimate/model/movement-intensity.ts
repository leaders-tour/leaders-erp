export type MovementIntensityValue = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5';

export interface MovementIntensityMeta {
  label: string;
  shortLabel: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

const MOVEMENT_INTENSITY_ORDER: readonly MovementIntensityValue[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5'];

const MOVEMENT_INTENSITY_META: Record<MovementIntensityValue, MovementIntensityMeta> = {
  LEVEL_1: {
    label: '이동강도1',
    shortLabel: '1',
    color: '#22c55e',
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    textColor: '#166534',
  },
  LEVEL_2: {
    label: '이동강도2',
    shortLabel: '2',
    color: '#eab308',
    backgroundColor: '#fef9c3',
    borderColor: '#fde047',
    textColor: '#854d0e',
  },
  LEVEL_3: {
    label: '이동강도3',
    shortLabel: '3',
    color: '#f97316',
    backgroundColor: '#ffedd5',
    borderColor: '#fdba74',
    textColor: '#9a3412',
  },
  LEVEL_4: {
    label: '이동강도4',
    shortLabel: '4',
    color: '#ef4444',
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    textColor: '#991b1b',
  },
  LEVEL_5: {
    label: '이동강도5',
    shortLabel: '5',
    color: '#111111',
    backgroundColor: '#e5e7eb',
    borderColor: '#9ca3af',
    textColor: '#111111',
  },
};

export function getMovementIntensityMeta(value: MovementIntensityValue | null | undefined): MovementIntensityMeta | null {
  if (!value) {
    return null;
  }

  return MOVEMENT_INTENSITY_META[value] ?? null;
}

export function movementIntensityToScore(value: MovementIntensityValue | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const index = MOVEMENT_INTENSITY_ORDER.indexOf(value);
  return index >= 0 ? index + 1 : null;
}

export function averageMovementIntensity(
  values: Array<MovementIntensityValue | null | undefined>,
): MovementIntensityValue | null {
  const scores = values
    .map((value) => movementIntensityToScore(value))
    .filter((value): value is number => typeof value === 'number');

  if (scores.length === 0) {
    return null;
  }

  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return MOVEMENT_INTENSITY_ORDER[Math.round(average) - 1] ?? null;
}

export function calculateMovementIntensityByHours(hours: number): MovementIntensityValue {
  if (hours <= 3) {
    return 'LEVEL_1';
  }
  if (hours <= 5) {
    return 'LEVEL_2';
  }
  if (hours <= 7) {
    return 'LEVEL_3';
  }
  if (hours <= 9) {
    return 'LEVEL_4';
  }
  return 'LEVEL_5';
}

/** GraphQL/캐시 등에서 들어오는 값을 LEVEL_* 로 정규화 */
export function normalizeMovementIntensityValue(value: unknown): MovementIntensityValue | null {
  if (typeof value !== 'string') {
    return null;
  }
  const upper = value.trim().toUpperCase();
  return (MOVEMENT_INTENSITY_ORDER as readonly string[]).includes(upper)
    ? (upper as MovementIntensityValue)
    : null;
}

/**
 * 목적지 셀에 들어 있는 "이동 N시간" 문구에서 시간 추출 (일정표 스냅샷 보조용)
 */
export function parseTravelHoursFromDestinationCellText(text: string | null | undefined): number | null {
  if (!text?.trim()) {
    return null;
  }
  const match = text.match(/이동\s*(\d+(?:\.\d+)?)\s*시간/u);
  if (!match?.[1]) {
    return null;
  }
  const hours = Number(match[1]);
  return Number.isFinite(hours) && hours >= 0 ? hours : null;
}

/**
 * 일정표 행의 이동강도: 저장된 값 → 목적지 텍스트 기반 추론 → (선택) 전체 폴백
 */
export function resolveMovementIntensityForEstimateStop(
  input: {
    rowType?: string | null;
    movementIntensity?: unknown;
    destinationCellText?: string | null;
  },
  overallFallback?: MovementIntensityValue | null,
): MovementIntensityValue | null {
  if (input.rowType === 'EXTERNAL_TRANSFER') {
    return null;
  }
  const direct = normalizeMovementIntensityValue(input.movementIntensity);
  if (direct) {
    return direct;
  }
  const hours = parseTravelHoursFromDestinationCellText(input.destinationCellText);
  if (hours != null) {
    return calculateMovementIntensityByHours(hours);
  }
  return overallFallback ?? null;
}
