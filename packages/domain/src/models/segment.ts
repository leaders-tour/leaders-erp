export interface Segment {
  id: string;
  regionId: string;
  fromLocationId: string;
  toLocationId: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  scheduleTimeBlocks: SegmentTimeBlock[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentTimeBlock {
  id: string;
  segmentId: string;
  startTime: string;
  label: string;
  orderIndex: number;
  activities: SegmentActivity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentActivity {
  id: string;
  segmentTimeBlockId: string;
  description: string;
  orderIndex: number;
  isOptional: boolean;
  conditionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}
