import type { PlaceType } from '@prisma/client';
import {
  buildPlanVersionCustomerDocumentSharedFields,
  type CustomerDocumentExternalTransfer,
  type CustomerDocumentTransportGroup,
  type PlanVersionPricingPublishedSource,
} from '@tour/domain';
import {
  consolidateConfirmationAccommodationEntries,
  contractTravelerProfileFromSubmission,
  formatConfirmationTravelerLine,
  formatVehicleAssignmentsForDisplay,
  lodgingSelectionLevelByDay,
  normalizeVehicleAssignments,
  resolveConfirmationAccommodationLevelTag,
  resolveConfirmationAccommodationName,
  resolveConfirmationMeetingPlaceFromPickupText,
  type ConfirmationDocumentSnapshotInput,
} from '@tour/validation';

const BALANCE_PAYMENT_NOTE = '(가이드 만나서 원화 현금 지불)';

type LodgingLike = {
  dayIndex: number;
  type: string;
  lodgingNameSnapshot: string;
  roomCount: number;
  accommodation: { name: string } | null;
  optionAssignments: Array<{
    roomCount: number;
    accommodationOption: {
      roomType: string;
      capacity: number | null;
      level: string;
    };
  }>;
};

type GuideAssignmentLike = {
  nameSnapshot: string | null;
  guide: {
    nameMn: string | null;
    nameKo: string | null;
  };
};

function parseExternalTransfers(value: unknown): CustomerDocumentExternalTransfer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return [];
    }

    const row = item as Record<string, unknown>;
    const direction = row.direction === 'PICKUP' || row.direction === 'DROP' ? row.direction : null;
    const travelDate = typeof row.travelDate === 'string' ? row.travelDate : '';
    const departureTime = typeof row.departureTime === 'string' ? row.departureTime : '';
    const arrivalTime = typeof row.arrivalTime === 'string' ? row.arrivalTime : '';
    const departurePlace = typeof row.departurePlace === 'string' ? row.departurePlace : '';
    const arrivalPlace = typeof row.arrivalPlace === 'string' ? row.arrivalPlace : '';
    const presetCode = typeof row.presetCode === 'string' ? row.presetCode : 'CUSTOM';
    const selectedTeamOrderIndexes = Array.isArray(row.selectedTeamOrderIndexes)
      ? row.selectedTeamOrderIndexes.filter((index): index is number => typeof index === 'number')
      : [];

    if (!direction || selectedTeamOrderIndexes.length === 0) {
      return [];
    }

    return [{
      direction,
      presetCode,
      travelDate,
      departureTime,
      arrivalTime,
      departurePlace,
      arrivalPlace,
      selectedTeamOrderIndexes,
    }];
  });
}

function toPricingPublishedSource(pricing: {
  baseAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
  securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
  manualPricingSnapshot?: unknown;
} | null | undefined): PlanVersionPricingPublishedSource | null {
  if (!pricing) {
    return null;
  }

  return {
    baseAmountKrw: pricing.baseAmountKrw,
    totalAmountKrw: pricing.totalAmountKrw,
    depositAmountKrw: pricing.depositAmountKrw,
    balanceAmountKrw: pricing.balanceAmountKrw,
    securityDepositAmountKrw: pricing.securityDepositAmountKrw,
    securityDepositUnitPriceKrw: pricing.securityDepositUnitPriceKrw,
    securityDepositMode: pricing.securityDepositMode,
    manualPricingSnapshot: pricing.manualPricingSnapshot,
  };
}

function formatGuideAssignmentName(assignment: GuideAssignmentLike): string {
  const ko = assignment.guide.nameKo?.trim() || '';
  const mn = assignment.guide.nameMn?.trim() || '';
  if (ko && mn) {
    return `${ko} ${mn}`;
  }
  return assignment.nameSnapshot?.trim() || ko || mn || '';
}

function resolveGuideName(assignments: GuideAssignmentLike[]): string {
  if (assignments.length === 0) {
    return '';
  }
  return assignments.map((assignment) => formatGuideAssignmentName(assignment)).filter(Boolean).join(', ');
}

function resolveLodgingAccommodationName(lodging: LodgingLike): string {
  return resolveConfirmationAccommodationName(lodging.lodgingNameSnapshot, lodging.accommodation?.name);
}

function buildAccommodationLines(
  lodgings: LodgingLike[],
  lodgingSelectionsByDay: Map<number, string>,
): string[] {
  const entries: Array<{
    name: string;
    roomCount: number;
    capacity: number | null;
    roomType: string | null;
    levelTag: string | null;
    dayIndex: number;
  }> = [];

  for (const lodging of lodgings) {
    const planLodgingSelectionLevel = lodgingSelectionsByDay.get(lodging.dayIndex) ?? null;

    if (lodging.optionAssignments.length > 0) {
      for (const option of lodging.optionAssignments) {
        const name = resolveLodgingAccommodationName(lodging);
        if (!name) {
          continue;
        }
        entries.push({
          name,
          roomCount: option.roomCount,
          capacity: option.accommodationOption.capacity,
          roomType: option.accommodationOption.roomType,
          levelTag: resolveConfirmationAccommodationLevelTag({
            lodgingType: lodging.type,
            optionLevel: option.accommodationOption.level,
            planLodgingSelectionLevel,
          }),
          dayIndex: lodging.dayIndex,
        });
      }
      continue;
    }

    const name = resolveLodgingAccommodationName(lodging);
    if (!name) {
      continue;
    }
    entries.push({
      name,
      roomCount: lodging.roomCount,
      capacity: null,
      roomType: null,
      levelTag: resolveConfirmationAccommodationLevelTag({
        lodgingType: lodging.type,
        planLodgingSelectionLevel,
      }),
      dayIndex: lodging.dayIndex,
    });
  }

  return consolidateConfirmationAccommodationEntries(entries);
}

