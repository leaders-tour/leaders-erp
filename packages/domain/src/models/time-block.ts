import type { Activity } from './activity';

export interface TimeBlock {
  id: string;
  dayPlanId: string;
  startTime: string;
  label: string;
  orderIndex: number;
  activities: Activity[];
  createdAt: Date;
  updatedAt: Date;
}
