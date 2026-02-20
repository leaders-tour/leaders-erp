import type { VariantType } from '../enums/variant-type';
import type { Override } from './override';
import type { PlanStop } from './plan-stop';

export interface Plan {
  id: string;
  regionId: string;
  variantType: VariantType;
  totalDays: number;
  planStops: PlanStop[];
  overrides: Override[];
  createdAt: Date;
  updatedAt: Date;
}
