import { describe, expect, it } from 'vitest';
import {
  buildExternalTransferDirectionText,
  buildExternalTransferFromPreset,
  normalizeExternalTransfers,
  type ExternalTransfer,
} from './external-transfer';

const teams = [
  {
    teamName: 'A팀',
    flightInDate: '2026-04-29',
    flightInTime: '23:45',
    flightOutDate: '2026-05-04',
    flightOutTime: '02:05',
  },
  {
    teamName: 'B팀',
    flightInDate: '2026-04-30',
    flightInTime: '10:20',
    flightOutDate: '2026-05-04',
    flightOutTime: '18:15',
  },
];

describe('external-transfer preset rules', () => {
  it('calculates ulaanbaatar drop from OUT time with previous-day rollover', () => {
    expect(buildExternalTransferFromPreset('DROP_ULAANBAATAR_AIRPORT', 0, teams)).toMatchObject({
      direction: 'DROP',
      travelDate: '2026-05-03',
      departureTime: '21:35',
      arrivalTime: '23:05',
      departurePlace: '울란바토르',
      arrivalPlace: '공항',
    });
  });

  it('calculates ozhouse drop with same OUT -4:30 / -3:00 rule', () => {
    expect(buildExternalTransferFromPreset('DROP_OZHOUSE_AIRPORT', 0, teams)).toMatchObject({
      direction: 'DROP',
      travelDate: '2026-05-03',
      departureTime: '21:35',
      arrivalTime: '23:05',
      departurePlace: '오즈하우스',
      arrivalPlace: '공항',
    });
  });

  it('rounds pickup departure up to next half-hour after adding one hour', () => {
    expect(buildExternalTransferFromPreset('PICKUP_AIRPORT_OZHOUSE', 0, teams)).toMatchObject({
      direction: 'PICKUP',
      travelDate: '2026-04-30',
      departureTime: '01:00',
      arrivalTime: '02:00',
      departurePlace: '공항',
      arrivalPlace: '오즈하우스',
    });
  });

  it('pickup airport to ulaanbaatar uses same IN+1h rule as airport to ozhouse', () => {
    expect(buildExternalTransferFromPreset('PICKUP_AIRPORT_ULAANBAATAR', 0, teams)).toMatchObject({
      direction: 'PICKUP',
      travelDate: '2026-04-30',
      departureTime: '01:00',
      arrivalTime: '02:00',
      departurePlace: '공항',
      arrivalPlace: '울란바토르',
    });
  });

  it('pickup airport to terelj uses same IN+1h rule as airport to ozhouse', () => {
    expect(buildExternalTransferFromPreset('PICKUP_AIRPORT_TERELJ', 1, teams)).toMatchObject({
      direction: 'PICKUP',
      travelDate: '2026-04-30',
      departureTime: '11:30',
      arrivalTime: '12:30',
      departurePlace: '공항',
      arrivalPlace: '테를지',
    });
  });

  it('pickup at :29 rounds to :30, arrival +1h', () => {
    const teams29 = [{ teamName: 'T', flightInDate: '2026-05-01', flightInTime: '09:29', flightOutDate: '2026-05-05', flightOutTime: '14:00' }];
    expect(buildExternalTransferFromPreset('PICKUP_AIRPORT_OZHOUSE', 0, teams29)).toMatchObject({
      departureTime: '10:30',
      arrivalTime: '11:30',
    });
  });

  it('pickup at :31 rounds to next hour, arrival +1h', () => {
    const teams31 = [{ teamName: 'T', flightInDate: '2026-05-01', flightInTime: '09:31', flightOutDate: '2026-05-05', flightOutTime: '14:00' }];
    expect(buildExternalTransferFromPreset('PICKUP_AIRPORT_ULAANBAATAR', 0, teams31)).toMatchObject({
      departureTime: '11:00',
      arrivalTime: '12:00',
    });
  });

  it('04:30 IN uses same-time airport departure, arrival +1h', () => {
    const teams0430 = [
      { teamName: 'T', flightInDate: '2026-05-01', flightInTime: '04:30', flightOutDate: '2026-05-05', flightOutTime: '14:00' },
    ];
    expect(buildExternalTransferFromPreset('PICKUP_AIRPORT_OZHOUSE', 0, teams0430)).toMatchObject({
      travelDate: '2026-05-01',
      departureTime: '04:30',
      arrivalTime: '05:30',
    });
  });
});

describe('external-transfer formatting', () => {
  const transfers: ExternalTransfer[] = [
    {
      direction: 'DROP',
      presetCode: 'DROP_TERELJ_AIRPORT',
      travelDate: '2026-05-03',
      departureTime: '13:45',
      arrivalTime: '15:15',
      departurePlace: '테를지',
      arrivalPlace: '공항',
      selectedTeamOrderIndexes: [0, 1],
    },
  ];

  it('builds team-separated detail lines', () => {
    expect(buildExternalTransferDirectionText(transfers, teams, 'DROP')).toBe(
      'A팀 05/03 13:45 테를지 > 15:15 공항\nB팀 05/03 13:45 테를지 > 15:15 공항',
    );
  });

  it('dedupes identical transfers and duplicate team indexes', () => {
    expect(
      normalizeExternalTransfers([
        {
          direction: 'DROP',
          presetCode: 'DROP_TERELJ_AIRPORT',
          travelDate: '2026-05-03 ',
          departureTime: '13:45',
          arrivalTime: '15:15',
          departurePlace: '테를지',
          arrivalPlace: '공항 ',
          selectedTeamOrderIndexes: [1, 0, 1],
        },
        {
          direction: 'DROP',
          presetCode: 'DROP_TERELJ_AIRPORT',
          travelDate: '2026-05-03',
          departureTime: '13:45 ',
          arrivalTime: '15:15',
          departurePlace: '테를지 ',
          arrivalPlace: '공항',
          selectedTeamOrderIndexes: [0, 1],
        },
      ]),
    ).toEqual([
      {
        direction: 'DROP',
        presetCode: 'DROP_TERELJ_AIRPORT',
        travelDate: '2026-05-03',
        departureTime: '13:45',
        arrivalTime: '15:15',
        departurePlace: '테를지',
        arrivalPlace: '공항',
        selectedTeamOrderIndexes: [0, 1],
      },
    ]);
  });
});
