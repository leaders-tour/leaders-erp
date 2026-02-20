export interface PlanStop {
  id: string;
  planId: string;
  dayIndex: number;
  fromLocationId: string;
  toLocationId: string;
  lodgingId: string | null;
  mealSetId: string | null;
  distanceText: string;
  lodgingText: string;
  mealsText: string;
  createdAt: Date;
  updatedAt: Date;
}
