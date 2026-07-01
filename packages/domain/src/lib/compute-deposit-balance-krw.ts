const MAX_AUTO_DEPOSIT_KRW = 90_000;
const TEN_THOUSAND_KRW = 10_000;

function roundBalanceToTenThousandCeil(balanceAmountKrw: number): number {
  return Math.ceil(balanceAmountKrw / TEN_THOUSAND_KRW) * TEN_THOUSAND_KRW;
}

function applyAutoDepositCap(
  totalAmountKrw: number,
  depositAmountKrw: number,
  balanceAmountKrw: number,
): { depositAmountKrw: number; balanceAmountKrw: number } {
  if (depositAmountKrw <= MAX_AUTO_DEPOSIT_KRW) {
    return { depositAmountKrw, balanceAmountKrw };
  }

  let nextBalance = totalAmountKrw - MAX_AUTO_DEPOSIT_KRW;
  if (nextBalance % TEN_THOUSAND_KRW !== 0) {
    nextBalance = roundBalanceToTenThousandCeil(nextBalance);
  }

  return {
    depositAmountKrw: totalAmountKrw - nextBalance,
    balanceAmountKrw: nextBalance,
  };
}

/**
 * 총액을 예약금·잔금으로 나눕니다.
 * - 기본: 10% 기준으로 잔금을 만 원 단위로 올림(ceil)하고, 예약금은 총액 - 잔금.
 * - 자동 계산 예약금은 9만 원을 초과할 수 없습니다.
 * - 잔금은 항상 만 원 단위(천 원 이하 0)입니다.
 * - manualDepositAmountKrw가 있으면 해당 값을 예약금으로 사용합니다.
 */
export function computeDepositAndBalanceKrw(
  totalAmountKrw: number,
  manualDepositAmountKrw?: number,
): { depositAmountKrw: number; balanceAmountKrw: number } {
  if (manualDepositAmountKrw !== undefined) {
    return {
      depositAmountKrw: manualDepositAmountKrw,
      balanceAmountKrw: totalAmountKrw - manualDepositAmountKrw,
    };
  }

  const tenPercent = Math.round(totalAmountKrw * 0.1);
  const rawBalance = totalAmountKrw - tenPercent;
  const balanceAmountKrw = Math.min(roundBalanceToTenThousandCeil(rawBalance), totalAmountKrw);
  const depositAmountKrw = totalAmountKrw - balanceAmountKrw;

  return applyAutoDepositCap(totalAmountKrw, depositAmountKrw, balanceAmountKrw);
}

export { MAX_AUTO_DEPOSIT_KRW };
