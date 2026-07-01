import { mergeLodgingSelectionDisplayLines } from '../../pricing/merge-lodging-selection-display';
import { buildEffectivePricing, resolveAdjustmentLinesForCustomerDocument } from '../../pricing/manual-pricing';
import { resolveCustomerOutputTeamPricings } from '../../pricing/customer-pricing-snapshot';
import { publishedTotalsFromPlanVersionPricing } from '../../pricing/published-pricing-totals';
import { buildPricingViewBuckets, getPricingLineLabel } from '../../pricing/view-model';
import type { PlanVersionDetail } from '../../plan/hooks';
import { countMainPlanStopRows } from '../../plan/plan-stop-row';
import { ESTIMATE_PAGE3_TITLE, ESTIMATE_VALIDITY_DAYS } from '../model/constants';
import type { EstimateDocumentData, EstimateSecurityDepositScope } from '../model/types';
import { normalizeEstimateGuideImagesPerPage, normalizeEstimateGuidePageSplits } from '../utils/guide-layout';
import { formatPricingDetailFormula, resolveDisplayLeadAmount } from '../../pricing/pricing-line-presenter';
import {
  buildPage2Title,
  resolveStoredValidUntilDate,
  toSecurityDepositScope,
} from '../utils/format';
import {
  buildSharedDocumentFieldsFromPlanVersion,
  mapPlanVersionTransportGroupsForCustomerDocument,
} from './plan-version-shared-document-fields';

function optionalTextForEstimateEditor(value: string): string {
  const text = value.trim();
  return text.length > 0 ? text : '-';
}

