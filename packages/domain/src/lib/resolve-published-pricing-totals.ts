import type { CustomerPricingSnapshot, SecurityDepositScopeMode } from '../models/pricing-manual';
import { computeDepositAndBalanceKrw } from './compute-deposit-balance-krw';

type JsonRecord = Record<string, unknown>;

export type PublishedPricingTotals = {
  baseAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
  securityDepositMode: SecurityDepositScopeMode;
};

export type PlanVersionPricingPublishedSource = {
  baseAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
  securityDepositMode: SecurityDepositScopeMode;
  manualPricingSnapshot?: unknown;
  /** GraphQL resolver가 풀어준 customerPricingSnapshot (manualPricingSnapshot과 중복 가능) */
  customerPricingSnapshot?: CustomerPricingSnapshot | null;
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function securityDepositModeValue(value: unknown): SecurityDepositScopeMode {
  if (value === 'PER_PERSON' || value === 'PER_TEAM' || value === 'NONE') {
    return value;
  }
  return 'NONE';
}

function totalsFromCustomerSnapshot(snapshot: CustomerPricingSnapshot): PublishedPricingTotals {
  return {
    baseAmountKrw: snapshot.baseAmountKrw,
    totalAmountKrw: snapshot.totalAmountKrw,
    depositAmountKrw: snapshot.depositAmountKrw,
    balanceAmountKrw: snapshot.balanceAmountKrw,
    securityDepositAmountKrw: snapshot.securityDepositTotalKrw,
    securityDepositUnitPriceKrw: snapshot.securityDepositUnitKrw,
    securityDepositMode: snapshot.securityDepositMode,
  };
}

function customerSnapshotFromSource(source: PlanVersionPricingPublishedSource): CustomerPricingSnapshot | null {
  if (source.customerPricingSnapshot) {
    return source.customerPricingSnapshot;
  }
  const manualSnapshot = asRecord(source.manualPricingSnapshot);
  const nested = manualSnapshot?.customerPricingSnapshot;
  if (!nested || typeof nested !== 'object') {
    return null;
  }
  return nested as CustomerPricingSnapshot;
}

/**
 * 버전 저장 시 확정된 대외·운영용 금액 요약.
 * 1) customerPricingSnapshot 2) pricing 컬럼 3) 총액 기준 재계산(fallback)
 */
export function resolvePublishedPricingTotals(
  pricing: PlanVersionPricingPublishedSource | null | undefined,
): PublishedPricingTotals | null {
  if (!pricing) {
    return null;
  }

  const customerSnapshot = customerSnapshotFromSource(pricing);
  if (customerSnapshot) {
    return totalsFromCustomerSnapshot(customerSnapshot);
  }

  const totalAmountKrw = numberValue(pricing.totalAmountKrw);
  const depositAmountKrw = numberValue(pricing.depositAmountKrw);
  const balanceAmountKrw = numberValue(pricing.balanceAmountKrw);
  if (
    totalAmountKrw != null &&
    depositAmountKrw != null &&
    balanceAmountKrw != null &&
    depositAmountKrw >= 0 &&
    balanceAmountKrw >= 0 &&
    depositAmountKrw + balanceAmountKrw === totalAmountKrw
  ) {
    return {
      baseAmountKrw: numberValue(pricing.baseAmountKrw) ?? totalAmountKrw,
      totalAmountKrw,
      depositAmountKrw,
      balanceAmountKrw,
      securityDepositAmountKrw: numberValue(pricing.securityDepositAmountKrw) ?? 0,
      securityDepositUnitPriceKrw: numberValue(pricing.securityDepositUnitPriceKrw) ?? 0,
      securityDepositMode: securityDepositModeValue(pricing.securityDepositMode),
    };
  }

  if (totalAmountKrw == null) {
    return null;
  }

  const { depositAmountKrw: computedDeposit, balanceAmountKrw: computedBalance } =
    computeDepositAndBalanceKrw(totalAmountKrw);
  return {
    baseAmountKrw: numberValue(pricing.baseAmountKrw) ?? totalAmountKrw,
    totalAmountKrw,
    depositAmountKrw: computedDeposit,
    balanceAmountKrw: computedBalance,
    securityDepositAmountKrw: numberValue(pricing.securityDepositAmountKrw) ?? 0,
    securityDepositUnitPriceKrw: numberValue(pricing.securityDepositUnitPriceKrw) ?? 0,
    securityDepositMode: securityDepositModeValue(pricing.securityDepositMode),
  };
}

export function resolvePublishedBalancePerPersonKrw(
  pricing: PlanVersionPricingPublishedSource | null | undefined,
): number | null {
  return resolvePublishedPricingTotals(pricing)?.balanceAmountKrw ?? null;
}

/** effective pricing 계산 시 deposit/balance 핀·저장값·재계산 우선순위 */
export function resolveEffectiveDepositAndBalanceKrw(input: {
  storedDepositAmountKrw: number;
  storedBalanceAmountKrw: number;
  totalAmountKrw: number;
  depositOverride?: number;
  balanceOverride?: number;
}): { depositAmountKrw: number; balanceAmountKrw: number } {
  const { storedDepositAmountKrw, storedBalanceAmountKrw, totalAmountKrw, depositOverride, balanceOverride } =
    input;

  if (balanceOverride !== undefined && depositOverride !== undefined) {
    return {
      depositAmountKrw: depositOverride,
      balanceAmountKrw: balanceOverride,
    };
  }

  if (balanceOverride !== undefined) {
    return {
      depositAmountKrw: totalAmountKrw - balanceOverride,
      balanceAmountKrw: balanceOverride,
    };
  }

  if (depositOverride !== undefined) {
    return computeDepositAndBalanceKrw(totalAmountKrw, depositOverride);
  }

  if (
    Number.isInteger(storedDepositAmountKrw) &&
    Number.isInteger(storedBalanceAmountKrw) &&
    storedDepositAmountKrw >= 0 &&
    storedBalanceAmountKrw >= 0 &&
    storedDepositAmountKrw + storedBalanceAmountKrw === totalAmountKrw
  ) {
    return {
      depositAmountKrw: storedDepositAmountKrw,
      balanceAmountKrw: storedBalanceAmountKrw,
    };
  }

  return computeDepositAndBalanceKrw(totalAmountKrw);
}
