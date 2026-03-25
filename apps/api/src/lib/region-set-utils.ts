/** First occurrence wins; trims; skips empty. Used for display name and item sortOrder. */
export function uniqueRegionIdsPreserveOrder(regionIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of regionIds) {
    const id = raw.trim();
    if (id.length === 0 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Canonical sorted unique region ids for signature and uniqueness. */
export function canonicalizeRegionIds(regionIds: string[]): string[] {
  const unique = Array.from(new Set(regionIds.map((id) => id.trim()).filter((id) => id.length > 0)));
  unique.sort((a, b) => a.localeCompare(b));
  return unique;
}

export function buildRegionSetSignature(regionIds: string[]): string {
  return canonicalizeRegionIds(regionIds).join(',');
}

export function formatRegionSetName(regionNamesOrdered: string[]): string {
  return regionNamesOrdered.join(' + ');
}