/** 플랜 버전 → 견적 문서. `customerPricingSnapshot`이 있으면 빌더 출력을 재계산 없이 사용한다(레거시는 폴백). */
export function fromVersion(version: PlanVersionDetail): EstimateDocumentData {
  const meta = version.meta;
  const regionSetName = version.regionSet?.name ?? version.plan.regionSet.name;
  const shared = buildSharedDocumentFieldsFromPlanVersion(version);
  const transportGroups = mapPlanVersionTransportGroupsForCustomerDocument(meta?.transportGroups);
  const externalTransfers = meta?.externalTransfers ?? [];
  const pricingCtx = {
    headcountTotal: meta?.headcountTotal ?? 0,
    totalDays: countMainPlanStopRows(version.planStops),
  };
  const customerPricingSnapshot = version.pricing?.manualPricing?.customerPricingSnapshot ?? null;
  const pricing = version.pricing
    ? buildEffectivePricing(
        version.pricing,
        pricingCtx,
        version.pricing.manualPricing ?? null,
        version.pricing.savedManualDepositAmountKrw ?? undefined,
      )
    : null;
  const publishedTotals = version.pricing ? publishedTotalsFromPlanVersionPricing(version.pricing) : null;
  const resolvedTeamPricings = resolveCustomerOutputTeamPricings({
    snapshotTeamPricings: customerPricingSnapshot?.teamPricings,
    effectiveTeamPricings: pricing?.teamPricings,
    headlineBaseAmountKrw: customerPricingSnapshot?.baseAmountKrw ?? publishedTotals?.baseAmountKrw ?? null,
  });
  const showCustomerSnapshotLineTeamName = resolvedTeamPricings.length > 1;
  const pricingBuckets =
    pricing && publishedTotals ? buildPricingViewBuckets(pricing.lines, publishedTotals.totalAmountKrw) : null;
  const basePricePerPersonKrw = customerPricingSnapshot
    ? customerPricingSnapshot.baseAmountKrw
    : publishedTotals?.baseAmountKrw ?? pricingBuckets?.baseTotal ?? null;

  return {
    mode: 'version',
    isDraft: false,
    planTitle: version.plan.title,
    page2Title: buildPage2Title(regionSetName, countMainPlanStopRows(version.planStops)),
    page3Title: ESTIMATE_PAGE3_TITLE,
    leaderName: shared.leaderName,
    documentNumber: shared.documentNumber,
    destinationName: shared.destination,
    headcountTotal: meta?.headcountTotal ?? null,
    headcountMale: meta?.headcountMale ?? null,
    headcountFemale: meta?.headcountFemale ?? null,
    travelStartDate: meta?.travelStartDate ?? null,
    travelEndDate: meta?.travelEndDate ?? null,
    vehicleType: shared.vehicleType,
    transportGroups,
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
    externalPickupText: shared.externalPickupText,
    externalDropText: shared.externalDropText,
    externalPickupDropText: shared.externalPickupDropText,
    specialNoteText: optionalTextForEstimateEditor(shared.specialNote),
    rentalItemsText: shared.rentalItemsText,
    eventText: shared.eventNames,
    remarkText: optionalTextForEstimateEditor(shared.remark),
    basePricePerPersonKrw,
    adjustmentLines: customerPricingSnapshot
      ? customerPricingSnapshot.adjustmentLines.map((line) => ({
          teamName: showCustomerSnapshotLineTeamName ? line.teamName ?? null : null,
          label: line.label,
          leadAmountKrw: line.leadAmountKrw,
          formula: line.formula,
          strikethrough: line.strikethrough === true,
        }))
      : pricing
        ? resolveAdjustmentLinesForCustomerDocument(pricing).map((line) => ({
            teamName: line.teamName ?? null,
            label: line.label,
            leadAmountKrw: line.leadAmountKrw,
            formula: line.formula,
            strikethrough: line.strikethrough === true,
          }))
        : (pricingBuckets ? mergeLodgingSelectionDisplayLines(pricingBuckets.addonLines) : []).map((line) => ({
            teamName: null,
            label: getPricingLineLabel(line),
            leadAmountKrw: resolveDisplayLeadAmount(line, pricingCtx),
            formula: formatPricingDetailFormula(line, pricingCtx),
            strikethrough: false,
          })),
    teamPricings: resolvedTeamPricings.map((row) => ({
      teamOrderIndex: row.teamOrderIndex,
      teamName: row.teamName,
      baseAmountKrw: row.baseAmountKrw,
      totalAmountKrw: row.totalAmountKrw,
      depositAmountKrw: row.depositAmountKrw,
      balanceAmountKrw: row.balanceAmountKrw,
      securityDepositAmountKrw: row.securityDepositAmountKrw,
      securityDepositUnitKrw: row.securityDepositUnitKrw,
      securityDepositScope: row.securityDepositScope as EstimateSecurityDepositScope,
    })),
    expandTeamPricingSummaryRows: version.pricing?.manualPricing?.expandTeamPricingSummaryRows === true,
    totalPricePerPersonKrw: customerPricingSnapshot
      ? customerPricingSnapshot.totalAmountKrw
      : publishedTotals?.totalAmountKrw ?? null,
    depositPricePerPersonKrw: customerPricingSnapshot
      ? customerPricingSnapshot.depositAmountKrw
      : publishedTotals?.depositAmountKrw ?? null,
    balancePricePerPersonKrw: customerPricingSnapshot
      ? customerPricingSnapshot.balanceAmountKrw
      : publishedTotals?.balanceAmountKrw ?? null,
    securityDepositTotalKrw: customerPricingSnapshot
      ? customerPricingSnapshot.securityDepositTotalKrw
      : publishedTotals?.securityDepositAmountKrw ?? null,
    securityDepositUnitKrw: customerPricingSnapshot
      ? customerPricingSnapshot.securityDepositUnitKrw
      : publishedTotals?.securityDepositUnitPriceKrw ?? null,
    securityDepositScope: customerPricingSnapshot
      ? toSecurityDepositScope(customerPricingSnapshot.securityDepositMode)
      : publishedTotals
        ? toSecurityDepositScope(publishedTotals.securityDepositMode)
        : '-',
    validUntilDate: resolveStoredValidUntilDate(
      meta?.validUntilDate ?? null,
      meta?.createdAt ?? null,
      ESTIMATE_VALIDITY_DAYS,
    ),
    movementIntensity: version.movementIntensity ?? null,
    overallMovementIntensityColorOverride: version.meta?.movementIntensityColorOverride ?? null,
    estimateGuideImagesPerPage: normalizeEstimateGuideImagesPerPage(version.meta?.estimateGuideImagesPerPage),
    estimateGuidePageSplits: normalizeEstimateGuidePageSplits(version.meta?.estimateGuidePageSplits),
    planStops: version.planStops.map((row) => ({
      rowType: row.rowType ?? 'MAIN',
      locationId: row.locationId ?? null,
      dateCellText: row.dateCellText,
      destinationCellText: row.destinationCellText,
      movementIntensity: row.movementIntensity ?? null,
      movementIntensityColorOverride: row.movementIntensityColorOverride ?? null,
      timeCellText: row.timeCellText,
      scheduleCellText: row.scheduleCellText,
      lodgingCellText: row.lodgingCellText,
      mealCellText: row.mealCellText,
    })),
    page3Blocks: [],
  };
}
