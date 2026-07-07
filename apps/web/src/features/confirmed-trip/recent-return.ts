/** 상세 → 목록 복귀 직후 리스트 스크롤·필터·"방금" 배지 복원용 */

const STORAGE_KEY = 'leaders-erp:confirmed-trip-recent-return';
const DEFAULT_MAX_AGE_MS = 120_000;

type ConfirmedTripsListReturnState = {
  tripId?: string;
  at: number;
  scrollY?: number;
  search?: string;
};

function readState(): ConfirmedTripsListReturnState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConfirmedTripsListReturnState;
    if (typeof parsed.at !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeState(patch: Partial<ConfirmedTripsListReturnState>): void {
  try {
    const current = readState();
    const next: ConfirmedTripsListReturnState = {
      ...current,
      ...patch,
      at: patch.at ?? Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function saveConfirmedTripsListExit(state: {
  scrollY: number;
  search: string;
  tripId?: string;
}): void {
  writeState({
    scrollY: state.scrollY,
    search: state.search,
    tripId: state.tripId,
    at: Date.now(),
  });
}

export function markConfirmedTripRecentlyReturned(tripId: string): void {
  writeState({ tripId, at: Date.now() });
}

export function isConfirmedTripRecentReturn(tripId: string, maxAgeMs = DEFAULT_MAX_AGE_MS): boolean {
  const parsed = readState();
  if (!parsed?.tripId || typeof parsed.at !== 'number') return false;
  return parsed.tripId === tripId && Date.now() - parsed.at < maxAgeMs;
}

export type ConfirmedTripsListRestoreState = {
  scrollY: number;
  search: string;
  tripId?: string;
};

/** 상세 복귀 직후 1회만 읽기 (삭제는 scroll 적용 후 clearConfirmedTripsListRestore) */
export function peekConfirmedTripsListRestore(options?: {
  navigationType?: 'POP' | 'PUSH' | 'REPLACE';
  maxAgeMs?: number;
}): ConfirmedTripsListRestoreState | null {
  const maxAgeMs = options?.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const navigationType = options?.navigationType;
  const parsed = readState();
  if (!parsed || Date.now() - parsed.at >= maxAgeMs) return null;
  if (typeof parsed.scrollY !== 'number' || typeof parsed.search !== 'string') return null;
  const fromPop = navigationType === 'POP';
  const fromMarkedReturn = Boolean(parsed.tripId);
  if (!fromPop && !fromMarkedReturn) return null;
  return { scrollY: parsed.scrollY, search: parsed.search, tripId: parsed.tripId };
}

export function clearConfirmedTripsListRestore(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
