export interface TemplatePlanRow {
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
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5' | null;
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
}

export function buildEmptyPlanRow(dayIndex: number): TemplatePlanRow {
  return {
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
