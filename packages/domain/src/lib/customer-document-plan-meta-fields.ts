import type { CustomerDocumentExternalTransfer } from './customer-document-external-transfer-format';
import { buildExternalTransferDirectionText } from './customer-document-external-transfer-format';
import { formatCustomerDocumentBalancePerPersonText } from './customer-document-balance-display';
import {
  formatPickupDropDisplay,
  formatTransportFlightLines,
  formatTransportPickupDropLines,
  type CustomerDocumentPickupDropPlaceType,
  type CustomerDocumentTransportGroup,
} from './customer-document-transport-format';
import type { PlanVersionPricingPublishedSource } from './resolve-published-pricing-totals';

export type PlanVersionCustomerDocumentMetaInput = {
  leaderName: string | null | undefined;
  documentNumber: string | null | undefined;
  regionSetName: string | null | undefined;
  headcountTotal: number | null | undefined;
  headcountMale: number | null | undefined;
  headcountFemale: number | null | undefined;
  travelStartDate: string | Date | null | undefined;
  travelEndDate: string | Date | null | undefined;
  vehicleTypeDisplay: string;
  includeRentalItems: boolean | null | undefined;
  rentalItemsText: string | null | undefined;
  specialNote: string | null | undefined;
  remark: string | null | undefined;
  eventNames: string[];
  transportGroups: CustomerDocumentTransportGroup[];
  externalTransfers: CustomerDocumentExternalTransfer[];
  externalPickupDate: string | Date | null | undefined;
  externalPickupTime: string | null | undefined;
  externalPickupPlaceType: CustomerDocumentPickupDropPlaceType | string | null | undefined;
  externalPickupPlaceCustomText: string | null | undefined;
  externalDropDate: string | Date | null | undefined;
  externalDropTime: string | null | undefined;
  externalDropPlaceType: CustomerDocumentPickupDropPlaceType | string | null | undefined;
  externalDropPlaceCustomText: string | null | undefined;
  externalPickupDropNote: string | null | undefined;
  pricing?: PlanVersionPricingPublishedSource | null;
  balancePaymentNote?: string | null;
};

