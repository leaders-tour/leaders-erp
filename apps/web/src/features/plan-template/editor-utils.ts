import type { PlanStopRowBase } from '../plan/plan-stop-row';

export interface TemplatePlanRow extends PlanStopRowBase {
  segmentId?: string;
  segmentVersionId?: string;
  overnightStayId?: string;
  overnightStayDayOrder?: number;
  overnightStayConnectionId?: string;
  overnightStayConnectionVersionId?: string;
  multiDayBlockId?: string;
  multiDayBlockDayOrder?: number;
  multiDayBlockConnectionId?: string;
  multiDayBlockConnectionVersionId?: string;
  locationId?: string;
  locationVersionId?: string;
}

export function buildEmptyPlanRow(dayIndex: number): TemplatePlanRow {
  return {
    rowType: 'MAIN',
    dateCellText: `${dayIndex}일차`,
    destinationCellText: '',
    timeCellText: '',
    scheduleCellText: '',
    lodgingCellText: '',
    mealCellText: '',
  };
}

export function buildPlaceholderPlanRows(totalDays: number): TemplatePlanRow[] {
  const safeTotalDays = Math.max(2, totalDays);
  return Array.from({ length: safeTotalDays }, (_, index) => buildEmptyPlanRow(index + 1));
}
