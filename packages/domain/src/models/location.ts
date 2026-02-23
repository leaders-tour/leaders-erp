export interface Location {
  id: string;
  regionId: string;
  regionName?: string;
  name: string;
  currentVersionId?: string | null;
  defaultLodgingType: string;
  internalMovementDistance?: number | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
}
