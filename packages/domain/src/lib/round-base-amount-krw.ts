/**
 * 고객-facing 요약에 쓰는 1인 기본금(원)을 천 원 단위로 반올림합니다.
 */
export function roundBaseAmountKrwToThousands(amountKrw: number): number {
  if (!Number.isFinite(amountKrw)) {
    return 0;
  }
  return Math.round(amountKrw / 1000) * 1000;
}
