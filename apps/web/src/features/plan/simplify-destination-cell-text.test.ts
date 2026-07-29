import { describe, expect, it } from 'vitest';
import { simplifyDestinationCellText } from './simplify-destination-cell-text';

describe('simplifyDestinationCellText', () => {
  it('removes inline travel time and distance', () => {
    expect(simplifyDestinationCellText('볼강 이동 7시간 (450 km)')).toBe('볼강');
    expect(simplifyDestinationCellText('칭기즈칸 공항 이동 7시간 (450 km)')).toBe('칭기즈칸 공항');
  });

  it('removes multiline travel metadata', () => {
    expect(simplifyDestinationCellText('울란바토르\n이동 1.5시간\n(35 km)')).toBe('울란바토르');
    expect(simplifyDestinationCellText('차강소브라가\n욜린암\n이동 1시간\n(50 km)')).toBe('차강소브라가 욜린암');
  });
});
