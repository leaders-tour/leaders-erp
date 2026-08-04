/** Diff 비교용 텍스트 정규화 — 표시 공백/대시만 맞춘다. */

export function normalizeDiffText(value: string | null | undefined): string {
  if (value == null) {
    return '';
  }

  return value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .join('\n')
    .trim();
}

export function textsEqualForDiff(left: string | null | undefined, right: string | null | undefined): boolean {
  return normalizeDiffText(left) === normalizeDiffText(right);
}

export function normalizeMealCellForDiff(value: string | null | undefined): string {
  const text = value?.trim();
  if (!text) {
    return '';
  }

  return text
    .split('\n')
    .map((line) => line.trim().replace(/^(아침|점심|저녁)\s*/, ''))
    .filter((line) => line.length > 0)
    .join('\n');
}
