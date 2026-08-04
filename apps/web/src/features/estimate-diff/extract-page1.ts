import { formatPickupDropDisplay } from '../plan/pickup-drop';
import type { EstimateDocumentData, EstimateTeamPricing } from '../estimate/model/types';
import {
  formatCurrency,
  formatFlightText,
  formatHeadcount,
  formatSignedCurrency,
  formatTransportFlightText,
  formatTransportPickupDropText,
  formatTravelPeriod,
} from '../estimate/utils/format';
import {
  shouldShowTeamPrefixForBaseAmount,
  teamPricingsForBaseAmountDisplay,
  teamPricingsForSummaryDisplay,
  teamPricingSummarySignatureFromParts,
  teamSecurityDepositSignatureFromParts,
} from '../pricing/team-pricing-summary-display';
import type { EstimatePage1DiffField } from './types';
import { normalizeDiffText } from './normalize';

function blankIfDash(value: string): string {
  return value === '-' ? '' : value;
}

function formatTravelPeriodCompact(startDate: string | null | undefined, endDate: string | null | undefined): string {
  const travelPeriod = formatTravelPeriod(startDate, endDate);
  if (travelPeriod === '-') {
    return '';
  }
  return travelPeriod.replace(' ~ ', '\n');
}

function vehicleDisplayText(data: EstimateDocumentData): string {
  const main = data.vehicleType?.trim() || '';
  const note = data.vehicleDisplayNote?.trim() || '';
  if (!main && !note) {
    return '';
  }
  if (!note) {
    return main;
  }
  if (!main || main === '-') {
    return note;
  }
  return `${main}\n${note}`;
}

function estimateTeamPricingSummarySignature(row: EstimateTeamPricing): string {
  return teamPricingSummarySignatureFromParts({
    totalAmountKrw: row.totalAmountKrw,
    depositAmountKrw: row.depositAmountKrw,
    balanceAmountKrw: row.balanceAmountKrw,
    securityNone: row.securityDepositScope === '-',
    securityDepositAmountKrw: row.securityDepositAmountKrw,
    securityDepositUnitKrw: row.securityDepositUnitKrw,
    securityScopeWhenPresent: row.securityDepositScope === '-' ? '' : row.securityDepositScope,
  });
}

function estimateSecurityDepositSignature(row: EstimateTeamPricing): string {
  return teamSecurityDepositSignatureFromParts({
    mode: row.securityDepositScope,
    amountKrw: row.securityDepositAmountKrw,
    unitPriceKrw: row.securityDepositUnitKrw,
    none: row.securityDepositScope === '-',
  });
}

/** Page1 기본금 표시와 동일한 팀 접힘/접두사 규칙 */
function resolveBaseTeamsForDisplay(data: EstimateDocumentData): EstimateTeamPricing[] {
  const rows = data.teamPricings;
  if (rows.length <= 1) {
    return rows;
  }
  if (shouldShowTeamPrefixForBaseAmount(rows)) {
    return rows;
  }
  if (data.expandTeamPricingSummaryRows === true) {
    return rows;
  }
  return teamPricingsForBaseAmountDisplay(rows);
}

/** Page1 총액·예약금·잔금 표시와 동일한 팀 접힘 규칙 */
function resolveSummaryTeamsForDisplay(data: EstimateDocumentData): EstimateTeamPricing[] {
  const rows = data.teamPricings;
  if (rows.length <= 1) {
    return rows;
  }
  if (shouldShowTeamPrefixInSummary(rows)) {
    return rows;
  }
  if (data.expandTeamPricingSummaryRows === true) {
    return rows;
  }
  return teamPricingsForSummaryDisplay(rows, estimateTeamPricingSummarySignature);
}

function shouldShowTeamPrefixInSummary(rows: EstimateTeamPricing[]): boolean {
  if (rows.length <= 1) {
    return false;
  }
  const first = estimateTeamPricingSummarySignature(rows[0]!);
  return rows.some((row) => estimateTeamPricingSummarySignature(row) !== first);
}

function resolveSecurityDepositTeamsForDisplay(data: EstimateDocumentData): EstimateTeamPricing[] {
  const rows = data.teamPricings;
  if (rows.length <= 1 || data.expandTeamPricingSummaryRows === true) {
    return rows;
  }
  return teamPricingsForSummaryDisplay(rows, estimateSecurityDepositSignature);
}

function basePriceDisplay(data: EstimateDocumentData): string {
  const rows = resolveBaseTeamsForDisplay(data);
  if (rows.length === 0) {
    return data.basePricePerPersonKrw == null ? '' : blankIfDash(formatCurrency(data.basePricePerPersonKrw));
  }
  const showPrefix = rows.length > 1;
  return rows
    .map((team) => `${showPrefix ? `${team.teamName}) ` : ''}${blankIfDash(formatCurrency(team.baseAmountKrw))}`)
    .join('\n');
}

function summaryAmountDisplay(
  data: EstimateDocumentData,
  pick: (team: EstimateTeamPricing) => number,
  fallback: number | null,
): string {
  const rows = resolveSummaryTeamsForDisplay(data);
  if (rows.length === 0) {
    return fallback == null ? '' : blankIfDash(formatCurrency(fallback));
  }
  const showPrefix = rows.length > 1;
  return rows
    .map((team) => `${showPrefix ? `${team.teamName}) ` : ''}${blankIfDash(formatCurrency(pick(team)))}`)
    .join('\n');
}

