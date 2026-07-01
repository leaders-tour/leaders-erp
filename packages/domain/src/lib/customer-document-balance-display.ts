import type { CustomerPricingTeamRowSnapshot } from '../models/pricing-manual';
import {
  resolvePublishedBalancePerPersonKrw,
  type PlanVersionPricingPublishedSource,
} from './resolve-published-pricing-totals';

type TeamPricingSummarySignatureParts = {
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityNone: boolean;
  securityDepositAmountKrw: number;
  securityDepositUnitKrw: number;
  securityScopeWhenPresent: string;
};

function customerTeamPricingSummarySignature(row: CustomerPricingTeamRowSnapshot): string {
  const securityNone = row.securityDepositScope === '-';
  if (securityNone) {
    return [
      row.totalAmountKrw,
      row.depositAmountKrw,
      row.balanceAmountKrw,
      'NONE',
      row.securityDepositAmountKrw,
    ].join('|');
  }
  return [
    row.totalAmountKrw,
    row.depositAmountKrw,
    row.balanceAmountKrw,
    row.securityDepositScope,
    row.securityDepositUnitKrw,
  ].join('|');
}

function shouldShowTeamPrefixInPricingSummary<T>(teams: T[], toSignature: (row: T) => string): boolean {
  if (teams.length <= 1) {
    return false;
  }
  const firstSig = toSignature(teams[0]!);
  return teams.some((team) => toSignature(team) !== firstSig);
}

function teamPricingsForSummaryDisplay<T>(teams: T[], toSignature: (row: T) => string): T[] {
  if (teams.length <= 1) {
    return teams;
  }
  if (!shouldShowTeamPrefixInPricingSummary(teams, toSignature)) {
    return [teams[0]!];
  }
  return teams;
}

function customerSnapshotFromPricing(pricing: PlanVersionPricingPublishedSource): {
  teamPricings: CustomerPricingTeamRowSnapshot[];
  expandTeamPricingSummaryRows?: boolean | null;
} | null {
  const snapshot = pricing.customerPricingSnapshot
    ?? (pricing.manualPricingSnapshot
      && typeof pricing.manualPricingSnapshot === 'object'
      && !Array.isArray(pricing.manualPricingSnapshot)
      && typeof (pricing.manualPricingSnapshot as Record<string, unknown>).customerPricingSnapshot === 'object'
      ? (pricing.manualPricingSnapshot as Record<string, unknown>).customerPricingSnapshot as {
          teamPricings?: CustomerPricingTeamRowSnapshot[];
        }
      : null);

  if (!snapshot || !Array.isArray(snapshot.teamPricings)) {
    return null;
  }

  const manualSnapshot = pricing.manualPricingSnapshot;
  const expandTeamPricingSummaryRows =
    manualSnapshot
    && typeof manualSnapshot === 'object'
    && !Array.isArray(manualSnapshot)
    && (manualSnapshot as Record<string, unknown>).expandTeamPricingSummaryRows === true
      ? true
      : null;

  return {
    teamPricings: snapshot.teamPricings,
    expandTeamPricingSummaryRows,
  };
}

export type CustomerDocumentBalanceDisplayLine = {
  teamName: string | null;
  balanceAmountKrw: number;
};

/** 견적서 Page1 요약표 잔금(1인) 열과 동일한 표시 행을 만든다. */
export function resolveCustomerDocumentBalanceDisplayLines(
  pricing: PlanVersionPricingPublishedSource | null | undefined,
): CustomerDocumentBalanceDisplayLine[] {
  if (!pricing) {
    return [];
  }

  const snapshot = customerSnapshotFromPricing(pricing);
  if (snapshot && snapshot.teamPricings.length > 0) {
    const teams = snapshot.teamPricings;
    if (snapshot.expandTeamPricingSummaryRows === true) {
      return teams.map((team) => ({
        teamName: teams.length > 1 ? team.teamName : null,
        balanceAmountKrw: team.balanceAmountKrw,
      }));
    }

    if (shouldShowTeamPrefixInPricingSummary(teams, customerTeamPricingSummarySignature)) {
      return teams.map((team) => ({
        teamName: team.teamName,
        balanceAmountKrw: team.balanceAmountKrw,
      }));
    }

    return teamPricingsForSummaryDisplay(teams, customerTeamPricingSummarySignature).map((team) => ({
      teamName: null,
      balanceAmountKrw: team.balanceAmountKrw,
    }));
  }

  const balanceAmountKrw = resolvePublishedBalancePerPersonKrw(pricing);
  if (balanceAmountKrw == null) {
    return [];
  }

  return [{ teamName: null, balanceAmountKrw }];
}

export function formatCustomerDocumentBalanceAmountKrw(value: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}

export function formatCustomerDocumentBalanceDisplayLines(
  lines: CustomerDocumentBalanceDisplayLine[],
): string {
  return lines
    .map((line) => {
      const amount = formatCustomerDocumentBalanceAmountKrw(line.balanceAmountKrw);
      const teamName = line.teamName?.trim();
      return teamName ? `${teamName}) ${amount}` : amount;
    })
    .join('\n');
}

export function formatCustomerDocumentBalancePerPersonText(
  pricing: PlanVersionPricingPublishedSource | null | undefined,
  options?: { paymentNote?: string | null },
): string {
  const lines = resolveCustomerDocumentBalanceDisplayLines(pricing);
  if (lines.length === 0) {
    return '-';
  }

  const amountText = formatCustomerDocumentBalanceDisplayLines(lines);
  const paymentNote = options?.paymentNote?.trim();
  return paymentNote ? `${amountText}\n${paymentNote}` : amountText;
}
