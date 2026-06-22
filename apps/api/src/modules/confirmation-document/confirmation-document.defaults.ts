import type { PlaceType } from '@prisma/client';
import { resolvePublishedBalancePerPersonKrw } from '@tour/domain';
import {
  accommodationLineGroupKey,
  contractTravelerProfileFromSubmission,
  formatConfirmationAccommodationLine,
  formatConfirmationTravelerLine,
  lodgingSelectionLevelByDay,
  resolveConfirmationAccommodationLevelTag,
  resolveConfirmationAccommodationName,
  type ConfirmationDocumentSnapshotInput,
} from '@tour/validation';

const DEFAULT_MEETING_PLACE = '출국게이트 우측 버거킹 앞';
const BALANCE_PAYMENT_NOTE = '(가이드 만나서 원화 현금 지불)';

type TransportGroupLike = {
  teamName: string;
  headcount: number;
  flightInDate: Date | null;
  flightInTime: string | null;
  flightOutDate: Date | null;
  flightOutTime: string | null;
  pickupDate: Date | null;
  pickupTime: string | null;
  pickupPlaceType: PlaceType | null;
  pickupPlaceCustomText: string | null;
  dropDate: Date | null;
  dropTime: string | null;
  dropPlaceType: PlaceType | null;
  dropPlaceCustomText: string | null;
};

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

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const raw = value instanceof Date ? value.toISOString() : value;
  const datePart = raw.split('T')[0] ?? raw;
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null;
}

