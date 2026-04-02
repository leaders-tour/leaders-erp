import { describe, expect, it } from 'vitest';
import { formatPricingDetailFormula, resolvePricingLineDisplay } from './pricing-line-presenter';

const ctx6 = { headcountTotal: 6, totalDays: 6 };

describe('pricing-line-presenter', () => {
  it('uses API display fields when present', () => {
    const line = {
      lineCode: 'MANUAL_ADJUSTMENT',
      sourceType: 'RULE' as const,
      description: '샤브샤브 누락 할인',
      unitPriceKrw: -15_000,
      quantity: 1,
      amountKrw: -15_000,
      displayBasis: 'PER_PERSON_SINGLE',
      displayUnitAmountKrw: -15_000,
      displayCount: 1,
      displayDivisorPerson: null,
      displayText: null,
    };
    expect(formatPricingDetailFormula(line, ctx6)).toBe('-15,000원*1');
    expect(resolvePricingLineDisplay(line, ctx6).basis).toBe('PER_PERSON_SINGLE');
  });

  it('formats team line as amount/headcount', () => {
    const line = {
      lineCode: 'MANUAL_ADJUSTMENT',
      sourceType: 'RULE' as const,
      description: '야간열차',
      unitPriceKrw: 420_000,
      quantity: 1,
      amountKrw: 420_000,
      displayBasis: 'TEAM_DIV_PERSON',
      displayDivisorPerson: 6,
    };
    expect(formatPricingDetailFormula(line, ctx6)).toBe('420,000원/6인');
  });

  it('infers PERCENT for stored uplift lines without display', () => {
    const line = {
      lineCode: 'BASE_UPLIFT_5PLUS_5PCT',
      sourceType: 'RULE' as const,
      description: null,
      unitPriceKrw: null,
      quantity: 1,
      amountKrw: 50_000,
    };
    expect(formatPricingDetailFormula(line, ctx6)).toBe('기본금의 5%');
  });
});
