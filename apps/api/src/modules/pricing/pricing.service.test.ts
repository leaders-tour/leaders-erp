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

  it('keeps shared TEAM charges common across all teams', async () => {
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
        headcountTotal: 6,
        transportGroupCount: 2,
        transportGroups: [
          {
            teamName: 'A팀',
            headcount: 2,
            flightInDate: '2026-04-01',
            flightInTime: '10:00',
            flightOutDate: '2026-04-02',
            flightOutTime: '12:00',
          },
          {
            teamName: 'B팀',
            headcount: 4,
            flightInDate: '2026-04-01',
            flightInTime: '10:00',
            flightOutDate: '2026-04-02',
            flightOutTime: '12:00',
          },
        ],
      }),
    );

    expect(result.teamPricings).toHaveLength(2);
    expect(result.teamPricings[0]).toMatchObject({
      teamOrderIndex: 0,
      teamName: 'A팀',
      totalAmountKrw: 1_040_000,
      addonAmountKrw: 40_000,
    });
    expect(result.teamPricings[1]).toMatchObject({
      teamOrderIndex: 1,
      teamName: 'B팀',
      totalAmountKrw: 1_040_000,
      addonAmountKrw: 40_000,
    });
    expect(result.teamPricings[0]?.lines.find((line) => line.lineCode === 'EARLY')).toMatchObject({
      amountKrw: 40_000,
      display: {
        basis: 'TEAM_DIV_PERSON',
        divisorPerson: 6,
      },
    });
    expect(result.teamPricings[1]?.lines.find((line) => line.lineCode === 'EARLY')).toMatchObject({
      amountKrw: 40_000,
      display: {
        basis: 'TEAM_DIV_PERSON',
        divisorPerson: 6,
      },
    });
  });

  it('assigns external transfer charges only to selected teams', async () => {
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
        id: 'pickup-rule',
        title: '외부 픽업',
        lineCode: 'PICKUP_DROP',
        amountKrw: 100_000,
        chargeScope: 'TEAM',
        personMode: null,
        externalTransferMode: 'PICKUP_ONLY',
      }),
    ]);

    const result = await service.preview(
      makeInput({
        variantType: VariantType.EARLY,
        headcountTotal: 6,
        transportGroupCount: 2,
        transportGroups: [
          {
            teamName: 'A팀',
            headcount: 2,
            flightInDate: '2026-04-01',
            flightInTime: '10:00',
            flightOutDate: '2026-04-02',
            flightOutTime: '12:00',
          },
          {
            teamName: 'B팀',
            headcount: 4,
            flightInDate: '2026-04-01',
            flightInTime: '10:00',
            flightOutDate: '2026-04-02',
            flightOutTime: '12:00',
          },
        ],
        externalTransfers: [
          {
            direction: 'PICKUP',
            presetCode: 'PICKUP_AIRPORT_OZHOUSE',
            travelDate: '2026-04-01',
            departureTime: '11:00',
            arrivalTime: '12:00',
            departurePlace: '공항',
            arrivalPlace: '오즈하우스',
            selectedTeamOrderIndexes: [0],
          },
        ],
      }),
    );

    expect(result.teamPricings[0]?.lines.find((line) => line.lineCode === 'PICKUP_DROP')).toMatchObject({
      teamOrderIndex: 0,
      teamName: 'A팀',
      amountKrw: 50_000,
    });
    expect(result.teamPricings[1]?.lines.find((line) => line.lineCode === 'PICKUP_DROP')).toBeUndefined();
  });

  it('dedupes identical external transfer pickups for the same team', async () => {
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
        id: 'pickup-rule',
        title: '외부 픽업',
        lineCode: 'PICKUP_DROP',
        amountKrw: 100_000,
        chargeScope: 'TEAM',
        personMode: null,
        externalTransferMode: 'PICKUP_ONLY',
      }),
    ]);

    const duplicatedPickup = {
      direction: 'PICKUP' as const,
      presetCode: 'PICKUP_AIRPORT_OZHOUSE',
      travelDate: '2026-04-01',
      departureTime: '11:00',
      arrivalTime: '12:00',
      departurePlace: '공항',
      arrivalPlace: '오즈하우스',
      selectedTeamOrderIndexes: [0],
    };

    const result = await service.preview(
      makeInput({
        headcountTotal: 6,
        transportGroupCount: 2,
        transportGroups: [
          {
            teamName: 'A팀',
            headcount: 2,
            flightInDate: '2026-04-01',
            flightInTime: '10:00',
            flightOutDate: '2026-04-02',
            flightOutTime: '12:00',
          },
          {
            teamName: 'B팀',
            headcount: 4,
            flightInDate: '2026-04-01',
            flightInTime: '10:00',
            flightOutDate: '2026-04-02',
            flightOutTime: '12:00',
          },
        ],
        externalTransfers: [duplicatedPickup, duplicatedPickup],
      }),
    );

    expect(result.teamPricings[0]?.lines.find((line) => line.lineCode === 'PICKUP_DROP')).toMatchObject({
      amountKrw: 50_000,
      quantity: 1,
      teamName: 'A팀',
    });
    expect(result.teamPricings[0]?.addonAmountKrw).toBe(50_000);
    expect(result.teamPricings[1]?.lines.find((line) => line.lineCode === 'PICKUP_DROP')).toBeUndefined();
  });

  it('keeps EARLY shared in team totals even when another team-scoped rule only matches A팀', async () => {
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
        chargeScope: 'TEAM',
        personMode: null,
        quantitySource: 'ONE',
        flightInTimeBand: 'DAWN',
        pickupPlaceType: 'AIRPORT',
      }),
      makeRule({
        id: 'pickup-rule',
        title: '외부 픽업',
        lineCode: 'PICKUP_DROP',
        amountKrw: 100_000,
        chargeScope: 'TEAM',
        personMode: null,
        externalTransferMode: 'PICKUP_ONLY',
      }),
    ]);

    const result = await service.preview(
      makeInput({
        variantType: VariantType.EARLY,
        headcountTotal: 6,
        transportGroupCount: 2,
        transportGroups: [
          {
            teamName: 'A팀',
            headcount: 3,
            flightInDate: '2026-04-01',
            flightInTime: '02:45',
            flightOutDate: '2026-04-02',
            flightOutTime: '12:00',
            pickupPlaceType: 'AIRPORT',
          },
          {
            teamName: 'B팀',
            headcount: 3,
            flightInDate: '2026-04-01',
            flightInTime: '02:30',
            flightOutDate: '2026-04-02',
            flightOutTime: '12:00',
            pickupPlaceType: 'HOTEL',
          },
        ],
        externalTransfers: [
          {
            direction: 'PICKUP',
            presetCode: 'PICKUP_AIRPORT_OZHOUSE',
            travelDate: '2026-04-01',
            departureTime: '11:00',
            arrivalTime: '12:00',
            departurePlace: '공항',
            arrivalPlace: '오즈하우스',
            selectedTeamOrderIndexes: [0],
          },
        ],
      }),
    );

    expect(result.teamPricings[0]).toMatchObject({
      teamOrderIndex: 0,
      addonAmountKrw: 73_300,
      totalAmountKrw: 1_073_300,
    });
    expect(result.teamPricings[1]).toMatchObject({
      teamOrderIndex: 1,
      addonAmountKrw: 40_000,
      totalAmountKrw: 1_040_000,
    });
    expect(result.teamPricings[0]?.lines.find((line) => line.lineCode === 'EARLY')).toMatchObject({
      amountKrw: 40_000,
      display: {
        basis: 'TEAM_DIV_PERSON',
        divisorPerson: 6,
      },
    });
    expect(result.teamPricings[1]?.lines.find((line) => line.lineCode === 'EARLY')).toMatchObject({
      amountKrw: 40_000,
      display: {
        basis: 'TEAM_DIV_PERSON',
        divisorPerson: 6,
      },
    });
    expect(result.teamPricings[0]?.lines.find((line) => line.lineCode === 'PICKUP_DROP')).toMatchObject({
      amountKrw: 33_300,
      teamName: 'A팀',
    });
    expect(result.teamPricings[1]?.lines.find((line) => line.lineCode === 'PICKUP_DROP')).toBeUndefined();
  });

  it('keeps flight-conditioned TEAM charges shared when multiple teams match the same rule', async () => {
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
        chargeScope: 'TEAM',
        personMode: null,
        quantitySource: 'HEADCOUNT',
        flightInTimeBand: 'DAWN',
      }),
    ]);

    const result = await service.preview(
      makeInput({
        variantType: VariantType.EARLY,
        headcountTotal: 6,
        transportGroupCount: 2,
        transportGroups: [
          {
            teamName: 'A팀',
            headcount: 3,
            flightInDate: '2026-04-01',
            flightInTime: '02:45',
            flightOutDate: '2026-04-02',
            flightOutTime: '12:00',
          },
          {
            teamName: 'B팀',
            headcount: 3,
            flightInDate: '2026-04-01',
            flightInTime: '02:30',
            flightOutDate: '2026-04-02',
            flightOutTime: '12:00',
          },
        ],
      }),
    );

    expect(result.teamPricings[0]?.lines.find((line) => line.lineCode === 'EARLY')).toMatchObject({
      quantity: 1,
      amountKrw: 40_000,
      teamName: 'A팀',
      display: {
        basis: 'TEAM_DIV_PERSON',
        divisorPerson: 6,
      },
    });
    expect(result.teamPricings[1]?.lines.find((line) => line.lineCode === 'EARLY')).toMatchObject({
      quantity: 1,
      amountKrw: 40_000,
      teamName: 'B팀',
      display: {
        basis: 'TEAM_DIV_PERSON',
        divisorPerson: 6,
      },
    });
  });

  it('assigns flight-conditioned TEAM charges only to matching teams', async () => {
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
        chargeScope: 'TEAM',
        personMode: null,
        quantitySource: 'ONE',
        flightInTimeBand: 'DAWN',
      }),
    ]);

    const result = await service.preview(
      makeInput({
        variantType: VariantType.EARLY,
        headcountTotal: 6,
        transportGroupCount: 2,
        transportGroups: [
          {
            teamName: 'A팀',
            headcount: 3,
            flightInDate: '2026-04-01',
            flightInTime: '02:45',
            flightOutDate: '2026-04-02',
            flightOutTime: '12:00',
          },
          {
            teamName: 'B팀',
            headcount: 3,
            flightInDate: '2026-04-01',
            flightInTime: '13:00',
            flightOutDate: '2026-04-02',
            flightOutTime: '12:00',
          },
        ],
      }),
    );

    expect(result.teamPricings[0]?.lines.find((line) => line.lineCode === 'EARLY')).toMatchObject({
      amountKrw: 80_000,
      teamName: 'A팀',
    });
    expect(result.teamPricings[1]?.lines.find((line) => line.lineCode === 'EARLY')).toBeUndefined();
  });
});