function securityDepositDisplay(data: EstimateDocumentData): string {
  const rows = resolveSecurityDepositTeamsForDisplay(data);
  if (rows.length > 0) {
    const showPrefix = rows.length > 1;
    return rows
      .map((team) => {
        const prefix = showPrefix ? `${team.teamName}) ` : '';
        if (team.securityDepositScope === '-') {
          return `${prefix}${blankIfDash(formatCurrency(team.securityDepositAmountKrw))}`;
        }
        return `${prefix}${formatCurrency(team.securityDepositUnitKrw)} (${team.securityDepositScope})`;
      })
      .join('\n');
  }

  if (data.securityDepositUnitKrw === null) {
    return '';
  }
  return `${formatCurrency(data.securityDepositUnitKrw)} (${data.securityDepositScope})`;
}

/**
 * Page1「추가 및 할인 사항」에 실제로 보이는 문자열만 비교한다.
 * teamName은 팀이 2개 이상일 때만 화면에 나오므로, 숨겨진 메타 차이는 무시한다.
 */
function adjustmentsDisplay(data: EstimateDocumentData): string {
  if (data.adjustmentLines.length === 0) {
    return '';
  }
  const showTeamPrefix = data.teamPricings.length > 1;
  return data.adjustmentLines
    .map((line) => {
      const labelPrefix = showTeamPrefix && line.teamName?.trim() ? `${line.teamName.trim()})` : '';
      return [
        `${labelPrefix}${line.label}`,
        formatSignedCurrency(line.leadAmountKrw),
        line.formula,
        line.strikethrough ? '1' : '0',
      ].join('|');
    })
    .join('\n');
}

export function extractPage1DiffValues(data: EstimateDocumentData): Record<EstimatePage1DiffField, string> {
  const flightIn = blankIfDash(
    data.transportGroups.length > 0
      ? formatTransportFlightText(data.transportGroups, 'IN')
      : formatFlightText(data.flightInDate, data.flightInTime),
  );
  const flightOut = blankIfDash(
    data.transportGroups.length > 0
      ? formatTransportFlightText(data.transportGroups, 'OUT')
      : formatFlightText(data.flightOutDate, data.flightOutTime),
  );
  const pickup = blankIfDash(
    data.transportGroups.length > 0
      ? formatTransportPickupDropText(data.transportGroups, 'pickup')
      : formatPickupDropDisplay(data.pickupDate, data.pickupTime, data.pickupPlaceType, data.pickupPlaceCustomText),
  );
  const drop = blankIfDash(
    data.transportGroups.length > 0
      ? formatTransportPickupDropText(data.transportGroups, 'drop')
      : formatPickupDropDisplay(data.dropDate, data.dropTime, data.dropPlaceType, data.dropPlaceCustomText),
  );

  return {
    leaderName: normalizeDiffText(data.leaderName),
    documentNumber: normalizeDiffText(data.documentNumber),
    destinationName: normalizeDiffText(data.destinationName),
    headcount: normalizeDiffText(
      blankIfDash(formatHeadcount(data.headcountTotal, data.headcountMale, data.headcountFemale)),
    ),
    travelPeriod: normalizeDiffText(formatTravelPeriodCompact(data.travelStartDate, data.travelEndDate)),
    vehicleType: normalizeDiffText(vehicleDisplayText(data)),
    flightIn: normalizeDiffText(flightIn),
    flightOut: normalizeDiffText(flightOut),
    pickup: normalizeDiffText(pickup),
    drop: normalizeDiffText(drop),
    externalPickupDrop: normalizeDiffText(data.externalPickupDropText),
    specialNote: normalizeDiffText(data.specialNoteText),
    rentalItems: normalizeDiffText(data.rentalItemsText),
    events: normalizeDiffText(data.eventText),
    remark: normalizeDiffText(data.remarkText),
    basePrice: normalizeDiffText(basePriceDisplay(data)),
    adjustments: normalizeDiffText(adjustmentsDisplay(data)),
    totalPrice: normalizeDiffText(
      summaryAmountDisplay(data, (team) => team.totalAmountKrw, data.totalPricePerPersonKrw),
    ),
    depositPrice: normalizeDiffText(
      summaryAmountDisplay(data, (team) => team.depositAmountKrw, data.depositPricePerPersonKrw),
    ),
    balancePrice: normalizeDiffText(
      summaryAmountDisplay(data, (team) => team.balanceAmountKrw, data.balancePricePerPersonKrw),
    ),
    securityDeposit: normalizeDiffText(securityDepositDisplay(data)),
  };
}

export const PAGE1_DIFF_FIELDS: EstimatePage1DiffField[] = [
  'leaderName',
  'documentNumber',
  'destinationName',
  'headcount',
  'travelPeriod',
  'vehicleType',
  'flightIn',
  'flightOut',
  'pickup',
  'drop',
  'externalPickupDrop',
  'specialNote',
  'rentalItems',
  'events',
  'remark',
  'basePrice',
  'adjustments',
  'totalPrice',
  'depositPrice',
  'balancePrice',
  'securityDeposit',
];
