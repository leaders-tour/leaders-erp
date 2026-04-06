import { describe, expect, it } from 'vitest';
import { buildEffectivePricing } from './manual-pricing';

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
    const effectivePricing = buildEffectivePricing(
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
});
