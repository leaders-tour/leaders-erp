import { useCallback, useEffect, useRef } from 'react';

export function useDebouncedSelectionSave(
  onSave: (optionIds: string[]) => void | Promise<void>,
  delayMs = 350,
): {
  scheduleSave: (nextIds: string[], onError: () => void) => void;
  saveImmediately: (nextIds: string[], onError: () => void) => void;
  flushPending: (options?: { silent?: boolean }) => void;
} {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingIdsRef = useRef<string[] | null>(null);
  const onErrorRef = useRef<(() => void) | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const runSave = useCallback((ids: string[], onError: () => void, silent = false): void => {
    void Promise.resolve(onSaveRef.current(ids)).catch((error) => {
      if (!silent) {
        onError();
        window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.');
      }
    });
  }, []);

  const flushPending = useCallback(
    (options?: { silent?: boolean }): void => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
      const ids = pendingIdsRef.current;
      pendingIdsRef.current = null;
      if (!ids) {
        return;
      }
      const onError = onErrorRef.current ?? (() => {});
      runSave(ids, onError, options?.silent ?? false);
    },
    [runSave],
  );

  useEffect(
    () => () => {
      flushPending({ silent: true });
    },
    [flushPending],
  );

  function scheduleSave(nextIds: string[], onError: () => void): void {
    pendingIdsRef.current = nextIds;
    onErrorRef.current = onError;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      flushPending();
    }, delayMs);
  }

  function saveImmediately(nextIds: string[], onError: () => void): void {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    pendingIdsRef.current = nextIds;
    onErrorRef.current = onError;
    flushPending();
  }

  return { scheduleSave, saveImmediately, flushPending };
}
