import type { EstimateDocumentData, EstimatePlanStopRow } from '../../estimate/model/types';
import { enrichAppendixPlanStopRowsWithScheduleDates } from '../../estimate/utils/schedule-date-cell-text';
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
    | 'movementIntensityColorOverride'
  >[],
  travelStartDate?: string | null,
): ConfirmationAppendixPlanStopRow[] {
  const rows = planStops.map((row) => ({
    dateCellText: row.dateCellText,
    destinationCellText: row.destinationCellText,
    timeCellText: row.timeCellText,
    scheduleCellText: row.scheduleCellText,
    lodgingCellText: row.lodgingCellText,
    mealCellText: row.mealCellText,
    movementIntensityColorOverride: row.movementIntensityColorOverride ?? null,
  }));

  if (!travelStartDate) {
    return rows;
  }

  return enrichAppendixPlanStopRowsWithScheduleDates(rows, travelStartDate);
}

export interface ConfirmationAppendixMergeInput {
  appendixPlanStops?: ConfirmationAppendixPlanStopRow[] | null;
  overallMovementIntensityColorOverride?: string | null;
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
    planStops: base.planStops.map((row, index) => {
      const override = overrides[index];
      if (!override) {
        return row;
      }
      return {
        ...row,
        dateCellText: override.dateCellText,
        destinationCellText: override.destinationCellText,
        timeCellText: override.timeCellText,
        scheduleCellText: override.scheduleCellText,
        lodgingCellText: override.lodgingCellText,
        mealCellText: override.mealCellText,
        movementIntensityColorOverride:
          override.movementIntensityColorOverride !== undefined
            ? override.movementIntensityColorOverride
            : row.movementIntensityColorOverride,
      };
    }),
  };
}

export function mergeConfirmationAppendixData(
  base: EstimateDocumentData,
  overrides: ConfirmationAppendixMergeInput | null | undefined,
): EstimateDocumentData {
  if (!overrides) {
    return base;
  }

  const withRows = mergeAppendixPlanStops(base, overrides.appendixPlanStops);
  if (overrides.overallMovementIntensityColorOverride !== undefined) {
    return {
      ...withRows,
      overallMovementIntensityColorOverride: overrides.overallMovementIntensityColorOverride,
    };
  }
  return withRows;
}
