import { useEffect, useRef, useState } from 'react';

function sameSelectionIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

/** 낙관적 선택 UI — 저장 완료 전 서버 prop이 로컬 변경을 덮어쓰지 않도록 보호 */
export function useOptimisticSelection<T extends { id: string }>(selected: T[]): {
  displaySelected: T[];
  beginPending: (nextIds: string[], nextSelected: T[]) => void;
  rollback: () => void;
} {
  const [displaySelected, setDisplaySelected] = useState(selected);
  const rollbackRef = useRef(selected);
  const pendingIdsRef = useRef<string[] | null>(null);

  useEffect(() => {
    const selectedIds = selected.map((option) => option.id);
    const pendingIds = pendingIdsRef.current;

    if (pendingIds !== null) {
      if (sameSelectionIds(selectedIds, pendingIds)) {
        pendingIdsRef.current = null;
        setDisplaySelected(selected);
        rollbackRef.current = selected;
      }
      return;
    }

    setDisplaySelected(selected);
    rollbackRef.current = selected;
  }, [selected]);

  function beginPending(nextIds: string[], nextSelected: T[]): void {
    pendingIdsRef.current = nextIds;
    setDisplaySelected(nextSelected);
  }

  function rollback(): void {
    pendingIdsRef.current = null;
    setDisplaySelected(rollbackRef.current);
  }

  return { displaySelected, beginPending, rollback };
}
