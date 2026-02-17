export interface Location {
  id: string;
  regionId: string;
  name: string;
  defaultLodgingType: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
}
