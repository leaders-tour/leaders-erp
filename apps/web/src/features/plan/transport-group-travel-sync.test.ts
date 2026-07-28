import { describe, expect, it } from 'vitest';
import { DEFAULT_PICKUP_DROP_PLACE_TYPE } from './pickup-drop';
import {
  applyTransportGroupTravelDateSync,
  DEFAULT_TRAVEL_SYNC_FLIGHT_IN_TIME,
  DEFAULT_TRAVEL_SYNC_FLIGHT_OUT_TIME,
  isTransportGroupTravelLinked,
  type TransportGroupTravelSyncDraft,
} from './transport-group-travel-sync';

function createGroup(
  overrides: Partial<TransportGroupTravelSyncDraft> = {},
): TransportGroupTravelSyncDraft {
  return {
    teamName: 'A팀',
    headcount: 8,
    flightInDate: '2026-04-01',
    flightInTime: '11:10',
    flightOutDate: '2026-04-07',
    flightOutTime: '18:15',
    pickupDate: '2026-04-01',
    pickupTime: '08:00',
    pickupPlaceType: DEFAULT_PICKUP_DROP_PLACE_TYPE,
    pickupPlaceCustomText: '',
    dropDate: '2026-04-07',
    dropTime: '15:30',
    dropPlaceType: DEFAULT_PICKUP_DROP_PLACE_TYPE,
    dropPlaceCustomText: '',
    hasEditedPickup: false,
    hasEditedDrop: false,
    hasEditedFlightIn: false,
    hasEditedFlightOut: false,
    ...overrides,
  };
}

const travelDates = {
  travelStartDate: '2026-04-02',
  travelEndDate: '2026-04-08',
};

describe('applyTransportGroupTravelDateSync', () => {
  it('clears manual pins and syncs dates only while keeping times', () => {
    const result = applyTransportGroupTravelDateSync(
      createGroup({
        flightInDate: '2026-04-01',
        flightInTime: '13:20',
        flightOutDate: '2026-04-07',
        flightOutTime: '20:30',
        pickupDate: '2026-04-01',
        pickupTime: '05:00',
        dropDate: '2026-04-07',
        dropTime: '23:00',
        hasEditedFlightIn: true,
        hasEditedFlightOut: true,
        hasEditedPickup: true,
        hasEditedDrop: true,
      }),
      travelDates,
      { clearManualPins: true },
    );

    expect(result.hasEditedFlightIn).toBe(false);
    expect(result.hasEditedFlightOut).toBe(false);
    expect(result.hasEditedPickup).toBe(false);
    expect(result.hasEditedDrop).toBe(false);
    expect(result.flightInDate).toBe('2026-04-02');
    expect(result.flightOutDate).toBe('2026-04-08');
    expect(result.flightInTime).toBe('13:20');
    expect(result.flightOutTime).toBe('20:30');
    expect(result.pickupTime).toBe('05:00');
    expect(result.dropTime).toBe('23:00');
  });

  it('updates only un-pinned fields when travel dates change', () => {
    const result = applyTransportGroupTravelDateSync(
      createGroup({
        flightInDate: '2026-04-01',
        flightInTime: '02:45',
        pickupDate: '2026-04-01',
        pickupTime: '08:00',
        hasEditedPickup: true,
      }),
      travelDates,
    );

    expect(result.flightInDate).toBe('2026-04-02');
    expect(result.flightInTime).toBe('02:45');
    expect(result.flightOutDate).toBe('2026-04-08');
    expect(result.pickupDate).toBe('2026-04-01');
    expect(result.pickupTime).toBe('08:00');
    expect(result.dropDate).toBe('2026-04-08');
    expect(result.dropTime).toBe('15:30');
  });

  it('fills default and recommended times on first travel-date sync when times are empty', () => {
    const result = applyTransportGroupTravelDateSync(
      createGroup({
        flightInDate: '',
        flightInTime: '',
        flightOutDate: '',
        flightOutTime: '',
        pickupDate: '',
        pickupTime: '',
        dropDate: '',
        dropTime: '',
      }),
      travelDates,
    );

    expect(result.flightInDate).toBe('2026-04-02');
    expect(result.flightOutDate).toBe('2026-04-08');
    expect(result.flightInTime).toBe(DEFAULT_TRAVEL_SYNC_FLIGHT_IN_TIME);
    expect(result.flightOutTime).toBe(DEFAULT_TRAVEL_SYNC_FLIGHT_OUT_TIME);
    expect(result.pickupDate).toBe('2026-04-02');
    expect(result.pickupTime).toBe('04:00');
    expect(result.dropDate).toBe('2026-04-08');
    expect(result.dropTime).toBe('15:30');
  });

  it('falls back pickup and drop dates to travel dates when flight times are empty', () => {
    const result = applyTransportGroupTravelDateSync(
      createGroup({
        flightInTime: '',
        flightOutTime: '',
        pickupTime: '',
        dropTime: '',
      }),
      travelDates,
      { clearManualPins: true },
    );

    expect(result.flightInDate).toBe('2026-04-02');
    expect(result.flightOutDate).toBe('2026-04-08');
    expect(result.flightInTime).toBe('');
    expect(result.flightOutTime).toBe('');
    expect(result.pickupDate).toBe('2026-04-02');
    expect(result.dropDate).toBe('2026-04-08');
    expect(result.pickupTime).toBe('');
    expect(result.dropTime).toBe('');
  });

  it('does not auto-fill flight times when only flight dates exist', () => {
    const result = applyTransportGroupTravelDateSync(
      createGroup({
        flightInDate: '2026-04-01',
        flightInTime: '',
        flightOutDate: '2026-04-07',
        flightOutTime: '',
        hasEditedFlightIn: true,
        hasEditedFlightOut: true,
      }),
      travelDates,
    );

    expect(result.flightInDate).toBe('2026-04-01');
    expect(result.flightOutDate).toBe('2026-04-07');
    expect(result.flightInTime).toBe('');
    expect(result.flightOutTime).toBe('');
  });
});

describe('isTransportGroupTravelLinked', () => {
  it('returns true when all manual pins are cleared and dates already match', () => {
    const linked = applyTransportGroupTravelDateSync(createGroup(), travelDates, {
      clearManualPins: true,
    });

    expect(isTransportGroupTravelLinked(linked, travelDates)).toBe(true);
  });

  it('returns false when any manual pin remains', () => {
    expect(
      isTransportGroupTravelLinked(
        createGroup({ hasEditedFlightIn: true }),
        travelDates,
      ),
    ).toBe(false);
  });
});
