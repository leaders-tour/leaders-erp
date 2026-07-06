import { useMemo } from 'react';
import { fromVersion } from '../../estimate/adapters/from-version';
import type { EstimateDocumentData } from '../../estimate/model/types';
import { usePlanVersionDetail } from '../../plan/hooks';
import type { ConfirmationAppendixPlanStopRow } from '../model/types';
import { mergeAppendixPlanStops } from '../utils/resolve-confirmation-appendix';
import { useEstimateLocationGuides } from '../../estimate/hooks/use-estimate-location-guides';
import { applyLocationGuides } from '../../estimate/utils/apply-location-guides';

export interface UseConfirmationAppendixDataParams {
  planVersionId?: string | null;
  appendixPlanStops?: ConfirmationAppendixPlanStopRow[] | null;
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

  const { version, loading: versionLoading } = usePlanVersionDetail(planVersionId ?? undefined);
  const { guideRows, loading: guidesLoading } = useEstimateLocationGuides();

  const appendixData = useMemo(() => {
    if (!version) {
      return null;
    }
    const base = fromVersion(version);
    const merged = mergeAppendixPlanStops(base, appendixPlanStops);
    return applyLocationGuides(merged, guideRows);
  }, [appendixPlanStops, guideRows, version]);

  return {
    appendixData,
    loading: !!planVersionId && (versionLoading || guidesLoading),
  };
}
