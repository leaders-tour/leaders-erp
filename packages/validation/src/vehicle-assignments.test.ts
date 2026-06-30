import { describe, expect, it } from 'vitest';
import {
  formatVehicleAssignmentsForDisplay,
  normalizeVehicleAssignments,
  validateHiaceHeadcountForAssignments,
} from './vehicle-assignments';

describe('normalizeVehicleAssignments', () => {
  it('falls back to single vehicleType', () => {
    expect(normalizeVehicleAssignments(null, '카운티')).toEqual([{ vehicleType: '카운티', count: 1 }]);
  });

  it('parses valid array', () => {
    expect(
      normalizeVehicleAssignments(
        [
          { vehicleType: '하이에이스', count: 1 },
          { vehicleType: '스타렉스', count: 1 },
        ],
        '스타렉스',
      ),
    ).toEqual([
      { vehicleType: '하이에이스', count: 1 },
      { vehicleType: '스타렉스', count: 1 },
    ]);
  });
});

describe('formatVehicleAssignmentsForDisplay', () => {
  it('formats single and multiple rows', () => {
    expect(formatVehicleAssignmentsForDisplay([{ vehicleType: '카운티', count: 2 }])).toBe('카운티 2대');
    expect(
      formatVehicleAssignmentsForDisplay([
        { vehicleType: '하이에이스', count: 1 },
        { vehicleType: '스타렉스', count: 1 },
      ]),
    ).toBe('하이에이스 1대, 스타렉스 1대');
  });
});

describe('validateHiaceHeadcountForAssignments', () => {
  it('requires 2+ headcount when hiace assigned', () => {
    expect(
      validateHiaceHeadcountForAssignments([{ vehicleType: '하이에이스', count: 2 }], 1),
    ).toMatch(/2인 이상/);
    expect(
      validateHiaceHeadcountForAssignments([{ vehicleType: '하이에이스', count: 2 }], 4),
    ).toBeNull();
  });
});
