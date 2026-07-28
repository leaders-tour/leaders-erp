import { describe, expect, it } from 'vitest';
import type { EstimateTransportGroup } from '../estimate/model/types';
import {
  isTransportGroupFlightFieldsInvalid,
  mapTransportGroupToPlanMutationInput,
  primaryMetaFlightFields,
} from './transport-group-plan-input';

function createGroup(overrides: Partial<EstimateTransportGroup> = {}): EstimateTransportGroup {
  return {
    teamName: 'A팀',
    headcount: 8,
    flightInDate: '',
    flightInTime: '',
    flightOutDate: '',
    flightOutTime: '',
    pickupDate: '',
    pickupTime: '',
    pickupPlaceType: 'AIRPORT',
    pickupPlaceCustomText: '',
    dropDate: '',
    dropTime: '',
    dropPlaceType: 'AIRPORT',
    dropPlaceCustomText: '',
    ...overrides,
  };
}

describe('mapTransportGroupToPlanMutationInput', () => {
  it('preserves date-only flight fields', () => {
    const result = mapTransportGroupToPlanMutationInput(
      createGroup({
        flightInDate: '2026-07-15',
        flightOutDate: '2026-07-20',
      }),
    );

    expect(result).toMatchObject({
      flightInDate: '2026-07-15T00:00:00.000Z',
      flightOutDate: '2026-07-20T00:00:00.000Z',
    });
    expect(result).not.toHaveProperty('flightInTime');
    expect(result).not.toHaveProperty('flightOutTime');
  });

  it('preserves complete flight pairs independently', () => {
    const result = mapTransportGroupToPlanMutationInput(
      createGroup({
        flightInDate: '2026-07-15',
        flightInTime: '02:45',
        flightOutDate: '2026-07-20',
        flightOutTime: '18:15',
      }),
    );

    expect(result).toMatchObject({
      flightInDate: '2026-07-15T00:00:00.000Z',
      flightInTime: '02:45',
      flightOutDate: '2026-07-20T00:00:00.000Z',
      flightOutTime: '18:15',
    });
  });
});

describe('isTransportGroupFlightFieldsInvalid', () => {
  it('flags time-only schedules', () => {
    expect(
      isTransportGroupFlightFieldsInvalid(
        createGroup({
          flightInTime: '02:45',
        }),
      ),
    ).toBe(true);
  });

  it('allows date-only schedules', () => {
    expect(
      isTransportGroupFlightFieldsInvalid(
        createGroup({
          flightInDate: '2026-07-15',
        }),
      ),
    ).toBe(false);
  });
});

describe('primaryMetaFlightFields', () => {
  it('includes only present flight times', () => {
    expect(
      primaryMetaFlightFields(
        createGroup({
          flightInDate: '2026-07-15',
          flightOutDate: '2026-07-20',
          flightOutTime: '18:15',
        }),
      ),
    ).toEqual({
      flightOutTime: '18:15',
    });
  });
});
