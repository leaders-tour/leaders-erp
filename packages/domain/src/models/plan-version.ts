import type { VariantType } from '../enums/variant-type';
import type { Override } from './override';
import type { PlanStop } from './plan-stop';

export interface PlanVersion {
  id: string;
  planId: string;
  parentVersionId: string | null;
  versionNumber: number;
  variantType: VariantType;
  totalDays: number;
  changeNote: string | null;
  planStops: PlanStop[];
  overrides: Override[];
  createdAt: Date;
  updatedAt: Date;
}
