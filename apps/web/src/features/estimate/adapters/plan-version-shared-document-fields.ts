import {
  buildCustomerDocumentExternalPickupDropParts,
  buildPlanVersionCustomerDocumentSharedFields,
  type CustomerDocumentExternalTransfer,
  type PlanVersionCustomerDocumentMetaInput,
  type PlanVersionCustomerDocumentSharedFields,
} from '@tour/domain';
import { formatVehicleAssignmentsForDisplay, normalizeVehicleAssignments } from '@tour/validation';
import type { PlanVersionDetail } from '../../plan/hooks';
import type { EstimateTransportGroup } from '../model/types';
import { toPlanVersionPricingPublishedSource } from '../../pricing/published-pricing-totals';

function mapTransportGroups(
  groups: NonNullable<PlanVersionDetail['meta']>['transportGroups'] | undefined,
): EstimateTransportGroup[] {
  return groups?.map((group) => ({
    teamName: group.teamName,
    headcount: group.headcount,
    flightInDate: group.flightInDate ?? '',
    flightInTime: group.flightInTime ?? '',
    flightOutDate: group.flightOutDate ?? '',
    flightOutTime: group.flightOutTime ?? '',
    pickupDate: group.pickupDate ?? '',
    pickupTime: group.pickupTime ?? '',
    pickupPlaceType: group.pickupPlaceType ?? 'AIRPORT',
    pickupPlaceCustomText: group.pickupPlaceCustomText ?? '',
    dropDate: group.dropDate ?? '',
    dropTime: group.dropTime ?? '',
    dropPlaceType: group.dropPlaceType ?? 'AIRPORT',
    dropPlaceCustomText: group.dropPlaceCustomText ?? '',
  })) ?? [];
}

export function buildPlanVersionCustomerDocumentMetaInputFromVersion(
  version: PlanVersionDetail,
): PlanVersionCustomerDocumentMetaInput {
  const meta = version.meta;
  const transportGroups = mapTransportGroups(meta?.transportGroups);

  return {
    leaderName: meta?.leaderName,
    documentNumber: meta?.documentNumber,
    regionSetName: version.regionSet?.name ?? version.plan.regionSet.name,
    headcountTotal: meta?.headcountTotal,
    headcountMale: meta?.headcountMale,
    headcountFemale: meta?.headcountFemale,
    travelStartDate: meta?.travelStartDate,
    travelEndDate: meta?.travelEndDate,
    vehicleTypeDisplay:
      formatVehicleAssignmentsForDisplay(
        normalizeVehicleAssignments(meta?.vehicleAssignments, meta?.vehicleType),
      ) || '-',
    vehicleDisplayNote: meta?.vehicleDisplayNote,
    includeRentalItems: meta?.includeRentalItems,
    rentalItemsText: meta?.rentalItemsText,
    specialNote: meta?.specialNote,
    remark: meta?.remark,
    eventNames: meta?.events.map((event) => event.name) ?? [],
    transportGroups,
    externalTransfers: (meta?.externalTransfers ?? []) as CustomerDocumentExternalTransfer[],
    externalPickupDate: meta?.externalPickupDate,
    externalPickupTime: meta?.externalPickupTime,
    externalPickupPlaceType: meta?.externalPickupPlaceType,
    externalPickupPlaceCustomText: meta?.externalPickupPlaceCustomText,
    externalDropDate: meta?.externalDropDate,
    externalDropTime: meta?.externalDropTime,
    externalDropPlaceType: meta?.externalDropPlaceType,
    externalDropPlaceCustomText: meta?.externalDropPlaceCustomText,
    externalPickupDropNote: meta?.externalPickupDropNote,
    pricing: version.pricing ? toPlanVersionPricingPublishedSource(version.pricing) : null,
  };
}

export function buildSharedDocumentFieldsFromPlanVersion(
  version: PlanVersionDetail,
  options?: { balancePaymentNote?: string | null },
): PlanVersionCustomerDocumentSharedFields & {
  externalPickupText: string;
  externalDropText: string;
} {
  const input = buildPlanVersionCustomerDocumentMetaInputFromVersion(version);
  const externalPickupDrop = buildCustomerDocumentExternalPickupDropParts({
    externalTransfers: input.externalTransfers,
    transportGroups: input.transportGroups,
    externalPickupDate: input.externalPickupDate,
    externalPickupTime: input.externalPickupTime,
    externalPickupPlaceType: input.externalPickupPlaceType,
    externalPickupPlaceCustomText: input.externalPickupPlaceCustomText,
    externalDropDate: input.externalDropDate,
    externalDropTime: input.externalDropTime,
    externalDropPlaceType: input.externalDropPlaceType,
    externalDropPlaceCustomText: input.externalDropPlaceCustomText,
    externalPickupDropNote: input.externalPickupDropNote,
  });

  return {
    ...buildPlanVersionCustomerDocumentSharedFields({
      ...input,
      balancePaymentNote: options?.balancePaymentNote ?? null,
    }),
    externalPickupText: externalPickupDrop.externalPickupText,
    externalDropText: externalPickupDrop.externalDropText,
  };
}

export { mapTransportGroups as mapPlanVersionTransportGroupsForCustomerDocument };
