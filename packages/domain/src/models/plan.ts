import type { PlanVersion } from './plan-version';

export interface Plan {
  id: string;
  userId: string;
  regionSetId: string;
  title: string;
  currentVersionId: string | null;
  versions: PlanVersion[];
  currentVersion: PlanVersion | null;
  createdAt: Date;
  updatedAt: Date;
}
