import type { EstimateDiffKind, EstimateDiffSide, EstimatePage1DiffField, EstimatePage2CellKey } from './types';
import type { EstimateDiffHints } from './types';

const KIND_CLASS: Record<EstimateDiffKind, string> = {
  changed: 'estimate-diff-cell estimate-diff-cell--changed',
  added: 'estimate-diff-cell estimate-diff-cell--added',
  removed: 'estimate-diff-cell estimate-diff-cell--removed',
};

export function estimateDiffCellClassName(kind: EstimateDiffKind | null | undefined): string {
  if (!kind) {
    return '';
  }
  return KIND_CLASS[kind] ?? '';
}

export function mergeEstimateDiffClassName(
  base: string | undefined,
  kind: EstimateDiffKind | null | undefined,
): string | undefined {
  const diff = estimateDiffCellClassName(kind);
  if (!diff) {
    return base;
  }
  if (!base) {
    return diff;
  }
  return `${base} ${diff}`;
}

export function page1DiffKind(
  hints: EstimateDiffHints | null | undefined,
  field: EstimatePage1DiffField,
): EstimateDiffKind | undefined {
  return hints?.page1?.[field];
}

export function page2DiffKind(
  hints: EstimateDiffHints | null | undefined,
  side: EstimateDiffSide,
  planStopIndex: number,
  cell: EstimatePage2CellKey,
): EstimateDiffKind | undefined {
  if (!hints) {
    return undefined;
  }
  const map = side === 'previous' ? hints.page2Previous : hints.page2Next;
  return map[planStopIndex]?.[cell];
}
