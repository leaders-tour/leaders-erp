import type { MovementIntensityValue } from '../estimate/model/movement-intensity';

export type PlanStopRowType = 'MAIN' | 'EXTERNAL_TRANSFER';

export interface PlanStopRowBase {
  rowType: PlanStopRowType;
  locationId?: string | null;
  locationVersionId?: string | null;
  movementIntensity?: MovementIntensityValue | null;
  movementIntensityColorOverride?: string | null;
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
}

export function isExternalTransferPlanStopRow(
  row: Pick<PlanStopRowBase, 'rowType'> | { rowType?: PlanStopRowType | null } | null | undefined,
): boolean {
  return row?.rowType === 'EXTERNAL_TRANSFER';
}

export function isMainPlanStopRow(
  row: Pick<PlanStopRowBase, 'rowType'> | { rowType?: PlanStopRowType | null } | null | undefined,
): boolean {
  return row?.rowType !== 'EXTERNAL_TRANSFER';
}

export function countMainPlanStopRows<T extends { rowType?: PlanStopRowType | null }>(rows: T[]): number {
  return rows.reduce((count, row) => count + (row.rowType === 'EXTERNAL_TRANSFER' ? 0 : 1), 0);
}

/** MAIN 행의 0-based 순번 → planRows 배열 인덱스. 기간외(EXTERNAL_TRANSFER) 행은 건너뜀 */
export function buildMainPlanRowPhysicalIndexes(
  rows: Array<{ rowType?: PlanStopRowType | null }>,
): number[] {
  return rows.reduce<number[]>((acc, row, index) => {
    if (isMainPlanStopRow(row)) {
      acc.push(index);
    }
    return acc;
  }, []);
}

export function resolveMainPlanRowPhysicalIndex(
  rows: Array<{ rowType?: PlanStopRowType | null }>,
  mainRowIndex: number,
): number {
  return buildMainPlanRowPhysicalIndexes(rows)[mainRowIndex] ?? mainRowIndex;
}
