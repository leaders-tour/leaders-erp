import type { MovementIntensity } from '@prisma/client';

export const MOVEMENT_INTENSITY_ORDER: readonly MovementIntensity[] = [
  'LEVEL_1',
  'LEVEL_2',
  'LEVEL_3',
  'LEVEL_4',
  'LEVEL_5',
] as const;

export function calculateMovementIntensity(averageTravelHours: number): MovementIntensity {
  if (averageTravelHours <= 3) {
    return 'LEVEL_1';
  }
  if (averageTravelHours <= 5) {
    return 'LEVEL_2';
  }
  if (averageTravelHours <= 7) {
    return 'LEVEL_3';
  }
  if (averageTravelHours <= 9) {
    return 'LEVEL_4';
  }
  return 'LEVEL_5';
}

export function movementIntensityToScore(value: MovementIntensity | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const index = MOVEMENT_INTENSITY_ORDER.indexOf(value);
  return index >= 0 ? index + 1 : null;
}

export function scoreToMovementIntensity(score: number | null | undefined): MovementIntensity | null {
  if (!score || score < 1 || score > MOVEMENT_INTENSITY_ORDER.length) {
    return null;
  }

  return MOVEMENT_INTENSITY_ORDER[score - 1] ?? null;
}

export function calculateAverageMovementIntensity(
  values: Array<MovementIntensity | null | undefined>,
): MovementIntensity | null {
  const scores = values
    .map((value) => movementIntensityToScore(value))
    .filter((value): value is number => typeof value === 'number');

  if (scores.length === 0) {
    return null;
  }

  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return scoreToMovementIntensity(Math.round(average));
}
