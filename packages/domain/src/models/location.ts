export interface Location {
  id: string;
  regionId: string;
  regionName?: string;
  name: string;
  currentVersionId?: string | null;
  defaultLodgingType: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
}
