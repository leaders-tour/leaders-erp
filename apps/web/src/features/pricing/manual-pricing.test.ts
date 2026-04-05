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
});
