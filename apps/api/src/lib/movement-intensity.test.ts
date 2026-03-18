import { describe, expect, it } from 'vitest';
import {
  calculateAverageMovementIntensity,
  calculateMovementIntensity,
  movementIntensityToScore,
} from './movement-intensity';

describe('movement-intensity', () => {
  it('maps travel hour thresholds to intensity levels', () => {
    expect(calculateMovementIntensity(3)).toBe('LEVEL_1');
    expect(calculateMovementIntensity(3.1)).toBe('LEVEL_2');
    expect(calculateMovementIntensity(5)).toBe('LEVEL_2');
    expect(calculateMovementIntensity(5.1)).toBe('LEVEL_3');
    expect(calculateMovementIntensity(7)).toBe('LEVEL_3');
    expect(calculateMovementIntensity(7.1)).toBe('LEVEL_4');
    expect(calculateMovementIntensity(9)).toBe('LEVEL_4');
    expect(calculateMovementIntensity(9.1)).toBe('LEVEL_5');
  });

  it('averages only non-null values and rounds to the nearest level', () => {
    expect(calculateAverageMovementIntensity(['LEVEL_2', null, 'LEVEL_3'])).toBe('LEVEL_3');
    expect(calculateAverageMovementIntensity(['LEVEL_1', 'LEVEL_2'])).toBe('LEVEL_2');
    expect(calculateAverageMovementIntensity([null, undefined])).toBeNull();
  });

  it('converts enum values to numeric scores', () => {
    expect(movementIntensityToScore('LEVEL_1')).toBe(1);
    expect(movementIntensityToScore('LEVEL_5')).toBe(5);
    expect(movementIntensityToScore(null)).toBeNull();
  });
});
