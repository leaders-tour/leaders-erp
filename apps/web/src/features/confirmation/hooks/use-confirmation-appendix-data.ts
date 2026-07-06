import { useMemo } from 'react';
import { fromVersion } from '../../estimate/adapters/from-version';
import type { EstimateDocumentData } from '../../estimate/model/types';
import { usePlanVersionDetail } from '../../plan/hooks';
import type { ConfirmationAppendixPlanStopRow } from '../model/types';
import { mergeConfirmationAppendixData } from '../utils/resolve-confirmation-appendix';
import { useEstimateLocationGuides } from '../../estimate/hooks/use-estimate-location-guides';
import { applyLocationGuides } from '../../estimate/utils/apply-location-guides';

export interface UseConfirmationAppendixDataParams {
  planVersionId?: string | null;
  appendixPlanStops?: ConfirmationAppendixPlanStopRow[] | null;
  overallMovementIntensityColorOverride?: string | null;
}

export function useConfirmationAppendixData(
  planVersionIdOrParams: string | null | undefined | UseConfirmationAppendixDataParams,
  legacyAppendixPlanStops?: ConfirmationAppendixPlanStopRow[] | null,
): {
  appendixData: EstimateDocumentData | null;
  loading: boolean;
} {
  const params: UseConfirmationAppendixDataParams =
    typeof planVersionIdOrParams === 'object' && planVersionIdOrParams !== null
      ? planVersionIdOrParams
      : {
          planVersionId: planVersionIdOrParams,
          appendixPlanStops: legacyAppendixPlanStops,
        };

  const planVersionId = params.planVersionId ?? null;
  const appendixPlanStops = params.appendixPlanStops;
  const overallMovementIntensityColorOverride = params.overallMovementIntensityColorOverride;

  const { version, loading: versionLoading } = usePlanVersionDetail(planVersionId ?? undefined);
  const { guideRows, loading: guidesLoading } = useEstimateLocationGuides();

  const appendixData = useMemo(() => {
    if (!version) {
      return null;
    }
    const base = fromVersion(version);
    const merged = mergeConfirmationAppendixData(base, {
      appendixPlanStops,
      overallMovementIntensityColorOverride,
    });
    return applyLocationGuides(merged, guideRows);
  }, [appendixPlanStops, guideRows, overallMovementIntensityColorOverride, version]);

  return {
    appendixData,
    loading: !!planVersionId && (versionLoading || guidesLoading),
  };
}
