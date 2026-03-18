import type { MovementIntensityValue } from '../estimate/model/movement-intensity';

export type PlanStopRowType = 'MAIN' | 'EXTERNAL_TRANSFER';

export interface PlanStopRowBase {
  rowType: PlanStopRowType;
  locationId?: string | null;
  locationVersionId?: string | null;
  movementIntensity?: MovementIntensityValue | null;
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
}

export function isExternalTransferPlanStopRow(
  row: Pick<PlanStopRowBase, 'rowType'> | null | undefined,
): boolean {
  return row?.rowType === 'EXTERNAL_TRANSFER';
}

export function isMainPlanStopRow(
  row: Pick<PlanStopRowBase, 'rowType'> | null | undefined,
): boolean {
  return row?.rowType !== 'EXTERNAL_TRANSFER';
}

export function countMainPlanStopRows<T extends { rowType?: PlanStopRowType | null }>(rows: T[]): number {
  return rows.reduce((count, row) => count + (row.rowType === 'EXTERNAL_TRANSFER' ? 0 : 1), 0);
}
