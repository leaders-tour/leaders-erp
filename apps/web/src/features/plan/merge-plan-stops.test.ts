import { describe, expect, it } from 'vitest';
import { buildMergedPlanStops } from './merge-plan-stops';
import type { ExternalTransfer } from './external-transfer';
import type { PlanStopRowBase } from './plan-stop-row';

const mainRows: PlanStopRowBase[] = [
  {
    rowType: 'MAIN',
    locationId: 'loc-1',
    locationVersionId: 'locv-1',
    movementIntensity: null,
    dateCellText: '05/01',
    destinationCellText: '고비',
    timeCellText: '09:00',
    scheduleCellText: '투어',
    lodgingCellText: '캠프',
    mealCellText: '중식',
  },
];

const teams = [
  {
    teamName: 'A팀',
    headcount: 3,
    flightInDate: '2026-05-01',
    flightInTime: '09:00',
    flightOutDate: '2026-05-04',
    flightOutTime: '18:00',
  },
  {
    teamName: 'B팀',
    headcount: 4,
    flightInDate: '2026-05-01',
    flightInTime: '09:30',
    flightOutDate: '2026-05-04',
    flightOutTime: '18:30',
  },
];

describe('buildMergedPlanStops external transfer rows', () => {
  it('formats pickup rows with destination-only and all-member wording', () => {
    const transfers: ExternalTransfer[] = [
      {
        direction: 'PICKUP',
        presetCode: 'PICKUP_AIRPORT_OZHOUSE',
        travelDate: '2026-05-01',
        departureTime: '10:00',
        arrivalTime: '11:00',
        departurePlace: '공항',
        arrivalPlace: '오즈하우스',
        selectedTeamOrderIndexes: [0, 1],
      },
    ];

    const [pickupRow] = buildMergedPlanStops(mainRows, transfers, teams);
    expect(pickupRow).toMatchObject({
      rowType: 'EXTERNAL_TRANSFER',
      dateCellText: '기간외',
      destinationCellText: '오즈게스트하우스',
      timeCellText: '10:00\n11:00',
      scheduleCellText: '전원 픽업 후 오즈게스트하우스로 출발\n오즈게스트하우스 드랍',
      lodgingCellText: '오즈게스트하우스',
      mealCellText: 'X',
    });
  });

  it('formats drop rows with team headcount and airport display label', () => {
    const transfers: ExternalTransfer[] = [
      {
        direction: 'DROP',
        presetCode: 'DROP_ULAANBAATAR_AIRPORT',
        travelDate: '2026-05-04',
        departureTime: '15:00',
        arrivalTime: '16:30',
        departurePlace: '울란바토르',
        arrivalPlace: '공항',
        selectedTeamOrderIndexes: [0],
      },
    ];

    const merged = buildMergedPlanStops(mainRows, transfers, teams);
    const dropRow = merged[merged.length - 1];
    expect(dropRow).toMatchObject({
      rowType: 'EXTERNAL_TRANSFER',
      dateCellText: '기간외',
      destinationCellText: '칭기즈칸 공항',
      timeCellText: '15:00\n16:30',
      scheduleCellText: 'A팀 3인 픽업 후 칭기즈칸 공항으로 출발\n칭기즈칸 공항 드랍',
      lodgingCellText: '숙소미포함',
      mealCellText: 'X',
    });
  });
});
