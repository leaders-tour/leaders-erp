import { useDeferredValue, useMemo } from 'react';
import { fromBuilderDraft } from '../adapters';
import { useEstimateLocationGuides } from './use-estimate-location-guides';
import type { EstimateBuilderDraftSnapshot, EstimateDocumentData } from '../model/types';
import { applyLocationGuides } from '../utils/apply-location-guides';

interface BuilderEstimatePreviewResult {
  data: EstimateDocumentData | null;
  guidesLoading: boolean;
}

export function useBuilderEstimatePreview(snapshot: EstimateBuilderDraftSnapshot | null): BuilderEstimatePreviewResult {
  const deferredSnapshot = useDeferredValue(snapshot);
  const { guideRows, loading: guidesLoading } = useEstimateLocationGuides();

  const data = useMemo<EstimateDocumentData | null>(() => {
    if (!deferredSnapshot) {
      return null;
    }

    return applyLocationGuides(fromBuilderDraft(deferredSnapshot), guideRows);
  }, [deferredSnapshot, guideRows]);

  return {
    data,
    guidesLoading,
  };
}