export type PlanVersionCustomerDocumentSharedFields = {
  leaderName: string;
  documentNumber: string | null;
  destination: string;
  headcountText: string;
  travelPeriodText: string;
  vehicleType: string;
  flightInText: string;
  flightOutText: string;
  pickupText: string;
  dropText: string;
  externalPickupDropText: string;
  specialNote: string;
  rentalItemsText: string;
  eventNames: string;
  remark: string;
  balancePerPersonText: string;
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const dateOnly = new Date(`${trimmed}T00:00:00.000Z`);
    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateKorean(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) {
    return '-';
  }

  return `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
}

function normalizeMultilineText(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 0 ? text : '-';
}

function normalizeOptionalMultilineText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

/** 견적서 `formatTravelPeriod`와 동일 */
export function formatCustomerDocumentTravelPeriod(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
): string {
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!start || !end) {
    return '-';
  }

  const diffMs = end.getTime() - start.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / dayMs);

  if (diffDays < 0) {
    return '-';
  }

  const nights = diffDays;
  const days = diffDays + 1;
  return `${formatDateKorean(startDate)} ~ ${formatDateKorean(endDate)} (${nights}박${days}일)`;
}

/** 견적서 `formatHeadcount`와 동일 */
export function formatCustomerDocumentHeadcount(
  total: number | null | undefined,
  male: number | null | undefined,
  female: number | null | undefined,
): string {
  if (total == null || male == null || female == null) {
    return '-';
  }

  return `${total}인 (남${male}/여${female})`;
}

function formatLegacyExternalTransferText(
  date: string | Date | null | undefined,
  time: string | null | undefined,
  placeType: CustomerDocumentPickupDropPlaceType | string | null | undefined,
  customText: string | null | undefined,
  legacyText?: string | null | undefined,
): string {
  const display = formatPickupDropDisplay(date, time, placeType, customText);
  if (display !== '-') {
    return display;
  }

  return normalizeMultilineText(legacyText);
}

/** 견적서 `fromVersion`의 `externalPickupDropText` 조합과 동일 */
export function buildCustomerDocumentExternalPickupDropParts(input: {
  externalTransfers: CustomerDocumentExternalTransfer[];
  transportGroups: CustomerDocumentTransportGroup[];
  externalPickupDate: string | Date | null | undefined;
  externalPickupTime: string | null | undefined;
  externalPickupPlaceType: CustomerDocumentPickupDropPlaceType | string | null | undefined;
  externalPickupPlaceCustomText: string | null | undefined;
  externalDropDate: string | Date | null | undefined;
  externalDropTime: string | null | undefined;
  externalDropPlaceType: CustomerDocumentPickupDropPlaceType | string | null | undefined;
  externalDropPlaceCustomText: string | null | undefined;
  externalPickupDropNote: string | null | undefined;
}): {
  externalPickupText: string;
  externalDropText: string;
  externalPickupDropText: string;
} {
  const externalPickupTextFromTransfers = buildExternalTransferDirectionText(
    input.externalTransfers,
    input.transportGroups,
    'PICKUP',
  );
  const externalDropTextFromTransfers = buildExternalTransferDirectionText(
    input.externalTransfers,
    input.transportGroups,
    'DROP',
  );
  const legacyExternalPickupText = formatLegacyExternalTransferText(
    input.externalPickupDate,
    input.externalPickupTime,
    input.externalPickupPlaceType,
    input.externalPickupPlaceCustomText,
    input.externalPickupDropNote,
  );
  const legacyExternalDropText = formatLegacyExternalTransferText(
    input.externalDropDate,
    input.externalDropTime,
    input.externalDropPlaceType,
    input.externalDropPlaceCustomText,
    undefined,
  );
  const externalPickupText =
    externalPickupTextFromTransfers !== '-' ? externalPickupTextFromTransfers : legacyExternalPickupText;
  const externalDropText =
    externalDropTextFromTransfers !== '-' ? externalDropTextFromTransfers : legacyExternalDropText;

  return {
    externalPickupText,
    externalDropText,
    externalPickupDropText: [externalPickupText, externalDropText]
      .filter((value) => value !== '-')
      .join('\n'),
  };
}

export function buildCustomerDocumentExternalPickupDropText(
  input: Parameters<typeof buildCustomerDocumentExternalPickupDropParts>[0],
): string {
  return buildCustomerDocumentExternalPickupDropParts(input).externalPickupDropText;
}

/** 견적서 Page1과 fresh 확정서가 공유해야 하는 플랜 버전 meta 필드 */
export function buildPlanVersionCustomerDocumentSharedFields(
  input: PlanVersionCustomerDocumentMetaInput,
): PlanVersionCustomerDocumentSharedFields {
  const transportGroups = input.transportGroups;
  const destination = input.regionSetName?.trim() || '-';

  return {
    leaderName: normalizeMultilineText(input.leaderName),
    documentNumber: input.documentNumber?.trim() || null,
    destination,
    headcountText: formatCustomerDocumentHeadcount(
      input.headcountTotal,
      input.headcountMale,
      input.headcountFemale,
    ),
    travelPeriodText: formatCustomerDocumentTravelPeriod(input.travelStartDate, input.travelEndDate),
    vehicleType: input.vehicleTypeDisplay.trim() || '-',
    flightInText: formatTransportFlightLines(transportGroups, 'IN'),
    flightOutText: formatTransportFlightLines(transportGroups, 'OUT'),
    pickupText: formatTransportPickupDropLines(transportGroups, 'pickup'),
    dropText: formatTransportPickupDropLines(transportGroups, 'drop'),
    externalPickupDropText: buildCustomerDocumentExternalPickupDropParts({
      externalTransfers: input.externalTransfers,
      transportGroups,
      externalPickupDate: input.externalPickupDate,
      externalPickupTime: input.externalPickupTime,
      externalPickupPlaceType: input.externalPickupPlaceType,
      externalPickupPlaceCustomText: input.externalPickupPlaceCustomText,
      externalDropDate: input.externalDropDate,
      externalDropTime: input.externalDropTime,
      externalDropPlaceType: input.externalDropPlaceType,
      externalDropPlaceCustomText: input.externalDropPlaceCustomText,
      externalPickupDropNote: input.externalPickupDropNote,
    }).externalPickupDropText,
    specialNote: normalizeOptionalMultilineText(input.specialNote),
    rentalItemsText: input.includeRentalItems ? normalizeMultilineText(input.rentalItemsText) : '-',
    eventNames: input.eventNames.length > 0 ? input.eventNames.join(' / ') : '-',
    remark: normalizeOptionalMultilineText(input.remark),
    balancePerPersonText: formatCustomerDocumentBalancePerPersonText(input.pricing ?? null, {
      paymentNote: input.balancePaymentNote,
    }),
  };
}
