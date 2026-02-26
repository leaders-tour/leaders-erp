import { buildPricingViewBuckets, getPricingLineLabel } from '../../pricing/view-model';
import { ESTIMATE_VALIDITY_DAYS } from '../model/constants';
import type { EstimateBuilderDraftSnapshot, EstimateDocumentData } from '../model/types';
import { addDays, formatCalculationBasis, normalizeMultilineText, toSecurityDepositScope, todayIsoDate } from '../utils/format';

export function fromBuilderDraft(snapshot: EstimateBuilderDraftSnapshot): EstimateDocumentData {
  const pricingBuckets = snapshot.pricing
    ? buildPricingViewBuckets(snapshot.pricing.lines, snapshot.pricing.totalAmountKrw)
    : null;

  return {
    mode: 'draft',
    isDraft: true,
    planTitle: snapshot.planTitle,
    leaderName: normalizeMultilineText(snapshot.leaderName),
    documentNumber: null,
    destinationName: normalizeMultilineText(snapshot.regionName),
    headcountTotal: Number.isFinite(snapshot.headcountTotal) ? snapshot.headcountTotal : null,
    headcountMale: Number.isFinite(snapshot.headcountMale) ? snapshot.headcountMale : null,
    headcountFemale: Number.isFinite(snapshot.headcountFemale) ? snapshot.headcountFemale : null,
    travelStartDate: snapshot.travelStartDate || null,
    travelEndDate: snapshot.travelEndDate || null,
    vehicleType: snapshot.vehicleType || '-',
    flightInDate: snapshot.travelStartDate || null,
    flightInTime: snapshot.flightInTime || null,
    flightOutDate: snapshot.travelEndDate || null,
    flightOutTime: snapshot.flightOutTime || null,
    pickupText: normalizeMultilineText(snapshot.pickupDropNote),
    dropText: '-',
    externalPickupDropText: normalizeMultilineText(snapshot.externalPickupDropNote),
    specialNoteText: '-',
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
  };
}
