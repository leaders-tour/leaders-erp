export interface ConfirmationTraveler {
  name: string;
  gender?: string | null;
  birthCode?: string | null;
  note?: string | null;
}

export interface ConfirmationAppendixPlanStopRow {
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
}

export interface ConfirmationDocumentSnapshot {
  leaderName: string;
  documentNumber?: string | null;
  destination: string;
  headcountText: string;
  travelPeriodText: string;
  vehicleType: string;
  flightInText: string;
  flightOutText: string;
  pickupText: string;
  dropText: string;
  externalPickupDropText: string;
  specialNote: string;
  rentalItemsText: string;
  eventNames: string;
  remark: string;
  balancePerPersonText: string;
  guideName: string;
  meetingPlace: string;
  travelers: ConfirmationTraveler[];
  accommodationLines: string[];
  appendixPlanStops?: ConfirmationAppendixPlanStopRow[] | null;
  sourcePlanVersionId?: string | null;
}

export interface ConfirmationDocumentRow {
  id: string;
  confirmedTripId: string;
  planVersionId?: string | null;
  documentNumber?: string | null;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  snapshot: ConfirmationDocumentSnapshot;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfirmationDraftDefaults {
  confirmedTripId: string;
  planVersionId?: string | null;
  documentNumber?: string | null;
  snapshot: ConfirmationDocumentSnapshot;
}

export type ConfirmationBuilderState = ConfirmationDocumentSnapshot;
