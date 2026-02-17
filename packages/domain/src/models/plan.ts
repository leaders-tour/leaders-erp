import type { VariantType } from '../enums/variant-type';
import type { DayPlan } from './day-plan';
import type { Override } from './override';

export interface Plan {
  id: string;
  regionId: string;
  variantType: VariantType;
  totalDays: number;
  dayPlans: DayPlan[];
  overrides: Override[];
  createdAt: Date;
  updatedAt: Date;
}
