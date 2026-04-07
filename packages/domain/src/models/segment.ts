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
  kind: 'DEFAULT' | 'SEASON' | 'FLIGHT';
  flightOutTimeBand?: 'DAWN' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | null;
  lodgingOverride?: {
    isUnspecified: boolean;
    name: string;
    hasElectricity: 'YES' | 'LIMITED' | 'NO';
    hasShower: 'YES' | 'LIMITED' | 'NO';
    hasInternet: 'YES' | 'LIMITED' | 'NO';
  } | null;
  mealsOverride?: {
    breakfast:
      | 'CAMP_MEAL'
      | 'LOCAL_RESTAURANT'
      | 'PORK_PARTY'
      | 'HORHOG'
      | 'SHASHLIK'
      | 'SHABU_SHABU'
      | null;
    lunch:
      | 'CAMP_MEAL'
      | 'LOCAL_RESTAURANT'
      | 'PORK_PARTY'
      | 'HORHOG'
      | 'SHASHLIK'
      | 'SHABU_SHABU'
      | null;
    dinner:
      | 'CAMP_MEAL'
      | 'LOCAL_RESTAURANT'
      | 'PORK_PARTY'
      | 'HORHOG'
      | 'SHASHLIK'
      | 'SHABU_SHABU'
      | null;
  } | null;
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
