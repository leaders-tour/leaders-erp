import { normalizeContractPersonName } from '@tour/validation';
import type { Prisma } from '@prisma/client';

type PlanVersionForPaymentSummary = Prisma.PlanVersionGetPayload<{
  select: {
    id: true;
    meta: {
      select: {
        headcountTotal: true;
      };
    };
    pricing: {
      select: {
        depositAmountKrw: true;
        securityDepositAmountKrw: true;
        securityDepositUnitPriceKrw: true;
        securityDepositMode: true;
        inputSnapshot: true;
        manualPricingSnapshot: true;
      };
    };
  };
}>;

type MatchedReceiptForSummary = {
  payerNameRaw: string | null;
  payerNameNorm: string | null;
  amountKrw: number | null;
};

export type TeamPaymentReferenceSummary = {
  teamName: string;
  headcount: number;
  depositAmountKrw: number;
  securityAmountKrw: number;
  securityLabel: string;
  requiredReferenceKrw: number;
  requiredTotalKrw: number;
};

export type MemberDepositSummary = {
  name: string;
  receivedAmountKrw: number;
  requiredReferenceAmountKrw: number | null;
};

export type DocumentPaymentReviewSummary = {
  teamPaymentReferences: TeamPaymentReferenceSummary[];
  memberDeposits: MemberDepositSummary[];
  requiredTotalKrw: number | null;
  receivedTotalKrw: number;
  remainingTotalKrw: number | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function headcountForPricing(planVersion: PlanVersionForPaymentSummary): number {
  const metaHeadcount = planVersion.meta?.headcountTotal;
  if (typeof metaHeadcount === 'number' && metaHeadcount > 0) {
    return metaHeadcount;
  }
  const inputSnapshot = asRecord(planVersion.pricing?.inputSnapshot);
  const inputHeadcount = numberValue(inputSnapshot?.headcountTotal);
  return inputHeadcount && inputHeadcount > 0 ? inputHeadcount : 1;
}

function teamHeadcountFromInputSnapshot(
  inputSnapshot: Record<string, unknown> | null,
  teamOrderIndex: number,
  fallback: number,
): number {
  const teams = inputSnapshot?.teams;
  if (!Array.isArray(teams)) {
    return fallback;
  }
  for (const team of teams) {
    const row = asRecord(team);
    if (!row || numberValue(row.teamOrderIndex) !== teamOrderIndex) {
      continue;
    }
    const headcount = numberValue(row.headcount);
    if (headcount != null && headcount > 0) {
      return headcount;
    }
  }
  return fallback;
}

function teamPaymentReferenceFromSnapshotRow(
  row: Record<string, unknown>,
  headcount: number,
): TeamPaymentReferenceSummary {
  const people = headcount > 0 ? headcount : 1;
  const depositAmountKrw = numberValue(row.depositAmountKrw) ?? 0;
  const securityScope = typeof row.securityDepositScope === 'string' ? row.securityDepositScope : '-';
  const securityAmountKrw =
    securityScope === '인당' || securityScope === '팀당' ? numberValue(row.securityDepositUnitKrw) ?? 0 : 0;
  const securityLabel = securityScope === '팀당' ? '보증금(팀당)' : '보증금';
  const depositTotalKrw = depositAmountKrw * people;
  const securityTotalKrw = securityScope === '팀당' ? securityAmountKrw : securityAmountKrw * people;

  return {
    teamName: typeof row.teamName === 'string' ? row.teamName : '팀',
    headcount: people,
    depositAmountKrw,
    securityAmountKrw,
    securityLabel,
    requiredReferenceKrw: depositAmountKrw + securityAmountKrw,
    requiredTotalKrw: depositTotalKrw + securityTotalKrw,
  };
}

function teamPaymentReferenceFromPricingFields(input: {
  teamName: string;
  headcount: number;
  depositAmountKrw: number;
  securityDepositMode: string;
  securityDepositUnitPriceKrw: number;
  securityDepositAmountKrw: number;
}): TeamPaymentReferenceSummary {
  const people = input.headcount > 0 ? input.headcount : 1;
  const securityAmountKrw =
    input.securityDepositMode === 'PER_PERSON' || input.securityDepositMode === 'PER_TEAM'
      ? input.securityDepositUnitPriceKrw
      : 0;
  const securityScope =
    input.securityDepositMode === 'PER_PERSON' ? '인당' : input.securityDepositMode === 'PER_TEAM' ? '팀당' : '-';
  const securityLabel = input.securityDepositMode === 'PER_TEAM' ? '보증금(팀당)' : '보증금';
  const depositTotalKrw = input.depositAmountKrw * people;
  const securityTotalKrw = input.securityDepositMode === 'PER_TEAM' ? securityAmountKrw : securityAmountKrw * people;

  return {
    teamName: input.teamName,
    headcount: people,
    depositAmountKrw: input.depositAmountKrw,
    securityAmountKrw,
    securityLabel,
    requiredReferenceKrw: input.depositAmountKrw + securityAmountKrw,
    requiredTotalKrw: depositTotalKrw + securityTotalKrw,
  };
}

export function teamPaymentReferencesFromPlanVersion(
  planVersion: PlanVersionForPaymentSummary | null | undefined,
): TeamPaymentReferenceSummary[] {
  if (!planVersion?.pricing) {
    return [];
  }

  const pricing = planVersion.pricing;
  const manualSnapshot = asRecord(pricing.manualPricingSnapshot);
  const customerSnapshot = asRecord(manualSnapshot?.customerPricingSnapshot);
  const inputSnapshot = asRecord(pricing.inputSnapshot);
  const snapshotRows = Array.isArray(customerSnapshot?.teamPricings)
    ? customerSnapshot.teamPricings.map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => row != null)
    : [];

  if (snapshotRows.length > 1) {
    return snapshotRows
      .map((row) => {
        const teamOrderIndex = numberValue(row.teamOrderIndex) ?? 0;
        const headcount = teamHeadcountFromInputSnapshot(inputSnapshot, teamOrderIndex, 1);
        return teamPaymentReferenceFromSnapshotRow(row, headcount);
      })
      .sort((left, right) => left.teamName.localeCompare(right.teamName, 'ko'));
  }

  const headcount = headcountForPricing(planVersion);
  const depositAmountKrw = numberValue(customerSnapshot?.depositAmountKrw) ?? pricing.depositAmountKrw;
  const securityMode = String(customerSnapshot?.securityDepositMode ?? pricing.securityDepositMode);
  const securityUnit = numberValue(customerSnapshot?.securityDepositUnitKrw) ?? pricing.securityDepositUnitPriceKrw;
  const securityTotal = numberValue(customerSnapshot?.securityDepositTotalKrw) ?? pricing.securityDepositAmountKrw;

  return [
    teamPaymentReferenceFromPricingFields({
      teamName: snapshotRows[0]?.teamName != null ? String(snapshotRows[0].teamName) : '전체',
      headcount,
      depositAmountKrw,
      securityDepositMode: securityMode,
      securityDepositUnitPriceKrw: securityUnit,
      securityDepositAmountKrw: securityTotal,
    }),
  ];
}

