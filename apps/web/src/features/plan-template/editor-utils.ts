export interface TemplatePlanRow {
  segmentId?: string;
  segmentVersionId?: string;
  locationId?: string;
  locationVersionId?: string;
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
