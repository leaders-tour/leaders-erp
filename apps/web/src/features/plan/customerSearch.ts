import type { UserRow } from './hooks';

function normalizeDocumentNumber(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[‐‑‒–—―-]/g, '-')
    .toLowerCase();
}

export function getUserDocumentNumbers(user: UserRow): string[] {
  const numbers: string[] = [];
  for (const plan of user.plans ?? []) {
    const documentNumber = plan.currentVersion?.meta?.documentNumber?.trim();
    if (documentNumber) {
      numbers.push(documentNumber);
    }
  }
  return numbers;
}

export function matchesCustomerSearchKeyword(user: UserRow, rawKeyword: string): boolean {
  const keyword = rawKeyword.trim().toLowerCase();
  if (!keyword) return true;

  if (user.name.toLowerCase().includes(keyword)) return true;
  if (user.email?.toLowerCase().includes(keyword)) return true;
  if (user.ownerEmployee?.name.toLowerCase().includes(keyword)) return true;
  if (user.ownerEmployee?.email.toLowerCase().includes(keyword)) return true;

  const normalizedDocKeyword = normalizeDocumentNumber(rawKeyword);
  if (!normalizedDocKeyword) return false;

  return getUserDocumentNumbers(user).some((documentNumber) =>
    normalizeDocumentNumber(documentNumber).includes(normalizedDocKeyword),
  );
}
