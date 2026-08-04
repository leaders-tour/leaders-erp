import type { EstimatePlanStopRow } from '../estimate/model/types';
import type { EstimatePage2CellKey } from './types';
import { normalizeDiffText, normalizeMealCellForDiff } from './normalize';

export const PAGE2_CELL_KEYS: EstimatePage2CellKey[] = [
  'date',
  'destination',
  'time',
  'schedule',
  'lodging',
  'meal',
];

export function extractPage2CellValues(row: EstimatePlanStopRow): Record<EstimatePage2CellKey, string> {
  return {
    date: normalizeDiffText(row.dateCellText),
    destination: normalizeDiffText(row.destinationCellText),
    time: normalizeDiffText(row.timeCellText),
    schedule: normalizeDiffText(row.scheduleCellText),
    lodging: normalizeDiffText(row.lodgingCellText),
    meal: normalizeDiffText(normalizeMealCellForDiff(row.mealCellText)),
  };
}
