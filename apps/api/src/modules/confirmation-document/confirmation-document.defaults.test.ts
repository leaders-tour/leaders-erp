import { describe, expect, it } from 'vitest';
import { resolveConfirmedTripDestination } from './confirmation-document.defaults';

describe('resolveConfirmedTripDestination', () => {
  it('prefers linked plan version region set over legacy destination', () => {
    expect(
      resolveConfirmedTripDestination({
        planVersionRegionSetName: '고비 + 테를지',
        planRegionSetName: '고비',
        destination: '고비테를지',
      }),
    ).toBe('고비 + 테를지');
  });

  it('falls back to plan region set and direct destination for legacy trips', () => {
    expect(
      resolveConfirmedTripDestination({
        planVersionRegionSetName: null,
        planRegionSetName: '고비 + 테를지',
        destination: '고비테를지',
      }),
    ).toBe('고비 + 테를지');

    expect(
      resolveConfirmedTripDestination({
        planVersionRegionSetName: null,
        planRegionSetName: null,
        destination: '수동 목적지',
      }),
    ).toBe('수동 목적지');
  });
});
