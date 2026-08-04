import type { EstimateDocumentData } from '../estimate/model/types';
import { alignPlanStopRows } from './align-rows';
import { extractPage1DiffValues, PAGE1_DIFF_FIELDS } from './extract-page1';
import { extractPage2CellValues, PAGE2_CELL_KEYS } from './extract-page2';
import type { EstimateDiffHints, EstimateDiffKind, EstimatePage2CellKey } from './types';

function emptyPage2Map(): Record<number, Partial<Record<EstimatePage2CellKey, EstimateDiffKind>>> {
  return {};
}

function markAllCells(
  target: Record<number, Partial<Record<EstimatePage2CellKey, EstimateDiffKind>>>,
  index: number,
  kind: EstimateDiffKind,
): void {
  const cells: Partial<Record<EstimatePage2CellKey, EstimateDiffKind>> = {};
  for (const key of PAGE2_CELL_KEYS) {
    cells[key] = kind;
  }
  target[index] = cells;
}

/**
 * 두 견적 문서의 표시 문자열을 비교해 하이라이트 힌트를 만든다.
 * 순수 함수 — 저장/편집과 무관. throw 하지 않도록 호출측에서 감싼다.
 */
export function diffEstimateDocuments(
  previous: EstimateDocumentData,
  next: EstimateDocumentData,
): EstimateDiffHints {
  const page1: EstimateDiffHints['page1'] = {};
  const prevPage1 = extractPage1DiffValues(previous);
  const nextPage1 = extractPage1DiffValues(next);
  for (const field of PAGE1_DIFF_FIELDS) {
    if (prevPage1[field] !== nextPage1[field]) {
      page1[field] = 'changed';
    }
  }

  const page2Previous = emptyPage2Map();
  const page2Next = emptyPage2Map();
  const pairs = alignPlanStopRows(previous.planStops ?? [], next.planStops ?? []);

  for (const pair of pairs) {
    if (pair.kind === 'removed') {
      markAllCells(page2Previous, pair.leftIndex, 'removed');
      continue;
    }
    if (pair.kind === 'added') {
      markAllCells(page2Next, pair.rightIndex, 'added');
      continue;
    }

    const leftRow = previous.planStops[pair.leftIndex];
    const rightRow = next.planStops[pair.rightIndex];
    if (!leftRow || !rightRow) {
      continue;
    }

    const leftCells = extractPage2CellValues(leftRow);
    const rightCells = extractPage2CellValues(rightRow);
    const leftDiff: Partial<Record<EstimatePage2CellKey, EstimateDiffKind>> = {};
    const rightDiff: Partial<Record<EstimatePage2CellKey, EstimateDiffKind>> = {};

    for (const key of PAGE2_CELL_KEYS) {
      if (leftCells[key] !== rightCells[key]) {
        leftDiff[key] = 'changed';
        rightDiff[key] = 'changed';
      }
    }

    if (Object.keys(leftDiff).length > 0) {
      page2Previous[pair.leftIndex] = leftDiff;
      page2Next[pair.rightIndex] = rightDiff;
    }
  }

  return { page1, page2Previous, page2Next };
}
