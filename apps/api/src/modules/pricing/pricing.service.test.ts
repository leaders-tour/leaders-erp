import { describe, expect, it, vi } from 'vitest';
import { VariantType } from '@tour/domain';
import { PricingService } from './pricing.service';
import type { PricingComputeInput } from './pricing.types';

function makeRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule',
    priceItemPreset: 'CONDITIONAL',
    ruleType: 'CONDITIONAL_ADDON',
    title: '규칙',
    lineCode: 'EARLY',
    calcType: 'AMOUNT',
    targetLineCode: null,
    amountKrw: 0,
    percentBps: null,
    quantitySource: 'ONE',
    lodgingSelectionLevel: null,
    headcountMin: null,
    headcountMax: null,
    dayMin: null,
    dayMax: null,
    travelDateFrom: null,
    travelDateTo: null,
    vehicleType: null,
    variantTypes: [],
    flightInTimeBand: null,
    flightOutTimeBand: null,
    pickupPlaceType: null,
    dropPlaceType: null,
    externalTransferMode: null,
    externalTransferMinCount: null,
    externalTransferPresetCodes: [],
    nightTrainRequired: null,
    nightTrainMinCount: null,
    longDistanceMinCount: null,
    chargeScope: 'PER_PERSON',
    personMode: 'SINGLE',
    customDisplayText: null,
    ...overrides,
  };
}

function makeService(rules: unknown[]) {
  const prisma = {
    pricingPolicy: {
      findFirst: vi.fn().mockResolvedValue({ id: 'policy-1' }),
    },
    pricingRule: {
      findMany: vi.fn().mockResolvedValue(rules),
    },
    event: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    overnightStay: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    segment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    overnightStayConnection: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as unknown as ConstructorParameters<typeof PricingService>[0];

  return new PricingService(prisma);
}

function makeInput(overrides: Partial<PricingComputeInput> = {}): PricingComputeInput {
  return {
    regionIds: [],
    variantType: VariantType.BASIC,
    totalDays: 1,
    planStops: [{ rowType: 'MAIN', locationId: 'loc-1', mealCellText: '샤브샤브' }],
    travelStartDate: '2026-04-01',
    headcountTotal: 6,
    vehicleType: '스타렉스',
    transportGroupCount: 1,
    transportGroups: [
      {
        teamName: '1팀',
        headcount: 6,
        flightInDate: '2026-04-01',
        flightInTime: '10:00',
        flightOutDate: '2026-04-02',
        flightOutTime: '12:00',
      },
    ],
    externalTransfers: [],
    includeRentalItems: false,
    eventIds: [],
    extraLodgings: [],
    lodgingSelections: [],
    manualAdjustments: [],
    ...overrides,
  };
}

describe('PricingService.preview', () => {
  it('converts TEAM rule amounts into per-person totals', async () => {
    const service = makeService([
      makeRule({
        id: 'base-rule',
        priceItemPreset: 'BASE',
        ruleType: 'BASE',
        title: '기본금',
        lineCode: 'BASE',
        amountKrw: 1_000_000,
      }),
      makeRule({
        id: 'early-rule',
        title: '얼리 스타트',
        lineCode: 'EARLY',
        amountKrw: 240_000,
        variantTypes: ['early', 'earlyExtend'],
        chargeScope: 'TEAM',
        personMode: null,
      }),
    ]);

    const result = await service.preview(
      makeInput({
        variantType: VariantType.EARLY,
      }),
    );

    const earlyLine = result.lines.find((line) => line.lineCode === 'EARLY');

    expect(earlyLine).toMatchObject({
      unitPriceKrw: 240_000,
      quantity: 1,
      amountKrw: 40_000,
      display: {
        basis: 'TEAM_DIV_PERSON',
        unitAmountKrw: 240_000,
        count: 1,
        divisorPerson: 6,
      },
    });
    expect(result.addonAmountKrw).toBe(40_000);
    expect(result.totalAmountKrw).toBe(1_040_000);
  });

  it('converts TEAM manual discounts into per-person totals', async () => {
    const service = makeService([
      makeRule({
        id: 'base-rule',
        priceItemPreset: 'BASE',
        ruleType: 'BASE',
        title: '기본금',
        lineCode: 'BASE',
        amountKrw: 1_000_000,
      }),
    ]);

    const result = await service.preview(
      makeInput({
        manualAdjustments: [
          {
            kind: 'DISCOUNT',
            title: '팀 할인',
            chargeScope: 'TEAM',
            amountKrw: 250_000,
            customDisplayText: null,
          },
        ],
      }),
    );

    const discountLine = result.lines.find((line) => line.description === '팀 할인');

    expect(discountLine).toMatchObject({
      unitPriceKrw: -250_000,
      quantity: 1,
      amountKrw: -41_700,
      display: {
        basis: 'TEAM_DIV_PERSON',
        unitAmountKrw: -250_000,
        count: 1,
        divisorPerson: 6,
      },
    });
    expect(result.addonAmountKrw).toBe(-41_700);
    expect(result.totalAmountKrw).toBe(958_300);
  });
});
