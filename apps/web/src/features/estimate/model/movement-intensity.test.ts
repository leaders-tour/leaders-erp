import { describe, expect, it } from 'vitest';
import { averageMovementIntensity, getMovementIntensityMeta, movementIntensityToScore } from './movement-intensity';

describe('estimate movement-intensity model', () => {
  it('returns badge metadata for each level', () => {
    expect(getMovementIntensityMeta('LEVEL_1')?.label).toBe('이동강도1');
    expect(getMovementIntensityMeta('LEVEL_5')?.textColor).toBe('#111111');
  });

  it('converts levels to numeric scores', () => {
    expect(movementIntensityToScore('LEVEL_3')).toBe(3);
    expect(movementIntensityToScore(undefined)).toBeNull();
  });

  it('averages levels while ignoring null rows', () => {
    expect(averageMovementIntensity(['LEVEL_2', null, 'LEVEL_3'])).toBe('LEVEL_3');
    expect(averageMovementIntensity([])).toBeNull();
  });
});
