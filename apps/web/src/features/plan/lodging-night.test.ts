import { describe, expect, it } from 'vitest';
import { isLodgingSettingDay, isLodgingSettingDayIndex } from './lodging-night';

describe('lodging-night', () => {
  it('allows lodging settings for days before the last travel day', () => {
    expect(isLodgingSettingDay(1, 6)).toBe(true);
    expect(isLodgingSettingDay(5, 6)).toBe(true);
  });

  it('disables lodging settings on the last travel day', () => {
    expect(isLodgingSettingDay(6, 6)).toBe(false);
  });

  it('maps zero-based day indexes to the same rule', () => {
    expect(isLodgingSettingDayIndex(4, 6)).toBe(true);
    expect(isLodgingSettingDayIndex(5, 6)).toBe(false);
  });
});
