import { mergeLodgingSelectionDisplayLines } from '../../pricing/merge-lodging-selection-display';
import { buildPricingViewBuckets, getPricingLineLabel } from '../../pricing/view-model';
import { countMainPlanStopRows } from '../../plan/plan-stop-row';
import { ESTIMATE_PAGE3_TITLE, ESTIMATE_VALIDITY_DAYS } from '../model/constants';
import type { EstimateBuilderDraftSnapshot, EstimateDocumentData } from '../model/types';
import { buildExternalTransferDirectionText } from '../../plan/external-transfer';
import {
  addDays,
  buildPage2Title,
  formatCalculationBasis,
  formatCalculationBasisNights,
  formatPerPersonCalculationBasis,
  normalizeMultilineText,
  toSecurityDepositScope,
  todayIsoDate,
} from '../utils/format';

export function fromBuilderDraft(snapshot: EstimateBuilderDraftSnapshot): EstimateDocumentData {
  const pricingBuckets = snapshot.pricing
    ? buildPricingViewBuckets(snapshot.pricing.lines, snapshot.pricing.totalAmountKrw)
    : null;
  const externalPickupText = buildExternalTransferDirectionText(snapshot.externalTransfers, snapshot.transportGroups, 'PICKUP');
  const externalDropText = buildExternalTransferDirectionText(snapshot.externalTransfers, snapshot.transportGroups, 'DROP');

  return {
    mode: 'draft',
    isDraft: true,
    planTitle: snapshot.planTitle,
    page2Title: buildPage2Title(snapshot.regionName, countMainPlanStopRows(snapshot.planStops)),
    page3Title: ESTIMATE_PAGE3_TITLE,
    leaderName: normalizeMultilineText(snapshot.leaderName),
    documentNumber: null,
    destinationName: normalizeMultilineText(snapshot.regionName),
    headcountTotal: Number.isFinite(snapshot.headcountTotal) ? snapshot.headcountTotal : null,
    headcountMale: Number.isFinite(snapshot.headcountMale) ? snapshot.headcountMale : null,
    headcountFemale: Number.isFinite(snapshot.headcountFemale) ? snapshot.headcountFemale : null,
    travelStartDate: snapshot.travelStartDate || null,
    travelEndDate: snapshot.travelEndDate || null,
    vehicleType: snapshot.vehicleType || '-',
    transportGroups: snapshot.transportGroups,
    flightInDate: snapshot.transportGroups[0]?.flightInDate || null,
    flightInTime: snapshot.transportGroups[0]?.flightInTime || null,
    flightOutDate: snapshot.transportGroups[0]?.flightOutDate || null,
    flightOutTime: snapshot.transportGroups[0]?.flightOutTime || null,
    pickupDate: snapshot.transportGroups[0]?.pickupDate || null,
    pickupTime: snapshot.transportGroups[0]?.pickupTime || null,
    dropDate: snapshot.transportGroups[0]?.dropDate || null,
    dropTime: snapshot.transportGroups[0]?.dropTime || null,
    pickupPlaceType: snapshot.transportGroups[0]?.pickupPlaceType ?? null,
    pickupPlaceCustomText: snapshot.transportGroups[0]?.pickupPlaceCustomText || null,
    dropPlaceType: snapshot.transportGroups[0]?.dropPlaceType ?? null,
    dropPlaceCustomText: snapshot.transportGroups[0]?.dropPlaceCustomText || null,
    externalTransfers: snapshot.externalTransfers,
    externalPickupDate: null,
    externalPickupTime: null,
    externalPickupPlaceType: null,
    externalPickupPlaceCustomText: null,
    externalDropDate: null,
    externalDropTime: null,
    externalDropPlaceType: null,
    externalDropPlaceCustomText: null,
    pickupText: '-',
    dropText: '-',
    externalPickupText,
    externalDropText,
    externalPickupDropText: [externalPickupText, externalDropText].filter((value) => value !== '-').join('\n'),
    specialNoteText: normalizeMultilineText(snapshot.specialNote),
    rentalItemsText: snapshot.includeRentalItems ? normalizeMultilineText(snapshot.rentalItemsText) : '-',
    eventText: snapshot.eventNames.length > 0 ? snapshot.eventNames.join(' / ') : '-',
    remarkText: normalizeMultilineText(snapshot.remark),
    basePricePerPersonKrw: snapshot.pricing?.baseAmountKrw ?? null,
    adjustmentLines:
      (pricingBuckets ? mergeLodgingSelectionDisplayLines(pricingBuckets.addonLines) : []).map((line) => ({
        label: getPricingLineLabel(line),
        amountKrw: line.amountKrw,
        formula:
          line.lineCode === 'MANUAL_ADJUSTMENT'
            ? formatPerPersonCalculationBasis(line.unitPriceKrw, line.quantity)
            : line.quantityDisplaySuffix === '박'
              ? formatCalculationBasisNights(line.unitPriceKrw, line.quantity)
              : formatCalculationBasis(line.unitPriceKrw, line.quantity),
      })),
    totalPricePerPersonKrw: snapshot.pricing?.totalAmountKrw ?? null,
    depositPricePerPersonKrw: snapshot.pricing?.depositAmountKrw ?? null,
    balancePricePerPersonKrw: snapshot.pricing?.balanceAmountKrw ?? null,
    securityDepositTotalKrw: snapshot.pricing?.securityDepositTotalKrw ?? null,
    securityDepositUnitKrw: snapshot.pricing?.securityDepositUnitKrw ?? null,
    securityDepositScope: snapshot.pricing ? toSecurityDepositScope(snapshot.pricing.securityDepositMode) : '-',
    validUntilDate: addDays(todayIsoDate(), ESTIMATE_VALIDITY_DAYS),
    movementIntensity: snapshot.movementIntensity ?? null,
    planStops: snapshot.planStops,
    page3Blocks: [],
  };
}
