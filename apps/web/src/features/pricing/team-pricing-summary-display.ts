/** 요약 표(총액·예약금·잔금·보증금)에서 팀 간 표시 값이 같은지 비교할 때 사용한다. */

export type TeamPricingSummarySignatureParts = {
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityNone: boolean;
  securityDepositAmountKrw: number;
  securityDepositUnitKrw: number;
  securityScopeWhenPresent: string;
};

export function teamPricingSummarySignatureFromParts(input: TeamPricingSummarySignatureParts): string {
  if (input.securityNone) {
    return [
      input.totalAmountKrw,
      input.depositAmountKrw,
      input.balanceAmountKrw,
      'NONE',
      input.securityDepositAmountKrw,
    ].join('|');
  }
  return [
    input.totalAmountKrw,
    input.depositAmountKrw,
    input.balanceAmountKrw,
    input.securityScopeWhenPresent,
    input.securityDepositUnitKrw,
  ].join('|');
}

export function shouldShowTeamPrefixInPricingSummary<T>(teams: T[], toSignature: (row: T) => string): boolean {
  if (teams.length <= 1) {
    return false;
  }
  const firstSig = toSignature(teams[0]!);
  return teams.some((t) => toSignature(t) !== firstSig);
}

/** 팀이 둘 이상이어도 요약 금액이 모두 같으면 한 줄(대표 팀)만 반환한다. */
export function teamPricingsForSummaryDisplay<T>(teams: T[], toSignature: (row: T) => string): T[] {
  if (teams.length <= 1) {
    return teams;
  }
  if (!shouldShowTeamPrefixInPricingSummary(teams, toSignature)) {
    return [teams[0]!];
  }
  return teams;
}
