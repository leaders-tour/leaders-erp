import { describe, expect, it } from 'vitest';
import { getColorByDestination } from './trip-color';

describe('getColorByDestination', () => {
  it('캘린더와 동일한 키워드 규칙으로 색상을 반환한다', () => {
    expect(getColorByDestination('고비 + 테를지').bg).toBe('bg-amber-500');
    expect(getColorByDestination('홉스골').text).toBe('text-blue-700');
    expect(getColorByDestination('중부').textSelected).toBe('text-emerald-300');
    expect(getColorByDestination('자브항').bg).toBe('bg-violet-500');
  });

  it('매칭되지 않으면 fallback 색상을 사용한다', () => {
    expect(getColorByDestination('울란바토르').bg).toBe('bg-blue-500');
  });
});
