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

export type SegmentVersionKind = 'DIRECT' | 'VIA';

export interface SegmentVersion {
  id: string;
  segmentId: string;
  name: string;
  kind: SegmentVersionKind;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  sortOrder: number;
  isDefault: boolean;
  viaLocations: SegmentVersionViaLocation[];
  scheduleTimeBlocks: SegmentVersionTimeBlock[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentVersionViaLocation {
  id: string;
  segmentVersionId: string;
  locationId: string;
  orderIndex: number;
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

export interface SegmentVersionTimeBlock {
  id: string;
  segmentVersionId: string;
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
