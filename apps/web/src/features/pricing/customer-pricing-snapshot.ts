import type { CustomerPricingSnapshot } from '@tour/domain';
import {
  sliceEffectiveTotalsForUi,
  type DisplayedPricingAdjustmentLineRow,
  type EffectivePricingResult,
  type PricingAdjustmentLineRow,
} from './manual-pricing';

/** `sliceEffectiveTotalsForUi`와 동일한 필드 형태 — 상세 카드·확정 카드에서 스냅샷을 그대로 표시할 때 사용 */
export type CustomerFacingPricingTotalsSlice = {
  baseAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
  securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
};

export function customerFacingTotalsFromSnapshot(snap: CustomerPricingSnapshot): CustomerFacingPricingTotalsSlice {
  return {
    baseAmountKrw: snap.baseAmountKrw,
    totalAmountKrw: snap.totalAmountKrw,
    depositAmountKrw: snap.depositAmountKrw,
    balanceAmountKrw: snap.balanceAmountKrw,
    securityDepositAmountKrw: snap.securityDepositTotalKrw,
    securityDepositUnitPriceKrw: snap.securityDepositUnitKrw,
    securityDepositMode: snap.securityDepositMode,
  };
}

/** 상세 페이지 「고객 출력」 블록에서 스냅샷 줄을 `PricingAdjustmentLineRow` 형태로 변환 */
export function customerFacingAdjustmentLineRowsFromSnapshot(
  snap: CustomerPricingSnapshot,
): PricingAdjustmentLineRow[] {
  const showLineTeamName = snap.teamPricings.length > 1;
  return snap.adjustmentLines.map((line, index) => ({
    id: `customer-pricing-snapshot:${index}`,
    type: 'MANUAL',
    rowKey: null,
    teamOrderIndex: null,
    teamName: showLineTeamName ? line.teamName ?? null : null,
    headcount: null,
    label: line.label,
    leadAmountKrw: line.leadAmountKrw,
    formula: line.formula,
    strikethrough: line.strikethrough === true,
    deleted: false,
    isManual: true,
  }));
}

/** 빌더 저장·견적 draft와 동일 기준의 고객용 금액 스냅샷 (상세/PDF 재해석 없이 그대로 표시). */
export function buildCustomerPricingSnapshot(
  pricingPreview: EffectivePricingResult | null,
  displayedPricingAdjustmentLines: DisplayedPricingAdjustmentLineRow[],
): CustomerPricingSnapshot | null {
  if (!pricingPreview) {
    return null;
  }
  const headlineTotals = sliceEffectiveTotalsForUi(pricingPreview);
  const showLineTeamName = pricingPreview.teamPricings.length > 1;
  return {
    baseAmountKrw: headlineTotals.baseAmountKrw,
    totalAmountKrw: headlineTotals.totalAmountKrw,
    depositAmountKrw: headlineTotals.depositAmountKrw,
    balanceAmountKrw: headlineTotals.balanceAmountKrw,
    securityDepositTotalKrw: headlineTotals.securityDepositAmountKrw,
    securityDepositUnitKrw: headlineTotals.securityDepositUnitPriceKrw,
    securityDepositMode: headlineTotals.securityDepositMode,
    adjustmentLines: displayedPricingAdjustmentLines.map((line) => ({
      teamName: showLineTeamName && !line.isSharedAcrossTeams ? line.teamNames[0] ?? null : null,
      label: line.label,
      leadAmountKrw: line.leadAmountKrw,
      formula: line.formula,
      strikethrough: line.strikethrough === true,
    })),
    teamPricings: pricingPreview.teamPricings.map((teamPricing) => ({
      teamOrderIndex: teamPricing.teamOrderIndex,
      teamName: teamPricing.teamName,
      totalAmountKrw: teamPricing.totalAmountKrw,
      depositAmountKrw: teamPricing.depositAmountKrw,
      balanceAmountKrw: teamPricing.balanceAmountKrw,
      securityDepositAmountKrw: teamPricing.securityDepositAmountKrw,
      securityDepositUnitKrw: teamPricing.securityDepositUnitPriceKrw,
      securityDepositScope:
        teamPricing.securityDepositMode === 'PER_PERSON'
          ? '인당'
          : teamPricing.securityDepositMode === 'PER_TEAM'
            ? '팀당'
            : '-',
    })),
  };
}
