export interface LocationVersion {
  id: string;
  locationId: string;
  parentVersionId: string | null;
  versionNumber: number;
  label: string;
  changeNote: string | null;
  locationNameSnapshot: string[];
  regionNameSnapshot: string;
  defaultLodgingType: string;
  createdAt: Date;
  updatedAt: Date;
}
