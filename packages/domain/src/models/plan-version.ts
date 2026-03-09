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
    pickupDate: Date | null;
    pickupTime: string | null;
    dropDate: Date | null;
    dropTime: string | null;
    pickupDropNote: string | null;
    externalPickupDropNote: string | null;
    specialNote: string | null;
    includeRentalItems: boolean;
    rentalItemsText: string;
    events: Array<{
      id: string;
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
    depositAmountKrw: number;
    balanceAmountKrw: number;
    securityDepositAmountKrw: number;
    securityDepositUnitPriceKrw: number;
    securityDepositQuantity: number;
    securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
    securityDepositEvent: {
      id: string;
      name: string;
      securityDepositKrw: number;
      isActive: boolean;
      sortOrder: number;
    } | null;
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
