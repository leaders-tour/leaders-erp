export interface Location {
  id: string;
  regionId: string;
  regionName?: string;
  name: string;
  currentVersionId?: string | null;
  defaultLodgingType: string;
  isFirstDayEligible: boolean;
  isLastDayEligible: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
}
