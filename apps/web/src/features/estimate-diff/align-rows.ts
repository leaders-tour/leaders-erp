import type { EstimatePlanStopRow } from '../estimate/model/types';
import { normalizeDiffText } from './normalize';

export type AlignedRowPair =
  | { kind: 'match'; leftIndex: number; rightIndex: number }
  | { kind: 'removed'; leftIndex: number }
  | { kind: 'added'; rightIndex: number };

function rowAlignmentKey(row: EstimatePlanStopRow, index: number): string {
  const locationId = row.locationId?.trim() ?? '';
  const dateKey = normalizeDiffText(row.dateCellText);
  const rowType = row.rowType?.trim() || 'MAIN';
  if (locationId || dateKey) {
    return `${rowType}|${locationId}|${dateKey}`;
  }
  return `${rowType}|__fallback:${index}`;
}

/** 단순 LCS 기반 행 정렬. 키는 locationId+날짜(+rowType). */
export function alignPlanStopRows(
  leftRows: EstimatePlanStopRow[],
  rightRows: EstimatePlanStopRow[],
): AlignedRowPair[] {
  const leftKeys = leftRows.map((row, index) => rowAlignmentKey(row, index));
  const rightKeys = rightRows.map((row, index) => rowAlignmentKey(row, index));
  const n = leftKeys.length;
  const m = rightKeys.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => 0));

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      if (leftKeys[i] === rightKeys[j]) {
        dp[i]![j] = (dp[i + 1]![j + 1] ?? 0) + 1;
      } else {
        dp[i]![j] = Math.max(dp[i + 1]![j] ?? 0, dp[i]![j + 1] ?? 0);
      }
    }
  }

  const pairs: AlignedRowPair[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (leftKeys[i] === rightKeys[j]) {
      pairs.push({ kind: 'match', leftIndex: i, rightIndex: j });
      i += 1;
      j += 1;
    } else if ((dp[i + 1]![j] ?? 0) >= (dp[i]![j + 1] ?? 0)) {
      pairs.push({ kind: 'removed', leftIndex: i });
      i += 1;
    } else {
      pairs.push({ kind: 'added', rightIndex: j });
      j += 1;
    }
  }
  while (i < n) {
    pairs.push({ kind: 'removed', leftIndex: i });
    i += 1;
  }
  while (j < m) {
    pairs.push({ kind: 'added', rightIndex: j });
    j += 1;
  }
  return pairs;
}
