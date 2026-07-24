/** 요약 표(총액·예약금·잔금·보증금)에서 팀 간 표시 값이 같은지 비교할 때 사용한다. */

/** 팀별 1인 기본금이 같은지 비교할 때 사용한다. */
export function teamBaseAmountSignature(row: { baseAmountKrw: number }): string {
  return String(row.baseAmountKrw);
}

export function shouldShowTeamPrefixForBaseAmount<T extends { baseAmountKrw: number }>(teams: T[]): boolean {
  return shouldShowTeamPrefixInPricingSummary(teams, teamBaseAmountSignature);
}

/** 팀이 둘 이상이어도 기본금이 모두 같으면 한 줄(대표 팀)만 반환한다. */
export function teamPricingsForBaseAmountDisplay<T extends { baseAmountKrw: number }>(teams: T[]): T[] {
  return teamPricingsForSummaryDisplay(teams, teamBaseAmountSignature);
}

type TeamSecurityDepositSummary = {
  securityDepositMode: string;
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
};

export function teamSecurityDepositSignatureFromParts(input: {
  mode: string;
  amountKrw: number;
  unitPriceKrw: number;
  none: boolean;
}): string {
  return input.none ? ['NONE', input.amountKrw].join('|') : [input.mode, input.unitPriceKrw].join('|');
}

/** 보증금 컬럼에 실제로 표시되는 값(단위·단가)이 같은지 비교한다. */
export function teamSecurityDepositSignature(row: TeamSecurityDepositSummary): string {
  return teamSecurityDepositSignatureFromParts({
    mode: row.securityDepositMode,
    amountKrw: row.securityDepositAmountKrw,
    unitPriceKrw: row.securityDepositUnitPriceKrw,
    none: row.securityDepositMode === 'NONE',
  });
}

/** 팀별 보증금 표시가 다를 때만 팀명을 노출한다. */
export function shouldShowTeamPrefixForSecurityDeposit<T extends TeamSecurityDepositSummary>(teams: T[]): boolean {
  return shouldShowTeamPrefixInPricingSummary(teams, teamSecurityDepositSignature);
}

/** 팀별 보증금 표시가 모두 같으면 대표 팀 한 줄만 반환한다. */
export function teamPricingsForSecurityDepositDisplay<T extends TeamSecurityDepositSummary>(teams: T[]): T[] {
  return teamPricingsForSummaryDisplay(teams, teamSecurityDepositSignature);
}

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
