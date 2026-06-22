import {
  resolvePublishedPricingTotals,
  type PlanVersionPricingPublishedSource,
  type PublishedPricingTotals,
} from '@tour/domain';
import type { CustomerPricingSnapshot } from '@tour/domain';
import type { PlanVersionPricingRow } from '../plan/hooks';
import type { CustomerFacingPricingTotalsSlice } from './customer-pricing-snapshot';

export function toPlanVersionPricingPublishedSource(
  pricing: Pick<
    PlanVersionPricingRow,
    | 'baseAmountKrw'
    | 'totalAmountKrw'
    | 'depositAmountKrw'
    | 'balanceAmountKrw'
    | 'securityDepositAmountKrw'
    | 'securityDepositUnitPriceKrw'
    | 'securityDepositMode'
    | 'manualPricing'
  >,
): PlanVersionPricingPublishedSource {
  return {
    baseAmountKrw: pricing.baseAmountKrw,
    totalAmountKrw: pricing.totalAmountKrw,
    depositAmountKrw: pricing.depositAmountKrw,
    balanceAmountKrw: pricing.balanceAmountKrw,
    securityDepositAmountKrw: pricing.securityDepositAmountKrw,
    securityDepositUnitPriceKrw: pricing.securityDepositUnitPriceKrw,
    securityDepositMode: pricing.securityDepositMode,
    customerPricingSnapshot: pricing.manualPricing?.customerPricingSnapshot ?? null,
  };
}

export function publishedTotalsFromPlanVersionPricing(
  pricing: Parameters<typeof toPlanVersionPricingPublishedSource>[0] | null | undefined,
): CustomerFacingPricingTotalsSlice | null {
  if (!pricing) {
    return null;
  }
  const totals = resolvePublishedPricingTotals(toPlanVersionPricingPublishedSource(pricing));
  return totals as CustomerFacingPricingTotalsSlice | null;
}

export type { PublishedPricingTotals, CustomerPricingSnapshot };
