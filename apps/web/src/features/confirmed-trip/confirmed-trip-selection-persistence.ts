import { GRAPHQL_URL } from '../../lib/graphql-endpoint';

type SelectionKind = 'koreaTeamStages' | 'postTripTasks';

interface PendingSelection {
  tripId: string;
  kind: SelectionKind;
  optionIds: string[];
}

const KEEPALIVE_MUTATIONS: Record<
  SelectionKind,
  { operationName: string; query: string; variables: (tripId: string, optionIds: string[]) => Record<string, unknown> }
> = {
  koreaTeamStages: {
    operationName: 'SetConfirmedTripKoreaTeamStages',
    query: `
      mutation SetConfirmedTripKoreaTeamStages($id: ID!, $optionIds: [ID!]!) {
        updateConfirmedTrip(id: $id, input: { koreaTeamStageOptionIds: $optionIds }) {
          id
        }
      }
    `,
    variables: (tripId, optionIds) => ({ id: tripId, optionIds }),
  },
  postTripTasks: {
    operationName: 'SetConfirmedTripPostTripTasks',
    query: `
      mutation SetConfirmedTripPostTripTasks($id: ID!, $optionIds: [ID!]!) {
        updateConfirmedTrip(id: $id, input: { postTripTaskOptionIds: $optionIds }) {
          id
        }
      }
    `,
    variables: (tripId, optionIds) => ({ id: tripId, optionIds }),
  },
};

const pendingSelections = new Map<string, PendingSelection>();
let getAccessTokenRef: () => string | null = () => null;
let unloadListenersRegistered = false;

function selectionKey(kind: SelectionKind, tripId: string): string {
  return `${kind}:${tripId}`;
}

function sameSelectionIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

function sendKeepaliveMutation(entry: PendingSelection): void {
  const config = KEEPALIVE_MUTATIONS[entry.kind];
  const accessToken = getAccessTokenRef();
  const body = JSON.stringify({
    operationName: config.operationName,
    query: config.query,
    variables: config.variables(entry.tripId, entry.optionIds),
  });

  try {
    void fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: 'include',
      body,
      keepalive: true,
    });
  } catch {
    // 페이지 종료 중에는 복구 불가 — best effort
  }
}

function flushPendingKeepalive(): void {
  for (const entry of pendingSelections.values()) {
    sendKeepaliveMutation(entry);
  }
}

function registerUnloadListeners(): void {
  if (unloadListenersRegistered || typeof window === 'undefined') {
    return;
  }
  unloadListenersRegistered = true;

  window.addEventListener('pagehide', flushPendingKeepalive);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingKeepalive();
    }
  });
}

export function registerConfirmedTripSelectionSaveAccess(getAccessToken: () => string | null): void {
  getAccessTokenRef = getAccessToken;
  registerUnloadListeners();
}

export function trackConfirmedTripSelectionPending(
  kind: SelectionKind,
  tripId: string,
  optionIds: string[],
): void {
  pendingSelections.set(selectionKey(kind, tripId), { tripId, kind, optionIds });
}

export function clearConfirmedTripSelectionPendingIfMatches(
  kind: SelectionKind,
  tripId: string,
  optionIds: string[],
): void {
  const key = selectionKey(kind, tripId);
  const pending = pendingSelections.get(key);
  if (pending && sameSelectionIds(pending.optionIds, optionIds)) {
    pendingSelections.delete(key);
  }
}
