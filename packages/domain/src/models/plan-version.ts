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
  meta: {
    id: string;
    planVersionId: string;
    leaderName: string;
    documentNumber: string;
    travelStartDate: Date;
    travelEndDate: Date;
    headcountTotal: number;
    headcountMale: number;
    headcountFemale: number;
    vehicleType: string;
    flightInTime: string;
    flightOutTime: string;
    pickupDropNote: string | null;
    externalPickupDropNote: string | null;
    rentalItemsText: string;
    eventCodes: string[];
    remark: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  planStops: PlanStop[];
  overrides: Override[];
  createdAt: Date;
  updatedAt: Date;
}
