import { describe, expect, it } from 'vitest';
import {
  averageMovementIntensity,
  getMovementIntensityMeta,
  movementIntensityToScore,
  parseTravelHoursFromDestinationCellText,
  resolveMovementIntensityForEstimateStop,
} from './movement-intensity';

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

  it('parses travel hours from destination cell text', () => {
    expect(parseTravelHoursFromDestinationCellText('차강소브라가 욜린암 이동 10시간 (600 km)')).toBe(10);
    expect(parseTravelHoursFromDestinationCellText('바양작 이동 6시간 (300 km)')).toBe(6);
    expect(parseTravelHoursFromDestinationCellText('텍스트 없음')).toBeNull();
  });

  it('resolves intensity from destination when movementIntensity is missing', () => {
    expect(
      resolveMovementIntensityForEstimateStop(
        {
          rowType: 'MAIN',
          movementIntensity: null,
          destinationCellText: '테를지 이동 2시간 (100 km)',
        },
        null,
      ),
    ).toBe('LEVEL_1');
    expect(
      resolveMovementIntensityForEstimateStop(
        {
          rowType: 'MAIN',
          movementIntensity: 'LEVEL_3',
          destinationCellText: '무시됨 이동 2시간',
        },
        null,
      ),
    ).toBe('LEVEL_3');
  });
});
