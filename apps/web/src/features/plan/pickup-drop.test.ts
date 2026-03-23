import { describe, expect, it } from 'vitest';
import { VariantType } from '../../generated/graphql';
import {
  getRecommendedPickupTime,
  isEarlyPickupTime,
  isExtendDropTime,
  resolveAutoVariantType,
} from './pickup-drop';

describe('getRecommendedPickupTime', () => {
  it('uses 04:30 pickup when IN is 04:30', () => {
    expect(getRecommendedPickupTime('04:30')).toBe('04:30');
  });

  it('keeps 05:00 for other early-morning IN in 04:00–05:00', () => {
    expect(getRecommendedPickupTime('04:00')).toBe('05:00');
    expect(getRecommendedPickupTime('04:45')).toBe('05:00');
  });
});

describe('pickup-drop variant automation', () => {
  it('treats pickup 04:00-05:00 as early', () => {
    expect(isEarlyPickupTime('03:30')).toBe(false);
    expect(isEarlyPickupTime('04:00')).toBe(true);
    expect(isEarlyPickupTime('04:30')).toBe(true);
    expect(isEarlyPickupTime('05:00')).toBe(true);
    expect(isEarlyPickupTime('05:30')).toBe(false);
  });

  it('treats drop 21:00-23:30 as extend', () => {
    expect(isExtendDropTime('20:30')).toBe(false);
    expect(isExtendDropTime('21:00')).toBe(true);
    expect(isExtendDropTime('22:30')).toBe(true);
    expect(isExtendDropTime('23:30')).toBe(true);
    expect(isExtendDropTime('23:45')).toBe(false);
  });

  it('combines early pickup and late drop into earlyExtend', () => {
    expect(
      resolveAutoVariantType(VariantType.Basic, [
        { pickupTime: '05:00', dropTime: '19:00' },
        { pickupTime: '08:00', dropTime: '23:00' },
      ]),
    ).toBe(VariantType.EarlyExtend);
  });

  it('preserves afternoon when no auto-check rule matches', () => {
    expect(resolveAutoVariantType(VariantType.Afternoon, [{ pickupTime: '08:00', dropTime: '19:00' }])).toBe(
      VariantType.Afternoon,
    );
  });
});
