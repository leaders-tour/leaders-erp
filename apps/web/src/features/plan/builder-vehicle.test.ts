import { describe, expect, it } from 'vitest';
import { resolveVehicleTypeForHeadcount } from './builder-vehicle';

const VEHICLES = ['스타렉스', '푸르공', '벨파이어', '하이에이스', '프리미엄 밴'] as const;

describe('resolveVehicleTypeForHeadcount', () => {
  it('8명 이상이면 하이에이스로 자동 선택한다', () => {
    expect(resolveVehicleTypeForHeadcount(8, '스타렉스', VEHICLES)).toBe('하이에이스');
    expect(resolveVehicleTypeForHeadcount(12, '푸르공', VEHICLES)).toBe('하이에이스');
  });

  it('7명 이하이면 기존 차량을 유지한다', () => {
    expect(resolveVehicleTypeForHeadcount(7, '스타렉스', VEHICLES)).toBe('스타렉스');
    expect(resolveVehicleTypeForHeadcount(5, '푸르공', VEHICLES)).toBe('푸르공');
    expect(resolveVehicleTypeForHeadcount(4, '하이에이스', VEHICLES)).toBe('하이에이스');
  });

  it('하이에이스는 3명 미만이면 스타렉스로 되돌린다', () => {
    expect(resolveVehicleTypeForHeadcount(2, '하이에이스', VEHICLES)).toBe('스타렉스');
  });
});
