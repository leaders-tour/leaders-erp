import { describe, expect, it } from 'vitest';
import {
  computeBuilderValidationResults,
  countMainPlanRowsStrictlyBefore,
  extractLastTimeFromCellText,
  resolveLastMainPlanRowContext,
  type BuilderValidationInput,
  type PlanRowForValidation,
  type TransportGroupForValidation,
} from './builder-validation';

function baseTransport(dropTime: string): TransportGroupForValidation {
  return {
    teamName: '테스트',
    headcount: 2,
    flightInDate: '2026-05-01',
    flightInTime: '09:00',
    flightOutDate: '2026-05-06',
    flightOutTime: '18:00',
    pickupDate: '',
    pickupTime: '',
    dropDate: '2026-05-06',
    dropTime,
    pickupPlaceType: 'AIRPORT',
    dropPlaceType: 'AIRPORT',
    pickupPlaceCustomText: '',
    dropPlaceCustomText: '',
  };
}

function minimalInput(planRows: PlanRowForValidation[], dropTime: string): BuilderValidationInput {
  return {
    planRows,
    selectedRoute: [],
    filteredSegments: [],
    transportGroups: [baseTransport(dropTime)],
    headcountTotal: 2,
    headcountMale: 1,
    vehicleType: '스타렉스',
    travelStartDate: '2026-05-01',
    travelEndDate: '2026-05-06',
    manualAdjustments: [],
    lodgingSelections: [],
    externalTransfers: [],
    hasEditedManualDeposit: false,
    manualDepositInput: '',
    pricingPreview: null,
    manualPricingEnabled: false,
  };
}

const row = (
  overrides: Partial<PlanRowForValidation> & Pick<PlanRowForValidation, 'timeCellText'>,
): PlanRowForValidation => ({
  mealCellText: '아침\n점심\n저녁',
  scheduleCellText: '일정',
  lodgingCellText: '숙소',
  destinationCellText: '목적지',
  rowType: 'MAIN',
  ...overrides,
});

describe('resolveLastMainPlanRowContext', () => {
  it('trailing EXTERNAL_TRANSFER rows are skipped for last main row', () => {
    const planRows = [
      row({
        rowType: 'MAIN',
        timeCellText: '08:00\n12:00\n-\n17:00\n-',
      }),
      row({
        rowType: 'EXTERNAL_TRANSFER',
        timeCellText: '20:00\n21:30',
        mealCellText: 'X',
        destinationCellText: '칭기즈칸 공항',
      }),
    ];

    const ctx = resolveLastMainPlanRowContext(planRows);
    expect(ctx?.lastMainPlanRowIndex).toBe(0);
    expect(extractLastTimeFromCellText(ctx!.lastMainRow.timeCellText)).toBe('17:00');

    expect(countMainPlanRowsStrictlyBefore(planRows, ctx!.lastMainPlanRowIndex)).toBe(0);
  });

  it('finds previous MAIN for lodging across interleaved EXTERNAL row at start', () => {
    const planRows = [
      row({
        rowType: 'EXTERNAL_TRANSFER',
        timeCellText: '10:00\n11:00',
        mealCellText: 'X',
        destinationCellText: '오즈',
      }),
      row({ rowType: 'MAIN', timeCellText: '09:00', lodgingCellText: '숙소A' }),
      row({ rowType: 'MAIN', timeCellText: '10:00', lodgingCellText: '숙소B' }),
      row({
        rowType: 'EXTERNAL_TRANSFER',
        timeCellText: '18:00\n19:00',
        mealCellText: 'X',
      }),
    ];

    const ctx = resolveLastMainPlanRowContext(planRows);
    expect(ctx?.lastMainRow.lodgingCellText).toBe('숙소B');
    expect(ctx?.previousMainLodgingRow?.lodgingCellText).toBe('숙소A');
    expect(countMainPlanRowsStrictlyBefore(planRows, ctx!.lastMainPlanRowIndex)).toBe(1);
  });
});

describe('drop-time-after-schedule', () => {
  it('does not compare drop time with trailing EXTERNAL_TRANSFER itinerary times', () => {
    const planRows = [
      row({
        rowType: 'MAIN',
        timeCellText: '08:00\n12:00\n-\n17:00\n-',
      }),
      row({
        rowType: 'EXTERNAL_TRANSFER',
        timeCellText: '20:00\n21:30',
        mealCellText: 'X',
        destinationCellText: '칭기즈칸 공항',
      }),
    ];

    const results = computeBuilderValidationResults(minimalInput(planRows, '19:00'));
    expect(results.filter((r) => r.id === 'drop-time-after-schedule')).toHaveLength(0);
  });

  it('still errors when the last MAIN day last time is later than drop time', () => {
    const planRows = [
      row({
        rowType: 'MAIN',
        timeCellText: '09:00\n21:30',
      }),
    ];

    const results = computeBuilderValidationResults(minimalInput(planRows, '19:00'));
    const hit = results.find((r) => r.id === 'drop-time-after-schedule');
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe('error');
    expect(hit?.affectedCells).toEqual([{ rowIndex: 0, field: 'timeCellText' }]);
  });

  it('uses MAIN ordinal rowIndex when EXTERNAL rows trail', () => {
    const planRows = [
      row({ rowType: 'MAIN', timeCellText: '09:00' }),
      row({ rowType: 'MAIN', timeCellText: '10:00\n21:45' }),
      row({
        rowType: 'EXTERNAL_TRANSFER',
        timeCellText: '22:00\n23:00',
        mealCellText: 'X',
      }),
    ];

    const results = computeBuilderValidationResults(minimalInput(planRows, '19:00'));
    const hit = results.find((r) => r.id === 'drop-time-after-schedule');
    expect(hit).toBeDefined();
    expect(hit?.affectedCells).toEqual([{ rowIndex: 1, field: 'timeCellText' }]);
  });
});
