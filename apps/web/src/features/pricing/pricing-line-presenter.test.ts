import { describe, expect, it } from 'vitest';
import { formatPricingDetailFormula, resolveDisplayLeadAmount, resolvePricingLineDisplay } from './pricing-line-presenter';

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

  it('formats night-train line as amount/count', () => {
    const line = {
      lineCode: 'NIGHT_TRAIN',
      sourceType: 'RULE' as const,
      description: '야간열차 추가금',
      unitPriceKrw: 420_000,
      quantity: 2,
      amountKrw: 840_000,
    };
    expect(formatPricingDetailFormula(line, ctx6)).toBe('420,000원×2회');
  });

  it('formats team-div-person display using unit amount and count', () => {
    const line = {
      lineCode: 'NIGHT_TRAIN',
      sourceType: 'RULE' as const,
      description: '야간열차',
      unitPriceKrw: 420_000,
      quantity: 2,
      amountKrw: 840_000,
      displayBasis: 'TEAM_DIV_PERSON',
      displayLabel: '야간열차',
      displayUnitAmountKrw: 420_000,
      displayCount: 2,
      displayDivisorPerson: 7,
    };
    expect(formatPricingDetailFormula(line, ctx6)).toBe('420,000원/7인*2회');
    expect(resolvePricingLineDisplay(line, ctx6)).toMatchObject({
      basis: 'TEAM_DIV_PERSON',
      unitAmountKrw: 420_000,
      count: 2,
      divisorPerson: 7,
    });
    expect(resolveDisplayLeadAmount(line, ctx6)).toBe(60_000);
  });

  it('rounds team-div-person display amount to nearest hundred', () => {
    const line = {
      lineCode: 'EARLY',
      sourceType: 'RULE' as const,
      description: '얼리 추가금',
      unitPriceKrw: 250_000,
      quantity: 1,
      amountKrw: 250_000,
      displayBasis: 'TEAM_DIV_PERSON',
      displayUnitAmountKrw: 250_000,
      displayCount: 1,
      displayDivisorPerson: 6,
    };
    expect(resolveDisplayLeadAmount(line, ctx6)).toBe(41_700);
  });

  it('uses team unit amount for formula and stored per-person amount for totals', () => {
    const line = {
      lineCode: 'EARLY',
      sourceType: 'RULE' as const,
      description: '얼리 추가금',
      unitPriceKrw: 240_000,
      quantity: 1,
      amountKrw: 40_000,
      displayBasis: 'TEAM_DIV_PERSON',
      displayUnitAmountKrw: 240_000,
      displayCount: 1,
      displayDivisorPerson: 6,
    };
    expect(formatPricingDetailFormula(line, ctx6)).toBe('240,000원/6인');
    expect(resolveDisplayLeadAmount(line, ctx6)).toBe(40_000);
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
