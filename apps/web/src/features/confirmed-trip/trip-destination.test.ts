import { describe, expect, it } from 'vitest';
import { getTripDestination, type ConfirmedTripRow } from './hooks';
import { getTripRegionBucket, tripMatchesAggRegion } from './trip-region-bucket';

function tripWithRegionSets(input: {
  planRegionSetName?: string | null;
  planVersionRegionSetName?: string | null;
  destination?: string | null;
}): ConfirmedTripRow {
  return {
    destination: input.destination ?? null,
    plan: input.planRegionSetName
      ? {
          id: 'plan-1',
          title: 'plan',
          regionSet: { id: 'plan-region-set', name: input.planRegionSetName },
        }
      : null,
    planVersion: input.planVersionRegionSetName
      ? {
          id: 'version-1',
          versionNumber: 2,
          totalDays: 5,
          variantType: 'CUSTOM',
          regionSet: { id: 'version-region-set', name: input.planVersionRegionSetName },
          meta: null,
        }
      : null,
  } as ConfirmedTripRow;
}

describe('confirmed trip destination helpers', () => {
  it('prefers the currently linked plan version region set over the base plan region set', () => {
    const trip = tripWithRegionSets({
      planRegionSetName: '고비 + 테를지',
      planVersionRegionSetName: '중부',
      destination: '수동 목적지',
    });

    expect(getTripDestination(trip)).toBe('중부');
    expect(getTripRegionBucket(trip)).toBe('중부');
    expect(tripMatchesAggRegion(trip, '중부')).toBe(true);
  });

  it('falls back to the base plan region set and direct destination for legacy trips', () => {
    expect(
      getTripDestination(
        tripWithRegionSets({
          planRegionSetName: '고비',
          planVersionRegionSetName: null,
          destination: '수동 목적지',
        }),
      ),
    ).toBe('고비');

    expect(
      getTripDestination(
        tripWithRegionSets({
          planRegionSetName: null,
          planVersionRegionSetName: null,
          destination: '수동 목적지',
        }),
      ),
    ).toBe('수동 목적지');
  });
});
