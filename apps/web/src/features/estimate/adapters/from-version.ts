import { mergeLodgingSelectionDisplayLines } from '../../pricing/merge-lodging-selection-display';
import { buildEffectivePricing } from '../../pricing/manual-pricing';
import { buildPricingViewBuckets, getPricingLineLabel } from '../../pricing/view-model';
import { buildExternalTransferDirectionText } from '../../plan/external-transfer';
import type { PlanVersionDetail } from '../../plan/hooks';
import { countMainPlanStopRows } from '../../plan/plan-stop-row';
import { ESTIMATE_PAGE3_TITLE, ESTIMATE_VALIDITY_DAYS } from '../model/constants';
import type { EstimateDocumentData } from '../model/types';
import { formatPricingDetailFormula, resolveDisplayLeadAmount } from '../../pricing/pricing-line-presenter';
import {
  addDays,
  buildPage2Title,
  formatExternalPickupDropText,
  formatLegacyExternalTransferText,
  normalizeMultilineText,
  toSecurityDepositScope,
  todayIsoDate,
} from '../utils/format';

export function fromVersion(version: PlanVersionDetail): EstimateDocumentData {
  const meta = version.meta;
  const regionSetName = version.regionSet?.name ?? version.plan.regionSet.name;
  const pricingCtx = {
    headcountTotal: meta?.headcountTotal ?? 0,
    totalDays: countMainPlanStopRows(version.planStops),
  };
  const pricing = version.pricing
    ? buildEffectivePricing(
        version.pricing,
        pricingCtx,
        version.pricing.manualPricing ?? null,
        version.pricing.savedManualDepositAmountKrw ?? undefined,
      )
    : null;
  const pricingBuckets = pricing ? buildPricingViewBuckets(pricing.lines, pricing.totalAmountKrw) : null;
  const basePricePerPersonKrw = pricingBuckets?.baseTotal ?? pricing?.baseAmountKrw ?? null;
  const externalTransfers = meta?.externalTransfers ?? [];
  const externalPickupTextFromTransfers = buildExternalTransferDirectionText(externalTransfers, meta?.transportGroups, 'PICKUP');
  const externalDropTextFromTransfers = buildExternalTransferDirectionText(externalTransfers, meta?.transportGroups, 'DROP');
  const legacyExternalPickupText = formatLegacyExternalTransferText(
    meta?.externalPickupDate,
    meta?.externalPickupTime,
    meta?.externalPickupPlaceType,
    meta?.externalPickupPlaceCustomText,
    meta?.externalPickupDropNote,
  );
  const legacyExternalDropText = formatLegacyExternalTransferText(
    meta?.externalDropDate,
    meta?.externalDropTime,
    meta?.externalDropPlaceType,
    meta?.externalDropPlaceCustomText,
    undefined,
  );
  const externalPickupText = externalPickupTextFromTransfers !== '-' ? externalPickupTextFromTransfers : legacyExternalPickupText;
  const externalDropText = externalDropTextFromTransfers !== '-' ? externalDropTextFromTransfers : legacyExternalDropText;
  return {
    mode: 'version',
    isDraft: false,
    planTitle: version.plan.title,
    page2Title: buildPage2Title(regionSetName, countMainPlanStopRows(version.planStops)),
    page3Title: ESTIMATE_PAGE3_TITLE,
    leaderName: normalizeMultilineText(meta?.leaderName),
    documentNumber: meta?.documentNumber ?? null,
    destinationName: normalizeMultilineText(regionSetName),
    headcountTotal: meta?.headcountTotal ?? null,
    headcountMale: meta?.headcountMale ?? null,
    headcountFemale: meta?.headcountFemale ?? null,
    travelStartDate: meta?.travelStartDate ?? null,
    travelEndDate: meta?.travelEndDate ?? null,
    vehicleType: meta?.vehicleType ?? '-',
    transportGroups:
      meta?.transportGroups.map((group) => ({
        teamName: group.teamName,
        headcount: group.headcount,
        flightInDate: group.flightInDate,
        flightInTime: group.flightInTime,
        flightOutDate: group.flightOutDate,
        flightOutTime: group.flightOutTime,
        pickupDate: group.pickupDate ?? '',
        pickupTime: group.pickupTime ?? '',
        pickupPlaceType: group.pickupPlaceType ?? 'AIRPORT',
        pickupPlaceCustomText: group.pickupPlaceCustomText ?? '',
        dropDate: group.dropDate ?? '',
        dropTime: group.dropTime ?? '',
        dropPlaceType: group.dropPlaceType ?? 'AIRPORT',
        dropPlaceCustomText: group.dropPlaceCustomText ?? '',
      })) ?? [],
    flightInDate: meta?.transportGroups[0]?.flightInDate ?? meta?.travelStartDate ?? null,
    flightInTime: meta?.transportGroups[0]?.flightInTime ?? meta?.flightInTime ?? null,
    flightOutDate: meta?.transportGroups[0]?.flightOutDate ?? meta?.travelEndDate ?? null,
    flightOutTime: meta?.transportGroups[0]?.flightOutTime ?? meta?.flightOutTime ?? null,
    pickupDate: meta?.transportGroups[0]?.pickupDate ?? meta?.pickupDate ?? null,
    pickupTime: meta?.transportGroups[0]?.pickupTime ?? meta?.pickupTime ?? null,
    dropDate: meta?.transportGroups[0]?.dropDate ?? meta?.dropDate ?? null,
    dropTime: meta?.transportGroups[0]?.dropTime ?? meta?.dropTime ?? null,
    pickupPlaceType: meta?.transportGroups[0]?.pickupPlaceType ?? meta?.pickupPlaceType ?? null,
    pickupPlaceCustomText: meta?.transportGroups[0]?.pickupPlaceCustomText ?? meta?.pickupPlaceCustomText ?? null,
    dropPlaceType: meta?.transportGroups[0]?.dropPlaceType ?? meta?.dropPlaceType ?? null,
    dropPlaceCustomText: meta?.transportGroups[0]?.dropPlaceCustomText ?? meta?.dropPlaceCustomText ?? null,
    externalTransfers,
    externalPickupDate: meta?.externalPickupDate ?? null,
    externalPickupTime: meta?.externalPickupTime ?? null,
    externalPickupPlaceType: meta?.externalPickupPlaceType ?? null,
    externalPickupPlaceCustomText: meta?.externalPickupPlaceCustomText ?? null,
    externalDropDate: meta?.externalDropDate ?? null,
    externalDropTime: meta?.externalDropTime ?? null,
    externalDropPlaceType: meta?.externalDropPlaceType ?? null,
    externalDropPlaceCustomText: meta?.externalDropPlaceCustomText ?? null,
    pickupText: '-',
    dropText: '-',
    externalPickupText,
    externalDropText,
    externalPickupDropText: formatExternalPickupDropText(
      meta?.externalPickupDate,
      meta?.externalPickupTime,
      meta?.externalPickupPlaceType,
      meta?.externalPickupPlaceCustomText,
      meta?.externalDropDate,
      meta?.externalDropTime,
      meta?.externalDropPlaceType,
      meta?.externalDropPlaceCustomText,
      meta?.externalPickupDropNote,
    ),
    specialNoteText: normalizeMultilineText(meta?.specialNote),
    rentalItemsText: meta?.includeRentalItems ? normalizeMultilineText(meta.rentalItemsText) : '-',
    eventText: meta?.events.length ? meta.events.map((event) => event.name).join(' / ') : '-',
    remarkText: normalizeMultilineText(meta?.remark),
    basePricePerPersonKrw,
    adjustmentLines:
      pricing?.adjustmentLines.map((line) => ({
        teamName: null,
        label: line.label,
        leadAmountKrw: line.leadAmountKrw,
        formula: line.formula,
      })) ??
      (pricingBuckets ? mergeLodgingSelectionDisplayLines(pricingBuckets.addonLines) : []).map((line) => ({
        teamName: null,
        label: getPricingLineLabel(line),
        leadAmountKrw: resolveDisplayLeadAmount(line, pricingCtx),
        formula: formatPricingDetailFormula(line, pricingCtx),
      })),
    teamPricings:
      pricing?.teamPricings.map((teamPricing) => ({
        teamOrderIndex: teamPricing.teamOrderIndex,
        teamName: teamPricing.teamName,
        totalAmountKrw: teamPricing.totalAmountKrw,
        depositAmountKrw: teamPricing.depositAmountKrw,
        balanceAmountKrw: teamPricing.balanceAmountKrw,
        securityDepositAmountKrw: teamPricing.securityDepositAmountKrw,
        securityDepositUnitKrw: teamPricing.securityDepositUnitPriceKrw,
        securityDepositScope: toSecurityDepositScope(teamPricing.securityDepositMode),
      })) ?? [],
    totalPricePerPersonKrw: pricing?.totalAmountKrw ?? null,
    depositPricePerPersonKrw: pricing?.depositAmountKrw ?? null,
    balancePricePerPersonKrw: pricing?.balanceAmountKrw ?? null,
    securityDepositTotalKrw: pricing?.securityDepositAmountKrw ?? null,
    securityDepositUnitKrw: pricing?.securityDepositUnitPriceKrw ?? null,
    securityDepositScope: pricing ? toSecurityDepositScope(pricing.securityDepositMode) : '-',
    validUntilDate: addDays(todayIsoDate(), ESTIMATE_VALIDITY_DAYS),
    movementIntensity: version.movementIntensity ?? null,
    planStops: version.planStops.map((row) => ({
      rowType: row.rowType ?? 'MAIN',
      locationId: row.locationId ?? null,
      dateCellText: row.dateCellText,
      destinationCellText: row.destinationCellText,
      movementIntensity: row.movementIntensity ?? null,
      timeCellText: row.timeCellText,
      scheduleCellText: row.scheduleCellText,
      lodgingCellText: row.lodgingCellText,
      mealCellText: row.mealCellText,
    })),
    page3Blocks: [],
  };
}
