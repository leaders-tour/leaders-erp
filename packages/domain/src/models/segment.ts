export interface Segment {
  id: string;
  regionId: string;
  fromLocationId: string;
  toLocationId: string;
  defaultVersionId: string | null;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  scheduleTimeBlocks: SegmentTimeBlock[];
  versions: SegmentVersion[];
  createdAt: Date;
  updatedAt: Date;
}

export type SegmentScheduleVariant = 'basic' | 'early' | 'extend' | 'earlyExtend';

export interface SegmentVersion {
  id: string;
  segmentId: string;
  name: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  flightOutTimeBand?: 'DAWN' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | null;
  sortOrder: number;
  isDefault: boolean;
  scheduleTimeBlocks: SegmentVersionTimeBlock[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentTimeBlock {
  id: string;
  segmentId: string;
  variant: SegmentScheduleVariant;
  startTime: string;
  label: string;
  orderIndex: number;
  activities: SegmentActivity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentVersionTimeBlock {
  id: string;
  segmentVersionId: string;
  variant: SegmentScheduleVariant;
  startTime: string;
  label: string;
  orderIndex: number;
  activities: SegmentVersionActivity[];
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

export interface SegmentVersionActivity {
  id: string;
  segmentVersionTimeBlockId: string;
  description: string;
  orderIndex: number;
  isOptional: boolean;
  conditionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}
