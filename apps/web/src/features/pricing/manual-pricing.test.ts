import { describe, expect, it } from 'vitest';
import type { PricingManualSourceLine } from '@tour/domain';
import { buildEffectivePricing, sliceEffectiveTotalsForUi } from './manual-pricing';

describe('buildEffectivePricing', () => {
  it('applies manual output overrides to merged display rows', () => {
    const autoPricing = buildEffectivePricing({
      baseAmountKrw: 100_000,
      addonAmountKrw: 100_000,
      totalAmountKrw: 200_000,
      depositAmountKrw: 20_000,
      balanceAmountKrw: 180_000,
      securityDepositAmountKrw: 0,
      securityDepositEvent: null,
      securityDepositUnitPriceKrw: 0,
      securityDepositQuantity: 0,
      securityDepositMode: 'NONE',
      lines: [
        {
          ruleType: 'BASE',
          lineCode: 'BASE',
          sourceType: 'RULE',
          description: '기본금',
          ruleId: 'rule-base',
          unitPriceKrw: 100_000,
          quantity: 1,
          amountKrw: 100_000,
        },
        {
          ruleType: 'CONDITIONAL_ADDON',
          lineCode: 'LODGING_SELECTION',
          sourceType: 'RULE',
          description: '2일차 LV4',
          ruleId: 'rule-lv4-a',
          unitPriceKrw: 50_000,
          quantity: 1,
          amountKrw: 50_000,
        },
        {
          ruleType: 'CONDITIONAL_ADDON',
          lineCode: 'LODGING_SELECTION',
          sourceType: 'RULE',
          description: '3일차 LV4',
          ruleId: 'rule-lv4-b',
          unitPriceKrw: 50_000,
          quantity: 1,
          amountKrw: 50_000,
        },
      ],
    }, { headcountTotal: 6, totalDays: 6 });

    const lodgingRow = autoPricing.adjustmentLines.find((line) => line.rowKey != null);
    expect(lodgingRow).toBeDefined();
    expect(lodgingRow?.leadAmountKrw).toBe(100_000);

    const effectivePricing = buildEffectivePricing(
      {
        baseAmountKrw: 100_000,
        addonAmountKrw: 100_000,
        totalAmountKrw: 200_000,
        depositAmountKrw: 20_000,
        balanceAmountKrw: 180_000,
        securityDepositAmountKrw: 0,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 100_000,
            quantity: 1,
            amountKrw: 100_000,
          },
          {
            ruleType: 'CONDITIONAL_ADDON',
            lineCode: 'LODGING_SELECTION',
            sourceType: 'RULE',
            description: '2일차 LV4',
            ruleId: 'rule-lv4-a',
            unitPriceKrw: 50_000,
            quantity: 1,
            amountKrw: 50_000,
          },
          {
            ruleType: 'CONDITIONAL_ADDON',
            lineCode: 'LODGING_SELECTION',
            sourceType: 'RULE',
            description: '3일차 LV4',
            ruleId: 'rule-lv4-b',
            unitPriceKrw: 50_000,
            quantity: 1,
            amountKrw: 50_000,
          },
        ],
      },
      {
        headcountTotal: 6,
        totalDays: 6,
      },
      {
        enabled: true,
        adjustmentLines: [
          {
            id: 'manual-auto-row',
            type: 'AUTO',
            rowKey: lodgingRow!.rowKey,
            label: lodgingRow!.label,
            leadAmountKrw: 120_000,
            formula: lodgingRow!.formula,
          },
        ],
        summary: {
          totalAmountKrw: 220_000,
          depositAmountKrw: 30_000,
          balanceAmountKrw: 190_000,
          securityDepositAmountKrw: 0,
        },
      },
    );

    expect(effectivePricing.baseAmountKrw).toBe(100_000);
    expect(effectivePricing.addonAmountKrw).toBe(120_000);
    expect(effectivePricing.totalAmountKrw).toBe(220_000);
    expect(effectivePricing.depositAmountKrw).toBe(30_000);
    expect(effectivePricing.balanceAmountKrw).toBe(190_000);
    expect(
      effectivePricing.adjustmentLines.find((line) => line.rowKey === lodgingRow!.rowKey)?.leadAmountKrw,
    ).toBe(120_000);
  });

  it('builds team-specific effective totals and overrides', () => {
    const effectivePricing = buildEffectivePricing<PricingManualSourceLine>(
      {
        baseAmountKrw: 1_000_000,
        addonAmountKrw: 40_000,
        totalAmountKrw: 1_040_000,
        depositAmountKrw: 90_000,
        balanceAmountKrw: 950_000,
        securityDepositAmountKrw: 0,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 1_000_000,
            quantity: 1,
            amountKrw: 1_000_000,
          },
        ],
        teamPricings: [
          {
            teamOrderIndex: 0,
            teamName: 'A팀',
            headcount: 2,
            baseAmountKrw: 1_000_000,
            addonAmountKrw: 50_000,
            totalAmountKrw: 1_050_000,
            depositAmountKrw: 100_000,
            balanceAmountKrw: 950_000,
            securityDepositAmountKrw: 0,
            securityDepositUnitPriceKrw: 0,
            securityDepositQuantity: 0,
            securityDepositMode: 'NONE',
            securityDepositEvent: null,
            lines: [
              {
                ruleType: 'BASE',
                lineCode: 'BASE',
                sourceType: 'RULE',
                description: '기본금',
                ruleId: 'rule-base',
                unitPriceKrw: 1_000_000,
                quantity: 1,
                amountKrw: 1_000_000,
                teamOrderIndex: 0,
                teamName: 'A팀',
                headcount: 2,
              },
              {
                ruleType: 'CONDITIONAL_ADDON',
                lineCode: 'PICKUP_DROP',
                sourceType: 'RULE',
                description: '픽드랍',
                ruleId: 'rule-pickup',
                unitPriceKrw: 100_000,
                quantity: 1,
                amountKrw: 50_000,
                displayBasis: 'TEAM_DIV_PERSON',
                displayUnitAmountKrw: 100_000,
                displayCount: 1,
                displayDivisorPerson: 2,
                teamOrderIndex: 0,
                teamName: 'A팀',
                headcount: 2,
              },
            ],
          },
          {
            teamOrderIndex: 1,
            teamName: 'B팀',
            headcount: 4,
            baseAmountKrw: 1_000_000,
            addonAmountKrw: 0,
            totalAmountKrw: 1_000_000,
            depositAmountKrw: 100_000,
            balanceAmountKrw: 900_000,
            securityDepositAmountKrw: 0,
            securityDepositUnitPriceKrw: 0,
            securityDepositQuantity: 0,
            securityDepositMode: 'NONE',
            securityDepositEvent: null,
            lines: [
              {
                ruleType: 'BASE',
                lineCode: 'BASE',
                sourceType: 'RULE',
                description: '기본금',
                ruleId: 'rule-base',
                unitPriceKrw: 1_000_000,
                quantity: 1,
                amountKrw: 1_000_000,
                teamOrderIndex: 1,
                teamName: 'B팀',
                headcount: 4,
              },
            ],
          },
        ],
      },
      { headcountTotal: 6, totalDays: 1 },
      {
        enabled: true,
        adjustmentLines: [
          {
            id: 'a-team-pickup',
            type: 'AUTO',
            teamOrderIndex: 0,
            rowKey:
              'ADDON|PICKUP_DROP|CONDITIONAL_ADDON|rule-pickup|0|A팀||픽드랍|TEAM_DIV_PERSON||100000|100000|1|2|1|#1',
            label: '픽드랍',
            leadAmountKrw: 60_000,
            formula: '100,000원/2인',
          },
        ],
        teamSummaries: [
          {
            teamOrderIndex: 0,
            totalAmountKrw: 1_060_000,
            depositAmountKrw: 110_000,
          },
        ],
      },
    );

    expect(effectivePricing.teamPricings).toHaveLength(2);
    expect(effectivePricing.teamPricings[0]).toMatchObject({
      teamOrderIndex: 0,
      totalAmountKrw: 1_060_000,
      depositAmountKrw: 110_000,
    });
    expect(effectivePricing.teamPricings[1]).toMatchObject({
      teamOrderIndex: 1,
      totalAmountKrw: 1_000_000,
    });
    expect(effectivePricing.teamPricings[0]?.adjustmentLines[0]).toMatchObject({
      teamOrderIndex: 0,
      leadAmountKrw: 60_000,
    });
  });

  it('keeps strikethrough lines visible while excluding them from totals', () => {
    const effectivePricing = buildEffectivePricing(
      {
        baseAmountKrw: 1_000_000,
        addonAmountKrw: 40_000,
        totalAmountKrw: 1_040_000,
        depositAmountKrw: 100_000,
        balanceAmountKrw: 940_000,
        securityDepositAmountKrw: 0,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 1_000_000,
            quantity: 1,
            amountKrw: 1_000_000,
          },
        ],
      },
      { headcountTotal: 6, totalDays: 1 },
      {
        enabled: true,
        adjustmentLines: [
          {
            id: 'manual-discount-line',
            type: 'MANUAL',
            label: '얼리 스타트',
            leadAmountKrw: 40_000,
            formula: '240,000원/6인',
            strikethrough: true,
          },
        ],
      },
    );

    expect(effectivePricing.totalAmountKrw).toBe(1_000_000);
    expect(effectivePricing.addonAmountKrw).toBe(0);
    expect(effectivePricing.adjustmentLines[0]).toMatchObject({
      label: '얼리 스타트',
      leadAmountKrw: 40_000,
      strikethrough: true,
    });
  });

  it('rounds auto base total to nearest ₩1,000 for totals', () => {
    const effectivePricing = buildEffectivePricing(
      {
        baseAmountKrw: 813_750,
        addonAmountKrw: 30_000,
        totalAmountKrw: 843_750,
        depositAmountKrw: 0,
        balanceAmountKrw: 0,
        securityDepositAmountKrw: 0,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 813_750,
            quantity: 1,
            amountKrw: 813_750,
          },
          {
            ruleType: 'CONDITIONAL_ADDON',
            lineCode: 'EARLY',
            sourceType: 'RULE',
            description: '얼리 스타트',
            ruleId: 'rule-early',
            unitPriceKrw: 30_000,
            quantity: 1,
            amountKrw: 30_000,
          },
        ],
      },
      { headcountTotal: 8, totalDays: 1 },
    );

    expect(effectivePricing.baseAmountKrw).toBe(814_000);
    expect(effectivePricing.addonAmountKrw).toBe(30_000);
    expect(effectivePricing.totalAmountKrw).toBe(844_000);
    expect(effectivePricing.depositAmountKrw).toBe(94_000);
    expect(effectivePricing.balanceAmountKrw).toBe(750_000);
  });

  it('applies manual securityDepositMode PER_TEAM for display (same total)', () => {
    const autoPricing = buildEffectivePricing(
      {
        baseAmountKrw: 500_000,
        addonAmountKrw: 0,
        totalAmountKrw: 500_000,
        depositAmountKrw: 50_000,
        balanceAmountKrw: 450_000,
        securityDepositAmountKrw: 180_000,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 30_000,
        securityDepositQuantity: 6,
        securityDepositMode: 'PER_PERSON',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 500_000,
            quantity: 1,
            amountKrw: 500_000,
          },
        ],
      },
      { headcountTotal: 6, totalDays: 2 },
    );

    expect(autoPricing.securityDepositMode).toBe('PER_PERSON');
    expect(autoPricing.securityDepositQuantity).toBe(6);
    expect(autoPricing.securityDepositUnitPriceKrw).toBe(30_000);

    const manualTeam = buildEffectivePricing(
      {
        baseAmountKrw: 500_000,
        addonAmountKrw: 0,
        totalAmountKrw: 500_000,
        depositAmountKrw: 50_000,
        balanceAmountKrw: 450_000,
        securityDepositAmountKrw: 180_000,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 30_000,
        securityDepositQuantity: 6,
        securityDepositMode: 'PER_PERSON',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 500_000,
            quantity: 1,
            amountKrw: 500_000,
          },
        ],
      },
      { headcountTotal: 6, totalDays: 2 },
      {
        enabled: true,
        adjustmentLines: [],
        summary: {
          securityDepositAmountKrw: 180_000,
          securityDepositMode: 'PER_TEAM',
        },
      },
    );

    expect(manualTeam.securityDepositMode).toBe('PER_TEAM');
    expect(manualTeam.securityDepositQuantity).toBe(1);
    expect(manualTeam.securityDepositUnitPriceKrw).toBe(180_000);
    expect(manualTeam.securityDepositAmountKrw).toBe(180_000);
  });

  it('applies manual securityDepositMode PER_PERSON for team slice (same total)', () => {
    const effectivePricing = buildEffectivePricing<PricingManualSourceLine>(
      {
        baseAmountKrw: 1_000_000,
        addonAmountKrw: 0,
        totalAmountKrw: 1_000_000,
        depositAmountKrw: 100_000,
        balanceAmountKrw: 900_000,
        securityDepositAmountKrw: 0,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 0,
        securityDepositQuantity: 0,
        securityDepositMode: 'NONE',
        lines: [
          {
            ruleType: 'BASE',
            lineCode: 'BASE',
            sourceType: 'RULE',
            description: '기본금',
            ruleId: 'rule-base',
            unitPriceKrw: 1_000_000,
            quantity: 1,
            amountKrw: 1_000_000,
          },
        ],
        teamPricings: [
          {
            teamOrderIndex: 0,
            teamName: 'A팀',
            headcount: 4,
            baseAmountKrw: 1_000_000,
            addonAmountKrw: 0,
            totalAmountKrw: 1_000_000,
            depositAmountKrw: 100_000,
            balanceAmountKrw: 900_000,
            securityDepositAmountKrw: 50_000,
            securityDepositUnitPriceKrw: 50_000,
            securityDepositQuantity: 1,
            securityDepositMode: 'PER_TEAM',
            securityDepositEvent: null,
            lines: [
              {
                ruleType: 'BASE',
                lineCode: 'BASE',
                sourceType: 'RULE',
                description: '기본금',
                ruleId: 'rule-base',
                unitPriceKrw: 1_000_000,
                quantity: 1,
                amountKrw: 1_000_000,
                teamOrderIndex: 0,
                teamName: 'A팀',
                headcount: 4,
              },
            ],
          },
        ],
      },
      { headcountTotal: 4, totalDays: 1 },
      {
        enabled: true,
        adjustmentLines: [],
        teamSummaries: [
          {
            teamOrderIndex: 0,
            securityDepositAmountKrw: 50_000,
            securityDepositMode: 'PER_PERSON',
          },
        ],
      },
    );

    const team = effectivePricing.teamPricings[0];
    expect(team?.securityDepositMode).toBe('PER_PERSON');
    expect(team?.securityDepositQuantity).toBe(4);
    expect(team?.securityDepositUnitPriceKrw).toBe(12_500);
    expect(team?.securityDepositAmountKrw).toBe(50_000);
  });

  it('단일 팀일 때 글로벌 수동 summary 기본금을 팀 슬라이스에 폴백한다', () => {
    const commonLines: PricingManualSourceLine[] = [
      {
        ruleType: 'BASE',
        lineCode: 'BASE',
        sourceType: 'RULE',
        description: '기본금',
        ruleId: 'rule-base',
        unitPriceKrw: 813_750,
        quantity: 1,
        amountKrw: 813_750,
      },
      {
        ruleType: 'CONDITIONAL_ADDON',
        lineCode: 'EARLY',
        sourceType: 'RULE',
        description: '얼리',
        ruleId: 'rule-early',
        unitPriceKrw: 30_000,
        quantity: 1,
        amountKrw: 30_000,
      },
      {
        ruleType: 'CONDITIONAL_ADDON',
        lineCode: 'LODGING_SELECTION',
        sourceType: 'RULE',
        description: '숙소',
        ruleId: 'rule-lv',
        unitPriceKrw: 50_000,
        quantity: 2,
        amountKrw: 100_000,
      },
    ];

    const effectivePricing = buildEffectivePricing(
      {
        baseAmountKrw: 814_000,
        addonAmountKrw: 130_000,
        totalAmountKrw: 944_000,
        depositAmountKrw: 74_000,
        balanceAmountKrw: 870_000,
        securityDepositAmountKrw: 300_000,
        securityDepositEvent: null,
        securityDepositUnitPriceKrw: 300_000,
        securityDepositQuantity: 1,
        securityDepositMode: 'PER_TEAM',
        lines: commonLines,
        teamPricings: [
          {
            teamOrderIndex: 0,
            teamName: 'A팀',
            headcount: 8,
            baseAmountKrw: 814_000,
            addonAmountKrw: 130_000,
            totalAmountKrw: 944_000,
            depositAmountKrw: 74_000,
            balanceAmountKrw: 870_000,
            securityDepositAmountKrw: 300_000,
            securityDepositUnitPriceKrw: 300_000,
            securityDepositQuantity: 1,
            securityDepositMode: 'PER_TEAM',
            securityDepositEvent: null,
            lines: commonLines.map((line) => ({
              ...line,
              teamOrderIndex: 0,
              teamName: 'A팀',
              headcount: 8,
            })),
          },
        ],
      },
      { headcountTotal: 8, totalDays: 4 },
      {
        enabled: true,
        adjustmentLines: [],
        summary: {
          baseAmountKrw: 1_000_000,
          totalAmountKrw: 1_130_000,
          depositAmountKrw: 74_000,
          balanceAmountKrw: 1_056_000,
        },
        teamSummaries: [{ teamOrderIndex: 0 }],
      },
    );

    expect(effectivePricing.teamPricings).toHaveLength(1);
    expect(sliceEffectiveTotalsForUi(effectivePricing).baseAmountKrw).toBe(1_000_000);
    expect(sliceEffectiveTotalsForUi(effectivePricing).totalAmountKrw).toBe(1_130_000);
  });
});
