import { describe, expect, it } from 'vitest';
import {
  resolveEffectiveDepositAndBalanceKrw,
  resolvePublishedBalancePerPersonKrw,
  resolvePublishedPricingTotals,
} from '@tour/domain';

describe('resolvePublishedPricingTotals', () => {
  it('prefers customerPricingSnapshot when present', () => {
    expect(
      resolvePublishedPricingTotals({
        baseAmountKrw: 1_000_000,
        totalAmountKrw: 1_048_000,
        depositAmountKrw: 108_000,
        balanceAmountKrw: 940_000,
        securityDepositAmountKrw: 180_000,
        securityDepositUnitPriceKrw: 30_000,
        securityDepositMode: 'PER_PERSON',
        customerPricingSnapshot: {
          baseAmountKrw: 1_008_000,
          totalAmountKrw: 1_048_000,
          depositAmountKrw: 98_000,
          balanceAmountKrw: 950_000,
          securityDepositTotalKrw: 180_000,
          securityDepositUnitKrw: 30_000,
          securityDepositMode: 'PER_PERSON',
          adjustmentLines: [],
          teamPricings: [],
        },
      })?.balanceAmountKrw,
    ).toBe(950_000);
  });

  it('uses stored pricing columns when customer snapshot is absent', () => {
    expect(
      resolvePublishedBalancePerPersonKrw({
        baseAmountKrw: 1_008_000,
        totalAmountKrw: 1_048_000,
        depositAmountKrw: 108_000,
        balanceAmountKrw: 940_000,
        securityDepositAmountKrw: 180_000,
        securityDepositUnitPriceKrw: 30_000,
        securityDepositMode: 'PER_PERSON',
      }),
    ).toBe(940_000);
  });

  it('recomputes only when stored split does not match total', () => {
    expect(
      resolvePublishedBalancePerPersonKrw({
        baseAmountKrw: 814_000,
        totalAmountKrw: 844_000,
        depositAmountKrw: 0,
        balanceAmountKrw: 0,
        securityDepositAmountKrw: 0,
        securityDepositUnitPriceKrw: 0,
        securityDepositMode: 'NONE',
      }),
    ).toBe(760_000);
  });
});

describe('resolveEffectiveDepositAndBalanceKrw', () => {
  it('keeps stored split when it matches total', () => {
    expect(
      resolveEffectiveDepositAndBalanceKrw({
        storedDepositAmountKrw: 108_000,
        storedBalanceAmountKrw: 940_000,
        totalAmountKrw: 1_048_000,
      }),
    ).toEqual({ depositAmountKrw: 108_000, balanceAmountKrw: 940_000 });
  });
});
