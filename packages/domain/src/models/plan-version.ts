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
    includeRentalItems: boolean;
    rentalItemsText: string;
    events: Array<{
      id: string;
      code: string;
      name: string;
      isActive: boolean;
      securityDepositKrw: number;
      sortOrder: number;
    }>;
    extraLodgings: Array<{
      dayIndex: number;
      lodgingCount: number;
    }>;
    remark: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  pricing: {
    id: string;
    planVersionId: string;
    policyId: string;
    currencyCode: string;
    baseAmountKrw: number;
    addonAmountKrw: number;
    totalAmountKrw: number;
    lines: Array<{
      id: string;
      lineCode: string;
      sourceType: 'RULE' | 'MANUAL';
      ruleId: string | null;
      description: string | null;
      unitPriceKrw: number | null;
      quantity: number;
      amountKrw: number;
    }>;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  planStops: PlanStop[];
  overrides: Override[];
  createdAt: Date;
  updatedAt: Date;
}
