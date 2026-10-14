export interface AccommodationSearchRow {
  id: string;
  name: string;
  destination: string;
  region: string;
}

const QUERY_ALIASES: Array<{ query: RegExp; latin: string[] }> = [
  { query: /어기|우기/, latin: ['ugii', 'ogii'] },
];

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function expandNeedles(query: string): string[] {
  const needle = normalizeSearch(query);
  if (!needle) return [];
  const needles = new Set([needle]);
  for (const alias of QUERY_ALIASES) {
    if (alias.query.test(needle)) {
      for (const latin of alias.latin) needles.add(latin);
    }
  }
  return [...needles];
}

function haystack(row: AccommodationSearchRow): string {
  return normalizeSearch([row.name, row.destination, row.region].filter(Boolean).join(' '));
}

export function searchAccommodations(
  rows: AccommodationSearchRow[],
  query: string,
  limit = 20,
): AccommodationSearchRow[] {
  const needles = expandNeedles(query);
  if (needles.length === 0) return [];
  return rows.filter((row) => {
    const text = haystack(row);
    return needles.some((needle) => text.includes(needle));
  }).slice(0, limit);
}
