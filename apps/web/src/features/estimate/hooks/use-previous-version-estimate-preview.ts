import { useMemo } from 'react';
import type { PlanVersionDetail } from '../../plan/hooks';
import { fromVersion } from '../adapters';
import { applyLocationGuides } from '../utils/apply-location-guides';
import { useEstimateLocationGuides } from './use-estimate-location-guides';
import type { EstimateDocumentData } from '../model/types';

interface PreviousVersionEstimatePreviewResult {
  data: EstimateDocumentData | null;
  guidesLoading: boolean;
}

export function usePreviousVersionEstimatePreview(
  parentVersion: PlanVersionDetail | null | undefined,
): PreviousVersionEstimatePreviewResult {
  const { guideRows, loading: guidesLoading } = useEstimateLocationGuides();

  const data = useMemo<EstimateDocumentData | null>(() => {
    if (!parentVersion) {
      return null;
    }
    return applyLocationGuides(fromVersion(parentVersion), guideRows);
  }, [guideRows, parentVersion]);

  return {
    data,
    guidesLoading,
  };
}
