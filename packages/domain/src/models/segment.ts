export interface Segment {
  id: string;
  regionId: string;
  fromLocationId: string;
  toLocationId: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  createdAt: Date;
  updatedAt: Date;
}
