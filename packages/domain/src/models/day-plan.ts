import type { TimeBlock } from './time-block';

export interface DayPlan {
  id: string;
  planId: string;
  dayIndex: number;
  fromLocationId: string;
  toLocationId: string;
  distanceText: string;
  lodgingText: string;
  mealsText: string;
  timeBlocks: TimeBlock[];
  createdAt: Date;
  updatedAt: Date;
}
