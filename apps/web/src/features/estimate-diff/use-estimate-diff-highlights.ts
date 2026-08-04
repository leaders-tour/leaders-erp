import { useMemo, useState } from 'react';
import type { EstimateDocumentData } from '../estimate/model/types';
import { diffEstimateDocuments } from './diff-estimate-documents';
import type { EstimateDiffHints } from './types';

interface UseEstimateDiffHighlightsInput {
  /** 이전버전 패널이 실제로 보이는지 */
  active: boolean;
  previous: EstimateDocumentData | null | undefined;
  next: EstimateDocumentData | null | undefined;
}

interface UseEstimateDiffHighlightsResult {
  highlightEnabled: boolean;
  setHighlightEnabled: (value: boolean | ((prev: boolean) => boolean)) => void;
  hints: EstimateDiffHints | null;
}

/**
 * 견적 셀 diff 하이라이트 훅.
 * 실패 시 hints=null만 반환하고 호출부(저장/편집)에는 영향을 주지 않는다.
 */
export function useEstimateDiffHighlights({
  active,
  previous,
  next,
}: UseEstimateDiffHighlightsInput): UseEstimateDiffHighlightsResult {
  const [highlightEnabled, setHighlightEnabled] = useState(true);

  const hints = useMemo(() => {
    if (!active || !highlightEnabled || !previous || !next) {
      return null;
    }

    try {
      return diffEstimateDocuments(previous, next);
    } catch (error) {
      console.warn('[estimate-diff] highlight computation failed; falling back to no highlights', error);
      return null;
    }
  }, [active, highlightEnabled, next, previous]);

  return {
    highlightEnabled,
    setHighlightEnabled,
    hints,
  };
}
