export function normalizeContractDocumentNumber(value: string | null | undefined): string | null {
  const normalized = value
    ?.normalize('NFKC')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[‐‑‒–—―-]/g, '-')
    .toUpperCase();

  return normalized || null;
}

export function normalizeContractPhoneDigits(value: string | null | undefined): string | null {
  const normalized = value?.normalize('NFKC').replace(/\D+/g, '') ?? '';
  return normalized || null;
}

export function normalizeContractPersonName(value: string | null | undefined): string | null {
  const normalized = value?.normalize('NFKC').trim().replace(/\s+/g, ' ') ?? '';
  return normalized || null;
}

/** 문서번호 앞 6자리 YYMMDD를 정렬 키로 반환합니다. */
export function contractDocumentDateSortKey(value: string | null | undefined): number | null {
  const normalized = normalizeContractDocumentNumber(value);
  if (!normalized) {
    return null;
  }
  const digits = normalized.replace(/\D/g, '');
  if (digits.length < 6) {
    return null;
  }
  const parsed = Number(digits.slice(0, 6));
  return Number.isFinite(parsed) ? parsed : null;
}

export function compareContractDocumentNumbersByDateDesc(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  const leftKey = contractDocumentDateSortKey(left);
  const rightKey = contractDocumentDateSortKey(right);
  if (leftKey != null && rightKey != null && leftKey !== rightKey) {
    return rightKey - leftKey;
  }
  if (leftKey != null && rightKey == null) {
    return -1;
  }
  if (leftKey == null && rightKey != null) {
    return 1;
  }
  return (right ?? '').localeCompare(left ?? '');
}
