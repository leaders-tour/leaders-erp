import type { Activity } from './activity';

export interface TimeBlock {
  id: string;
  locationId: string;
  locationVersionId: string | null;
  startTime: string;
  label: string;
  orderIndex: number;
  activities: Activity[];
  createdAt: Date;
  updatedAt: Date;
}
