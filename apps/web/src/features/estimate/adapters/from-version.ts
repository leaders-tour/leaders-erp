import { buildPricingViewBuckets, getPricingLineLabel } from '../../pricing/view-model';
import type { PlanVersionDetail } from '../../plan/hooks';
import { ESTIMATE_PAGE3_TITLE, ESTIMATE_VALIDITY_DAYS } from '../model/constants';
import type { EstimateDocumentData } from '../model/types';
import {
  addDays,
  buildPage2Title,
  formatCalculationBasis,
  normalizeMultilineText,
  toSecurityDepositScope,
  todayIsoDate,
} from '../utils/format';

export function fromVersion(version: PlanVersionDetail): EstimateDocumentData {
  const meta = version.meta;
  const pricing = version.pricing;
  const pricingBuckets = pricing ? buildPricingViewBuckets(pricing.lines, pricing.totalAmountKrw) : null;

  return {
    mode: 'version',
    isDraft: false,
    planTitle: version.plan.title,
    page2Title: buildPage2Title(version.plan.region.name, version.planStops.length),
    page3Title: ESTIMATE_PAGE3_TITLE,
    leaderName: normalizeMultilineText(meta?.leaderName),
    documentNumber: meta?.documentNumber ?? null,
    destinationName: normalizeMultilineText(version.plan.region.name),
    headcountTotal: meta?.headcountTotal ?? null,
    headcountMale: meta?.headcountMale ?? null,
    headcountFemale: meta?.headcountFemale ?? null,
    travelStartDate: meta?.travelStartDate ?? null,
    travelEndDate: meta?.travelEndDate ?? null,
    vehicleType: meta?.vehicleType ?? '-',
    flightInDate: meta?.travelStartDate ?? null,
    flightInTime: meta?.flightInTime ?? null,
    flightOutDate: meta?.travelEndDate ?? null,
    flightOutTime: meta?.flightOutTime ?? null,
    pickupText: normalizeMultilineText(meta?.pickupDropNote),
    dropText: '-',
    externalPickupDropText: normalizeMultilineText(meta?.externalPickupDropNote),
    specialNoteText: '-',
    rentalItemsText: meta?.includeRentalItems ? normalizeMultilineText(meta.rentalItemsText) : '-',
    eventText: meta?.events.length ? meta.events.map((event) => event.name).join(' / ') : '-',
    remarkText: normalizeMultilineText(meta?.remark),
    basePricePerPersonKrw: pricing?.baseAmountKrw ?? null,
    adjustmentLines:
      pricingBuckets?.addonLines.map((line) => ({
        label: getPricingLineLabel(line),
        amountKrw: line.amountKrw,
        formula: formatCalculationBasis(line.unitPriceKrw, line.quantity),
      })) ?? [],
    totalPricePerPersonKrw: pricing?.totalAmountKrw ?? null,
    depositPricePerPersonKrw: pricing?.depositAmountKrw ?? null,
    balancePricePerPersonKrw: pricing?.balanceAmountKrw ?? null,
    securityDepositTotalKrw: pricing?.securityDepositAmountKrw ?? null,
    securityDepositUnitKrw: pricing?.securityDepositUnitPriceKrw ?? null,
    securityDepositScope: pricing ? toSecurityDepositScope(pricing.securityDepositMode) : '-',
    validUntilDate: addDays(todayIsoDate(), ESTIMATE_VALIDITY_DAYS),
    planStops: version.planStops.map((row) => ({
      locationId: row.locationId ?? null,
      dateCellText: row.dateCellText,
      destinationCellText: row.destinationCellText,
      timeCellText: row.timeCellText,
      scheduleCellText: row.scheduleCellText,
      lodgingCellText: row.lodgingCellText,
      mealCellText: row.mealCellText,
    })),
    page3Blocks: [],
  };
}
