import type { CustomerPricingSnapshot, CustomerPricingTeamRowSnapshot } from '@tour/domain';
import { resolvePublishedPricingTotals } from '@tour/domain';
import {
  sliceEffectiveTotalsForUi,
  type DisplayedPricingAdjustmentLineRow,
  type EffectivePricingResult,
  type EffectiveTeamPricingResult,
  type PricingAdjustmentLineRow,
} from './manual-pricing';
import {
  shouldShowTeamPrefixInPricingSummary,
  shouldShowTeamPrefixForBaseAmount,
  teamPricingsForSummaryDisplay,
  teamPricingsForBaseAmountDisplay,
  teamPricingSummarySignatureFromParts,
} from './team-pricing-summary-display';

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

/** 상세·확정 카드 요약 표에 쓰는 팀별 1인 금액 행 */
export type CustomerOutputTeamPricingRow = {
  teamOrderIndex: number;
  teamName: string;
  baseAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitKrw: number;
  securityDepositScope: string;
};

function securityDepositScopeFromMode(mode: 'NONE' | 'PER_PERSON' | 'PER_TEAM'): string {
  if (mode === 'PER_PERSON') {
    return '인당';
  }
  if (mode === 'PER_TEAM') {
    return '팀당';
  }
  return '-';
}

function mapSnapshotTeamPricingRow(row: CustomerPricingTeamRowSnapshot): CustomerOutputTeamPricingRow {
  return {
    teamOrderIndex: row.teamOrderIndex,
    teamName: row.teamName,
    baseAmountKrw: row.baseAmountKrw ?? 0,
    totalAmountKrw: row.totalAmountKrw,
    depositAmountKrw: row.depositAmountKrw,
    balanceAmountKrw: row.balanceAmountKrw,
    securityDepositAmountKrw: row.securityDepositAmountKrw,
    securityDepositUnitKrw: row.securityDepositUnitKrw,
    securityDepositScope: row.securityDepositScope,
  };
}

function mapEffectiveTeamPricingRow(row: EffectiveTeamPricingResult): CustomerOutputTeamPricingRow {
  return {
    teamOrderIndex: row.teamOrderIndex,
    teamName: row.teamName,
    baseAmountKrw: row.baseAmountKrw,
    totalAmountKrw: row.totalAmountKrw,
    depositAmountKrw: row.depositAmountKrw,
    balanceAmountKrw: row.balanceAmountKrw,
    securityDepositAmountKrw: row.securityDepositAmountKrw,
    securityDepositUnitKrw: row.securityDepositUnitPriceKrw,
    securityDepositScope: securityDepositScopeFromMode(row.securityDepositMode),
  };
}

export function customerOutputTeamPricingSignature(row: CustomerOutputTeamPricingRow): string {
  return teamPricingSummarySignatureFromParts({
    totalAmountKrw: row.totalAmountKrw,
    depositAmountKrw: row.depositAmountKrw,
    balanceAmountKrw: row.balanceAmountKrw,
    securityNone: row.securityDepositScope === '-',
    securityDepositAmountKrw: row.securityDepositAmountKrw,
    securityDepositUnitKrw: row.securityDepositUnitKrw,
    securityScopeWhenPresent: row.securityDepositScope === '-' ? '' : row.securityDepositScope,
  });
}

/** 저장 스냅샷 팀 행이 없으면 live effective pricing 팀 행으로 보완한다. */
export function resolveCustomerOutputTeamPricings(input: {
  snapshotTeamPricings?: CustomerPricingTeamRowSnapshot[] | null;
  effectiveTeamPricings?: EffectiveTeamPricingResult[] | null;
  headlineBaseAmountKrw?: number | null;
}): CustomerOutputTeamPricingRow[] {
  const snapshotRows = input.snapshotTeamPricings ?? [];
  const effectiveByIndex = new Map(
    (input.effectiveTeamPricings ?? []).map((row) => [row.teamOrderIndex, row]),
  );
  if (snapshotRows.length > 0) {
    return snapshotRows.map((row) => {
      const effective = effectiveByIndex.get(row.teamOrderIndex);
      const baseAmountKrw =
        typeof row.baseAmountKrw === 'number'
          ? row.baseAmountKrw
          : effective?.baseAmountKrw ?? input.headlineBaseAmountKrw ?? 0;
      return mapSnapshotTeamPricingRow({ ...row, baseAmountKrw });
    });
  }
  return (input.effectiveTeamPricings ?? []).map(mapEffectiveTeamPricingRow);
}

/** 빌더·견적 PDF와 동일한 팀 요약 표시 규칙 */
export function buildCustomerOutputSummaryTeams(input: {
  teamPricings: CustomerOutputTeamPricingRow[];
  expandTeamPricingSummaryRows?: boolean | null;
}): { rows: CustomerOutputTeamPricingRow[]; showTeamPrefix: boolean } | null {
  const teams = input.teamPricings;
  if (teams.length === 0) {
    return null;
  }
  if (teams.length <= 1) {
    return { rows: teams, showTeamPrefix: false };
  }
  if (shouldShowTeamPrefixInPricingSummary(teams, customerOutputTeamPricingSignature)) {
    return { rows: teams, showTeamPrefix: true };
  }
  if (input.expandTeamPricingSummaryRows === true) {
    return { rows: teams, showTeamPrefix: true };
  }
  return {
    rows: teamPricingsForSummaryDisplay(teams, customerOutputTeamPricingSignature),
    showTeamPrefix: false,
  };
}

/** 빌더·견적 PDF와 동일한 팀별 기본금 표시 규칙 */
export function buildCustomerOutputBaseAmountTeams(input: {
  teamPricings: CustomerOutputTeamPricingRow[];
  expandTeamPricingSummaryRows?: boolean | null;
}): { rows: CustomerOutputTeamPricingRow[]; showTeamPrefix: boolean } | null {
  const teams = input.teamPricings;
  if (teams.length === 0) {
    return null;
  }
  if (teams.length <= 1) {
    return { rows: teams, showTeamPrefix: false };
  }
  if (shouldShowTeamPrefixForBaseAmount(teams)) {
    return { rows: teams, showTeamPrefix: true };
  }
  if (input.expandTeamPricingSummaryRows === true) {
    return { rows: teams, showTeamPrefix: true };
  }
  return {
    rows: teamPricingsForBaseAmountDisplay(teams),
    showTeamPrefix: false,
  };
}

/** 빌더 저장·견적 draft와 동일 기준의 고객용 금액 스냅샷 (상세/PDF 재해석 없이 그대로 표시). */
export function buildCustomerPricingSnapshot(
  pricingPreview: EffectivePricingResult | null,
  displayedPricingAdjustmentLines: DisplayedPricingAdjustmentLineRow[],
  publishedSource?: Parameters<typeof resolvePublishedPricingTotals>[0] | null,
): CustomerPricingSnapshot | null {
  if (!pricingPreview) {
    return null;
  }
  const headlineTotals =
    (publishedSource ? resolvePublishedPricingTotals(publishedSource) : null) ??
    sliceEffectiveTotalsForUi(pricingPreview);
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
      baseAmountKrw: teamPricing.baseAmountKrw,
      totalAmountKrw: teamPricing.totalAmountKrw,
      depositAmountKrw: teamPricing.depositAmountKrw,
      balanceAmountKrw: teamPricing.balanceAmountKrw,
      securityDepositAmountKrw: teamPricing.securityDepositAmountKrw,
      securityDepositUnitKrw: teamPricing.securityDepositUnitPriceKrw,
      securityDepositScope: securityDepositScopeFromMode(teamPricing.securityDepositMode),
    })),
  };
}
