export function normalizeUserNameKey(name: string): string {
  return name.normalize('NFKC').trim();
}

export function indexToNameDisambiguator(index: number): string {
  if (index < 0) {
    throw new RangeError('index must be non-negative');
  }

  let remaining = index;
  let label = '';

  while (remaining >= 0) {
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26) - 1;
  }

  return label;
}

export function formatUserDisplayName(
  name: string,
  nameDisambiguator: string | null | undefined,
): string {
  const trimmedName = name.trim();
  const suffix = nameDisambiguator?.trim();
  if (!suffix) {
    return trimmedName;
  }
  return `${trimmedName} ${suffix}`;
}