function formatDateShort(value: Date | string | null | undefined): string {
  const iso = toIsoDate(value);
  if (!iso) {
    return '-';
  }
  const [, month, day] = iso.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function formatPickupDropPlace(type: PlaceType | null | undefined, customText: string | null | undefined): string {
  if (type === 'AIRPORT') {
    return '공항';
  }
  if (type === 'OZ_HOUSE') {
    return '오즈하우스';
  }
  if (type === 'ULAANBAATAR') {
    return '울란바토르';
  }
  if (type === 'CUSTOM') {
    return customText?.trim() || '기타';
  }
  return customText?.trim() || '-';
}

function formatPickupDropDisplay(
  date: Date | string | null | undefined,
  time: string | null | undefined,
  placeType: PlaceType | null | undefined,
  customText: string | null | undefined,
): string {
  const dateText = formatDateShort(date);
  const timeText = time?.trim();
  const placeText = formatPickupDropPlace(placeType, customText);
  if (dateText === '-' && !timeText) {
    return '-';
  }
  const schedule = [dateText !== '-' ? dateText : null, timeText || null].filter(Boolean).join(' - ');
  return placeText && placeText !== '-' ? `${schedule} ${placeText}`.trim() : schedule || '-';
}

function formatFlightDisplay(date: Date | string | null | undefined, time: string | null | undefined): string {
  const dateText = formatDateShort(date);
  const timeText = time?.trim();
  if (dateText === '-' && !timeText) {
    return '-';
  }
  return [dateText !== '-' ? dateText : null, timeText || null].filter(Boolean).join(' - ') || '-';
}

function formatTransportGroupLabel(teamName: string, headcount: number): string {
  return `${teamName} ${headcount}명`;
}

function formatTransportFlightLines(groups: TransportGroupLike[], direction: 'IN' | 'OUT'): string {
  if (groups.length === 0) {
    return '-';
  }
  const shouldShowLabel = groups.length > 1;
  const lines = groups.map((group) => {
    const display =
      direction === 'IN'
        ? formatFlightDisplay(group.flightInDate, group.flightInTime)
        : formatFlightDisplay(group.flightOutDate, group.flightOutTime);
    const lineContent = display === '-' ? '항공권 미정' : display;
    const label = shouldShowLabel ? formatTransportGroupLabel(group.teamName, group.headcount) : '';
    return label ? `${label} ${lineContent}` : lineContent;
  });
  return lines.join('\n') || '-';
}

function formatTransportPickupDropLines(groups: TransportGroupLike[], direction: 'pickup' | 'drop'): string {
  if (groups.length === 0) {
    return '-';
  }
  const shouldShowLabel = groups.length > 1;
  const lines = groups.map((group) => {
    const display =
      direction === 'pickup'
        ? formatPickupDropDisplay(
            group.pickupDate,
            group.pickupTime,
            group.pickupPlaceType,
            group.pickupPlaceCustomText,
          )
        : formatPickupDropDisplay(
            group.dropDate,
            group.dropTime,
            group.dropPlaceType,
            group.dropPlaceCustomText,
          );
    const label = shouldShowLabel ? formatTransportGroupLabel(group.teamName, group.headcount) : '';
    return label ? `${label} ${display}` : display;
  });
  return lines.join('\n') || '-';
}

function formatTravelPeriod(start: Date | string | null | undefined, end: Date | string | null | undefined, totalDays: number | null): string {
  const startIso = toIsoDate(start);
  const endIso = toIsoDate(end);
  if (!startIso || !endIso) {
    return '-';
  }
  const startDate = new Date(`${startIso}T00:00:00.000Z`);
  const endDate = new Date(`${endIso}T00:00:00.000Z`);
  const nights = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
  const days = totalDays ?? nights + 1;
  return `${startDate.getUTCFullYear()}년 ${startDate.getUTCMonth() + 1}월 ${startDate.getUTCDate()}일 ~ ${endDate.getUTCMonth() + 1}월 ${endDate.getUTCDate()}일 (${nights}박${days}일)`;
}

function formatHeadcount(total: number | null | undefined, male: number | null | undefined, female: number | null | undefined): string {
  if (!total) {
    return '-';
  }
  if (male != null && female != null) {
    return `${total}인 (남${male}/여${female})`;
  }
  return `${total}인`;
}

function formatCurrencyKrw(value: number | null | undefined): string {
  if (value == null) {
    return '-';
  }
  return new Intl.NumberFormat('ko-KR').format(value);
}

function normalizeMultiline(value: string | null | undefined): string {
  return value?.trim() ?? '';
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
  const grouped = new Map<
    string,
    {
      name: string;
      roomCount: number;
      capacity: number | null;
      roomType: string | null;
      levelTag: string | null;
    }
  >();

  for (const lodging of lodgings) {
    const planLodgingSelectionLevel = lodgingSelectionsByDay.get(lodging.dayIndex) ?? null;

    if (lodging.optionAssignments.length > 0) {
      for (const option of lodging.optionAssignments) {
        const name = resolveLodgingAccommodationName(lodging);
        if (!name) {
          continue;
        }
        const capacity = option.accommodationOption.capacity;
        const roomType = option.accommodationOption.roomType;
        const levelTag = resolveConfirmationAccommodationLevelTag({
          lodgingType: lodging.type,
          optionLevel: option.accommodationOption.level,
          planLodgingSelectionLevel,
        });
        const key = accommodationLineGroupKey({ name, capacity, roomType, levelTag });
        const existing = grouped.get(key);
        if (existing) {
          existing.roomCount += option.roomCount;
          continue;
        }
        grouped.set(key, {
          name,
          roomCount: option.roomCount,
          capacity,
          roomType,
          levelTag,
        });
      }
      continue;
    }

    const name = resolveLodgingAccommodationName(lodging);
    if (!name) {
      continue;
    }
    const levelTag = resolveConfirmationAccommodationLevelTag({
      lodgingType: lodging.type,
      planLodgingSelectionLevel,
    });
    const key = accommodationLineGroupKey({ name, capacity: null, roomType: null, levelTag });
    const existing = grouped.get(key);
    if (existing) {
      existing.roomCount += lodging.roomCount;
      continue;
    }
    grouped.set(key, {
      name,
      roomCount: lodging.roomCount,
      capacity: null,
      roomType: null,
      levelTag,
    });
  }

  return [...grouped.values()]
    .map((entry) =>
      formatConfirmationAccommodationLine({
        name: entry.name,
        roomCount: entry.roomCount,
        capacity: entry.capacity,
        roomType: entry.roomType,
        levelTag: entry.levelTag,
      }),
    )
    .filter(Boolean);
}

function buildExternalPickupDropText(meta: {
  externalTransfers: unknown;
  externalPickupDate: Date | null;
  externalPickupTime: string | null;
  externalPickupPlaceType: PlaceType | null;
  externalPickupPlaceCustomText: string | null;
  externalDropDate: Date | null;
  externalDropTime: string | null;
  externalDropPlaceType: PlaceType | null;
  externalDropPlaceCustomText: string | null;
  externalPickupDropNote: string | null;
} | null | undefined): string {
  if (!meta) {
    return '';
  }
  const pickup = formatPickupDropDisplay(
    meta.externalPickupDate,
    meta.externalPickupTime,
    meta.externalPickupPlaceType,
    meta.externalPickupPlaceCustomText,
  );
  const drop = formatPickupDropDisplay(
    meta.externalDropDate,
    meta.externalDropTime,
    meta.externalDropPlaceType,
    meta.externalDropPlaceCustomText,
  );
  const lines = [pickup !== '-' ? pickup : null, drop !== '-' ? drop : null].filter(Boolean);
  const note = meta.externalPickupDropNote?.trim();
  if (note) {
    lines.push(note);
  }
  return lines.join('\n');
}

export function buildConfirmationDraftDefaults(input: {
  confirmedTrip: {
    assignedVehicle: string | null;
    destination: string | null;
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
        includeRentalItems: boolean;
        rentalItemsText: string;
        remark: string | null;
        specialNote: string | null;
        transportGroups: TransportGroupLike[];
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
  const transportGroups = meta?.transportGroups ?? [];
  const balanceAmountKrw =
    input.confirmedTrip.balanceAmountKrw
    ?? resolvePublishedBalancePerPersonKrw(input.confirmedTrip.planVersion?.pricing ?? null)
    ?? null;
  const destination =
    input.confirmedTrip.destination?.trim()
    || input.confirmedTrip.planVersion?.regionSet?.name?.trim()
    || '-';
  const vehicleType = input.confirmedTrip.assignedVehicle?.trim() || meta?.vehicleType?.trim() || '-';
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
  const eventNames = input.confirmedTrip.planVersion?.planVersionEvents
    .map((row) => row.event.name)
    .join('\n') ?? '';

  return {
    leaderName: meta?.leaderName?.trim() || '-',
    documentNumber: meta?.documentNumber ?? null,
    destination,
    headcountText: formatHeadcount(meta?.headcountTotal, meta?.headcountMale, meta?.headcountFemale),
    travelPeriodText: formatTravelPeriod(meta?.travelStartDate, meta?.travelEndDate, input.confirmedTrip.planVersion?.totalDays ?? null),
    vehicleType,
    flightInText: formatTransportFlightLines(transportGroups, 'IN'),
    flightOutText: formatTransportFlightLines(transportGroups, 'OUT'),
    pickupText: formatTransportPickupDropLines(transportGroups, 'pickup'),
    dropText: formatTransportPickupDropLines(transportGroups, 'drop'),
    externalPickupDropText: buildExternalPickupDropText(meta),
    specialNote: normalizeMultiline(meta?.specialNote),
    rentalItemsText: meta?.includeRentalItems === false ? '' : normalizeMultiline(meta?.rentalItemsText),
    eventNames,
    remark: normalizeMultiline(meta?.remark),
    balancePerPersonText:
      balanceAmountKrw == null
        ? '-'
        : `${formatCurrencyKrw(balanceAmountKrw)}원\n${BALANCE_PAYMENT_NOTE}`,
    guideName: resolveGuideName(input.confirmedTrip.guideAssignments),
    meetingPlace: DEFAULT_MEETING_PLACE,
    travelers,
    accommodationLines: buildAccommodationLines(
      input.confirmedTrip.lodgings,
      lodgingSelectionLevelByDay(meta?.lodgingSelections),
    ),
  };
}

export { DEFAULT_MEETING_PLACE, formatConfirmationTravelerLine };
