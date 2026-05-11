/** 상세 → 목록 복귀 직후 리스트에서만 짧게 보여 줄 표시용 */

const STORAGE_KEY = 'leaders-erp:confirmed-trip-recent-return';

export function markConfirmedTripRecentlyReturned(tripId: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ tripId, at: Date.now() }));
  } catch {
    /* quota / private mode */
  }
}

export function isConfirmedTripRecentReturn(tripId: string, maxAgeMs = 120_000): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { tripId?: string; at?: number };
    if (!parsed.tripId || typeof parsed.at !== 'number') return false;
    return parsed.tripId === tripId && Date.now() - parsed.at < maxAgeMs;
  } catch {
    return false;
  }
}
