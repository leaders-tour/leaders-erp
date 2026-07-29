import { describe, expect, it } from 'vitest';
import {
  resolveVehicleAssignmentsForHeadcount,
  resolveVehicleTypeForHeadcount,
} from './builder-vehicle';

const VEHICLES = ['스타렉스', '푸르공', '벨파이어', '하이에이스', '프리미엄 밴', 'SUV'] as const;

describe('resolveVehicleTypeForHeadcount', () => {
  it('7명 이상이면 하이에이스로 자동 선택한다', () => {
    expect(resolveVehicleTypeForHeadcount(7, '스타렉스', VEHICLES)).toBe('하이에이스');
    expect(resolveVehicleTypeForHeadcount(8, '스타렉스', VEHICLES)).toBe('하이에이스');
    expect(resolveVehicleTypeForHeadcount(12, '푸르공', VEHICLES)).toBe('하이에이스');
  });

  it('6명 이하이거나 하이에이스가 아니면 기존 차량을 유지한다', () => {
    expect(resolveVehicleTypeForHeadcount(6, '스타렉스', VEHICLES)).toBe('스타렉스');
    expect(resolveVehicleTypeForHeadcount(5, '푸르공', VEHICLES)).toBe('푸르공');
  });

  it('7명 이상에서 6명 이하로 줄이면 하이에이스를 스타렉스로 되돌린다', () => {
    expect(resolveVehicleTypeForHeadcount(6, '하이에이스', VEHICLES, 7)).toBe('스타렉스');
    expect(resolveVehicleTypeForHeadcount(6, '하이에이스', VEHICLES, 8)).toBe('스타렉스');
  });

  it('2~6명이면 수동 선택한 하이에이스를 유지한다', () => {
    expect(resolveVehicleTypeForHeadcount(2, '하이에이스', VEHICLES)).toBe('하이에이스');
    expect(resolveVehicleTypeForHeadcount(6, '하이에이스', VEHICLES)).toBe('하이에이스');
    expect(resolveVehicleTypeForHeadcount(5, '하이에이스', VEHICLES, 5)).toBe('하이에이스');
  });

  it('1명이면 하이에이스를 스타렉스로 되돌린다', () => {
    expect(resolveVehicleTypeForHeadcount(1, '하이에이스', VEHICLES)).toBe('스타렉스');
  });
});

describe('resolveVehicleAssignmentsForHeadcount', () => {
  it('7명에서 6명으로 줄이면 첫 배정 줄만 스타렉스로 되돌린다', () => {
    expect(
      resolveVehicleAssignmentsForHeadcount(
        6,
        [{ vehicleType: '하이에이스', count: 1 }],
        VEHICLES,
        7,
      ),
    ).toEqual([{ vehicleType: '스타렉스', count: 1 }]);
  });

  it('직접입력 차종은 인원 변경 시 유지한다', () => {
    expect(
      resolveVehicleAssignmentsForHeadcount(
        8,
        [{ vehicleType: 'CUSTOM', vehicleTypeCustomText: '45인승 버스', count: 1 }],
        VEHICLES,
        6,
      ),
    ).toEqual([{ vehicleType: 'CUSTOM', vehicleTypeCustomText: '45인승 버스', count: 1 }]);
  });
});
