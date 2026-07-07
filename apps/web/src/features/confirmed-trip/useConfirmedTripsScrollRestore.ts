import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigationType, type SetURLSearchParams, type URLSearchParamsInit } from 'react-router-dom';
import {
  clearConfirmedTripsListRestore,
  peekConfirmedTripsListRestore,
  saveConfirmedTripsListExit,
  type ConfirmedTripsListRestoreState,
} from './recent-return';

function normalizeSearch(search: string): string {
  if (!search || search === '?') return '';
  return search.startsWith('?') ? search : `?${search}`;
}

function scrollToY(scrollY: number): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    });
  });
}

export function useConfirmedTripsScrollRestore(options: {
  loading: boolean;
  contentReady: boolean;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}): { saveBeforeNavigateToDetail: (tripId: string) => void } {
  const { loading, contentReady, searchParams, setSearchParams } = options;
  const navigationType = useNavigationType();
  const restoreStateRef = useRef<ConfirmedTripsListRestoreState | null | undefined>(undefined);
  const restoredRef = useRef(false);
  const searchSyncedRef = useRef(false);

  if (restoreStateRef.current === undefined) {
    restoreStateRef.current = peekConfirmedTripsListRestore({ navigationType });
  }

  const saveBeforeNavigateToDetail = useCallback((tripId: string) => {
    saveConfirmedTripsListExit({
      scrollY: window.scrollY,
      search: window.location.search,
      tripId,
    });
  }, []);

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    if (restoredRef.current) return;

    const state = restoreStateRef.current;
    if (!state) {
      searchSyncedRef.current = true;
      return;
    }

    if (!searchSyncedRef.current) {
      const targetSearch = normalizeSearch(state.search);
      const currentSearch = normalizeSearch(
        searchParams.toString() ? `?${searchParams.toString()}` : '',
      );
      if (targetSearch !== currentSearch) {
        const nextParams: URLSearchParamsInit = new URLSearchParams(
          state.search.replace(/^\?/, ''),
        );
        setSearchParams(nextParams, { replace: true });
        return;
      }
      searchSyncedRef.current = true;
    }

    if (loading || !contentReady) return;

    scrollToY(state.scrollY);
    restoredRef.current = true;
    clearConfirmedTripsListRestore();
  }, [loading, contentReady, searchParams, setSearchParams]);

  return { saveBeforeNavigateToDetail };
}
