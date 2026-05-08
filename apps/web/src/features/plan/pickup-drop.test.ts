import { describe, expect, it } from 'vitest';
import { VariantType } from '../../generated/graphql';
import {
  computeAutoVariantSyncUpdate,
  getRecommendedDropSchedule,
  getRecommendedPickupSchedule,
  getRecommendedPickupTime,
  inferVariantTypeFromTransportGroups,
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

describe('getRecommendedPickupSchedule', () => {
  const travelStart = '2024-08-11';

  it('caps pickup to first travel day when IN is before travel start', () => {
    expect(getRecommendedPickupSchedule('2024-08-10', '02:45', travelStart)).toEqual({
      date: travelStart,
      time: '04:00',
    });
  });

  it('uses IN date when IN is on or after travel start', () => {
    expect(getRecommendedPickupSchedule('2024-08-11', '02:45', travelStart)).toEqual({
      date: '2024-08-11',
      time: '04:00',
    });
    expect(getRecommendedPickupSchedule('2024-08-12', '13:20', travelStart)).toEqual({
      date: '2024-08-12',
      time: '08:00',
    });
  });

  it('omitting travelStartDate keeps legacy IN-date behavior', () => {
    expect(getRecommendedPickupSchedule('2024-08-10', '02:45')).toEqual({
      date: '2024-08-10',
      time: '04:00',
    });
  });

  it('returns empty pickup when flight IN date or time is missing', () => {
    expect(getRecommendedPickupSchedule('', '04:30', travelStart)).toEqual({
      date: '',
      time: '',
    });
    expect(getRecommendedPickupSchedule('2024-08-11', '', travelStart)).toEqual({
      date: '',
      time: '',
    });
  });
});

describe('getRecommendedDropSchedule', () => {
  const travelEnd = '2024-08-16';

  it('caps drop to last travel day at DEFAULT end−3h when OUT is after travel end (daytime)', () => {
    expect(getRecommendedDropSchedule('2024-08-17', '18:15', travelEnd)).toEqual({
      date: travelEnd,
      time: '16:00',
    });
  });

  it('uses 23:00 on last travel day when OUT is after travel end and departure is early morning', () => {
    expect(getRecommendedDropSchedule('2024-08-17', '02:05', travelEnd)).toEqual({
      date: travelEnd,
      time: '23:00',
    });
  });

  it('keeps previous-day 23:00 extension when OUT is on travel end day', () => {
    expect(getRecommendedDropSchedule('2024-08-16', '02:05', travelEnd)).toEqual({
      date: '2024-08-15',
      time: '23:00',
    });
  });

  it('keeps flight-based schedule when OUT is before travel end (early departure)', () => {
    expect(getRecommendedDropSchedule('2024-08-14', '18:15', travelEnd)).toEqual({
      date: '2024-08-14',
      time: '15:30',
    });
  });

  it('returns empty drop when flight OUT date or time is missing', () => {
    expect(getRecommendedDropSchedule('', '18:15', travelEnd)).toEqual({ date: '', time: '' });
    expect(getRecommendedDropSchedule('2024-08-16', '', travelEnd)).toEqual({ date: '', time: '' });
  });

  it('omitting travelEndDate keeps legacy flight-only behavior for late OUT', () => {
    expect(getRecommendedDropSchedule('2024-08-17', '18:15')).toEqual({
      date: '2024-08-17',
      time: '15:30',
    });
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

describe('inferVariantTypeFromTransportGroups', () => {
  it('returns null when no early pickup or extend drop signal', () => {
    expect(inferVariantTypeFromTransportGroups([{ pickupTime: '08:00', dropTime: '19:00' }])).toBeNull();
  });

  it('returns earlyExtend when both signals present', () => {
    expect(inferVariantTypeFromTransportGroups([{ pickupTime: '05:00', dropTime: '22:00' }])).toBe(
      VariantType.EarlyExtend,
    );
  });
});

describe('computeAutoVariantSyncUpdate', () => {
  it('returns null when manual override locks auto sync', () => {
    expect(
      computeAutoVariantSyncUpdate(true, VariantType.Basic, [{ pickupTime: '05:00', dropTime: '22:00' }]),
    ).toBeNull();
  });

  it('returns inferred variant when unlocked and current differs', () => {
    expect(
      computeAutoVariantSyncUpdate(false, VariantType.Basic, [{ pickupTime: '05:00', dropTime: '22:00' }]),
    ).toBe(VariantType.EarlyExtend);
  });

  it('returns null when unlocked and already in sync', () => {
    expect(
      computeAutoVariantSyncUpdate(false, VariantType.EarlyExtend, [{ pickupTime: '05:00', dropTime: '22:00' }]),
    ).toBeNull();
  });
});
