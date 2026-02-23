export interface PlanStop {
  id: string;
  planVersionId: string;
  locationId: string | null;
  locationVersionId: string | null;
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
  createdAt: Date;
  updatedAt: Date;
}
