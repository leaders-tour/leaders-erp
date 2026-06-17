/**
 * 총액을 예약금·잔금으로 나눕니다.
 * - 기본: 10% 기준으로 잔금을 만 원 단위로 올림(ceil)하고, 예약금은 총액 - 잔금 (10% 이하).
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
  const balanceAmountKrw = Math.min(Math.ceil(rawBalance / 10_000) * 10_000, totalAmountKrw);
  const depositAmountKrw = totalAmountKrw - balanceAmountKrw;

  return { depositAmountKrw, balanceAmountKrw };
}
