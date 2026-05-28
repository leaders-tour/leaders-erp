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
