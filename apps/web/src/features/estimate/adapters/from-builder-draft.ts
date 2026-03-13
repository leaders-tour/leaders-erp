import { buildPricingViewBuckets, getPricingLineLabel } from '../../pricing/view-model';
import { ESTIMATE_PAGE3_TITLE, ESTIMATE_VALIDITY_DAYS } from '../model/constants';
import type { EstimateBuilderDraftSnapshot, EstimateDocumentData } from '../model/types';
import {
  addDays,
  buildPage2Title,
  formatExternalPickupDropText,
  formatCalculationBasis,
  normalizeMultilineText,
  toSecurityDepositScope,
  todayIsoDate,
} from '../utils/format';

export function fromBuilderDraft(snapshot: EstimateBuilderDraftSnapshot): EstimateDocumentData {
  const pricingBuckets = snapshot.pricing
    ? buildPricingViewBuckets(snapshot.pricing.lines, snapshot.pricing.totalAmountKrw)
    : null;

  return {
    mode: 'draft',
    isDraft: true,
    planTitle: snapshot.planTitle,
    page2Title: buildPage2Title(snapshot.regionName, snapshot.planStops.length),
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
    externalPickupDate: snapshot.externalPickupDate || null,
    externalPickupTime: snapshot.externalPickupTime || null,
    externalPickupPlaceType: snapshot.externalPickupPlaceType,
    externalPickupPlaceCustomText: snapshot.externalPickupPlaceCustomText || null,
    externalDropDate: snapshot.externalDropDate || null,
    externalDropTime: snapshot.externalDropTime || null,
    externalDropPlaceType: snapshot.externalDropPlaceType,
    externalDropPlaceCustomText: snapshot.externalDropPlaceCustomText || null,
    pickupText: '-',
    dropText: '-',
    externalPickupDropText: formatExternalPickupDropText(
      snapshot.externalPickupDate,
      snapshot.externalPickupTime,
      snapshot.externalPickupPlaceType,
      snapshot.externalPickupPlaceCustomText,
      snapshot.externalDropDate,
      snapshot.externalDropTime,
      snapshot.externalDropPlaceType,
      snapshot.externalDropPlaceCustomText,
      snapshot.externalPickupDropNote,
    ),
    specialNoteText: normalizeMultilineText(snapshot.specialNote),
    rentalItemsText: snapshot.includeRentalItems ? normalizeMultilineText(snapshot.rentalItemsText) : '-',
    eventText: snapshot.eventNames.length > 0 ? snapshot.eventNames.join(' / ') : '-',
    remarkText: normalizeMultilineText(snapshot.remark),
    basePricePerPersonKrw: snapshot.pricing?.baseAmountKrw ?? null,
    adjustmentLines:
      pricingBuckets?.addonLines.map((line) => ({
        label: getPricingLineLabel(line),
        amountKrw: line.amountKrw,
        formula: formatCalculationBasis(line.unitPriceKrw, line.quantity),
      })) ?? [],
    totalPricePerPersonKrw: snapshot.pricing?.totalAmountKrw ?? null,
    depositPricePerPersonKrw: snapshot.pricing?.depositAmountKrw ?? null,
    balancePricePerPersonKrw: snapshot.pricing?.balanceAmountKrw ?? null,
    securityDepositTotalKrw: snapshot.pricing?.securityDepositTotalKrw ?? null,
    securityDepositUnitKrw: snapshot.pricing?.securityDepositUnitKrw ?? null,
    securityDepositScope: snapshot.pricing ? toSecurityDepositScope(snapshot.pricing.securityDepositMode) : '-',
    validUntilDate: addDays(todayIsoDate(), ESTIMATE_VALIDITY_DAYS),
    planStops: snapshot.planStops,
    page3Blocks: [],
  };
}
