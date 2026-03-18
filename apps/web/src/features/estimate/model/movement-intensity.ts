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