/** 견적서·투어리스트 `getTripDestination`과 동일 우선순위: regionSet → legacy destination */
export function resolveConfirmedTripDestination(input: {
  planVersionRegionSetName?: string | null;
  planRegionSetName?: string | null;
  destination?: string | null;
}): string {
  return (
    input.planVersionRegionSetName?.trim()
    || input.planRegionSetName?.trim()
    || input.destination?.trim()
    || '-'
  );
}

export function buildConfirmationDraftDefaults(input: {
  confirmedTrip: {
    assignedVehicle: string | null;
    destination: string | null;
    plan?: { regionSet: { name: string } | null } | null;
    balanceAmountKrw: number | null;
    guideAssignments: GuideAssignmentLike[];
    lodgings: LodgingLike[];
    planVersion: {
      id: string;
      totalDays: number;
      regionSet: { name: string } | null;
      meta: {
        leaderName: string;
        documentNumber: string;
        travelStartDate: Date;
        travelEndDate: Date;
        headcountTotal: number;
        headcountMale: number;
        headcountFemale: number;
        vehicleType: string;
        vehicleAssignments?: unknown;
        vehicleDisplayNote?: string | null;
        includeRentalItems: boolean;
        rentalItemsText: string;
        remark: string | null;
        specialNote: string | null;
        transportGroups: CustomerDocumentTransportGroup[];
        externalPickupDate: Date | null;
        externalPickupTime: string | null;
        externalPickupPlaceType: PlaceType | null;
        externalPickupPlaceCustomText: string | null;
        externalDropDate: Date | null;
        externalDropTime: string | null;
        externalDropPlaceType: PlaceType | null;
        externalDropPlaceCustomText: string | null;
        externalPickupDropNote: string | null;
        externalTransfers: unknown;
        lodgingSelections: unknown;
      } | null;
      pricing: {
        baseAmountKrw: number;
        totalAmountKrw: number;
        depositAmountKrw: number;
        balanceAmountKrw: number;
        securityDepositAmountKrw: number;
        securityDepositUnitPriceKrw: number;
        securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
        manualPricingSnapshot?: unknown;
      } | null;
      planVersionEvents: Array<{ event: { name: string } }>;
    } | null;
  };
  contractSubmissions: Array<{
    travelerName: string | null;
    travelerGender?: string | null;
    travelerBirthCode?: string | null;
    travelerNote?: string | null;
    rawJson: unknown;
    excludedFromContractCount: boolean;
  }>;
}): ConfirmationDocumentSnapshotInput {
  const meta = input.confirmedTrip.planVersion?.meta ?? null;
  const regionSetName =
    input.confirmedTrip.planVersion?.regionSet?.name
    ?? input.confirmedTrip.plan?.regionSet?.name
    ?? null;
  const vehicleTypeDisplay =
    formatVehicleAssignmentsForDisplay(
      normalizeVehicleAssignments(meta?.vehicleAssignments, meta?.vehicleType ?? ''),
    ) || '-';
  const sharedFields = buildPlanVersionCustomerDocumentSharedFields({
    leaderName: meta?.leaderName,
    documentNumber: meta?.documentNumber,
    regionSetName,
    headcountTotal: meta?.headcountTotal,
    headcountMale: meta?.headcountMale,
    headcountFemale: meta?.headcountFemale,
    travelStartDate: meta?.travelStartDate,
    travelEndDate: meta?.travelEndDate,
    vehicleTypeDisplay,
    vehicleDisplayNote: meta?.vehicleDisplayNote,
    includeRentalItems: meta?.includeRentalItems,
    rentalItemsText: meta?.rentalItemsText,
    specialNote: meta?.specialNote,
    remark: meta?.remark,
    eventNames: input.confirmedTrip.planVersion?.planVersionEvents.map((row) => row.event.name) ?? [],
    transportGroups: meta?.transportGroups ?? [],
    externalTransfers: parseExternalTransfers(meta?.externalTransfers),
    externalPickupDate: meta?.externalPickupDate,
    externalPickupTime: meta?.externalPickupTime,
    externalPickupPlaceType: meta?.externalPickupPlaceType,
    externalPickupPlaceCustomText: meta?.externalPickupPlaceCustomText,
    externalDropDate: meta?.externalDropDate,
    externalDropTime: meta?.externalDropTime,
    externalDropPlaceType: meta?.externalDropPlaceType,
    externalDropPlaceCustomText: meta?.externalDropPlaceCustomText,
    externalPickupDropNote: meta?.externalPickupDropNote,
    pricing: toPricingPublishedSource(input.confirmedTrip.planVersion?.pricing ?? null),
    balancePaymentNote: BALANCE_PAYMENT_NOTE,
  });
  const travelers = input.contractSubmissions
    .filter((submission) => !submission.excludedFromContractCount)
    .flatMap((submission) => {
      const name = submission.travelerName?.trim();
      if (!name) {
        return [];
      }
      const profile = contractTravelerProfileFromSubmission(submission);
      return [{
        name,
        gender: profile.gender,
        birthCode: profile.birthCode,
        note: null,
      }];
    });

  return {
    ...sharedFields,
    guideName: resolveGuideName(input.confirmedTrip.guideAssignments),
    meetingPlace: resolveConfirmationMeetingPlaceFromPickupText(sharedFields.pickupText),
    travelers,
    accommodationLines: buildAccommodationLines(
      input.confirmedTrip.lodgings,
      lodgingSelectionLevelByDay(meta?.lodgingSelections),
    ),
  };
}

export { formatConfirmationTravelerLine };
