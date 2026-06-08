import { useMemo } from 'react';
import { fromBuilderDraft } from '../adapters';
import { useEstimateLocationGuides } from './use-estimate-location-guides';
import type { EstimateBuilderDraftSnapshot, EstimateDocumentData } from '../model/types';
import { applyLocationGuides } from '../utils/apply-location-guides';

interface BuilderEstimatePreviewResult {
  data: EstimateDocumentData | null;
  guidesLoading: boolean;
}

export function useBuilderEstimatePreview(snapshot: EstimateBuilderDraftSnapshot | null): BuilderEstimatePreviewResult {
  const { guideRows, loading: guidesLoading } = useEstimateLocationGuides();

  const data = useMemo<EstimateDocumentData | null>(() => {
    if (!snapshot) {
      return null;
    }

    return applyLocationGuides(fromBuilderDraft(snapshot), guideRows);
  }, [snapshot, guideRows]);

  return {
    data,
    guidesLoading,
  };
}