function requiredTotalFromTeamReferences(rows: TeamPaymentReferenceSummary[]): number | null {
  if (rows.length === 0) {
    return null;
  }
  return rows.reduce((sum, row) => sum + row.requiredTotalKrw, 0);
}

function singleTeamRequiredReference(rows: TeamPaymentReferenceSummary[]): number | null {
  return rows.length === 1 ? rows[0]?.requiredReferenceKrw ?? null : null;
}

function aggregateReceivedByMember(
  teamMemberNames: string[],
  receipts: MatchedReceiptForSummary[],
): Map<string, number> {
  const memberKeys = new Map<string, string>();
  for (const name of teamMemberNames) {
    const normalized = normalizeContractPersonName(name);
    if (normalized) {
      memberKeys.set(normalized, name);
    }
  }

  const totals = new Map<string, number>();
  for (const receipt of receipts) {
    if (receipt.amountKrw == null || receipt.amountKrw <= 0) {
      continue;
    }
    const normalized =
      receipt.payerNameNorm?.trim()
      || normalizeContractPersonName(receipt.payerNameRaw);
    if (!normalized) {
      continue;
    }
    const memberName = memberKeys.get(normalized);
    if (!memberName) {
      continue;
    }
    totals.set(memberName, (totals.get(memberName) ?? 0) + receipt.amountKrw);
  }
  return totals;
}

export function buildDocumentPaymentReviewSummary(input: {
  planVersion: PlanVersionForPaymentSummary | null | undefined;
  teamMemberNames: string[];
  matchedReceipts: MatchedReceiptForSummary[];
}): DocumentPaymentReviewSummary {
  const teamPaymentReferences = teamPaymentReferencesFromPlanVersion(input.planVersion);
  const requiredTotalKrw = requiredTotalFromTeamReferences(teamPaymentReferences);
  const requiredReferenceAmountKrw = singleTeamRequiredReference(teamPaymentReferences);
  const receivedByMember = aggregateReceivedByMember(input.teamMemberNames, input.matchedReceipts);
  const receivedTotalKrw = input.matchedReceipts.reduce((sum, receipt) => sum + (receipt.amountKrw ?? 0), 0);
  const remainingTotalKrw = requiredTotalKrw == null ? null : Math.max(0, requiredTotalKrw - receivedTotalKrw);

  const memberDeposits = input.teamMemberNames.map((name) => ({
    name,
    receivedAmountKrw: receivedByMember.get(name) ?? 0,
    requiredReferenceAmountKrw: requiredReferenceAmountKrw,
  }));

  return {
    teamPaymentReferences,
    memberDeposits,
    requiredTotalKrw,
    receivedTotalKrw,
    remainingTotalKrw,
  };
}
