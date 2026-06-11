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

function startOfLocalDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/** 문서번호 앞 6자리 YYMMDD를 로컬 날짜로 파싱합니다. */
export function parseContractDocumentDate(value: string | null | undefined): Date | null {
  const normalized = normalizeContractDocumentNumber(value);
  if (!normalized) {
    return null;
  }
  const digits = normalized.replace(/\D/g, '');
  if (digits.length < 6) {
    return null;
  }

  const year = 2000 + Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

/** 문서번호 날짜가 기준일로부터 days일 이상 지났는지 판정합니다. */
export function isContractDocumentNumberExpiredByDays(
  value: string | null | undefined,
  days = 7,
  referenceDate: Date = new Date(),
): boolean {
  const documentDate = parseContractDocumentDate(value);
  if (!documentDate) {
    return false;
  }

  const referenceStart = startOfLocalDay(referenceDate);
  const cutoff = new Date(referenceStart);
  cutoff.setDate(cutoff.getDate() - days);

  return startOfLocalDay(documentDate) < cutoff;
}
