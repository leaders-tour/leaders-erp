import { describe, expect, it } from 'vitest';
import {
  computeBuilderValidationResults,
  countMainPlanRowsStrictlyBefore,
  extractLastTimeFromCellText,
  resolveLatestDropTransportGroup,
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
    vehicleAssignments: [{ vehicleType: '스타렉스', count: 1 }],
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

function minimalInputWithGroups(
  planRows: PlanRowForValidation[],
  transportGroups: TransportGroupForValidation[],
): BuilderValidationInput {
  return {
    ...minimalInput(planRows, '19:00'),
    transportGroups,
    headcountTotal: transportGroups.reduce((sum, group) => sum + group.headcount, 0),
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

describe('resolveLatestDropTransportGroup', () => {
  it('selects the latest valid drop date and time across teams', () => {
    const latest = resolveLatestDropTransportGroup([
      { ...baseTransport('21:00'), teamName: 'A팀', dropDate: '2026-05-06' },
      { ...baseTransport('08:00'), teamName: 'B팀', dropDate: '2026-05-07' },
      { ...baseTransport('23:00'), teamName: 'C팀', dropDate: '2026-05-06' },
    ]);

    expect(latest?.teamName).toBe('B팀');
  });

  it('ignores groups without a complete valid drop schedule', () => {
    const latest = resolveLatestDropTransportGroup([
      { ...baseTransport('19:00'), teamName: 'A팀', dropDate: '' },
      { ...baseTransport('미정'), teamName: 'B팀', dropDate: '2026-05-07' },
      { ...baseTransport('18:30'), teamName: 'C팀', dropDate: '2026-05-06' },
    ]);

    expect(latest?.teamName).toBe('C팀');
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

  it('allows the last schedule time when a later team drop time matches it', () => {
    const planRows = [
      row({
        rowType: 'MAIN',
        timeCellText: '08:00\n12:00\n17:30\n19:00',
      }),
    ];

    const results = computeBuilderValidationResults(
      minimalInputWithGroups(planRows, [
        { ...baseTransport('17:30'), teamName: 'A팀', headcount: 1 },
        { ...baseTransport('19:00'), teamName: 'B팀', headcount: 1 },
      ]),
    );

    expect(results.filter((r) => r.id === 'drop-time-after-schedule')).toHaveLength(0);
  });

  it('uses the latest drop among three teams for the schedule comparison', () => {
    const planRows = [
      row({
        rowType: 'MAIN',
        timeCellText: '08:00\n12:00\n17:30\n19:00',
      }),
    ];

    const passingResults = computeBuilderValidationResults(
      minimalInputWithGroups(planRows, [
        { ...baseTransport('17:30'), teamName: 'A팀', headcount: 1 },
        { ...baseTransport('18:30'), teamName: 'B팀', headcount: 1 },
        { ...baseTransport('19:00'), teamName: 'C팀', headcount: 1 },
      ]),
    );
    expect(passingResults.filter((r) => r.id === 'drop-time-after-schedule')).toHaveLength(0);

    const failingResults = computeBuilderValidationResults(
      minimalInputWithGroups(planRows, [
        { ...baseTransport('17:30'), teamName: 'A팀', headcount: 1 },
        { ...baseTransport('18:00'), teamName: 'B팀', headcount: 1 },
        { ...baseTransport('18:30'), teamName: 'C팀', headcount: 1 },
      ]),
    );
    const hit = failingResults.find((r) => r.id === 'drop-time-after-schedule');
    expect(hit).toBeDefined();
    expect(hit?.message).toContain('드랍시간(18:30)');
  });
});

describe('last-day-meal-x-rule', () => {
  it('uses the latest team drop time for last-day meal monitoring', () => {
    const planRows = [
      row({
        rowType: 'MAIN',
        timeCellText: '08:00\n12:00\n17:30',
        mealCellText: '호텔조식\n현지식\n샤브샤브',
      }),
    ];

    const results = computeBuilderValidationResults(
      minimalInputWithGroups(planRows, [
        { ...baseTransport('10:30'), teamName: 'A팀', headcount: 1 },
        { ...baseTransport('19:00'), teamName: 'B팀', headcount: 1 },
      ]),
    );

    expect(results.filter((r) => r.id === 'last-day-meal-x-rule')).toHaveLength(0);
  });
});

describe('missing-special-meals', () => {
  it('5종 중 누락된 특식을 warning으로 표시한다', () => {
    const planRows = [
      row({
        timeCellText: '08:00\n12:00\n18:00',
        mealCellText: '아침\n점심\n샤브샤브',
      }),
    ];
    const results = computeBuilderValidationResults(minimalInput(planRows, '19:00'));
    const hit = results.find((r) => r.id === 'missing-special-meals');
    expect(hit).toBeDefined();
    expect(hit?.message).toContain('5종 모두 배치');
    expect(hit?.message).toContain('삼겹살 뷔페');
  });
});

describe('invalid-transport-groups', () => {
  it('allows date-only flight schedules', () => {
    const results = computeBuilderValidationResults(
      minimalInputWithGroups([], [
        {
          ...baseTransport('19:00'),
          flightInDate: '2026-05-01',
          flightInTime: '',
          flightOutDate: '2026-05-06',
          flightOutTime: '',
        },
      ]),
    );

    expect(results.some((result) => result.id === 'invalid-transport-groups')).toBe(false);
  });

  it('rejects time-only flight schedules', () => {
    const results = computeBuilderValidationResults(
      minimalInputWithGroups([], [
        {
          ...baseTransport('19:00'),
          flightInDate: '',
          flightInTime: '09:00',
        },
      ]),
    );

    expect(results.some((result) => result.id === 'invalid-transport-groups')).toBe(true);
  });
});

describe('samgyeopsal-recommendation-deviation', () => {
  it('삼겹살 뷔페도 추천지 이탈 warning을 검사한다', () => {
    const planRows = [
      row({
        timeCellText: '08:00\n12:00\n18:00',
        destinationCellText: '알 수 없는 지역',
        mealCellText: '아침\n점심\n삼겹살 뷔페',
      }),
    ];
    const results = computeBuilderValidationResults(minimalInput(planRows, '19:00'));
    const hit = results.find((r) => r.id === 'samgyeopsal-recommendation-deviation');
    expect(hit).toBeDefined();
    expect(hit?.message).toContain('삼겹살 뷔페');
  });
});
