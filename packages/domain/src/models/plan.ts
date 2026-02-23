import type { PlanVersion } from './plan-version';

export interface Plan {
  id: string;
  userId: string;
  regionId: string;
  title: string;
  currentVersionId: string | null;
  versions: PlanVersion[];
  currentVersion: PlanVersion | null;
  createdAt: Date;
  updatedAt: Date;
}
