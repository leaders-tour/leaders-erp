import type { EstimateDocumentData, EstimatePlanStopRow } from '../../estimate/model/types';
import type { ConfirmationAppendixPlanStopRow } from '../model/types';

export function planStopRowsToAppendixRows(
  planStops: readonly Pick<
    EstimatePlanStopRow,
    | 'dateCellText'
    | 'destinationCellText'
    | 'timeCellText'
    | 'scheduleCellText'
    | 'lodgingCellText'
    | 'mealCellText'
  >[],
): ConfirmationAppendixPlanStopRow[] {
  return planStops.map((row) => ({
    dateCellText: row.dateCellText,
    destinationCellText: row.destinationCellText,
    timeCellText: row.timeCellText,
    scheduleCellText: row.scheduleCellText,
    lodgingCellText: row.lodgingCellText,
    mealCellText: row.mealCellText,
  }));
}

export function mergeAppendixPlanStops(
  base: EstimateDocumentData,
  overrides: ConfirmationAppendixPlanStopRow[] | null | undefined,
): EstimateDocumentData {
  if (!overrides?.length) {
    return base;
  }

  return {
    ...base,
    planStops: base.planStops.map((row, index) => ({
      ...row,
      ...(overrides[index] ?? {}),
    })),
  };
}
