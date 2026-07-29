import { useMemo } from 'react';
import { fromVersion } from '../../estimate/adapters/from-version';
import type { EstimateDocumentData } from '../../estimate/model/types';
import { enrichAppendixPlanStopRowsWithScheduleDates } from '../../estimate/utils/schedule-date-cell-text';
import { usePlanVersionDetail } from '../../plan/hooks';
import type { ConfirmationAppendixPlanStopRow } from '../model/types';
import { mergeConfirmationAppendixData } from '../utils/resolve-confirmation-appendix';
import { useEstimateLocationGuides } from '../../estimate/hooks/use-estimate-location-guides';
import { applyLocationGuides } from '../../estimate/utils/apply-location-guides';

export interface UseConfirmationAppendixDataParams {
  planVersionId?: string | null;
  appendixPlanStops?: ConfirmationAppendixPlanStopRow[] | null;
  overallMovementIntensityColorOverride?: string | null;
  enrichScheduleDateCells?: boolean;
  /** false면 locationGuides 조회·적용 생략 (확정서 1·2페이지 미리보기 등) */
  includeLocationGuides?: boolean;
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
  const enrichScheduleDateCells = params.enrichScheduleDateCells ?? false;
  const includeLocationGuides = params.includeLocationGuides ?? true;

  const { version, loading: versionLoading } = usePlanVersionDetail(planVersionId ?? undefined);
  const { guideRows, loading: guidesLoading } = useEstimateLocationGuides({
    skip: !includeLocationGuides,
  });

  const appendixData = useMemo(() => {
    if (!version) {
      return null;
    }
    const base = fromVersion(version);
    const resolvedAppendixPlanStops =
      enrichScheduleDateCells && appendixPlanStops?.length
        ? enrichAppendixPlanStopRowsWithScheduleDates(
            appendixPlanStops,
            base.travelStartDate,
          )
        : appendixPlanStops;
    const merged = mergeConfirmationAppendixData(base, {
      appendixPlanStops: resolvedAppendixPlanStops,
      overallMovementIntensityColorOverride,
    });
    if (!includeLocationGuides) {
      return merged;
    }
    return applyLocationGuides(merged, guideRows);
  }, [
    appendixPlanStops,
    enrichScheduleDateCells,
    guideRows,
    includeLocationGuides,
    overallMovementIntensityColorOverride,
    version,
  ]);

  return {
    appendixData,
    loading: !!planVersionId && (versionLoading || (includeLocationGuides && guidesLoading)),
  };
}
