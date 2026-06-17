import { describe, expect, it } from 'vitest';
import { buildPricingLineDisplay } from './pricing-line-display';

describe('buildPricingLineDisplay', () => {
  it('uses rule title as display label for conditional per-day addons', () => {
    const display = buildPricingLineDisplay(
      {
        ruleType: 'CONDITIONAL_ADDON',
        lineCode: 'CONDITIONAL',
        sourceType: 'RULE',
        description: '하이에이스 추가금',
        unitPriceKrw: 5_000,
        quantity: 6,
        amountKrw: 30_000,
        meta: {
          ruleType: 'CONDITIONAL_ADDON',
          title: '하이에이스 추가금',
          lineCode: 'CONDITIONAL',
          chargeScope: 'PER_PERSON',
          personMode: 'PER_DAY',
        },
      },
      { headcountTotal: 4, totalDays: 6 },
    );

    expect(display).toMatchObject({
      basis: 'PER_DAY',
      label: '하이에이스 추가금',
      unitAmountKrw: 5_000,
      count: 6,
    });
  });

  it('falls back to meta.title when description is empty', () => {
    const display = buildPricingLineDisplay(
      {
        ruleType: 'CONDITIONAL_ADDON',
        lineCode: 'CONDITIONAL',
        sourceType: 'RULE',
        description: null,
        unitPriceKrw: 5_000,
        quantity: 6,
        amountKrw: 30_000,
        meta: {
          ruleType: 'CONDITIONAL_ADDON',
          title: '하이에이스 추가금',
          lineCode: 'CONDITIONAL',
          chargeScope: 'PER_PERSON',
          personMode: 'PER_DAY',
        },
      },
      { headcountTotal: 4, totalDays: 6 },
    );

    expect(display.label).toBe('하이에이스 추가금');
  });
});
