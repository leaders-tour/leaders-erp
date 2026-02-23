export interface LocationVersion {
  id: string;
  locationId: string;
  parentVersionId: string | null;
  versionNumber: number;
  label: string;
  changeNote: string | null;
  locationNameSnapshot: string;
  regionNameSnapshot: string;
  internalMovementDistance: number | null;
  defaultLodgingType: string;
  createdAt: Date;
  updatedAt: Date;
}
