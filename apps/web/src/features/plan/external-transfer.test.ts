import { describe, expect, it } from 'vitest';
import {
  buildDerivedExternalTransferManualAdjustments,
  buildExternalTransferDirectionText,
  buildExternalTransferFromPreset,
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
      unitPriceKrw: 100000,
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
      unitPriceKrw: 60000,
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
      unitPriceKrw: 150000,
    },
  ];

  it('builds team-separated detail lines', () => {
    expect(buildExternalTransferDirectionText(transfers, teams, 'DROP')).toBe(
      'A팀 05/03 13:45 테를지 > 15:15 공항\nB팀 05/03 13:45 테를지 > 15:15 공항',
    );
  });

  it('derives manual adjustment totals from selected team count', () => {
    expect(buildDerivedExternalTransferManualAdjustments(transfers, teams)).toEqual([
      {
        description: '실투어 외 드랍(테를지→공항) A팀, B팀',
        amountKrw: 300000,
      },
    ]);
  });
});
