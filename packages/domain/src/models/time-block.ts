import type { Activity } from './activity';

export type LocationTimeBlockProfile = 'DEFAULT' | 'FIRST_DAY' | 'FIRST_DAY_EARLY';

export interface TimeBlock {
  id: string;
  locationId: string;
  locationVersionId: string | null;
  profile: LocationTimeBlockProfile;
  startTime: string;
  label: string;
  orderIndex: number;
  activities: Activity[];
  createdAt: Date;
  updatedAt: Date;
}
