import { ApolloError, gql, useMutation, useQuery } from '@apollo/client';
import { pickDefaultLocationMealSet, type PricingManualSnapshot } from '@tour/domain';
import { renderRentalItemPresetText, type RentalItemPreset } from '@tour/validation';
import {
  formatVehicleAssignmentsForDisplay,
  normalizeVehicleAssignments,
  PLAN_VEHICLE_TYPES,
  primaryVehicleTypeFromAssignments,
  validateHiaceHeadcountForAssignments,
  type VehicleAssignment,
} from '@tour/validation';
import { Button, Card, Table, Td, Th } from '@tour/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DatePickerModal } from '../components/date-picker/DatePickerModal';
import {
  formatDateTriggerLabel,
  getCurrentLocalYear,
} from '../components/date-picker/date-picker-utils';
import { TimePickerModal } from '../components/date-picker/TimePickerModal';
import { formatTimeTriggerLabel } from '../components/date-picker/time-picker-utils';
import { EstimateDocument } from '../features/estimate/components/EstimateDocument';
import { EstimateGuideLayoutControls } from '../features/estimate/components/EstimateGuideLayoutControls';
import { EstimateValidUntilControls } from '../features/estimate/components/EstimateValidUntilControls';
import { EstimatePreviewScaler } from '../features/estimate/components/EstimatePreviewScaler';
import { useBuilderEstimatePreview } from '../features/estimate/hooks/use-builder-estimate-preview';
import {
  averageMovementIntensity,
  isMovementIntensityPaletteColor,
  type MovementIntensityValue,
} from '../features/estimate/model/movement-intensity';
import {
  formatEstimateGuidePageSplitsInput,
  normalizeEstimateGuideImagesPerPage,
  normalizeEstimateGuidePageSplits,
  parseEstimateGuidePageSplitsInput,
} from '../features/estimate/utils/guide-layout';
import type {
  EstimateBuilderDraftSnapshot,
  EstimateGuideImagesPerPage,
  EstimatePage1Editor,
  EstimatePage2Editor,
  EstimateSecurityDepositScope,
  EstimateTransportGroup,
} from '../features/estimate/model/types';
import { ESTIMATE_GUIDE_IMAGES_PER_PAGE_DEFAULT, ESTIMATE_VALIDITY_DAYS } from '../features/estimate/model/constants';
import { addDays, todayIsoDate } from '../features/estimate/utils/format';
import { resolveInitialValidUntilDateForNewVersion } from '../features/estimate/utils/resolve-initial-valid-until-date';
import { useAuth } from '../features/auth/context';
import {
  useRentalItemAvailability,
  useUpdateConfirmedTrip,
  type TourListRentalItem,
} from '../features/confirmed-trip/hooks';
import { RentalItemAvailabilityBadges } from '../features/confirmed-trip/RentalItemAvailabilityBadges';
import {
  formatLocationNameInline,
  formatLocationNameMultiline,
  toFacilityLabel,
  toMealLabel,
} from '../features/location/display';
import { LodgingUpgradeModal } from '../features/lodging-selection/components/LodgingUpgradeModal';
import { RegionLodgingSelectModal } from '../features/lodging-selection/components/RegionLodgingSelectModal';
import { ExtraLodgingsModal } from '../features/pricing/components/ExtraLodgingsModal';
import {
  teamPricingsForSummaryDisplay,
  teamPricingsForBaseAmountDisplay,
  shouldShowTeamPrefixInPricingSummary,
  shouldShowTeamPrefixForBaseAmount,
  teamPricingSummarySignatureFromParts,
} from '../features/pricing/team-pricing-summary-display';
import {
  buildLodgingCellText,
  formatRegionLodgingDisplayLabel,
  getBaseLodgingText,
  type LodgingSelectionLevel,
  type RegionLodgingOption,
} from '../features/lodging-selection/model';
import { ConsultationPasteModal } from '../features/plan/components/ConsultationPasteModal';
import { VehicleAssignmentsEditor } from '../features/plan/components/VehicleAssignmentsEditor';
import { PlanVersionContractCreateNotice } from '../features/plan/components/PlanVersionContractCreateNotice';
import { ExternalTransferModal } from '../features/plan/components/ExternalTransferModal';
import { ExternalTransfersManagerModal } from '../features/plan/components/ExternalTransfersManagerModal';
import { SpecialMealsModal } from '../features/plan/components/SpecialMealsModal';
import { TransportTeamHeadcountModal } from '../features/plan/components/TransportTeamHeadcountModal';
import { adjustLastDayMealCellText } from '../features/plan/last-day-plan';
import {
  getAssignmentsFromPlanRows,
  parseMealCellText,
  toMealCellText,
  type MealCellFields,
} from '../features/plan/special-meals';
import {
  buildExternalTransferDirectionText,
  buildEmptyExternalTransfer,
  isExternalTransferComplete,
  normalizeExternalTransfers,
  syncExternalTransferTeamSelection,
  type ExternalTransfer,
} from '../features/plan/external-transfer';
import { useBuilderValidation } from '../features/plan/builder-validation';
import { resolveVehicleAssignmentsForHeadcount } from '../features/plan/builder-vehicle';
import { useSpecialMealDestinationRules } from '../features/plan/hooks/use-special-meal-destination-rules';
import { buildMergedPlanStops } from '../features/plan/merge-plan-stops';
import {
  buildMainPlanRowPhysicalIndexes,
  countMainPlanStopRows,
  isMainPlanStopRow,
  resolveMainPlanRowPhysicalIndex,
  type PlanStopRowBase,
  type PlanStopRowType,
} from '../features/plan/plan-stop-row';
import {
  computeAutoVariantSyncUpdate,
  DEFAULT_PICKUP_DROP_PLACE_TYPE,
  inferVariantTypeFromTransportGroups,
  PICKUP_DROP_PLACE_OPTIONS,
  getRecommendedDropSchedule,
  getRecommendedPickupSchedule,
  parseTimeToMinutes,
  normalizePickupDropCustomText,
  type PickupDropPlaceType,
} from '../features/plan/pickup-drop';
import {
  applyTransportGroupTravelDateSync,
  DEFAULT_TRAVEL_SYNC_FLIGHT_IN_TIME,
  DEFAULT_TRAVEL_SYNC_FLIGHT_OUT_TIME,
  isTransportGroupTravelLinked,
  type TransportGroupTravelSyncDraft,
} from '../features/plan/transport-group-travel-sync';
import {
  applyTeamHeadcountsToGroups,
  distributeHeadcountTotalAcrossTeams,
  redistributeTeamHeadcountsAfterRemoval,
  usesTransportTeamHeadcountModal,
} from '../features/plan/transport-team-headcount';
import { toVariantLabel } from '../features/plan/variant-label';
import {
  buildAutoRowsFromRoute,
  buildMultiDayBlockOptions,
  buildSelectedRouteFromStops,
  buildFirstDayOptions,
  buildNextOptions,
  findMultiDayBlockConnection,
  findSegment,
  formatLocationVersion,
  formatMultiDayBlockConnectionVersionLabel,
  formatSegmentVersionLabel,
  getConsumedRouteDayCount,
  getDefaultMultiDayBlockConnectionVersionId,
  getDefaultVersionId,
  getRouteDateForDayIndex,
  getRouteStopEndDayIndex,
  getRouteStopStartDayIndex,
  isRouteSelectionStopComplete,
  getMultiDayBlockConnectionVersions,
  getSegmentVersions,
  resolveMultiDayBlockConnectionVersion,
  resolveSegmentVersionForContext,
  type LocationVersionOption,
  type LocationOption,
  type MultiDayBlockConnectionOption,
  type MultiDayBlockOption,
  type RouteSelection,
  trimRouteSelectionsToTotalDays,
  type SegmentOption,
} from '../features/plan-template/route-autofill';
import { resolveTemplateStopDisplayName } from '../features/plan-template/template-stop-display';
import {
  ManualAdjustmentsModal,
  type ManualAdjustmentDraftRow,
  type ManualAdjustmentPresetOption,
} from '../features/pricing/components/ManualAdjustmentsModal';
import { PricingBaseLinesBreakdown } from '../features/pricing/components/PricingBaseLinesBreakdown';
import {
  assignDisplayedAdjustmentLineTeam,
  resolveDisplayedAdjustmentLineTeamOrderIndex,
} from '../features/pricing/adjustment-line-team-assignment';
import { buildEffectivePricing, sliceEffectiveTotalsForUi, buildDisplayedPricingAdjustmentLines, type PricingAdjustmentLineRow, type DisplayedPricingAdjustmentLineRow, type EffectivePricingResult } from '../features/pricing/manual-pricing';
import { buildCustomerPricingSnapshot } from '../features/pricing/customer-pricing-snapshot';
import { MealOption, VariantType } from '../generated/graphql';
import type { ConsultationDraft } from '../generated/graphql';
import { usePlanVersionDetail } from '../features/plan/hooks';
import { useCurrentRentalItemPreset, useMovementIntensityColorSettings } from '../features/app-settings/hooks';

interface RegionRow {
  id: string;
  name: string;
}

type LocationRow = LocationOption;
type LocationVersionRow = LocationOption['variations'][number];
type SegmentRow = SegmentOption;

interface RegionSetItemRow {
  id: string;
  regionId: string;
  sortOrder: number;
  region: RegionRow;
}

interface RegionSetRow {
  id: string;
  signature: string;
  name: string;
  isActive: boolean;
  items: RegionSetItemRow[];
}

interface PlanContextRow {
  id: string;
  userId: string;
  regionSetId: string;
  title: string;
  currentVersionId: string | null;
  user: {
    id: string;
    name: string;
  };
}

interface UserRow {
  id: string;
  name: string;
}

interface EventOptionRow {
  id: string;
  name: string;
  tourListRentalItem: TourListRentalItem | null;
}

interface PlanRow extends PlanStopRowBase {
  segmentId?: string;
  segmentVersionId?: string;
  overnightStayId?: string;
  overnightStayDayOrder?: number;
  multiDayBlockId?: string;
  multiDayBlockDayOrder?: number;
  multiDayBlockConnectionId?: string;
  multiDayBlockConnectionVersionId?: string;
  lodgingSelectionLevel: LodgingSelectionLevel;
  customLodgingId?: string;
  customLodgingNameSnapshot?: string | null;
}

interface ExtraLodgingRow {
  dayIndex: number;
  lodgingCount: number;
}

type ManualAdjustmentRow = ManualAdjustmentDraftRow;

function createManualAdjustmentDraft(kind: 'ADD' | 'DISCOUNT'): ManualAdjustmentRow {
  return {
    kind,
    title: '',
    chargeScope: 'PER_PERSON',
    personMode: 'SINGLE',
    countValue: '',
    amountKrw: '',
    customDisplayText: '',
  };
}

function createManualAdjustmentDraftFromPreset(preset: ManualAdjustmentPresetOption): ManualAdjustmentRow {
  return {
    kind: preset.kind,
    title: preset.title,
    chargeScope: preset.chargeScope,
    personMode: preset.personMode,
    countValue: preset.personMode === 'PER_DAY' || preset.personMode === 'PER_NIGHT' ? '1' : '',
    amountKrw: String(preset.amountKrw),
    customDisplayText: preset.customDisplayText,
  };
}

function parsePositiveIntString(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function isManualAdjustmentRowBlank(row: ManualAdjustmentRow): boolean {
  return (
    row.title.trim().length === 0 &&
    row.amountKrw.trim().length === 0 &&
    row.customDisplayText.trim().length === 0 &&
    row.countValue.trim().length === 0
  );
}

function isManualAdjustmentRowValid(row: ManualAdjustmentRow): boolean {
  if (isManualAdjustmentRowBlank(row)) {
    return true;
  }

  const title = row.title.trim();
  const amount = parsePositiveIntString(row.amountKrw);
  if (title.length === 0 || amount === null) {
    return false;
  }

  if (row.chargeScope === 'TEAM') {
    return true;
  }

  if (row.personMode === 'SINGLE') {
    return true;
  }

  const countValue = parsePositiveIntString(row.countValue);
  return countValue !== null && countValue >= 1;
}

function toManualAdjustmentInput(row: ManualAdjustmentRow) {
  if (isManualAdjustmentRowBlank(row) || !isManualAdjustmentRowValid(row)) {
    return null;
  }

  const amountKrw = parsePositiveIntString(row.amountKrw);
  if (amountKrw === null) {
    return null;
  }

  const countValue =
    row.chargeScope === 'PER_PERSON' && (row.personMode === 'PER_DAY' || row.personMode === 'PER_NIGHT')
      ? parsePositiveIntString(row.countValue)
      : null;

  return {
    kind: row.kind,
    title: row.title.trim(),
    chargeScope: row.chargeScope,
    personMode: row.chargeScope === 'TEAM' ? null : row.personMode,
    countValue,
    amountKrw,
    customDisplayText: row.customDisplayText.trim() || null,
  };
}

function getManualAdjustmentSignedTotal(row: ManualAdjustmentRow): number | null {
  const normalized = toManualAdjustmentInput(row);
  if (!normalized) {
    return null;
  }
  const sign = normalized.kind === 'DISCOUNT' ? -1 : 1;
  const count =
    normalized.chargeScope === 'TEAM'
      ? 1
      : normalized.personMode === 'PER_DAY' || normalized.personMode === 'PER_NIGHT'
        ? normalized.countValue ?? 1
        : 1;
  return sign * normalized.amountKrw * count;
}

interface PricingLineRow {
  ruleType?: string | null;
  lineCode: string;
  sourceType: 'RULE' | 'MANUAL';
  description: string | null;
  ruleId: string | null;
  unitPriceKrw: number | null;
  quantity: number;
  amountKrw: number;
  displayBasis?: string | null;
  displayLabel?: string | null;
  displayUnitAmountKrw?: number | null;
  displayCount?: number | null;
  displayDivisorPerson?: number | null;
  displayText?: string | null;
  quantityDisplaySuffix?: '박';
  teamOrderIndex?: number | null;
  teamName?: string | null;
  headcount?: number | null;
}

interface PricingPreviewRow {
  policyId: string;
  currencyCode: string;
  baseAmountKrw: number;
  addonAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
  securityDepositQuantity: number;
  securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
  securityDepositEvent: {
    id: string;
    name: string;
  } | null;
  longDistanceSegmentCount: number;
  extraLodgingCount: number;
  teamPricings: TeamPricingRow[];
  lines: PricingLineRow[];
}

interface TeamPricingRow {
  teamOrderIndex: number;
  teamName: string;
  headcount: number;
  baseAmountKrw: number;
  addonAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
  securityDepositQuantity: number;
  securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
  securityDepositEvent: {
    id: string;
    name: string;
  } | null;
  lines: PricingLineRow[];
}

interface OriginalPricingSnapshotRow {
  baseAmountKrw: number;
  addonAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  teamPricings?: Array<{
    teamOrderIndex: number;
    teamName: string;
    headcount: number;
    baseAmountKrw: number;
    addonAmountKrw: number;
    totalAmountKrw: number;
    depositAmountKrw: number;
    balanceAmountKrw: number;
    securityDepositAmountKrw: number;
    securityDepositUnitPriceKrw: number;
    securityDepositQuantity: number;
    securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
  }>;
}

interface ManualPricingLineOverrideRow {
  rowKey: string;
  amountKrw: number;
}

interface ManualPricingAdjustmentLineRow {
  id: string;
  type: 'AUTO' | 'MANUAL';
  rowKey?: string | null;
  teamOrderIndex?: number | null;
  label: string;
  leadAmountKrw: number;
  formula: string;
  strikethrough?: boolean;
  deleted?: boolean;
}

type ManualPricingSecurityDepositMode = 'NONE' | 'PER_PERSON' | 'PER_TEAM';

interface ManualPricingSummaryState {
  baseAmountKrw?: number | null;
  totalAmountKrw?: number | null;
  depositAmountKrw?: number | null;
  balanceAmountKrw?: number | null;
  securityDepositAmountKrw?: number | null;
  /** null/undefined = computed pricing mode 유지 */
  securityDepositMode?: ManualPricingSecurityDepositMode | null;
}

interface ManualPricingTeamSummaryState extends ManualPricingSummaryState {
  teamOrderIndex: number;
}

interface ManualPricingState {
  enabled: boolean;
  adjustmentLines: ManualPricingAdjustmentLineRow[];
  summary?: ManualPricingSummaryState | null;
  teamSummaries?: ManualPricingTeamSummaryState[];
  lineOverrides?: ManualPricingLineOverrideRow[];
}

interface EffectivePricingRow extends PricingPreviewRow {
  originalPricing: OriginalPricingSnapshotRow;
  manualPricing: ManualPricingState | null;
  adjustmentLines: PricingAdjustmentLineRow[];
  teamPricings: EffectiveTeamPricingRow[];
}

interface EffectiveTeamPricingRow extends TeamPricingRow {
  originalPricing: OriginalPricingSnapshotRow['teamPricings'] extends Array<infer T> ? T : never;
  manualPricing: ManualPricingState | null;
  adjustmentLines: PricingAdjustmentLineRow[];
}

function builderTeamPricingRowSummarySignature(row: TeamPricingRow): string {
  return teamPricingSummarySignatureFromParts({
    totalAmountKrw: row.totalAmountKrw,
    depositAmountKrw: row.depositAmountKrw,
    balanceAmountKrw: row.balanceAmountKrw,
    securityNone: row.securityDepositMode === 'NONE',
    securityDepositAmountKrw: row.securityDepositAmountKrw,
    securityDepositUnitKrw: row.securityDepositUnitPriceKrw,
    securityScopeWhenPresent: row.securityDepositMode,
  });
}

function normalizeManualPricingState(value?: ManualPricingState | null): ManualPricingState {
  return {
    enabled: value?.enabled === true,
    adjustmentLines: Array.isArray(value?.adjustmentLines)
      ? value.adjustmentLines.filter(
          (row): row is ManualPricingAdjustmentLineRow =>
            typeof row?.id === 'string' &&
            (row?.type === 'AUTO' || row?.type === 'MANUAL') &&
            (row?.teamOrderIndex == null || Number.isInteger(row?.teamOrderIndex)) &&
            typeof row?.label === 'string' &&
            Number.isInteger(row?.leadAmountKrw) &&
            typeof row?.formula === 'string' &&
            (row.type !== 'AUTO' || typeof row.rowKey === 'string'),
        )
      : [],
    summary:
      value?.summary && typeof value.summary === 'object'
        ? {
            baseAmountKrw: Number.isInteger(value.summary.baseAmountKrw) ? value.summary.baseAmountKrw : null,
            totalAmountKrw: Number.isInteger(value.summary.totalAmountKrw) ? value.summary.totalAmountKrw : null,
            depositAmountKrw: Number.isInteger(value.summary.depositAmountKrw)
              ? value.summary.depositAmountKrw
              : null,
            balanceAmountKrw: Number.isInteger(value.summary.balanceAmountKrw)
              ? value.summary.balanceAmountKrw
              : null,
            securityDepositAmountKrw: Number.isInteger(value.summary.securityDepositAmountKrw)
              ? value.summary.securityDepositAmountKrw
              : null,
            securityDepositMode:
              value.summary.securityDepositMode === 'NONE' ||
              value.summary.securityDepositMode === 'PER_PERSON' ||
              value.summary.securityDepositMode === 'PER_TEAM'
                ? value.summary.securityDepositMode
                : null,
          }
        : null,
    teamSummaries: Array.isArray(value?.teamSummaries)
      ? value.teamSummaries.filter(
          (row): row is ManualPricingTeamSummaryState =>
            Number.isInteger(row?.teamOrderIndex) &&
            (row.baseAmountKrw == null || Number.isInteger(row.baseAmountKrw)) &&
            (row.totalAmountKrw == null || Number.isInteger(row.totalAmountKrw)) &&
            (row.depositAmountKrw == null || Number.isInteger(row.depositAmountKrw)) &&
            (row.balanceAmountKrw == null || Number.isInteger(row.balanceAmountKrw)) &&
            (row.securityDepositAmountKrw == null || Number.isInteger(row.securityDepositAmountKrw)) &&
            (row.securityDepositMode == null ||
              row.securityDepositMode === 'NONE' ||
              row.securityDepositMode === 'PER_PERSON' ||
              row.securityDepositMode === 'PER_TEAM'),
        )
      : [],
    lineOverrides: Array.isArray(value?.lineOverrides)
      ? value.lineOverrides.filter(
          (row): row is ManualPricingLineOverrideRow =>
            typeof row?.rowKey === 'string' && Number.isInteger(row?.amountKrw),
        )
      : [],
  };
}

function createManualPricingLineId(): string {
  return `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 상태에 정수 요약이 있으면 우선하고, 비어 있을 때만 effective(등) 폴백을 씁니다 — 저장 시 계산값이 수동 입력을 덮어쓰지 않도록 */
function mergeManualPricingSummaryFields(
  stateSummary: ManualPricingSummaryState | null | undefined,
  fallback: ManualPricingSummaryState | null | undefined,
): ManualPricingSummaryState | null {
  const pick = (
    k: 'baseAmountKrw' | 'totalAmountKrw' | 'depositAmountKrw' | 'balanceAmountKrw' | 'securityDepositAmountKrw',
  ): number | null => {
    const sv = stateSummary?.[k];
    if (typeof sv === 'number' && Number.isInteger(sv)) return sv;
    const fv = fallback?.[k];
    if (typeof fv === 'number' && Number.isInteger(fv)) return fv;
    return null;
  };

  const pickSecurityMode = (): ManualPricingSecurityDepositMode | null => {
    const sv = stateSummary?.securityDepositMode;
    if (sv === 'NONE' || sv === 'PER_PERSON' || sv === 'PER_TEAM') return sv;
    const fv = fallback?.securityDepositMode;
    if (fv === 'NONE' || fv === 'PER_PERSON' || fv === 'PER_TEAM') return fv;
    return null;
  };

  const merged: ManualPricingSummaryState = {
    baseAmountKrw: pick('baseAmountKrw'),
    totalAmountKrw: pick('totalAmountKrw'),
    depositAmountKrw: pick('depositAmountKrw'),
    balanceAmountKrw: pick('balanceAmountKrw'),
    securityDepositAmountKrw: pick('securityDepositAmountKrw'),
    securityDepositMode: pickSecurityMode(),
  };

  const hasNumeric =
    merged.baseAmountKrw != null ||
    merged.totalAmountKrw != null ||
    merged.depositAmountKrw != null ||
    merged.balanceAmountKrw != null ||
    merged.securityDepositAmountKrw != null;
  const hasAny = hasNumeric || merged.securityDepositMode != null;
  return hasAny ? merged : null;
}

function toManualPricingSnapshot(
  value: ManualPricingState,
  summaryFallback?: ManualPricingSummaryState | null,
): PricingManualSnapshot {
  const stateSummary = value.summary && typeof value.summary === 'object' ? value.summary : null;
  const merged = mergeManualPricingSummaryFields(stateSummary, summaryFallback);
  return {
    enabled: value.enabled,
    adjustmentLines: value.adjustmentLines.map((row) => ({
      id: row.id,
      type: row.type,
      rowKey: row.type === 'AUTO' ? row.rowKey ?? null : null,
      teamOrderIndex: row.teamOrderIndex ?? null,
      label: row.label,
      leadAmountKrw: row.leadAmountKrw,
      formula: row.formula,
      strikethrough: row.strikethrough === true,
      deleted: row.deleted === true,
    })),
    summary:
      merged
        ? {
            baseAmountKrw: merged.baseAmountKrw ?? null,
            totalAmountKrw: merged.totalAmountKrw ?? null,
            depositAmountKrw: merged.depositAmountKrw ?? null,
            balanceAmountKrw: merged.balanceAmountKrw ?? null,
            securityDepositAmountKrw: merged.securityDepositAmountKrw ?? null,
            securityDepositMode: merged.securityDepositMode ?? null,
          }
        : null,
    teamSummaries: (value.teamSummaries ?? []).map((summary) => ({
      teamOrderIndex: summary.teamOrderIndex,
      baseAmountKrw: Number.isInteger(summary.baseAmountKrw) ? summary.baseAmountKrw : null,
      totalAmountKrw: Number.isInteger(summary.totalAmountKrw) ? summary.totalAmountKrw : null,
      depositAmountKrw: Number.isInteger(summary.depositAmountKrw) ? summary.depositAmountKrw : null,
      balanceAmountKrw: Number.isInteger(summary.balanceAmountKrw) ? summary.balanceAmountKrw : null,
      securityDepositAmountKrw: Number.isInteger(summary.securityDepositAmountKrw)
        ? summary.securityDepositAmountKrw
        : null,
      securityDepositMode:
        summary.securityDepositMode === 'NONE' ||
        summary.securityDepositMode === 'PER_PERSON' ||
        summary.securityDepositMode === 'PER_TEAM'
          ? summary.securityDepositMode
          : null,
    })),
    lineOverrides: (value.lineOverrides ?? []).map((row) => ({
      rowKey: row.rowKey,
      amountKrw: row.amountKrw,
    })),
  };
}

function createManualPricingAdjustmentLine(): ManualPricingAdjustmentLineRow {
  return {
    id: createManualPricingLineId(),
    type: 'MANUAL',
    teamOrderIndex: null,
    label: '',
    leadAmountKrw: 0,
    formula: '',
    strikethrough: false,
    deleted: false,
  };
}

/** 수동 금액(추가·할인) 입력: '-'만 있는 중간 상태 허용 */
const MANUAL_PRICING_ADJUSTMENT_AMOUNT_INPUT_PATTERN = /^-?\d*$/;

function commitManualPricingAdjustmentAmountInput(raw: string): number {
  if (raw === '' || raw === '-') {
    return 0;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : 0;
}

function upsertManualPricingAutoOverride(
  current: ManualPricingState,
  line: PricingAdjustmentLineRow,
  patch: Partial<
    Pick<
      ManualPricingAdjustmentLineRow,
      'label' | 'leadAmountKrw' | 'formula' | 'strikethrough' | 'deleted' | 'teamOrderIndex'
    >
  >,
): ManualPricingState {
  if (!line.rowKey) {
    return current;
  }
  const existingIndex = current.adjustmentLines.findIndex((row) => row.type === 'AUTO' && row.rowKey === line.rowKey);
  const existing = existingIndex >= 0 ? current.adjustmentLines[existingIndex] : null;
  const nextRow: ManualPricingAdjustmentLineRow = {
    id: existing?.id ?? line.id,
    type: 'AUTO',
    rowKey: line.rowKey,
    teamOrderIndex: patch.teamOrderIndex ?? existing?.teamOrderIndex ?? line.teamOrderIndex ?? null,
    label: patch.label ?? existing?.label ?? line.label,
    leadAmountKrw: patch.leadAmountKrw ?? existing?.leadAmountKrw ?? line.leadAmountKrw,
    formula: patch.formula ?? existing?.formula ?? line.formula,
    strikethrough: patch.strikethrough ?? existing?.strikethrough ?? line.strikethrough ?? false,
    deleted: patch.deleted ?? existing?.deleted ?? false,
  };
  const matchesAuto =
    nextRow.deleted !== true &&
    nextRow.label === (line.autoLabel ?? line.label) &&
    nextRow.leadAmountKrw === (line.autoLeadAmountKrw ?? line.leadAmountKrw) &&
    nextRow.formula === (line.autoFormula ?? line.formula) &&
    nextRow.strikethrough !== true;

  if (matchesAuto) {
    return {
      ...current,
      adjustmentLines: current.adjustmentLines.filter((row) => !(row.type === 'AUTO' && row.rowKey === line.rowKey)),
    };
  }

  if (existingIndex < 0) {
    return {
      ...current,
      adjustmentLines: [...current.adjustmentLines, nextRow],
    };
  }

  return {
    ...current,
    adjustmentLines: current.adjustmentLines.map((row, index) =>
      index === existingIndex ? nextRow : row,
    ),
  };
}

function updateManualPricingCustomLine(
  current: ManualPricingState,
  id: string,
  patch: Partial<
    Pick<ManualPricingAdjustmentLineRow, 'label' | 'leadAmountKrw' | 'formula' | 'strikethrough' | 'teamOrderIndex'>
  >,
): ManualPricingState {
  return {
    ...current,
    adjustmentLines: current.adjustmentLines.map((row) =>
      row.type === 'MANUAL' && row.id === id ? { ...row, ...patch } : row,
    ),
  };
}

function removeManualPricingCustomLine(current: ManualPricingState, id: string): ManualPricingState {
  return {
    ...current,
    adjustmentLines: current.adjustmentLines.filter((row) => !(row.type === 'MANUAL' && row.id === id)),
  };
}

function restoreManualPricingAutoLine(current: ManualPricingState, rowKey: string): ManualPricingState {
  return {
    ...current,
    adjustmentLines: current.adjustmentLines.filter((row) => !(row.type === 'AUTO' && row.rowKey === rowKey)),
  };
}

function setManualPricingSummaryValue(
  current: ManualPricingState,
  field: keyof ManualPricingSummaryState,
  value: number,
): ManualPricingState {
  return {
    ...current,
    summary: {
      ...(current.summary ?? {}),
      [field]: value,
    },
  };
}

function hasManualBaseAmountOverride(manual: ManualPricingState): boolean {
  if (Number.isInteger(manual.summary?.baseAmountKrw)) {
    return true;
  }
  return (manual.teamSummaries ?? []).some((row) => Number.isInteger(row.baseAmountKrw));
}

/** 수동 기본금 핀을 해제해 현재 자동 계산값을 다시 따르게 한다. */
function resetManualPricingBaseAmount(current: ManualPricingState): ManualPricingState {
  const nextSummary =
    current.summary != null
      ? {
          ...current.summary,
          baseAmountKrw: null,
        }
      : null;
  const nextTeamSummaries = (current.teamSummaries ?? []).map((row) => ({
    ...row,
    baseAmountKrw: null,
  }));
  return {
    ...current,
    summary: nextSummary,
    teamSummaries: nextTeamSummaries,
  };
}

function hasManualSecurityDepositOverride(manual: ManualPricingState): boolean {
  if (Number.isInteger(manual.summary?.securityDepositAmountKrw)) {
    return true;
  }
  if (
    manual.summary?.securityDepositMode === 'NONE' ||
    manual.summary?.securityDepositMode === 'PER_PERSON' ||
    manual.summary?.securityDepositMode === 'PER_TEAM'
  ) {
    return true;
  }
  return (manual.teamSummaries ?? []).some(
    (row) =>
      Number.isInteger(row.securityDepositAmountKrw) ||
      row.securityDepositMode === 'NONE' ||
      row.securityDepositMode === 'PER_PERSON' ||
      row.securityDepositMode === 'PER_TEAM',
  );
}

/** 수동 보증금 핀을 해제해 참여 이벤트·기본 물품 기준 자동 계산을 다시 따르게 한다. */
function resetManualPricingSecurityDeposit(current: ManualPricingState): ManualPricingState {
  const nextSummary =
    current.summary != null
      ? {
          ...current.summary,
          securityDepositAmountKrw: null,
          securityDepositMode: null,
        }
      : null;
  const nextTeamSummaries = (current.teamSummaries ?? []).map((row) => ({
    ...row,
    securityDepositAmountKrw: null,
    securityDepositMode: null,
  }));
  return {
    ...current,
    summary: nextSummary,
    teamSummaries: nextTeamSummaries,
  };
}

function setManualPricingTeamSummaryValue(
  current: ManualPricingState,
  teamOrderIndex: number,
  field: keyof ManualPricingSummaryState,
  value: number,
): ManualPricingState {
  const existing = (current.teamSummaries ?? []).find((item) => item.teamOrderIndex === teamOrderIndex);
  const nextRow: ManualPricingTeamSummaryState = {
    teamOrderIndex,
    ...(existing ?? {}),
    [field]: value,
  };
  const nextTeamSummaries =
    existing == null
      ? [...(current.teamSummaries ?? []), nextRow]
      : (current.teamSummaries ?? []).map((item) => (item.teamOrderIndex === teamOrderIndex ? nextRow : item));
  return {
    ...current,
    teamSummaries: nextTeamSummaries,
  };
}

function setManualPricingAllTeamSummariesValue(
  current: ManualPricingState,
  teamOrderIndexes: number[],
  field: keyof ManualPricingSummaryState,
  value: number,
): ManualPricingState {
  return teamOrderIndexes.reduce(
    (state, teamOrderIndex) => setManualPricingTeamSummaryValue(state, teamOrderIndex, field, value),
    current,
  );
}

/** 항공/픽업 팀 삭제 후 teamOrderIndex가 한 칸씩 당겨지므로 수동 금액 상태를 같이 맞춘다. */
function remapManualPricingAfterTransportGroupRemoved(
  manual: ManualPricingState,
  removedIndex: number,
): ManualPricingState {
  const nextTeamSummaries = (manual.teamSummaries ?? [])
    .filter((s) => s.teamOrderIndex !== removedIndex)
    .map((s) =>
      s.teamOrderIndex > removedIndex ? { ...s, teamOrderIndex: s.teamOrderIndex - 1 } : s,
    );

  const nextAdjustmentLines: ManualPricingAdjustmentLineRow[] = [];
  for (const line of manual.adjustmentLines) {
    const ti = line.teamOrderIndex;
    if (ti === removedIndex) {
      if (line.type === 'MANUAL') {
        continue;
      }
      nextAdjustmentLines.push({ ...line, teamOrderIndex: null });
      continue;
    }
    if (ti != null && ti > removedIndex) {
      nextAdjustmentLines.push({ ...line, teamOrderIndex: ti - 1 });
      continue;
    }
    nextAdjustmentLines.push(line);
  }

  return {
    ...manual,
    teamSummaries: nextTeamSummaries,
    adjustmentLines: nextAdjustmentLines,
  };
}

function setManualPricingSummarySecurityDepositMode(
  current: ManualPricingState,
  mode: 'PER_PERSON' | 'PER_TEAM',
): ManualPricingState {
  return {
    ...current,
    summary: {
      ...(current.summary ?? {}),
      securityDepositMode: mode,
    },
  };
}

function setManualPricingTeamSummarySecurityDepositMode(
  current: ManualPricingState,
  teamOrderIndex: number,
  mode: 'PER_PERSON' | 'PER_TEAM',
): ManualPricingState {
  const existing = (current.teamSummaries ?? []).find((item) => item.teamOrderIndex === teamOrderIndex);
  const nextRow: ManualPricingTeamSummaryState = {
    teamOrderIndex,
    ...(existing ?? {}),
    securityDepositMode: mode,
  };
  const nextTeamSummaries =
    existing == null
      ? [...(current.teamSummaries ?? []), nextRow]
      : (current.teamSummaries ?? []).map((item) => (item.teamOrderIndex === teamOrderIndex ? nextRow : item));
  return {
    ...current,
    teamSummaries: nextTeamSummaries,
  };
}

function setManualPricingAllTeamSummariesSecurityDepositMode(
  current: ManualPricingState,
  teamOrderIndexes: number[],
  mode: 'PER_PERSON' | 'PER_TEAM',
): ManualPricingState {
  return teamOrderIndexes.reduce(
    (state, teamOrderIndex) => setManualPricingTeamSummarySecurityDepositMode(state, teamOrderIndex, mode),
    current,
  );
}

interface PricingPolicyManualPresetRuleRow {
  id: string;
  priceItemPreset: 'MANUAL_PRESET';
  title: string;
  amountKrw?: number | null;
  chargeScope?: 'TEAM' | 'PER_PERSON' | null;
  personMode?: 'SINGLE' | 'PER_DAY' | 'PER_NIGHT' | null;
  customDisplayText?: string | null;
  isEnabled: boolean;
}

interface PricingPolicyManualPresetQueryRow {
  pricingPolicy: {
    id: string;
    rules: PricingPolicyManualPresetRuleRow[];
  } | null;
}

interface PlanTemplateStopRow {
  id: string;
  dayIndex: number;
  segmentId: string | null;
  segmentVersionId: string | null;
  overnightStayId: string | null;
  overnightStayDayOrder: number | null;
  multiDayBlockId: string | null;
  multiDayBlockDayOrder: number | null;
  multiDayBlockConnectionId: string | null;
  multiDayBlockConnectionVersionId: string | null;
  locationId: string | null;
  locationVersionId: string | null;
  location?: { id: string; name: string[] } | null;
  locationVersion?: { id: string; label: string; versionNumber: number } | null;
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5' | null;
  lodgingSelectionLevel?: LodgingSelectionLevel | null;
  customLodgingId?: string | null;
  customLodgingNameSnapshot?: string | null;
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
}

interface PlanTemplateRow {
  id: string;
  name: string;
  description: string | null;
  regionSetId: string;
  totalDays: number;
  sortOrder: number;
  isActive: boolean;
  planStops: PlanTemplateStopRow[];
}

interface PlaceFieldProps {
  label: string;
  placeType: PickupDropPlaceType;
  customText: string;
  onPlaceTypeChange: (value: PickupDropPlaceType) => void;
  onCustomTextChange: (value: string) => void;
}

type DatePickerTarget =
  | { kind: 'travelStartDate'; anchorEl: HTMLButtonElement }
  | { kind: 'travelEndDate'; anchorEl: HTMLButtonElement }
  | { kind: 'flightInDate'; index: number; anchorEl: HTMLButtonElement }
  | { kind: 'flightOutDate'; index: number; anchorEl: HTMLButtonElement }
  | { kind: 'pickupDate'; index: number; anchorEl: HTMLButtonElement }
  | { kind: 'dropDate'; index: number; anchorEl: HTMLButtonElement };

type TimePickerTarget =
  | { kind: 'flightInTime'; index: number; anchorEl: HTMLButtonElement }
  | { kind: 'flightOutTime'; index: number; anchorEl: HTMLButtonElement }
  | { kind: 'pickupTime'; index: number; anchorEl: HTMLButtonElement }
  | { kind: 'dropTime'; index: number; anchorEl: HTMLButtonElement };

interface ExternalTransferModalState {
  open: boolean;
  editingIndex: number | null;
}

interface ExternalTransfersManagerModalState {
  open: boolean;
}

interface LodgingSelectionModalState {
  open: boolean;
  rowIndex: number | null;
}

interface LodgingUpgradeModalState {
  open: boolean;
  focusPlanRowIndex: number | null;
}

interface SpecialMealsModalState {
  open: boolean;
}

interface ManualAdjustmentsModalState {
  open: boolean;
}

interface ExtraLodgingsModalState {
  open: boolean;
}

interface DateInputTriggerProps {
  value: string;
  placeholder?: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

interface TimeInputTriggerProps {
  value: string;
  placeholder?: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

function arePlanRowsEqual(left: PlanRow[], right: PlanRow[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((row, index) => {
    const other = right[index];
    if (!other) {
      return false;
    }

    return (
      row.segmentId === other.segmentId &&
      row.segmentVersionId === other.segmentVersionId &&
      row.overnightStayId === other.overnightStayId &&
      row.overnightStayDayOrder === other.overnightStayDayOrder &&
      row.rowType === other.rowType &&
      row.locationId === other.locationId &&
      row.locationVersionId === other.locationVersionId &&
      row.movementIntensity === other.movementIntensity &&
      row.lodgingSelectionLevel === other.lodgingSelectionLevel &&
      row.customLodgingId === other.customLodgingId &&
      row.customLodgingNameSnapshot === other.customLodgingNameSnapshot &&
      row.dateCellText === other.dateCellText &&
      row.destinationCellText === other.destinationCellText &&
      row.timeCellText === other.timeCellText &&
      row.scheduleCellText === other.scheduleCellText &&
      row.lodgingCellText === other.lodgingCellText &&
      row.mealCellText === other.mealCellText
    );
  });
}

const PRESERVED_PLAN_ROW_FIELDS: Array<keyof PlanRow> = [
  'dateCellText',
  'destinationCellText',
  'timeCellText',
  'scheduleCellText',
  'mealCellText',
  'lodgingSelectionLevel',
  'customLodgingId',
  'customLodgingNameSnapshot',
  'lodgingCellText',
];

function getDirtyPlanRowFieldKey(rowIndex: number, field: keyof PlanRow): string {
  return `${rowIndex}:${field}`;
}

function isSamePlanRowSource(left: PlanRow | undefined, right: PlanRow | undefined): boolean {
  if (!left || !right) {
    return false;
  }

  return (
    left.segmentId === right.segmentId &&
    left.segmentVersionId === right.segmentVersionId &&
    left.overnightStayId === right.overnightStayId &&
    left.overnightStayDayOrder === right.overnightStayDayOrder &&
    left.multiDayBlockId === right.multiDayBlockId &&
    left.multiDayBlockDayOrder === right.multiDayBlockDayOrder &&
    left.multiDayBlockConnectionId === right.multiDayBlockConnectionId &&
    left.multiDayBlockConnectionVersionId === right.multiDayBlockConnectionVersionId &&
    left.rowType === right.rowType &&
    left.locationId === right.locationId &&
    left.locationVersionId === right.locationVersionId &&
    left.movementIntensity === right.movementIntensity
  );
}

function planRowHasRouteStructure(row: PlanRow): boolean {
  return Boolean(
    row.segmentId ||
      row.segmentVersionId ||
      row.multiDayBlockId ||
      row.multiDayBlockConnectionId ||
      row.overnightStayId ||
      row.locationId,
  );
}

/** 자동 생성 행이 목적지/구간 정보 없이 비어 있을 때 (플레이스홀더 등) */
function isVacuousMainPlanAutoRow(row: PlanRow): boolean {
  if (row.rowType === 'EXTERNAL_TRANSFER') {
    return false;
  }
  return !planRowHasRouteStructure(row);
}

/** 자동 행이 일정표에 찍을 표면 텍스트가 거의 없을 때 */
function planRowMissingScheduleSurface(row: PlanRow): boolean {
  return (
    !(row.destinationCellText?.trim()) &&
    !(row.scheduleCellText?.trim()) &&
    !(row.timeCellText?.trim())
  );
}

function planRowHasScheduleSurface(row: PlanRow): boolean {
  return (
    Boolean(row.destinationCellText?.trim()) ||
    Boolean(row.scheduleCellText?.trim()) ||
    Boolean(row.timeCellText?.trim())
  );
}

function mergeAutoRowsWithDirtyValues(
  current: PlanRow[],
  autoRows: PlanRow[],
  dirtyFieldKeys: Set<string>,
): PlanRow[] {
  const mainPhysicalIndexes = buildMainPlanRowPhysicalIndexes(current);

  const mergedMainRows = autoRows.map((autoRow, mainIndex) => {
    const physicalIndex = mainPhysicalIndexes[mainIndex];
    const currentRow = physicalIndex !== undefined ? current[physicalIndex] : undefined;

    if (!currentRow || !isSamePlanRowSource(currentRow, autoRow)) {
      if (
        currentRow &&
        isVacuousMainPlanAutoRow(autoRow) &&
        planRowHasRouteStructure(currentRow)
      ) {
        return currentRow;
      }
      if (
        currentRow &&
        planRowHasRouteStructure(currentRow) &&
        planRowHasScheduleSurface(currentRow) &&
        planRowMissingScheduleSurface(autoRow)
      ) {
        return currentRow;
      }
      return autoRow;
    }

    const mergedRow = { ...autoRow };
    const dirtyRowIndex = physicalIndex ?? mainIndex;
    for (const field of PRESERVED_PLAN_ROW_FIELDS) {
      if (dirtyFieldKeys.has(getDirtyPlanRowFieldKey(dirtyRowIndex, field))) {
        (mergedRow as Record<string, unknown>)[field] = currentRow[field];
      }
    }
    return mergedRow;
  });

  if (mainPhysicalIndexes.length === 0) {
    return mergedMainRows.length > 0 ? mergedMainRows : current;
  }

  const result: PlanRow[] = [];
  let mergedMainIndex = 0;
  for (let physicalIndex = 0; physicalIndex < current.length; physicalIndex += 1) {
    const row = current[physicalIndex]!;
    if (!isMainPlanStopRow(row)) {
      result.push(row);
      continue;
    }
    if (mergedMainIndex < mergedMainRows.length) {
      result.push(mergedMainRows[mergedMainIndex]!);
      mergedMainIndex += 1;
    }
  }
  while (mergedMainIndex < mergedMainRows.length) {
    result.push(mergedMainRows[mergedMainIndex]!);
    mergedMainIndex += 1;
  }
  return result;
}

const REGION_SETS_QUERY = gql`
  query ItineraryRegionSets($includeInactive: Boolean) {
    regionSets(includeInactive: $includeInactive) {
      id
      signature
      name
      isActive
      items {
        id
        regionId
        sortOrder
        region {
          id
          name
        }
      }
    }
  }
`;

const REGIONS_FIRST_DAY_BOOST_QUERY = gql`
  query ItineraryBuilderRegionsFirstDayBoost {
    regions {
      id
      alwaysIncludeFirstDayStart
    }
  }
`;

const PLAN_CONTEXT_QUERY = gql`
  query BuilderPlanContext($id: ID!) {
    plan(id: $id) {
      id
      userId
      regionSetId
      title
      currentVersionId
      user {
        id
        name
      }
    }
  }
`;

const USER_QUERY = gql`
  query BuilderUser($id: ID!) {
    user(id: $id) {
      id
      name
    }
  }
`;

const EVENTS_QUERY = gql`
  query BuilderEvents($activeOnly: Boolean) {
    events(activeOnly: $activeOnly) {
      id
      name
      tourListRentalItem
    }
  }
`;

const REGION_LODGINGS_QUERY = gql`
  query BuilderRegionLodgings($regionSetId: ID, $activeOnly: Boolean) {
    regionLodgings(regionSetId: $regionSetId, activeOnly: $activeOnly) {
      id
      regionId
      name
      subtitle
      priceKrw
      pricePerPersonKrw
      pricePerTeamKrw
      isActive
      sortOrder
    }
  }
`;

const LOCATIONS_QUERY = gql`
  query ItineraryLocations($regionSetId: ID) {
    locations(regionSetId: $regionSetId) {
      id
      regionId
      name
      isFirstDayEligible
      isLastDayEligible
      defaultVersionId
      defaultVersion {
        id
        versionNumber
        label
      }
      variations {
        id
        versionNumber
        label
        firstDayAverageDistanceKm
        firstDayAverageTravelHours
        firstDayMovementIntensity
        lodgings {
          id
          name
          hasElectricity
          hasShower
          hasInternet
        }
        mealSets {
          id
          setName
          breakfast
          lunch
          dinner
        }
        firstDayTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        firstDayEarlyTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
      }
    }
  }
`;

const SEGMENTS_QUERY = gql`
  query ItinerarySegments($regionSetId: ID) {
    segments(regionSetId: $regionSetId) {
      id
      regionId
      fromLocationId
      toLocationId
      defaultVersionId
      averageDistanceKm
      averageTravelHours
      movementIntensity
      isLongDistance
      scheduleTimeBlocks {
        id
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      extendScheduleTimeBlocks {
        id
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      versions {
        id
        segmentId
        name
        averageDistanceKm
        averageTravelHours
        movementIntensity
        isLongDistance
        kind
        startDate
        endDate
        flightOutTimeBand
        lodgingOverride {
          isUnspecified
          name
          hasElectricity
          hasShower
          hasInternet
        }
        mealsOverride {
          breakfast
          lunch
          dinner
        }
        sortOrder
        isDefault
        scheduleTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        extendScheduleTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
      }
    }
  }
`;

const OVERNIGHT_STAYS_QUERY = gql`
  query ItineraryMultiDayBlocks($regionSetId: ID) {
    multiDayBlocks(regionSetId: $regionSetId) {
      id
      regionId
      regionIds
      locationId
      name
      title
      isNightTrain
      isActive
      sortOrder
      days {
        id
        dayOrder
        displayLocationId
        averageDistanceKm
        averageTravelHours
        movementIntensity
        timeCellText
        scheduleCellText
        lodgingCellText
        mealCellText
      }
    }
  }
`;

const MULTI_DAY_BLOCK_CONNECTIONS_QUERY = gql`
  query ItineraryMultiDayBlockConnections($regionSetId: ID) {
    multiDayBlockConnections(regionSetId: $regionSetId) {
      id
      regionId
      fromMultiDayBlockId
      toLocationId
      defaultVersionId
      averageDistanceKm
      averageTravelHours
      movementIntensity
      isLongDistance
      scheduleTimeBlocks {
        id
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      extendScheduleTimeBlocks {
        id
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      versions {
        id
        multiDayBlockConnectionId
        name
        averageDistanceKm
        averageTravelHours
        movementIntensity
        isLongDistance
        sortOrder
        isDefault
        scheduleTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        extendScheduleTimeBlocks {
          id
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
      }
    }
  }
`;

const PLAN_TEMPLATES_QUERY = gql`
  query ItineraryBuilderTemplates($regionSetId: ID, $totalDays: Int, $activeOnly: Boolean) {
    planTemplates(regionSetId: $regionSetId, totalDays: $totalDays, activeOnly: $activeOnly) {
      id
      name
      description
      regionSetId
      totalDays
      sortOrder
      isActive
      planStops {
        id
        dayIndex
        segmentId
        segmentVersionId
        overnightStayId: multiDayBlockId
        overnightStayDayOrder: multiDayBlockDayOrder
        multiDayBlockId
        multiDayBlockDayOrder
        multiDayBlockConnectionId
        multiDayBlockConnectionVersionId
        locationId
        locationVersionId
        dateCellText
        destinationCellText
        movementIntensity
        timeCellText
        scheduleCellText
        lodgingCellText
        mealCellText
      }
    }
  }
`;

const PLAN_TEMPLATE_QUERY = gql`
  query ItineraryBuilderTemplate($id: ID!) {
    planTemplate(id: $id) {
      id
      name
      description
      regionSetId
      totalDays
      sortOrder
      isActive
      planStops {
        id
        dayIndex
        segmentId
        segmentVersionId
        overnightStayId: multiDayBlockId
        overnightStayDayOrder: multiDayBlockDayOrder
        multiDayBlockId
        multiDayBlockDayOrder
        multiDayBlockConnectionId
        multiDayBlockConnectionVersionId
        locationId
        locationVersionId
        dateCellText
        destinationCellText
        movementIntensity
        timeCellText
        scheduleCellText
        lodgingCellText
        mealCellText
        location {
          id
          name
        }
        locationVersion {
          id
          label
          versionNumber
        }
      }
    }
  }
`;

const CREATE_PLAN_MUTATION = gql`
  mutation CreatePlanFromBuilder($input: PlanCreateInput!) {
    createPlan(input: $input) {
      id
      currentVersionId
    }
  }
`;

const CREATE_PLAN_VERSION_MUTATION = gql`
  mutation CreatePlanVersionFromBuilder($input: PlanVersionCreateInput!) {
    createPlanVersion(input: $input) {
      id
      versionNumber
    }
  }
`;

const CREATE_USER_MUTATION = gql`
  mutation CreateUserFromBuilder($input: UserCreateInput!) {
    createUser(input: $input) {
      id
      name
    }
  }
`;

const PLAN_PRICING_PREVIEW_QUERY = gql`
  query PlanPricingPreviewFromBuilder($input: PlanPricingPreviewInput!) {
    planPricingPreview(input: $input) {
      policyId
      currencyCode
      baseAmountKrw
      addonAmountKrw
      totalAmountKrw
      depositAmountKrw
      balanceAmountKrw
      securityDepositAmountKrw
      securityDepositUnitPriceKrw
      securityDepositQuantity
      securityDepositMode
      securityDepositEvent {
        id
        name
      }
      longDistanceSegmentCount
      extraLodgingCount
      teamPricings {
        teamOrderIndex
        teamName
        headcount
        baseAmountKrw
        addonAmountKrw
        totalAmountKrw
        depositAmountKrw
        balanceAmountKrw
        securityDepositAmountKrw
        securityDepositUnitPriceKrw
        securityDepositQuantity
        securityDepositMode
        securityDepositEvent {
          id
          name
        }
        lines {
          ruleType
          lineCode
          sourceType
          description
          ruleId
          unitPriceKrw
          quantity
          amountKrw
          displayBasis
          displayLabel
          displayUnitAmountKrw
          displayCount
          displayDivisorPerson
          displayText
          teamOrderIndex
          teamName
          headcount
        }
      }
      lines {
        ruleType
        lineCode
        sourceType
        description
        ruleId
        unitPriceKrw
        quantity
        amountKrw
        displayBasis
        displayLabel
        displayUnitAmountKrw
        displayCount
        displayDivisorPerson
        displayText
        teamOrderIndex
        teamName
        headcount
      }
    }
  }
`;

const PRICING_POLICY_MANUAL_PRESETS_QUERY = gql`
  query PricingPolicyManualPresetsFromBuilder($id: ID!) {
    pricingPolicy(id: $id) {
      id
      rules {
        id
        priceItemPreset
        title
        amountKrw
        chargeScope
        personMode
        customDisplayText
        isEnabled
      }
    }
  }
`;

const VARIANTS = [
  { id: VariantType.Basic, label: '기본' },
  { id: VariantType.Afternoon, label: '오후' },
  { id: VariantType.Extend, label: '연장' },
  { id: VariantType.Early, label: '얼리' },
  { id: VariantType.EarlyExtend, label: '얼리+연장' },
];

const PLAN_VEHICLES = PLAN_VEHICLE_TYPES;
const FLIGHT_IN_TIME_OPTIONS = [
  '00:05',
  '00:30',
  '00:50',
  '02:45',
  '04:30',
  '11:10',
  '12:40',
  '13:20',
  '17:00',
  '18:10',
  '23:05',
  '23:30',
] as const;
const FLIGHT_OUT_TIME_OPTIONS = [
  '00:25',
  '00:50',
  '01:30',
  '01:50',
  '02:05',
  '08:40',
  '11:00',
  '13:00',
  '13:40',
  '14:50',
  '18:15',
  '20:30',
] as const;
/** 여행 기간 선택(또는 새 팀 추가) 시 IN/OUT 자동 맞춤에만 사용하는 추천 시각 — 「미정」또는 직접 수정 후에는 재적용되지 않음 */
const PICKUP_DROP_TIME_OPTIONS = [
  '04:00',
  '05:00',
  '08:00',
  '15:30',
  '19:00',
  '21:00',
  '23:00',
] as const;
const HALF_HOUR_MINUTE_OPTIONS = [0, 30] as const;

function toIsoDateTime(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function isFlightInPairComplete(group: Pick<EstimateTransportGroup, 'flightInDate' | 'flightInTime'>): boolean {
  const d = group.flightInDate?.trim() ?? '';
  const t = group.flightInTime?.trim() ?? '';
  return Boolean(d && t);
}

function isFlightOutPairComplete(group: Pick<EstimateTransportGroup, 'flightOutDate' | 'flightOutTime'>): boolean {
  const d = group.flightOutDate?.trim() ?? '';
  const t = group.flightOutTime?.trim() ?? '';
  return Boolean(d && t);
}

/** GraphQL/서버 계약: IN/OUT은 날짜·시간 완전 쌍일 때만 필드를 보냅니다. */
function mapTransportGroupToPlanMutationInput(group: EstimateTransportGroup) {
  const inC = isFlightInPairComplete(group);
  const outC = isFlightOutPairComplete(group);
  return {
    teamName: group.teamName.trim(),
    headcount: group.headcount,
    ...(inC
      ? { flightInDate: toIsoDateTime(group.flightInDate.trim()), flightInTime: group.flightInTime.trim() }
      : {}),
    ...(outC
      ? {
          flightOutDate: toIsoDateTime(group.flightOutDate.trim()),
          flightOutTime: group.flightOutTime.trim(),
        }
      : {}),
    pickupDate: group.pickupDate?.trim() ? toIsoDateTime(group.pickupDate.trim()) : undefined,
    pickupTime: group.pickupTime.trim() || undefined,
    pickupPlaceType: group.pickupPlaceType,
    pickupPlaceCustomText: normalizePickupDropCustomText(group.pickupPlaceType, group.pickupPlaceCustomText),
    dropDate: group.dropDate?.trim() ? toIsoDateTime(group.dropDate.trim()) : undefined,
    dropTime: group.dropTime.trim() || undefined,
    dropPlaceType: group.dropPlaceType,
    dropPlaceCustomText: normalizePickupDropCustomText(group.dropPlaceType, group.dropPlaceCustomText),
  };
}

function primaryMetaFlightFields(primary: EstimateTransportGroup | undefined): {
  flightInTime?: string;
  flightOutTime?: string;
} {
  if (!primary) {
    return {};
  }
  const inC = isFlightInPairComplete(primary);
  const outC = isFlightOutPairComplete(primary);
  return {
    ...(inC ? { flightInTime: primary.flightInTime.trim() } : {}),
    ...(outC ? { flightOutTime: primary.flightOutTime.trim() } : {}),
  };
}

function toAutoTravelEndDate(startDate: string, totalDays: number): string {
  if (!startDate) {
    return '';
  }

  const [yearText, monthText, dayText] = startDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return '';
  }

  const daysToAdd = Math.max(totalDays - 1, 0);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + daysToAdd);

  const yyyy = utcDate.getUTCFullYear();
  const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildDefaultPlanTitle(leaderName: string): string {
  const trimmedLeaderName = leaderName.trim();
  return trimmedLeaderName ? `${trimmedLeaderName} - 여행일정` : '고객명 - 여행일정';
}

function buildDefaultMaleHeadcount(total: number): number {
  return Math.ceil(Math.max(1, total) / 2);
}

export function buildRentalItemsTextForHeadcountChange(input: {
  includeRentalItems: boolean;
  currentText: string;
  nextTotal: number;
  preset: RentalItemPreset;
}): string {
  if (!input.includeRentalItems) {
    return input.currentText;
  }
  return renderRentalItemPresetText(input.preset, input.nextTotal);
}

function formatKrw(value: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}

function formatSignedKrw(value: number): string {
  return value > 0 ? `+${formatKrw(value)}` : value < 0 ? `-${formatKrw(Math.abs(value))}` : formatKrw(0);
}

function mutationErrorMessages(error: unknown): string[] {
  if (error instanceof ApolloError) {
    const fromGql = error.graphQLErrors
      .map((e) => e.message?.trim())
      .filter((m): m is string => Boolean(m && m.length > 0));
    if (fromGql.length > 0) {
      return [...new Set(fromGql)];
    }
    const net = error.networkError;
    if (net && typeof net === 'object' && 'message' in net && typeof (net as { message: unknown }).message === 'string') {
      const msg = String((net as { message: string }).message).trim();
      if (msg) {
        return [msg];
      }
    }
    if (error.message.trim()) {
      return [error.message.trim()];
    }
    return ['요청에 실패했습니다.'];
  }
  if (error instanceof Error && error.message.trim()) {
    return [error.message.trim()];
  }
  return ['알 수 없는 오류가 발생했습니다.'];
}

/** 부모 클론 후 사용자가 루트를 바꿨는지 비교용 */
function serializeSelectedRouteBaseline(route: RouteSelection[]): string {
  return JSON.stringify(
    route.map((stop) =>
      stop.kind === 'MULTI_DAY_BLOCK'
        ? {
            k: 'B',
            b: stop.multiDayBlockId,
            n: stop.stayLength,
            l: stop.locationId,
            v: stop.locationVersionId,
          }
        : {
            k: 'L',
            l: stop.locationId,
            v: stop.locationVersionId,
            seg: stop.segmentId ?? '',
            sv: stop.segmentVersionId ?? '',
            mc: stop.multiDayBlockConnectionId ?? '',
            mcv: stop.multiDayBlockConnectionVersionId ?? '',
          },
    ),
  );
}

function cloneExternalTransfer(transfer: ExternalTransfer): ExternalTransfer {
  return {
    ...transfer,
    selectedTeamOrderIndexes: [...transfer.selectedTeamOrderIndexes],
  };
}

function formatSecurityDepositScope(mode: 'NONE' | 'PER_PERSON' | 'PER_TEAM'): string {
  if (mode === 'PER_TEAM') {
    return '팀당';
  }
  if (mode === 'PER_PERSON') {
    return '인당';
  }
  return '-';
}

function createEstimateDraftSnapshot(input: {
  planTitle: string;
  leaderName: string;
  regionName: string;
  headcountTotal: number;
  headcountMale: number;
  headcountFemale: number;
  travelStartDate: string;
  travelEndDate: string;
  vehicleType: string;
  vehicleAssignments: VehicleAssignment[];
  transportGroups: EstimateTransportGroup[];
  externalTransfers: ExternalTransfer[];
  specialNote: string;
  includeRentalItems: boolean;
  rentalItemsText: string;
  eventNames: string[];
  remark: string;
  validUntilDate: string;
  planStops: PlanStopRowBase[];
  totalDays: number;
  pricingPreview: EffectivePricingRow | null;
  displayedPricingAdjustmentLines: DisplayedPricingAdjustmentLineRow[];
  expandTeamPricingSummaryRows?: boolean;
  estimateGuideImagesPerPage?: EstimateGuideImagesPerPage;
  estimateGuidePageSplits?: number[] | null;
  overallMovementIntensityColorOverride?: string | null;
}): EstimateBuilderDraftSnapshot {
  const customerSnap =
    input.pricingPreview
      ? buildCustomerPricingSnapshot(
          input.pricingPreview as EffectivePricingResult,
          input.displayedPricingAdjustmentLines,
        )
      : null;
  const planStopsForPreview =
    input.planStops.length > 0
      ? input.planStops
      : Array.from({ length: Math.max(1, input.totalDays) }, (_, index) => ({
          rowType: 'MAIN' as const,
          locationId: null,
          locationVersionId: null,
          movementIntensity: null,
          movementIntensityColorOverride: null,
          dateCellText: `${index + 1}일차`,
          destinationCellText: '',
          timeCellText: '',
          scheduleCellText: '',
          lodgingCellText: '',
          mealCellText: '',
        }));
  return {
    planTitle: input.planTitle,
    leaderName: input.leaderName,
    regionName: input.regionName,
    headcountTotal: input.headcountTotal,
    headcountMale: input.headcountMale,
    headcountFemale: input.headcountFemale,
    travelStartDate: input.travelStartDate,
    travelEndDate: input.travelEndDate,
    vehicleType: input.vehicleType,
    vehicleAssignments: input.vehicleAssignments,
    transportGroups: input.transportGroups,
    externalTransfers: input.externalTransfers,
    specialNote: input.specialNote,
    includeRentalItems: input.includeRentalItems,
    rentalItemsText: input.rentalItemsText,
    eventNames: input.eventNames,
    remark: input.remark,
    validUntilDate: input.validUntilDate,
    movementIntensity: averageMovementIntensity(
      planStopsForPreview.filter((row) => isMainPlanStopRow(row)).map((row) => row.movementIntensity),
    ),
    overallMovementIntensityColorOverride: input.overallMovementIntensityColorOverride ?? null,
    planStops: planStopsForPreview.map((row) => ({
      rowType: row.rowType,
      locationId: row.locationId,
      dateCellText: row.dateCellText,
      destinationCellText: row.destinationCellText,
      movementIntensity: row.movementIntensity ?? null,
      movementIntensityColorOverride: row.movementIntensityColorOverride ?? null,
      timeCellText: row.timeCellText,
      scheduleCellText: row.scheduleCellText,
      lodgingCellText: row.lodgingCellText,
      mealCellText: row.mealCellText,
    })),
    pricing:
      customerSnap && input.pricingPreview
        ? {
            baseAmountKrw: customerSnap.baseAmountKrw,
            totalAmountKrw: customerSnap.totalAmountKrw,
            depositAmountKrw: customerSnap.depositAmountKrw,
            balanceAmountKrw: customerSnap.balanceAmountKrw,
            securityDepositTotalKrw: customerSnap.securityDepositTotalKrw,
            securityDepositUnitKrw: customerSnap.securityDepositUnitKrw,
            securityDepositMode: customerSnap.securityDepositMode,
            adjustmentLines: customerSnap.adjustmentLines,
            teamPricings: customerSnap.teamPricings.map((row) => ({
              teamOrderIndex: row.teamOrderIndex,
              teamName: row.teamName,
              baseAmountKrw: row.baseAmountKrw ?? customerSnap.baseAmountKrw,
              totalAmountKrw: row.totalAmountKrw,
              depositAmountKrw: row.depositAmountKrw,
              balanceAmountKrw: row.balanceAmountKrw,
              securityDepositAmountKrw: row.securityDepositAmountKrw,
              securityDepositUnitKrw: row.securityDepositUnitKrw,
              securityDepositScope: row.securityDepositScope as EstimateSecurityDepositScope,
            })),
            lines: input.pricingPreview.lines.map((line) => ({
              lineCode: line.lineCode,
              sourceType: line.sourceType,
              description: line.description,
              unitPriceKrw: line.unitPriceKrw,
              quantity: line.quantity,
              amountKrw: line.amountKrw,
              displayBasis: line.displayBasis,
              displayLabel: line.displayLabel,
              displayUnitAmountKrw: line.displayUnitAmountKrw,
              displayCount: line.displayCount,
              displayDivisorPerson: line.displayDivisorPerson,
              displayText: line.displayText,
            })),
            expandTeamPricingSummaryRows: input.expandTeamPricingSummaryRows === true,
          }
        : null,
    estimateGuideImagesPerPage: normalizeEstimateGuideImagesPerPage(input.estimateGuideImagesPerPage),
    estimateGuidePageSplits: normalizeEstimateGuidePageSplits(input.estimateGuidePageSplits),
  };
}

type TransportGroupDraft = TransportGroupTravelSyncDraft;

function getTransportGroupTeamName(index: number): string {
  const normalizedIndex = Math.max(0, index);
  const alphabet = String.fromCharCode(65 + (normalizedIndex % 26));
  const suffix = normalizedIndex >= 26 ? String(Math.floor(normalizedIndex / 26) + 1) : '';
  return `${alphabet}팀${suffix}`;
}

function toEstimateTransportGroup(group: TransportGroupDraft): EstimateTransportGroup {
  return {
    teamName: group.teamName,
    headcount: group.headcount,
    flightInDate: group.flightInDate,
    flightInTime: group.flightInTime,
    flightOutDate: group.flightOutDate,
    flightOutTime: group.flightOutTime,
    pickupDate: group.pickupDate,
    pickupTime: group.pickupTime,
    pickupPlaceType: group.pickupPlaceType,
    pickupPlaceCustomText: group.pickupPlaceCustomText,
    dropDate: group.dropDate,
    dropTime: group.dropTime,
    dropPlaceType: group.dropPlaceType,
    dropPlaceCustomText: group.dropPlaceCustomText,
  };
}

function createTransportGroupDraft(input: {
  index: number;
  headcount: number;
  travelStartDate: string;
  travelEndDate: string;
  flightInDate?: string;
  flightInTime?: string;
  flightOutDate?: string;
  flightOutTime?: string;
}): TransportGroupDraft {
  const travelStart = input.travelStartDate?.trim() ?? '';
  const travelEnd = input.travelEndDate?.trim() ?? '';

  let flightInDate: string;
  let flightInTime: string;
  let flightOutDate: string;
  let flightOutTime: string;

  const inPairUnspecified = input.flightInDate === undefined && input.flightInTime === undefined;
  const outPairUnspecified = input.flightOutDate === undefined && input.flightOutTime === undefined;

  if (inPairUnspecified && travelStart) {
    flightInDate = travelStart;
    flightInTime = DEFAULT_TRAVEL_SYNC_FLIGHT_IN_TIME;
  } else {
    flightInDate = input.flightInDate ?? '';
    flightInTime = input.flightInTime ?? '';
  }

  if (outPairUnspecified && travelEnd) {
    flightOutDate = travelEnd;
    flightOutTime = DEFAULT_TRAVEL_SYNC_FLIGHT_OUT_TIME;
  } else {
    flightOutDate = input.flightOutDate ?? '';
    flightOutTime = input.flightOutTime ?? '';
  }

  const recommendedPickup = getRecommendedPickupSchedule(flightInDate, flightInTime, input.travelStartDate);
  const recommendedDrop = getRecommendedDropSchedule(flightOutDate, flightOutTime, input.travelEndDate);

  return {
    teamName: getTransportGroupTeamName(input.index),
    headcount: Math.max(1, input.headcount),
    flightInDate,
    flightInTime,
    flightOutDate,
    flightOutTime,
    pickupDate: recommendedPickup.date,
    pickupTime: recommendedPickup.date ? recommendedPickup.time : '',
    pickupPlaceType: DEFAULT_PICKUP_DROP_PLACE_TYPE,
    pickupPlaceCustomText: '',
    dropDate: recommendedDrop.date,
    dropTime: recommendedDrop.time,
    dropPlaceType: DEFAULT_PICKUP_DROP_PLACE_TYPE,
    dropPlaceCustomText: '',
    hasEditedPickup: false,
    hasEditedDrop: false,
    hasEditedFlightIn: false,
    hasEditedFlightOut: false,
  };
}

function buildTransportGroupsAfterRemoveTeam(
  current: TransportGroupDraft[],
  removedIndex: number,
  headcountTotal: number,
): TransportGroupDraft[] {
  if (current.length <= 1) {
    return current;
  }
  const counts = redistributeTeamHeadcountsAfterRemoval(
    current.map((group) => group.headcount),
    removedIndex,
    headcountTotal,
  );
  let countIndex = 0;
  return current
    .filter((_, groupIndex) => groupIndex !== removedIndex)
    .map((group) => ({
      ...group,
      headcount: counts[countIndex++] ?? group.headcount,
    }));
}

function buildTransportGroupsAfterAddTeam(
  current: TransportGroupDraft[],
  headcountTotal: number,
  travelStartDate: string,
  travelEndDate: string,
): TransportGroupDraft[] | null {
  const newLen = current.length + 1;
  if (headcountTotal < newLen) {
    return null;
  }

  const usedHeadcount = current.reduce((sum, group) => sum + group.headcount, 0);
  const remainingHeadcount = Math.max(headcountTotal - usedHeadcount, 0);

  if (remainingHeadcount > 0) {
    return [
      ...current,
      createTransportGroupDraft({
        index: current.length,
        headcount: remainingHeadcount,
        travelStartDate,
        travelEndDate,
      }),
    ];
  }

  const counts = distributeHeadcountTotalAcrossTeams(headcountTotal, newLen);
  if (!counts) {
    return null;
  }

  return [
    ...current.map((group, index) => ({ ...group, headcount: counts[index]! })),
    createTransportGroupDraft({
      index: current.length,
      headcount: counts[current.length]!,
      travelStartDate,
      travelEndDate,
    }),
  ];
}

/** 다팀일 때 한 팀 인원을 바꾸면, 나머지 팀에 (전체 − 해당 팀)을 균등 분배해 합이 headcountTotal과 맞춘다. */
function applyPartitionHeadcountOnTeamEdit(
  groups: TransportGroupDraft[],
  editIndex: number,
  requestedHeadcount: number,
  headcountTotal: number,
): TransportGroupDraft[] {
  const n = groups.length;
  if (n <= 1) {
    return groups.map((g, i) =>
      i === editIndex ? { ...g, headcount: Math.max(1, requestedHeadcount) } : g,
    );
  }

  const maxForEdited = headcountTotal - (n - 1);
  const safeRequested = Math.max(1, requestedHeadcount);

  if (maxForEdited < 1) {
    const all = distributeHeadcountTotalAcrossTeams(headcountTotal, n);
    if (!all) {
      return groups;
    }
    return groups.map((g, i) => ({ ...g, headcount: all[i]! }));
  }

  const clamped = Math.min(maxForEdited, safeRequested);

  const remaining = headcountTotal - clamped;
  const subCounts = distributeHeadcountTotalAcrossTeams(remaining, n - 1);
  if (!subCounts) {
    const all = distributeHeadcountTotalAcrossTeams(headcountTotal, n);
    if (!all) {
      return groups;
    }
    return groups.map((g, i) => ({ ...g, headcount: all[i]! }));
  }

  let subIdx = 0;
  return groups.map((g, i) => {
    if (i === editIndex) {
      return { ...g, headcount: clamped };
    }
    return { ...g, headcount: subCounts[subIdx++]! };
  });
}

function shouldPreserveParentCloneTransportHeadcounts(input: {
  parentVersionId: string;
  parentVersionLoading: boolean;
  isWaitingForParentTransportGroups: boolean;
  hasHydratedParentVersion: boolean;
}): boolean {
  if (!input.parentVersionId) {
    return false;
  }
  return (
    input.parentVersionLoading ||
    input.isWaitingForParentTransportGroups ||
    input.hasHydratedParentVersion
  );
}

function applyHeadcountTotalToTransportGroups<T extends { headcount: number }>(
  groups: T[],
  nextTotal: number,
): T[] {
  if (groups.length === 0) {
    return groups;
  }
  if (groups.length === 1 && groups[0]) {
    return [{ ...groups[0], headcount: nextTotal }];
  }
  const counts = distributeHeadcountTotalAcrossTeams(nextTotal, groups.length);
  if (!counts) {
    return groups;
  }
  return applyTeamHeadcountsToGroups(groups, counts);
}

function toSegmentTimeCell(
  segmentVersion:
    | {
        scheduleTimeBlocks: Array<{
          startTime: string;
          orderIndex: number;
          activities: Array<{
            description: string;
            orderIndex: number;
          }>;
        }>;
      }
    | undefined,
): string {
  if (!segmentVersion || segmentVersion.scheduleTimeBlocks.length === 0) {
    return '';
  }

  const orderedTimeBlocks = segmentVersion.scheduleTimeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return orderedTimeBlocks
    .flatMap((timeBlock) => {
      const orderedActivities = timeBlock.activities
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const startTime = timeBlock.startTime;
      if (orderedActivities.length <= 1) {
        return [startTime];
      }
      return [startTime, ...orderedActivities.slice(1).map(() => '-')];
    })
    .join('\n');
}

function toSegmentScheduleCell(
  segmentVersion:
    | {
        scheduleTimeBlocks: Array<{
          startTime: string;
          orderIndex: number;
          activities: Array<{
            description: string;
            orderIndex: number;
          }>;
        }>;
      }
    | undefined,
): string {
  if (!segmentVersion || segmentVersion.scheduleTimeBlocks.length === 0) {
    return '';
  }

  return segmentVersion.scheduleTimeBlocks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((timeBlock) => {
      const orderedActivities = timeBlock.activities
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex);
      if (orderedActivities.length === 0) {
        return ['(일정 없음)'];
      }
      return orderedActivities.map((activity) => activity.description);
    })
    .join('\n');
}

function toLodgingCell(version: LocationVersionRow | undefined): string {
  return getBaseLodgingText(version, toFacilityLabel);
}

function toMealCell(version: LocationVersionRow | undefined): string {
  const mealSet = pickDefaultLocationMealSet(version?.mealSets ?? []);
  return [
    `아침 ${toMealLabel((mealSet?.breakfast ?? null) as MealOption | null)}`,
    `점심 ${toMealLabel((mealSet?.lunch ?? null) as MealOption | null)}`,
    `저녁 ${toMealLabel((mealSet?.dinner ?? null) as MealOption | null)}`,
  ].join('\n');
}

function formatTimeFromMinutes(value: number): string {
  const normalized = ((value % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function replaceLastTimeCellLine(timeCellText: string, replacement: string): string {
  const lines = timeCellText.split('\n');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!line?.trim()) {
      continue;
    }
    lines[index] = replacement;
    return lines.join('\n');
  }
  return replacement;
}

function resolveLastDayAirportScheduleOverride(input: {
  timeCellText: string;
  flightOutTime: string;
  dropTime: string;
}): Pick<PlanRow, 'timeCellText' | 'scheduleCellText'> | Pick<PlanRow, 'timeCellText'> | null {
  const flightOutMinutes = parseTimeToMinutes(input.flightOutTime);
  const dropMinutes = parseTimeToMinutes(input.dropTime);
  if (flightOutMinutes === null || dropMinutes === null) {
    return null;
  }

  const departureTimeCellText = `${formatTimeFromMinutes(dropMinutes - 60)}\n${formatTimeFromMinutes(dropMinutes)}`;
  if (flightOutMinutes >= 8 * 60 && flightOutMinutes <= 11 * 60 + 30) {
    return {
      timeCellText: departureTimeCellText,
      scheduleCellText: '공항출발\n공항 드랍 후 투어 종료',
    };
  }

  if (flightOutMinutes >= 13 * 60 && flightOutMinutes <= 14 * 60) {
    return {
      timeCellText: departureTimeCellText,
      scheduleCellText: '아침 식사 후 공항출발\n공항 드랍 후 투어 종료',
    };
  }

  if (flightOutMinutes >= 18 * 60 && flightOutMinutes <= 21 * 60) {
    return {
      timeCellText: replaceLastTimeCellLine(input.timeCellText, formatTimeFromMinutes(dropMinutes)),
    };
  }

  return null;
}

export function applyLastDayAutoRowAdjustments<T extends {
  lodgingCellText: string;
  mealCellText: string;
  timeCellText: string;
  scheduleCellText: string;
}>(
  rows: T[],
  input: {
    travelEndDate: string;
    dropDate: string;
    dropTime: string;
    flightOutTime: string;
  },
): T[] {
  return rows.map((row, index, allRows) => {
    if (index !== allRows.length - 1) {
      return row;
    }

    const previousRow = index > 0 ? allRows[index - 1] : undefined;
    const mealCellText = adjustLastDayMealCellText(row.mealCellText, {
      ...input,
      previousLodgingCellText: previousRow?.lodgingCellText ?? null,
    });

    return {
      ...row,
      lodgingCellText: '숙소미포함',
      mealCellText,
      ...(resolveLastDayAirportScheduleOverride({
        timeCellText: row.timeCellText,
        flightOutTime: input.flightOutTime,
        dropTime: input.dropTime,
      }) ?? {}),
    };
  });
}

function autoResizeTextarea(element: HTMLTextAreaElement): void {
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

function sortTemplateStops(stops: PlanTemplateStopRow[]): PlanTemplateStopRow[] {
  return stops.slice().sort((a, b) => a.dayIndex - b.dayIndex);
}

function normalizeCellText(value: string | null | undefined): string {
  return (value ?? '').replace(/\r\n/g, '\n').trim();
}

function templateUsesEarlyFirstDay(input: {
  template: PlanTemplateRow;
  locationById: Map<string, LocationOption>;
  locationVersionById: Map<string, LocationVersionOption>;
}): boolean {
  const orderedStops = sortTemplateStops(input.template.planStops);
  const dayOrderedStops = Array.from({ length: input.template.totalDays }, (_, index) =>
    orderedStops.find((stop) => stop.dayIndex === index + 1),
  );
  const route = buildSelectedRouteFromStops(
    dayOrderedStops.map((stop) => ({
      segmentId: stop?.segmentId,
      segmentVersionId: stop?.segmentVersionId,
      overnightStayId: stop?.overnightStayId,
      overnightStayDayOrder: stop?.overnightStayDayOrder,
      multiDayBlockId: stop?.multiDayBlockId,
      multiDayBlockDayOrder: stop?.multiDayBlockDayOrder,
      multiDayBlockConnectionId: stop?.multiDayBlockConnectionId,
      multiDayBlockConnectionVersionId: stop?.multiDayBlockConnectionVersionId,
      locationId: stop?.locationId,
      locationVersionId: stop?.locationVersionId,
    })),
  );
  if (route.length === 0 || !isRouteSelectionStopComplete(route[0]!)) {
    return false;
  }

  const totalDays = Math.max(2, input.template.totalDays);
  const baseRows = buildAutoRowsFromRoute({
    selectedRoute: route,
    filteredSegments: [],
    filteredMultiDayBlocks: [],
    filteredMultiDayBlockConnections: [],
    locationById: input.locationById,
    locationVersionById: input.locationVersionById,
    totalDays,
    variantType: VariantType.Basic,
  });
  const earlyRows = buildAutoRowsFromRoute({
    selectedRoute: route,
    filteredSegments: [],
    filteredMultiDayBlocks: [],
    filteredMultiDayBlockConnections: [],
    locationById: input.locationById,
    locationVersionById: input.locationVersionById,
    totalDays,
    variantType: VariantType.Early,
  });

  const firstStop = orderedStops[0];
  const templateTime = normalizeCellText(firstStop?.timeCellText);
  const templateSchedule = normalizeCellText(firstStop?.scheduleCellText);
  const basicTime = normalizeCellText(baseRows[0]?.timeCellText);
  const basicSchedule = normalizeCellText(baseRows[0]?.scheduleCellText);
  const earlyTime = normalizeCellText(earlyRows[0]?.timeCellText);
  const earlySchedule = normalizeCellText(earlyRows[0]?.scheduleCellText);

  const matchesEarly = templateTime === earlyTime && templateSchedule === earlySchedule;
  const matchesBasic = templateTime === basicTime && templateSchedule === basicSchedule;
  return matchesEarly && !matchesBasic;
}

function buildDefaultLodgingRow(input: {
  rowType?: PlanStopRowType;
  segmentId?: string;
  segmentVersionId?: string;
  overnightStayId?: string;
  overnightStayDayOrder?: number;
  multiDayBlockId?: string;
  multiDayBlockDayOrder?: number;
  multiDayBlockConnectionId?: string;
  multiDayBlockConnectionVersionId?: string;
  locationId?: string;
  locationVersionId?: string;
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5' | null;
  movementIntensityColorOverride?: string | null;
  dateCellText: string;
  destinationCellText: string;
  timeCellText: string;
  scheduleCellText: string;
  mealCellText: string;
  baseLodgingName: string;
  lodgingCellText?: string;
}): PlanRow {
  return {
    rowType: input.rowType ?? 'MAIN',
    segmentId: input.segmentId,
    segmentVersionId: input.segmentVersionId,
    overnightStayId: input.overnightStayId,
    overnightStayDayOrder: input.overnightStayDayOrder,
    multiDayBlockId: input.multiDayBlockId,
    multiDayBlockDayOrder: input.multiDayBlockDayOrder,
    multiDayBlockConnectionId: input.multiDayBlockConnectionId,
    multiDayBlockConnectionVersionId: input.multiDayBlockConnectionVersionId,
    locationId: input.locationId,
    locationVersionId: input.locationVersionId,
    movementIntensity: input.movementIntensity ?? null,
    movementIntensityColorOverride: input.movementIntensityColorOverride ?? null,
    lodgingSelectionLevel: 'LV3',
    customLodgingId: undefined,
    customLodgingNameSnapshot: null,
    dateCellText: input.dateCellText,
    destinationCellText: input.destinationCellText,
    timeCellText: input.timeCellText,
    scheduleCellText: input.scheduleCellText,
    lodgingCellText:
      input.lodgingCellText ??
      buildLodgingCellText({ level: 'LV3', baseLodgingName: input.baseLodgingName }),
    mealCellText: input.mealCellText,
  };
}

function PlaceField({
  label,
  placeType,
  customText,
  onPlaceTypeChange,
  onCustomTextChange,
}: PlaceFieldProps): JSX.Element {
  return (
    <div className="grid gap-2 text-sm">
      <span className="text-xs text-slate-600">{label}</span>
      <div className="flex flex-wrap gap-2">
        {PICKUP_DROP_PLACE_OPTIONS.map((option) => (
          <button
            key={`${label}-${option.value}`}
            type="button"
            onClick={() => onPlaceTypeChange(option.value)}
            className={`rounded-xl border px-3 py-1.5 text-sm transition ${
              placeType === option.value
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {placeType === 'CUSTOM' ? (
        <input
          value={customText}
          onChange={(event) => onCustomTextChange(event.target.value)}
          placeholder="장소 직접 입력"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      ) : null}
    </div>
  );
}

function DateInputTrigger({
  value,
  placeholder = '날짜를 선택하세요',
  onClick,
}: DateInputTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:bg-slate-50"
      aria-haspopup="dialog"
    >
      <span className={value ? 'text-slate-900' : 'text-slate-400'}>
        {formatDateTriggerLabel(value) || placeholder}
      </span>
      <span className="text-xs text-slate-500">열기</span>
    </button>
  );
}

function TimeInputTrigger({
  value,
  placeholder = '시간을 선택하세요',
  onClick,
}: TimeInputTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:bg-slate-50"
      aria-haspopup="dialog"
    >
      <span className={value ? 'text-slate-900' : 'text-slate-400'}>
        {formatTimeTriggerLabel(value) || placeholder}
      </span>
      <span className="text-xs text-slate-500">열기</span>
    </button>
  );
}

export function ItineraryBuilderPage(): JSX.Element {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const userId = searchParams.get('userId') ?? '';
  const planId = searchParams.get('planId') ?? '';
  const parentVersionId = searchParams.get('parentVersionId') ?? '';
  const confirmedTripId = searchParams.get('confirmedTripId') ?? '';
  const initialChangeNote = searchParams.get('changeNote') ?? '';
  const initialTemplateId = searchParams.get('templateId') ?? '';

  const isVersionMode = Boolean(planId);
  const hasPlanContext = Boolean(userId) && (!isVersionMode || Boolean(parentVersionId));
  const isTemplateOnlyMode = !hasPlanContext && Boolean(initialTemplateId);
  const hasValidContext = hasPlanContext || isTemplateOnlyMode;

  const [variantType, setVariantType] = useState<VariantType>(VariantType.Basic);
  /** true면 픽업/드랍 시각 기반 Variant 자동 덮어쓰기 비활성화 */
  const [variantTypeManualLocked, setVariantTypeManualLocked] = useState(false);
  const [totalDays, setTotalDays] = useState<number>(6);
  const [regionSetId, setRegionSetId] = useState<string>('');
  const [planTitle, setPlanTitle] = useState<string>(() => buildDefaultPlanTitle(''));
  const [planDocumentNumberBase, setPlanDocumentNumberBase] = useState<string>('');
  const [changeNote, setChangeNote] = useState<string>(initialChangeNote);
  const [leaderName, setLeaderName] = useState<string>('');
  const [travelStartDate, setTravelStartDate] = useState<string>('');
  const [travelEndDate, setTravelEndDate] = useState<string>('');
  const [headcountTotal, setHeadcountTotal] = useState<number>(6);
  const [headcountMale, setHeadcountMale] = useState<number>(() => buildDefaultMaleHeadcount(6));
  const [vehicleAssignments, setVehicleAssignments] = useState<VehicleAssignment[]>([
    { vehicleType: '스타렉스', count: 1 },
  ]);
  const vehicleType = useMemo(
    () => primaryVehicleTypeFromAssignments(vehicleAssignments),
    [vehicleAssignments],
  );
  const vehicleDisplayText = useMemo(
    () => formatVehicleAssignmentsForDisplay(vehicleAssignments),
    [vehicleAssignments],
  );
  const [transportGroups, setTransportGroups] = useState<TransportGroupDraft[]>([
    createTransportGroupDraft({
      index: 0,
      headcount: 6,
      travelStartDate: '',
      travelEndDate: '',
    }),
  ]);
  const [externalTransfers, setExternalTransfers] = useState<ExternalTransfer[]>([]);
  const [externalTransfersDraft, setExternalTransfersDraft] = useState<ExternalTransfer[]>([]);
  const [specialNote, setSpecialNote] = useState<string>('');
  const [includeRentalItems, setIncludeRentalItems] = useState<boolean>(true);
  const [rentalItemsText, setRentalItemsText] = useState<string>('');
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [eventSecurityResyncModalEventId, setEventSecurityResyncModalEventId] = useState<string | null>(
    null,
  );
  const [remark, setRemark] = useState<string>('');
  const [validUntilDate, setValidUntilDate] = useState<string>(
    () => addDays(todayIsoDate(), ESTIMATE_VALIDITY_DAYS) ?? '',
  );
  const [estimateGuideImagesPerPage, setEstimateGuideImagesPerPage] = useState<EstimateGuideImagesPerPage>(
    ESTIMATE_GUIDE_IMAGES_PER_PAGE_DEFAULT,
  );
  const [estimateGuidePageSplitsText, setEstimateGuidePageSplitsText] = useState('');
  const [overallMovementIntensityColorOverride, setOverallMovementIntensityColorOverride] = useState<
    string | null
  >(null);

  const [selectedRoute, setSelectedRoute] = useState<RouteSelection[]>([]);
  const [isMultiDayBlockSectionOpen, setIsMultiDayBlockSectionOpen] = useState<boolean>(false);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [extraLodgingCounts, setExtraLodgingCounts] = useState<number[]>(
    Array.from({ length: 6 }, () => 0),
  );
  const [extraLodgingsModalState, setExtraLodgingsModalState] = useState<ExtraLodgingsModalState>({
    open: false,
  });
  const [transportTeamHeadcountModalOpen, setTransportTeamHeadcountModalOpen] =
    useState<boolean>(false);
  const [manualAdjustments, setManualAdjustments] = useState<ManualAdjustmentRow[]>([]);
  const [manualAdjustmentsModalState, setManualAdjustmentsModalState] =
    useState<ManualAdjustmentsModalState>({
      open: false,
    });
  const [externalTransfersManagerModalState, setExternalTransfersManagerModalState] =
    useState<ExternalTransfersManagerModalState>({
      open: false,
    });
  const [manualDepositInput, setManualDepositInput] = useState<string>('');
  const [hasEditedManualDeposit, setHasEditedManualDeposit] = useState<boolean>(false);
  const [manualPricing, setManualPricing] = useState<ManualPricingState>({
    enabled: false,
    adjustmentLines: [],
    summary: null,
    teamSummaries: [],
    lineOverrides: [],
  });
  const [manualPricingSplitTeamRows, setManualPricingSplitTeamRows] = useState(false);
  const [manualPricingAdjustmentAmountDraft, setManualPricingAdjustmentAmountDraft] = useState<{
    rowKey: string;
    value: string;
  } | null>(null);
  const [createdId, setCreatedId] = useState<string>('');
  const [planSaveErrorMessages, setPlanSaveErrorMessages] = useState<string[]>([]);
  const [isCreateBlockedTooltipOpen, setIsCreateBlockedTooltipOpen] = useState<boolean>(false);
  const [isValidationOpen, setIsValidationOpen] = useState<boolean>(false);
  const [isPayloadPreviewOpen, setIsPayloadPreviewOpen] = useState<boolean>(false);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState<boolean>(true);
  const [activePane, setActivePane] = useState<'builder' | 'preview'>('builder');
  const [hasAppliedInitialTemplate, setHasAppliedInitialTemplate] = useState<boolean>(false);
  const [skipNextAutoRowsSync, setSkipNextAutoRowsSync] = useState<boolean>(false);
  const [routePresetTemplateId, setRoutePresetTemplateId] = useState<string>('');
  const [homeSelectedUserId, setHomeSelectedUserId] = useState<string>('');
  const [homeSelectedUserName, setHomeSelectedUserName] = useState<string>('');
  const [homeSelectedTemplateId, setHomeSelectedTemplateId] = useState<string>('');
  const [homeTemplateRegionSetId, setHomeTemplateRegionSetId] = useState<string>('');
  const [homeTemplateTotalDays, setHomeTemplateTotalDays] = useState<number>(0);
  const [homeEntryMode, setHomeEntryMode] = useState<'new' | 'existing' | null>(null);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState<boolean>(false);
  const [datePickerTarget, setDatePickerTarget] = useState<DatePickerTarget | null>(null);
  const [timePickerTarget, setTimePickerTarget] = useState<TimePickerTarget | null>(null);
  const [isConsultationPasteModalOpen, setIsConsultationPasteModalOpen] = useState<boolean>(false);
  const [externalTransferModalState, setExternalTransferModalState] =
    useState<ExternalTransferModalState>({
      open: false,
      editingIndex: null,
    });
  const [lodgingUpgradeModalState, setLodgingUpgradeModalState] =
    useState<LodgingUpgradeModalState>({
      open: false,
      focusPlanRowIndex: null,
    });
  const [specialMealsModalState, setSpecialMealsModalState] = useState<SpecialMealsModalState>({
    open: false,
  });
  const [lodgingSelectionModalState, setLodgingSelectionModalState] =
    useState<LodgingSelectionModalState>({
      open: false,
      rowIndex: null,
    });
  const [homeNewUserName, setHomeNewUserName] = useState<string>('');
  const [homeCreateUserError, setHomeCreateUserError] = useState<string>('');
  const dirtyPlanRowFieldKeysRef = useRef<Set<string>>(new Set());
  const pendingConsultationTemplateApplyIdRef = useRef<string | null>(null);
  const lastAutoPlanTitleRef = useRef<string>(buildDefaultPlanTitle(''));
  const hasEditedHeadcountMaleRef = useRef<boolean>(false);
  const hasHydratedParentVersionRef = useRef<boolean>(false);
  const hasInitializedRentalItemsRef = useRef<boolean>(false);
  const isWaitingForParentTransportGroupsRef = useRef<boolean>(false);
  /** 부모 버전 하이드레이션과 같은 틱에서 autoRows merge가 돌면 setPlanRows가 엇갈려 일정이 비워짐 — 한 프레임 스킵 */
  const suppressAutoRowsMergeOnceRef = useRef<boolean>(false);
  /** 신규 버전(부모 복제) 직후: 사용자가 루트·일수·variant를 바꾸기 전까지 autoRows 병합으로 일정을 덮어쓰지 않음 */
  const skipAutoRowMergeForParentCloneRef = useRef<boolean>(false);
  const parentCloneScheduleBaselineRef = useRef<{
    route: string;
    variantType: VariantType;
    totalDays: number;
  } | null>(null);
  const parentCloneTravelDatesBaselineRef = useRef<{
    travelStartDate: string;
    travelEndDate: string;
    totalDays: number;
  } | null>(null);
  const hasEditedParentCloneTravelScheduleRef = useRef<boolean>(false);

  const { rules: specialMealDestinationRules } = useSpecialMealDestinationRules();
  const { colors: settingsMovementIntensityColors } = useMovementIntensityColorSettings();
  const { preset: currentRentalItemPreset } = useCurrentRentalItemPreset();
  const buildRentalItemsText = useCallback(
    (total: number) => renderRentalItemPresetText(currentRentalItemPreset, total),
    [currentRentalItemPreset],
  );

  useEffect(() => {
    hasHydratedParentVersionRef.current = false;
    hasInitializedRentalItemsRef.current = false;
    isWaitingForParentTransportGroupsRef.current = false;
    suppressAutoRowsMergeOnceRef.current = false;
    skipAutoRowMergeForParentCloneRef.current = false;
    parentCloneScheduleBaselineRef.current = null;
    parentCloneTravelDatesBaselineRef.current = null;
    hasEditedParentCloneTravelScheduleRef.current = false;
  }, [parentVersionId]);

  useEffect(() => {
    setVariantTypeManualLocked(false);
  }, [userId, planId, parentVersionId]);

  useEffect(() => {
    if (parentVersionId || hasInitializedRentalItemsRef.current || !includeRentalItems) {
      return;
    }
    setRentalItemsText(buildRentalItemsText(headcountTotal));
    hasInitializedRentalItemsRef.current = true;
  }, [buildRentalItemsText, headcountTotal, includeRentalItems, parentVersionId]);

  const { data: planContextData } = useQuery<{ plan: PlanContextRow | null }>(PLAN_CONTEXT_QUERY, {
    variables: { id: planId },
    skip: !isVersionMode,
  });
  const { version: parentVersion, loading: parentVersionLoading } = usePlanVersionDetail(
    parentVersionId || undefined,
  );
  const { data: userData } = useQuery<{ user: UserRow | null }>(USER_QUERY, {
    variables: { id: userId },
    skip: !userId,
  });
  const { data: eventData } = useQuery<{ events: EventOptionRow[] }>(EVENTS_QUERY, {
    variables: { activeOnly: true },
  });
  const { data: regionLodgingData } = useQuery<{ regionLodgings: RegionLodgingOption[] }>(
    REGION_LODGINGS_QUERY,
    {
      variables: {
        regionSetId: regionSetId || undefined,
        activeOnly: true,
      },
      skip: !regionSetId,
    },
  );
  const { data: regionSetData } = useQuery<{ regionSets: RegionSetRow[] }>(REGION_SETS_QUERY, {
    variables: { includeInactive: true },
  });
  const { data: regionsFirstDayData } = useQuery<{
    regions: Array<{ id: string; alwaysIncludeFirstDayStart: boolean }>;
  }>(REGIONS_FIRST_DAY_BOOST_QUERY);
  const { data: locationData, loading: locationsLoading } = useQuery<{ locations: LocationRow[] }>(
    LOCATIONS_QUERY,
    {
      skip: !regionSetId,
    },
  );
  const { data: segmentData, loading: segmentsLoading } = useQuery<{ segments: SegmentRow[] }>(
    SEGMENTS_QUERY,
    {
      skip: !regionSetId,
    },
  );
  const { data: overnightStayData, loading: overnightStaysLoading } = useQuery<{
    multiDayBlocks: MultiDayBlockOption[];
  }>(OVERNIGHT_STAYS_QUERY, {
    skip: !regionSetId,
  });
  const { data: overnightStayConnectionData, loading: overnightStayConnectionsLoading } = useQuery<{
    multiDayBlockConnections: MultiDayBlockConnectionOption[];
  }>(MULTI_DAY_BLOCK_CONNECTIONS_QUERY, {
    skip: !regionSetId,
  });
  const { data: templateListData } = useQuery<{ planTemplates: PlanTemplateRow[] }>(
    PLAN_TEMPLATES_QUERY,
    {
      variables: {
        regionSetId: hasValidContext ? regionSetId || undefined : undefined,
        totalDays: hasValidContext ? totalDays : undefined,
        activeOnly: true,
      },
      skip: hasValidContext ? !regionSetId : false,
    },
  );
  const { data: templateByIdData } = useQuery<{ planTemplate: PlanTemplateRow | null }>(
    PLAN_TEMPLATE_QUERY,
    {
      variables: { id: initialTemplateId },
      skip: !initialTemplateId,
    },
  );

  const [createPlan, { loading: creatingPlan }] = useMutation<{
    createPlan: { id: string; currentVersionId?: string | null };
  }>(CREATE_PLAN_MUTATION);
  const [createPlanVersion, { loading: creatingVersion }] = useMutation<{
    createPlanVersion: { id: string; versionNumber: number };
  }>(CREATE_PLAN_VERSION_MUTATION);
  const [createUser, { loading: creatingUser }] = useMutation<{ createUser: UserRow }>(
    CREATE_USER_MUTATION,
  );
  const { updateConfirmedTrip, loading: confirmingTripVersion } = useUpdateConfirmedTrip();

  const creating = creatingPlan || creatingVersion || confirmingTripVersion;

  const regionSets = regionSetData?.regionSets ?? [];
  const locations = locationData?.locations ?? [];
  const segments = segmentData?.segments ?? [];
  const overnightStays = overnightStayData?.multiDayBlocks ?? [];
  const overnightStayConnections = overnightStayConnectionData?.multiDayBlockConnections ?? [];
  const routeGraphLoading = Boolean(
    regionSetId &&
      (segmentsLoading ||
        locationsLoading ||
        overnightStaysLoading ||
        overnightStayConnectionsLoading),
  );
  const planContext = planContextData?.plan ?? null;
  const selectedUserName = userData?.user?.name ?? planContext?.user.name ?? '';
  const eventOptions = eventData?.events ?? [];
  const { availability: rentalItemAvailability, loading: rentalItemAvailabilityLoading } =
    useRentalItemAvailability({
      travelStartDate,
      travelEndDate,
      excludeConfirmedTripId: confirmedTripId || null,
      excludePlanId: planId || planContext?.id || null,
    });
  const rentalItemAvailabilityByItem = useMemo(
    () => new Map(rentalItemAvailability.map((row) => [row.item, row] as const)),
    [rentalItemAvailability],
  );
  const regionLodgings = regionLodgingData?.regionLodgings ?? [];
  const activeTemplateRows = templateListData?.planTemplates ?? [];
  const templateById = templateByIdData?.planTemplate ?? null;
  const templateStopByDayForDisplay = useMemo(
    () => new Map((templateById?.planStops ?? []).map((s) => [s.dayIndex, s] as const)),
    [templateById?.planStops],
  );
  const selectedRegionIds = useMemo(
    () =>
      new Set(
        (regionSets.find((set) => set.id === regionSetId)?.items ?? []).map((item) => item.regionId),
      ),
    [regionSetId, regionSets],
  );
  const alwaysIncludeFirstDayStartRegionIds = useMemo(
    () =>
      new Set(
        (regionsFirstDayData?.regions ?? [])
          .filter((r) => r.alwaysIncludeFirstDayStart)
          .map((r) => r.id),
      ),
    [regionsFirstDayData],
  );
  const firstDayScopedLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          selectedRegionIds.has(location.regionId) ||
          alwaysIncludeFirstDayStartRegionIds.has(location.regionId),
      ),
    [locations, selectedRegionIds, alwaysIncludeFirstDayStartRegionIds],
  );

  const templateOptions = useMemo(() => {
    const deduped = new Map<string, PlanTemplateRow>();
    activeTemplateRows.forEach((template) => {
      deduped.set(template.id, template);
    });
    if (templateById) {
      deduped.set(templateById.id, templateById);
    }
    return Array.from(deduped.values()).sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name, 'ko-KR');
    });
  }, [activeTemplateRows, templateById]);

  const homeTemplateOptions = useMemo(() => {
    return templateOptions.filter((template) => {
      if (!template.isActive) {
        return false;
      }
      if (homeTemplateRegionSetId && template.regionSetId !== homeTemplateRegionSetId) {
        return false;
      }
      if (homeTemplateTotalDays > 0 && template.totalDays !== homeTemplateTotalDays) {
        return false;
      }
      return true;
    });
  }, [homeTemplateRegionSetId, homeTemplateTotalDays, templateOptions]);

  const routePresetOptions = useMemo(
    () =>
      templateOptions.filter(
        (template) =>
          template.isActive &&
          template.regionSetId === regionSetId &&
          template.totalDays === totalDays,
      ),
    [regionSetId, templateOptions, totalDays],
  );

  const routePresetSelected = useMemo(
    () => routePresetOptions.find((template) => template.id === routePresetTemplateId) ?? null,
    [routePresetOptions, routePresetTemplateId],
  );

  useEffect(() => {
    if (!isVersionMode || !planContext || parentVersionId) {
      return;
    }

    setRegionSetId(planContext.regionSetId);
  }, [isVersionMode, parentVersionId, planContext]);

  useEffect(() => {
    if (!isVersionMode || !parentVersionId || parentVersionLoading || !parentVersion) {
      return;
    }
    if (hasHydratedParentVersionRef.current) {
      return;
    }

    const meta = parentVersion.meta;
    const pricing = parentVersion.pricing;
    const mainPlanStops = parentVersion.planStops.filter((stop) => (stop.rowType ?? 'MAIN') !== 'EXTERNAL_TRANSFER');
    const firstStop = mainPlanStops[0];
    if (!meta || !firstStop) {
      return;
    }

    suppressAutoRowsMergeOnceRef.current = true;
    skipAutoRowMergeForParentCloneRef.current = true;
    parentCloneScheduleBaselineRef.current = null;
    hasHydratedParentVersionRef.current = true;
    isWaitingForParentTransportGroupsRef.current = true;
    dirtyPlanRowFieldKeysRef.current.clear();
    setSkipNextAutoRowsSync(true);

    setPlanTitle(parentVersion.plan.title);
    setVariantType(parentVersion.variantType as VariantType);
    /** 부모에 저장된 Variant(운항과 불일치한 수동 값 포함)가 자동 동기화로 덮이지 않게 함 */
    setVariantTypeManualLocked(true);
    setTotalDays(parentVersion.totalDays);
    setRegionSetId(parentVersion.regionSetId);
    setLeaderName(meta.leaderName);
    setTravelStartDate(meta.travelStartDate.slice(0, 10));
    setTravelEndDate(meta.travelEndDate.slice(0, 10));
    parentCloneTravelDatesBaselineRef.current = {
      travelStartDate: meta.travelStartDate.slice(0, 10),
      travelEndDate: meta.travelEndDate.slice(0, 10),
      totalDays: parentVersion.totalDays,
    };
    setHeadcountTotal(meta.headcountTotal);
    setHeadcountMale(meta.headcountMale);
    hasEditedHeadcountMaleRef.current = true;
    setVehicleAssignments(
      normalizeVehicleAssignments(meta.vehicleAssignments, meta.vehicleType),
    );
    setSpecialNote(meta.specialNote ?? '');
    setIncludeRentalItems(meta.includeRentalItems);
    setRentalItemsText(meta.rentalItemsText);
    hasInitializedRentalItemsRef.current = true;
    setEventIds(meta.events.map((event) => event.id));
    setRemark(meta.remark ?? '');
    setValidUntilDate(
      resolveInitialValidUntilDateForNewVersion({
        parentMetaCreatedAt: meta.createdAt,
        parentValidUntilDate: meta.validUntilDate,
      }),
    );
    setEstimateGuideImagesPerPage(normalizeEstimateGuideImagesPerPage(meta.estimateGuideImagesPerPage));
    setEstimateGuidePageSplitsText(
      formatEstimateGuidePageSplitsInput(
        Array.isArray(meta.estimateGuidePageSplits) ? meta.estimateGuidePageSplits : null,
      ),
    );
    setOverallMovementIntensityColorOverride(meta.movementIntensityColorOverride ?? null);
    setRoutePresetTemplateId('');
    setIsMultiDayBlockSectionOpen(false);

    setExternalTransfers(
      normalizeExternalTransfers(
        meta.externalTransfers.map((transfer) => ({
          ...transfer,
          travelDate: transfer.travelDate.slice(0, 10),
        })),
      ),
    );
    setExternalTransfersDraft(
      normalizeExternalTransfers(
        meta.externalTransfers.map((transfer) => ({
          ...transfer,
          travelDate: transfer.travelDate.slice(0, 10),
        })),
      ),
    );

    const hydratedTransportGroups =
      meta.transportGroups.length > 0
        ? meta.transportGroups.map((group, index) => ({
            ...createTransportGroupDraft({
              index,
              headcount: group.headcount,
              travelStartDate: meta.travelStartDate.slice(0, 10),
              travelEndDate: meta.travelEndDate.slice(0, 10),
            }),
            teamName: group.teamName,
            headcount: group.headcount,
            flightInDate: group.flightInDate?.slice(0, 10) ?? '',
            flightInTime: group.flightInTime ?? '',
            flightOutDate: group.flightOutDate?.slice(0, 10) ?? '',
            flightOutTime: group.flightOutTime ?? '',
            pickupDate: group.pickupDate?.slice(0, 10) ?? '',
            pickupTime: group.pickupTime ?? '',
            pickupPlaceType: (group.pickupPlaceType ?? DEFAULT_PICKUP_DROP_PLACE_TYPE) as PickupDropPlaceType,
            pickupPlaceCustomText: group.pickupPlaceCustomText ?? '',
            dropDate: group.dropDate?.slice(0, 10) ?? '',
            dropTime: group.dropTime ?? '',
            dropPlaceType: (group.dropPlaceType ?? DEFAULT_PICKUP_DROP_PLACE_TYPE) as PickupDropPlaceType,
            dropPlaceCustomText: group.dropPlaceCustomText ?? '',
            hasEditedFlightIn: true,
            hasEditedFlightOut: true,
            hasEditedPickup: true,
            hasEditedDrop: true,
          }))
        : [
            {
              ...createTransportGroupDraft({
                index: 0,
                headcount: meta.headcountTotal,
                travelStartDate: meta.travelStartDate.slice(0, 10),
                travelEndDate: meta.travelEndDate.slice(0, 10),
                flightInDate: meta.flightInTime?.trim() ? meta.travelStartDate.slice(0, 10) : '',
                flightInTime: meta.flightInTime ?? '',
                flightOutDate: meta.flightOutTime?.trim() ? meta.travelEndDate.slice(0, 10) : '',
                flightOutTime: meta.flightOutTime ?? '',
              }),
              hasEditedFlightIn: true,
              hasEditedFlightOut: true,
              hasEditedPickup: true,
              hasEditedDrop: true,
            },
          ];
    setTransportGroups(hydratedTransportGroups);

    const nextExtraLodgingCounts = Array.from({ length: Math.max(parentVersion.totalDays, 6) }, () => 0);
    meta.extraLodgings.forEach((row) => {
      const index = row.dayIndex - 1;
      if (index >= 0 && index < nextExtraLodgingCounts.length) {
        nextExtraLodgingCounts[index] = row.lodgingCount;
      }
    });
    setExtraLodgingCounts(nextExtraLodgingCounts);

    setSelectedRoute(
      buildSelectedRouteFromStops(
        mainPlanStops.map((stop) => ({
          segmentId: stop.segmentId,
          segmentVersionId: stop.segmentVersionId,
          multiDayBlockId: stop.multiDayBlockId,
          multiDayBlockDayOrder: stop.multiDayBlockDayOrder,
          multiDayBlockConnectionId: stop.multiDayBlockConnectionId,
          multiDayBlockConnectionVersionId: stop.multiDayBlockConnectionVersionId,
          locationId: stop.locationId,
          locationVersionId: stop.locationVersionId,
        })),
      ),
    );

    const lodgingSelectionByDayIndex = new Map(
      meta.lodgingSelections.map((selection) => [selection.dayIndex, selection] as const),
    );
    let mainDayIndex = 0;
    setPlanRows(
      parentVersion.planStops.map((stop) => {
        const nextRow = buildDefaultLodgingRow({
          rowType: stop.rowType ?? 'MAIN',
          segmentId: stop.segmentId ?? undefined,
          segmentVersionId: stop.segmentVersionId ?? undefined,
          overnightStayId: stop.multiDayBlockId ?? undefined,
          overnightStayDayOrder: stop.multiDayBlockDayOrder ?? undefined,
          multiDayBlockId: stop.multiDayBlockId ?? undefined,
          multiDayBlockDayOrder: stop.multiDayBlockDayOrder ?? undefined,
          multiDayBlockConnectionId: stop.multiDayBlockConnectionId ?? undefined,
          multiDayBlockConnectionVersionId: stop.multiDayBlockConnectionVersionId ?? undefined,
          locationId: stop.locationId ?? undefined,
          locationVersionId: stop.locationVersionId ?? undefined,
          movementIntensity: stop.movementIntensity ?? null,
          movementIntensityColorOverride: stop.movementIntensityColorOverride ?? null,
          dateCellText: stop.dateCellText,
          destinationCellText: stop.destinationCellText,
          timeCellText: stop.timeCellText,
          scheduleCellText: stop.scheduleCellText,
          mealCellText: stop.mealCellText,
          baseLodgingName: '',
          lodgingCellText: stop.lodgingCellText,
        });
        if (nextRow.rowType === 'EXTERNAL_TRANSFER') {
          return nextRow;
        }
        mainDayIndex += 1;
        const selection = lodgingSelectionByDayIndex.get(mainDayIndex);
        return {
          ...nextRow,
          lodgingSelectionLevel: selection?.level ?? 'LV3',
          customLodgingId: selection?.customLodgingId ?? undefined,
          customLodgingNameSnapshot: selection?.customLodgingNameSnapshot ?? null,
        };
      }),
    );

    setManualAdjustments(
      (pricing?.savedManualAdjustments ?? []).map((row) => ({
        kind: row.kind,
        title: row.title,
        chargeScope: row.chargeScope,
        personMode: row.personMode ?? 'SINGLE',
        countValue: row.countValue != null ? String(row.countValue) : '',
        amountKrw: String(row.amountKrw),
        customDisplayText: row.customDisplayText ?? '',
      })),
    );
    setHasEditedManualDeposit(pricing?.savedManualDepositAmountKrw != null);
    setManualDepositInput(
      pricing?.savedManualDepositAmountKrw != null
        ? String(pricing.savedManualDepositAmountKrw)
        : pricing
          ? String(pricing.depositAmountKrw)
          : '',
    );
    const nextManualPricingState = normalizeManualPricingState(pricing?.manualPricing);
    setManualPricing(nextManualPricingState);
    setManualPricingSplitTeamRows(
      nextManualPricingState.enabled === true && pricing?.manualPricing?.expandTeamPricingSummaryRows === true,
    );
    setManualPricingAdjustmentAmountDraft(null);
  }, [isVersionMode, parentVersionId, parentVersionLoading, parentVersion]);

  useEffect(() => {
    if (!manualPricing.enabled) {
      setManualPricingAdjustmentAmountDraft(null);
    }
  }, [manualPricing.enabled]);

  useEffect(() => {
    const trimmedName = selectedUserName.trim();
    if (!trimmedName || leaderName === trimmedName) {
      return;
    }
    setLeaderName(trimmedName);
  }, [leaderName, selectedUserName]);

  useEffect(() => {
    if (isVersionMode) {
      return;
    }

    const nextAutoPlanTitle = buildDefaultPlanTitle(leaderName);
    if (!planTitle.trim() || planTitle === lastAutoPlanTitleRef.current) {
      setPlanTitle(nextAutoPlanTitle);
    }
    lastAutoPlanTitleRef.current = nextAutoPlanTitle;
  }, [isVersionMode, leaderName, planTitle]);

  useEffect(() => {
    if (!routePresetTemplateId) {
      return;
    }
    if (!routePresetOptions.some((template) => template.id === routePresetTemplateId)) {
      setRoutePresetTemplateId('');
    }
  }, [routePresetOptions, routePresetTemplateId]);

  useEffect(() => {
    if (!homeSelectedTemplateId) {
      return;
    }
    if (!homeTemplateOptions.some((template) => template.id === homeSelectedTemplateId)) {
      setHomeSelectedTemplateId('');
    }
  }, [homeSelectedTemplateId, homeTemplateOptions]);

  useEffect(() => {
    if (
      isWaitingForParentTransportGroupsRef.current &&
      parentVersion?.meta &&
      transportGroups.length !== parentVersion.meta.transportGroups.length
    ) {
      return;
    }
    isWaitingForParentTransportGroupsRef.current = false;

    setExternalTransfers((current) =>
      normalizeExternalTransfers(
        current.map((transfer) =>
          syncExternalTransferTeamSelection(
            {
              ...transfer,
              selectedTeamOrderIndexes: transfer.selectedTeamOrderIndexes.filter(
                (teamOrderIndex) => teamOrderIndex >= 0 && teamOrderIndex < transportGroups.length,
              ),
            },
            transportGroups,
          ),
        ),
      ),
    );
  }, [parentVersion?.meta, transportGroups]);

  const filteredLocations = locations;
  const filteredOvernightStays = overnightStays;
  const filteredOvernightStayConnections = overnightStayConnections;
  const activeDatePickerAnchorEl = datePickerTarget?.anchorEl ?? null;
  const activeDatePickerValue = useMemo(() => {
    if (!datePickerTarget) {
      return '';
    }

    switch (datePickerTarget.kind) {
      case 'travelStartDate':
        return travelStartDate;
      case 'travelEndDate':
        return travelEndDate;
      case 'flightInDate':
        return transportGroups[datePickerTarget.index]?.flightInDate ?? '';
      case 'flightOutDate':
        return transportGroups[datePickerTarget.index]?.flightOutDate ?? '';
      case 'pickupDate':
        return transportGroups[datePickerTarget.index]?.pickupDate ?? '';
      case 'dropDate':
        return transportGroups[datePickerTarget.index]?.dropDate ?? '';
    }
  }, [datePickerTarget, travelEndDate, travelStartDate, transportGroups]);
  const activeDatePickerTitle = useMemo(() => {
    if (!datePickerTarget) {
      return '날짜 선택';
    }

    switch (datePickerTarget.kind) {
      case 'travelStartDate':
        return '여행 시작일 선택';
      case 'travelEndDate':
        return '여행 종료일 선택';
      case 'flightInDate':
        return '항공권 IN 날짜 선택';
      case 'flightOutDate':
        return '항공권 OUT 날짜 선택';
      case 'pickupDate':
        return '픽업 날짜 선택';
      case 'dropDate':
        return '드랍 날짜 선택';
    }
  }, [datePickerTarget]);
  const activeTimePickerAnchorEl = timePickerTarget?.anchorEl ?? null;
  const activeTimePickerValue = useMemo(() => {
    if (!timePickerTarget) {
      return '';
    }

    switch (timePickerTarget.kind) {
      case 'flightInTime':
        return transportGroups[timePickerTarget.index]?.flightInTime ?? '';
      case 'flightOutTime':
        return transportGroups[timePickerTarget.index]?.flightOutTime ?? '';
      case 'pickupTime':
        return transportGroups[timePickerTarget.index]?.pickupTime ?? '';
      case 'dropTime':
        return transportGroups[timePickerTarget.index]?.dropTime ?? '';
    }
  }, [timePickerTarget, transportGroups]);
  const activeTimePickerTitle = useMemo(() => {
    if (!timePickerTarget) {
      return '시간 선택';
    }

    switch (timePickerTarget.kind) {
      case 'flightInTime':
        return '항공권 IN 시간 선택';
      case 'flightOutTime':
        return '항공권 OUT 시간 선택';
      case 'pickupTime':
        return '픽업 시간 선택';
      case 'dropTime':
        return '드랍 시간 선택';
    }
  }, [timePickerTarget]);
  const activeTimePickerAllowedMinutes = useMemo(() => {
    if (!timePickerTarget) {
      return undefined;
    }

    switch (timePickerTarget.kind) {
      case 'flightInTime':
      case 'flightOutTime':
        return undefined;
      case 'pickupTime':
      case 'dropTime':
        return HALF_HOUR_MINUTE_OPTIONS;
    }
  }, [timePickerTarget]);

  const filteredSegments = segments;

  const allLocationById = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations],
  );
  const allLocationVersionById = useMemo(
    () =>
      new Map(
        locations.flatMap((location) =>
          location.variations.map((version) => [version.id, version] as const),
        ),
      ),
    [locations],
  );
  const locationById = useMemo(
    () => new Map(filteredLocations.map((location) => [location.id, location])),
    [filteredLocations],
  );
  const locationVersionById = useMemo(
    () =>
      new Map(
        filteredLocations.flatMap((location) =>
          location.variations.map((version) => [version.id, version] as const),
        ),
      ),
    [filteredLocations],
  );

  const firstDayOptions = useMemo(
    () => buildFirstDayOptions(firstDayScopedLocations),
    [firstDayScopedLocations],
  );

  const nextRouteDayIndex = 1 + getConsumedRouteDayCount(selectedRoute);
  const nextRouteDate = useMemo(
    () =>
      travelStartDate ? getRouteDateForDayIndex(travelStartDate, nextRouteDayIndex) : undefined,
    [nextRouteDayIndex, travelStartDate],
  );

  const nextOptions = useMemo(
    () =>
      buildNextOptions({
        filteredLocations,
        filteredSegments,
        filteredMultiDayBlockConnections: filteredOvernightStayConnections,
        selectedRoute,
        totalDays,
        variantType,
        targetDate: nextRouteDate,
      }),
    [
      filteredLocations,
      filteredOvernightStayConnections,
      filteredSegments,
      nextRouteDate,
      selectedRoute,
      totalDays,
      variantType,
    ],
  );

  const overnightStayOptions = useMemo(
    () =>
      buildMultiDayBlockOptions({
        filteredMultiDayBlocks: filteredOvernightStays,
        selectedRoute,
        totalDays,
      }),
    [filteredOvernightStays, selectedRoute, totalDays],
  );

  const autoRows = useMemo((): PlanRow[] => {
    const firstPickupTime = transportGroups[0]?.pickupTime?.trim() ?? '';
    const dropDate = transportGroups[0]?.dropDate?.trim() ?? '';
    const dropTime = transportGroups[0]?.dropTime?.trim() ?? '';
    const flightOutTime = transportGroups[0]?.flightOutTime?.trim() ?? '';
    const firstDayTimeOverride =
      (variantType === VariantType.Early || variantType === VariantType.EarlyExtend) &&
      firstPickupTime
        ? firstPickupTime
        : undefined;

    const baseRows = buildAutoRowsFromRoute({
      selectedRoute,
      filteredSegments,
      filteredMultiDayBlocks: filteredOvernightStays,
      filteredMultiDayBlockConnections: filteredOvernightStayConnections,
      locationById,
      locationVersionById,
      totalDays,
      variantType,
      travelStartDate,
      flightOutTime,
      firstDayTimeOverride,
    }).map((row) => ({
      ...row,
      lodgingSelectionLevel: 'LV3' as const,
      customLodgingId: undefined,
      customLodgingNameSnapshot: null,
    }));
    return applyLastDayAutoRowAdjustments(baseRows, {
      travelEndDate,
      dropDate,
      dropTime,
      flightOutTime,
    });
  }, [
    filteredOvernightStays,
    filteredOvernightStayConnections,
    filteredSegments,
    locationById,
    locationVersionById,
    selectedRoute,
    totalDays,
    transportGroups,
    travelStartDate,
    variantType,
  ]);

  const transportSuggestedVariant = useMemo(
    () => inferVariantTypeFromTransportGroups(transportGroups),
    [transportGroups],
  );

  useEffect(() => {
    if (suppressAutoRowsMergeOnceRef.current) {
      suppressAutoRowsMergeOnceRef.current = false;
      return;
    }
    if (skipNextAutoRowsSync) {
      setSkipNextAutoRowsSync(false);
      return;
    }
    if (regionSetId && routeGraphLoading) {
      return;
    }
    if (parentVersionId && skipAutoRowMergeForParentCloneRef.current) {
      return;
    }
    setPlanRows((current) => {
      const nextRows = mergeAutoRowsWithDirtyValues(
        current,
        autoRows,
        dirtyPlanRowFieldKeysRef.current,
      );
      return arePlanRowsEqual(current, nextRows) ? current : nextRows;
    });
  }, [autoRows, regionSetId, routeGraphLoading, skipNextAutoRowsSync]);

  useEffect(() => {
    if (!parentVersionId || !hasHydratedParentVersionRef.current) {
      return;
    }
    if (parentCloneScheduleBaselineRef.current !== null) {
      return;
    }
    if (selectedRoute.length === 0 || planRows.length === 0) {
      return;
    }
    parentCloneScheduleBaselineRef.current = {
      route: serializeSelectedRouteBaseline(selectedRoute),
      variantType,
      totalDays,
    };
  }, [parentVersionId, selectedRoute, variantType, totalDays, planRows.length]);

  useEffect(() => {
    if (!parentVersionId || !skipAutoRowMergeForParentCloneRef.current) {
      return;
    }
    const baseline = parentCloneScheduleBaselineRef.current;
    if (!baseline) {
      return;
    }
    const routeNow = serializeSelectedRouteBaseline(selectedRoute);
    if (
      routeNow !== baseline.route ||
      variantType !== baseline.variantType ||
      totalDays !== baseline.totalDays
    ) {
      skipAutoRowMergeForParentCloneRef.current = false;
    }
  }, [parentVersionId, selectedRoute, variantType, totalDays]);

  useEffect(() => {
    setExtraLodgingCounts((prev) =>
      Array.from({ length: totalDays }, (_, index) => prev[index] ?? 0),
    );
  }, [totalDays]);

  useEffect(() => {
    const hydrationPending =
      Boolean(parentVersionId) &&
      (parentVersionLoading || isWaitingForParentTransportGroupsRef.current);

    if (hydrationPending) {
      return;
    }

    if (!travelStartDate) {
      setTravelEndDate('');
      return;
    }

    const travelBaseline = parentCloneTravelDatesBaselineRef.current;
    const matchesTravelBaseline =
      travelBaseline != null &&
      travelStartDate === travelBaseline.travelStartDate &&
      totalDays === travelBaseline.totalDays;

    if (
      parentVersionId &&
      travelBaseline &&
      !hasEditedParentCloneTravelScheduleRef.current &&
      matchesTravelBaseline
    ) {
      return;
    }

    if (parentVersionId && travelBaseline && !matchesTravelBaseline) {
      hasEditedParentCloneTravelScheduleRef.current = true;
    }

    setTravelEndDate(toAutoTravelEndDate(travelStartDate, totalDays));
  }, [parentVersionId, parentVersionLoading, totalDays, travelStartDate]);

  const updateTransportGroup = <K extends keyof TransportGroupDraft>(
    index: number,
    field: K,
    value: TransportGroupDraft[K],
  ): void => {
    if (field === 'headcount') {
      setTransportGroups((current) => {
        if (usesTransportTeamHeadcountModal(current.length)) {
          return current;
        }
        const raw = typeof value === 'number' && Number.isFinite(value) ? value : 1;
        return applyPartitionHeadcountOnTeamEdit(current, index, raw, headcountTotal);
      });
      return;
    }

    setTransportGroups((current) =>
      current.map((group, groupIndex) => {
        if (groupIndex !== index) {
          return group;
        }

        const nextGroup = { ...group, [field]: value } as TransportGroupDraft;

        if (field === 'flightInDate') {
          if (!group.hasEditedPickup) {
            const nextFlightInDate = typeof value === 'string' ? value : group.flightInDate;
            const recommendedPickup = getRecommendedPickupSchedule(
              nextFlightInDate,
              nextGroup.flightInTime,
              travelStartDate,
            );
            nextGroup.pickupDate = recommendedPickup.date;
            if (!nextGroup.pickupTime.trim()) {
              nextGroup.pickupTime = recommendedPickup.time;
            }
          }
        }

        if (field === 'flightInTime') {
          if (!group.hasEditedPickup) {
            const nextFlightInTime = typeof value === 'string' ? value : group.flightInTime;
            const recommendedPickup = getRecommendedPickupSchedule(
              nextGroup.flightInDate,
              nextFlightInTime,
              travelStartDate,
            );
            nextGroup.pickupDate = recommendedPickup.date;
            nextGroup.pickupTime = recommendedPickup.time;
          }
        }

        if (field === 'flightOutDate') {
          if (!group.hasEditedDrop) {
            const recommendedDrop = getRecommendedDropSchedule(
              typeof value === 'string' ? value : group.flightOutDate,
              nextGroup.flightOutTime,
              travelEndDate,
            );
            nextGroup.dropDate = recommendedDrop.date;
            nextGroup.dropTime = recommendedDrop.time;
          }
        }

        if (field === 'flightOutTime') {
          if (!group.hasEditedDrop) {
            const recommendedDrop = getRecommendedDropSchedule(
              nextGroup.flightOutDate,
              typeof value === 'string' ? value : group.flightOutTime,
              travelEndDate,
            );
            nextGroup.dropDate = recommendedDrop.date;
            nextGroup.dropTime = recommendedDrop.time;
          }
        }

        if (field === 'flightInDate' || field === 'flightInTime') {
          nextGroup.hasEditedFlightIn = true;
        }
        if (field === 'flightOutDate' || field === 'flightOutTime') {
          nextGroup.hasEditedFlightOut = true;
        }

        if (field === 'pickupDate' || field === 'pickupTime') {
          nextGroup.hasEditedPickup = true;
        }

        if (field === 'dropDate' || field === 'dropTime') {
          nextGroup.hasEditedDrop = true;
        }

        if (field === 'pickupPlaceType' && value !== 'CUSTOM') {
          nextGroup.pickupPlaceCustomText = '';
        }

        if (field === 'dropPlaceType' && value !== 'CUSTOM') {
          nextGroup.dropPlaceCustomText = '';
        }

        return nextGroup;
      }),
    );
  };

  const removeTransportGroupAt = useCallback((index: number) => {
    setTransportGroups((current) => buildTransportGroupsAfterRemoveTeam(current, index, headcountTotal));
    setManualPricing((current) => remapManualPricingAfterTransportGroupRemoved(current, index));
    setManualPricingSplitTeamRows(false);
  }, [headcountTotal]);

  const addTransportGroup = useCallback(() => {
    let didAdd = false;
    setTransportGroups((current) => {
      const next = buildTransportGroupsAfterAddTeam(current, headcountTotal, travelStartDate, travelEndDate);
      if (!next) {
        window.alert(
          '전체 인원은 팀 수 이상이어야 합니다. 인원을 늘리거나 팀을 줄여 주세요.',
        );
        return current;
      }
      didAdd = true;
      return next;
    });
    if (didAdd) {
      setManualPricingSplitTeamRows(false);
    }
  }, [headcountTotal, travelStartDate, travelEndDate]);

  const clearTransportGroupFlightIn = (index: number): void => {
    setTransportGroups((current) =>
      current.map((group, groupIndex) => {
        if (groupIndex !== index) {
          return group;
        }
        const nextGroup: TransportGroupDraft = {
          ...group,
          flightInDate: '',
          flightInTime: '',
          hasEditedFlightIn: true,
        };
        if (!group.hasEditedPickup) {
          const recommendedPickup = getRecommendedPickupSchedule('', '', travelStartDate);
          nextGroup.pickupDate = recommendedPickup.date;
          nextGroup.pickupTime = recommendedPickup.time;
        }
        return nextGroup;
      }),
    );
  };

  const clearTransportGroupFlightOut = (index: number): void => {
    setTransportGroups((current) =>
      current.map((group, groupIndex) => {
        if (groupIndex !== index) {
          return group;
        }
        const nextGroup: TransportGroupDraft = {
          ...group,
          flightOutDate: '',
          flightOutTime: '',
          hasEditedFlightOut: true,
        };
        if (!group.hasEditedDrop) {
          const recommendedDrop = getRecommendedDropSchedule('', '', travelEndDate);
          nextGroup.dropDate = recommendedDrop.date;
          nextGroup.dropTime = recommendedDrop.time;
        }
        return nextGroup;
      }),
    );
  };

  const saveTransportTeamHeadcounts = useCallback((counts: number[]): void => {
    setTransportGroups((current) => applyTeamHeadcountsToGroups(current, counts));
    setTransportTeamHeadcountModalOpen(false);
  }, []);

  const resyncTransportGroupTravelSchedule = useCallback(
    (index: number): void => {
      setTransportGroups((current) =>
        current.map((group, groupIndex) =>
          groupIndex === index
            ? applyTransportGroupTravelDateSync(
                group,
                { travelStartDate, travelEndDate },
                { clearManualPins: true },
              )
            : group,
        ),
      );
    },
    [travelEndDate, travelStartDate],
  );

  const handleToggleParticipationEvent = useCallback(
    (eventId: string) => {
      const shouldPromptResync =
        manualPricing.enabled && hasManualSecurityDepositOverride(manualPricing);

      if (!shouldPromptResync) {
        setEventIds((prev) =>
          prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId],
        );
        return;
      }

      setEventSecurityResyncModalEventId(eventId);
    },
    [manualPricing],
  );

  const applyParticipationEventToggle = useCallback(
    (eventId: string, resyncSecurityDeposit: boolean) => {
      if (resyncSecurityDeposit) {
        setManualPricing((current) => resetManualPricingSecurityDeposit(current));
      }
      setEventIds((prev) =>
        prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId],
      );
    },
    [],
  );

  const closeEventSecurityResyncModal = useCallback(() => {
    setEventSecurityResyncModalEventId(null);
  }, []);

  const handleEventSecurityResyncCancel = useCallback(() => {
    if (eventSecurityResyncModalEventId === null) {
      return;
    }
    applyParticipationEventToggle(eventSecurityResyncModalEventId, false);
    closeEventSecurityResyncModal();
  }, [
    applyParticipationEventToggle,
    closeEventSecurityResyncModal,
    eventSecurityResyncModalEventId,
  ]);

  const handleEventSecurityResyncConfirm = useCallback(() => {
    if (eventSecurityResyncModalEventId === null) {
      return;
    }
    applyParticipationEventToggle(eventSecurityResyncModalEventId, true);
    closeEventSecurityResyncModal();
  }, [
    applyParticipationEventToggle,
    closeEventSecurityResyncModal,
    eventSecurityResyncModalEventId,
  ]);

  const eventSecurityResyncModalEventName = useMemo(() => {
    if (eventSecurityResyncModalEventId === null) {
      return null;
    }
    return eventOptions.find((option) => option.id === eventSecurityResyncModalEventId)?.name ?? null;
  }, [eventOptions, eventSecurityResyncModalEventId]);

  const handleDatePickerChange = (nextIsoDate: string): void => {
    if (!datePickerTarget) {
      return;
    }

    switch (datePickerTarget.kind) {
      case 'travelStartDate':
        setTravelStartDate(nextIsoDate);
        return;
      case 'travelEndDate':
        setTravelEndDate(nextIsoDate);
        return;
      case 'flightInDate':
        updateTransportGroup(datePickerTarget.index, 'flightInDate', nextIsoDate);
        return;
      case 'flightOutDate':
        updateTransportGroup(datePickerTarget.index, 'flightOutDate', nextIsoDate);
        return;
      case 'pickupDate':
        updateTransportGroup(datePickerTarget.index, 'pickupDate', nextIsoDate);
        return;
      case 'dropDate':
        updateTransportGroup(datePickerTarget.index, 'dropDate', nextIsoDate);
        return;
    }
  };

  const handleTimePickerChange = (nextTime: string): void => {
    if (!timePickerTarget) {
      return;
    }

    switch (timePickerTarget.kind) {
      case 'flightInTime':
        updateTransportGroup(timePickerTarget.index, 'flightInTime', nextTime);
        return;
      case 'flightOutTime':
        updateTransportGroup(timePickerTarget.index, 'flightOutTime', nextTime);
        return;
      case 'pickupTime':
        updateTransportGroup(timePickerTarget.index, 'pickupTime', nextTime);
        return;
      case 'dropTime':
        updateTransportGroup(timePickerTarget.index, 'dropTime', nextTime);
        return;
    }
  };

  useEffect(() => {
    const hydrationPending =
      Boolean(parentVersionId) &&
      (parentVersionLoading || isWaitingForParentTransportGroupsRef.current);
    const travelBaseline = parentCloneTravelDatesBaselineRef.current;
    const matchesTravelBaseline =
      travelBaseline != null &&
      travelStartDate === travelBaseline.travelStartDate &&
      totalDays === travelBaseline.totalDays;
    const preserveParentTransportTravelSync =
      Boolean(parentVersionId) &&
      !hasEditedParentCloneTravelScheduleRef.current &&
      matchesTravelBaseline;

    if (hydrationPending || preserveParentTransportTravelSync) {
      return;
    }
    setTransportGroups((current) =>
      current.map((group, index) => {
        let nextGroup = { ...group };

        if (index === 0 && group.teamName.trim().length === 0) {
          nextGroup.teamName = getTransportGroupTeamName(index);
        }

        nextGroup = applyTransportGroupTravelDateSync(nextGroup, {
          travelStartDate,
          travelEndDate,
        });

        return nextGroup;
      }),
    );
  }, [parentVersionId, parentVersionLoading, totalDays, travelEndDate, travelStartDate]);

  useEffect(() => {
    const preserveParentCloneHeadcounts = shouldPreserveParentCloneTransportHeadcounts({
      parentVersionId,
      parentVersionLoading,
      isWaitingForParentTransportGroups: isWaitingForParentTransportGroupsRef.current,
      hasHydratedParentVersion: hasHydratedParentVersionRef.current,
    });

    setTransportGroups((current) => {
      if (current.length === 0) {
        if (preserveParentCloneHeadcounts) {
          return current;
        }
        return [
          createTransportGroupDraft({
            index: 0,
            headcount: headcountTotal,
            travelStartDate,
            travelEndDate,
          }),
        ];
      }

      const nextGroups = current.map((group, index) => {
        const nextGroup = { ...group };
        if (nextGroup.teamName.trim().length === 0) {
          nextGroup.teamName = getTransportGroupTeamName(index);
        }
        return nextGroup;
      });

      if (!preserveParentCloneHeadcounts) {
        const firstGroup = nextGroups[0];
        if (nextGroups.length === 1 && firstGroup && firstGroup.headcount !== headcountTotal) {
          nextGroups[0] = { ...firstGroup, headcount: headcountTotal };
        }
      }

      return nextGroups;
    });
  }, [headcountTotal, parentVersionId, parentVersionLoading, travelEndDate, travelStartDate]);

  useEffect(() => {
    const nextVariantType = computeAutoVariantSyncUpdate(
      variantTypeManualLocked,
      variantType,
      transportGroups,
    );
    if (nextVariantType !== null) {
      setVariantType(nextVariantType);
    }
  }, [transportGroups, variantType, variantTypeManualLocked]);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLTextAreaElement>('[data-plan-cell="true"]');
    elements.forEach((element) => autoResizeTextarea(element));
  }, [planRows]);

  useEffect(() => {
    if (!hasValidContext || createdId) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (
        !regionSetId &&
        !travelStartDate &&
        !travelEndDate &&
        totalDays === 6 &&
        headcountTotal === 6 &&
        headcountMale === buildDefaultMaleHeadcount(6) &&
        vehicleAssignments.length === 1 &&
        vehicleAssignments[0]?.vehicleType === '스타렉스' &&
        vehicleAssignments[0]?.count === 1 &&
        transportGroups.length === 1 &&
        !transportGroups[0]?.flightInDate?.trim() &&
        !transportGroups[0]?.flightOutDate?.trim() &&
        !transportGroups[0]?.flightInTime?.trim() &&
        !transportGroups[0]?.flightOutTime?.trim() &&
        !transportGroups[0]?.pickupDate &&
        !transportGroups[0]?.pickupTime &&
        transportGroups[0]?.pickupPlaceType === DEFAULT_PICKUP_DROP_PLACE_TYPE &&
        !transportGroups[0]?.pickupPlaceCustomText &&
        !transportGroups[0]?.dropDate &&
        !transportGroups[0]?.dropTime &&
        transportGroups[0]?.dropPlaceType === DEFAULT_PICKUP_DROP_PLACE_TYPE &&
        !transportGroups[0]?.dropPlaceCustomText &&
        externalTransfers.length === 0 &&
        !specialNote.trim() &&
        includeRentalItems &&
        rentalItemsText.trim() === buildRentalItemsText(headcountTotal).trim() &&
        eventIds.length === 0 &&
        !remark.trim() &&
        selectedRoute.length === 0 &&
        planRows.length === 0 &&
        extraLodgingCounts.every((count) => count === 0) &&
        manualAdjustments.length === 0 &&
        !manualDepositInput.trim() &&
        !routePresetTemplateId &&
        !changeNote.trim() &&
        (isVersionMode || planTitle.trim() === buildDefaultPlanTitle(leaderName))
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [
    changeNote,
    createdId,
    eventIds,
    externalTransfers.length,
    extraLodgingCounts,
    buildRentalItemsText,
    hasValidContext,
    headcountMale,
    headcountTotal,
    includeRentalItems,
    isVersionMode,
    leaderName,
    manualAdjustments,
    manualDepositInput,
    planRows.length,
    planTitle,
    regionSetId,
    remark,
    rentalItemsText,
    routePresetTemplateId,
    selectedRoute.length,
    specialNote,
    totalDays,
    transportGroups,
    travelEndDate,
    travelStartDate,
    vehicleAssignments,
  ]);

  const updateCell = (rowIndex: number, field: keyof PlanRow, value: string): void => {
    dirtyPlanRowFieldKeysRef.current.add(getDirtyPlanRowFieldKey(rowIndex, field));
    setPlanRows((prev) =>
      prev.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row)),
    );
  };

  const updateMovementIntensityColorOverride = (rowIndex: number, value: string | null): void => {
    dirtyPlanRowFieldKeysRef.current.add(
      getDirtyPlanRowFieldKey(rowIndex, 'movementIntensityColorOverride'),
    );
    setPlanRows((prev) =>
      prev.map((row, index) =>
        index === rowIndex ? { ...row, movementIntensityColorOverride: value } : row,
      ),
    );
  };

  const updateMealCellField = (
    rowIndex: number,
    field: keyof MealCellFields,
    value: string,
  ): void => {
    dirtyPlanRowFieldKeysRef.current.add(getDirtyPlanRowFieldKey(rowIndex, 'mealCellText'));
    setPlanRows((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) {
          return row;
        }
        const nextMealFields = {
          ...parseMealCellText(row.mealCellText),
          [field]: value,
        };
        return {
          ...row,
          mealCellText: toMealCellText(nextMealFields),
        };
      }),
    );
  };

  const openLodgingUpgradeModal = (focusPlanRowIndex: number | null = null): void => {
    setLodgingUpgradeModalState({ open: true, focusPlanRowIndex });
  };

  const applyLodgingSelection = (
    rowIndex: number,
    level: LodgingSelectionLevel,
    customLodging?: RegionLodgingOption | null,
  ): void => {
    dirtyPlanRowFieldKeysRef.current.add(
      getDirtyPlanRowFieldKey(rowIndex, 'lodgingSelectionLevel'),
    );
    dirtyPlanRowFieldKeysRef.current.add(getDirtyPlanRowFieldKey(rowIndex, 'customLodgingId'));
    dirtyPlanRowFieldKeysRef.current.add(
      getDirtyPlanRowFieldKey(rowIndex, 'customLodgingNameSnapshot'),
    );
    dirtyPlanRowFieldKeysRef.current.add(getDirtyPlanRowFieldKey(rowIndex, 'lodgingCellText'));
    setPlanRows((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) {
          return row;
        }

        const baseLodgingName = toLodgingCell(
          row.locationVersionId ? locationVersionById.get(row.locationVersionId) : undefined,
        );
        const customLodgingName =
          level === 'CUSTOM'
            ? customLodging
              ? formatRegionLodgingDisplayLabel(customLodging)
              : (row.customLodgingNameSnapshot ?? '')
            : null;
        const lodgingCellText =
          level === row.lodgingSelectionLevel
            ? row.lodgingCellText
            : buildLodgingCellText({
                level,
                baseLodgingName,
                customLodgingName,
              });

        return {
          ...row,
          lodgingSelectionLevel: level,
          customLodgingId:
            level === 'CUSTOM' ? (customLodging?.id ?? row.customLodgingId) : undefined,
          customLodgingNameSnapshot: customLodgingName,
          lodgingCellText,
        };
      }),
    );
  };

  const lodgingSelections = useMemo(
    () =>
      planRows
        .filter((row) => isMainPlanStopRow(row))
        .map((row, index) => ({
          dayIndex: index + 1,
          level: row.lodgingSelectionLevel,
          customLodgingId: row.lodgingSelectionLevel === 'CUSTOM' ? row.customLodgingId : undefined,
        })),
    [planRows],
  );
  const lodgingUpgradeRows = useMemo(() => {
    let dayIndex = 0;

    return planRows.flatMap((row, planRowIndex) => {
      if (!isMainPlanStopRow(row)) {
        return [];
      }

      dayIndex += 1;

      return [{
        dayIndex,
        planRowIndex,
        locationLabel: formatLocationNameInline(
          locationById.get(row.locationId ?? '')?.name ?? row.locationId ?? '목적지 미정',
        ),
        lodgingSelectionLevel: row.lodgingSelectionLevel,
        lodgingCellText: row.lodgingCellText,
        customLodgingId: row.customLodgingId,
      }];
    });
  }, [locationById, planRows]);
  const selectedLodgingUpgradeRow = useMemo(
    () =>
      lodgingSelectionModalState.rowIndex === null
        ? null
        : (lodgingUpgradeRows.find((row) => row.planRowIndex === lodgingSelectionModalState.rowIndex) ?? null),
    [lodgingSelectionModalState.rowIndex, lodgingUpgradeRows],
  );
  const planStopInputs = useMemo(
    () =>
      planRows.map((row) => ({
        rowType: row.rowType,
        segmentId: row.segmentId,
        segmentVersionId: row.segmentVersionId,
        overnightStayId: row.overnightStayId,
        overnightStayDayOrder: row.overnightStayDayOrder,
        multiDayBlockId: row.multiDayBlockId,
        multiDayBlockDayOrder: row.multiDayBlockDayOrder,
        multiDayBlockConnectionId: row.multiDayBlockConnectionId,
        multiDayBlockConnectionVersionId: row.multiDayBlockConnectionVersionId,
        locationId: row.locationId,
        locationVersionId: row.locationVersionId,
        movementIntensity: row.movementIntensity ?? null,
        movementIntensityColorOverride: row.movementIntensityColorOverride ?? null,
        dateCellText: row.dateCellText,
        destinationCellText: row.destinationCellText,
        timeCellText: row.timeCellText,
        scheduleCellText: row.scheduleCellText,
        lodgingCellText: row.lodgingCellText,
        mealCellText: row.mealCellText,
      })),
    [planRows],
  );
  const normalizedExternalTransfers = useMemo(
    () => normalizeExternalTransfers(externalTransfers),
    [externalTransfers],
  );
  const mergedPlanStops = useMemo(
    () => buildMergedPlanStops(planStopInputs, normalizedExternalTransfers, transportGroups),
    [normalizedExternalTransfers, planStopInputs, transportGroups],
  );
  const planStopsForMutation = useMemo(
    () =>
      mergedPlanStops.map((row) => {
        const overnightStayId = 'overnightStayId' in row ? row.overnightStayId : undefined;
        const overnightStayDayOrder =
          'overnightStayDayOrder' in row ? row.overnightStayDayOrder : undefined;
        return {
          rowType: row.rowType,
          segmentId: 'segmentId' in row ? row.segmentId ?? undefined : undefined,
          segmentVersionId: 'segmentVersionId' in row ? row.segmentVersionId ?? undefined : undefined,
          multiDayBlockId:
            'multiDayBlockId' in row ? row.multiDayBlockId ?? undefined : overnightStayId ?? undefined,
          multiDayBlockDayOrder:
            'multiDayBlockDayOrder' in row
              ? row.multiDayBlockDayOrder ?? undefined
              : overnightStayDayOrder ?? undefined,
          multiDayBlockConnectionId:
            'multiDayBlockConnectionId' in row ? row.multiDayBlockConnectionId ?? undefined : undefined,
          multiDayBlockConnectionVersionId:
            'multiDayBlockConnectionVersionId' in row ? row.multiDayBlockConnectionVersionId ?? undefined : undefined,
          locationId: row.locationId ?? undefined,
          locationVersionId: 'locationVersionId' in row ? row.locationVersionId ?? undefined : undefined,
          movementIntensity: row.movementIntensity ?? null,
          movementIntensityColorOverride:
            'movementIntensityColorOverride' in row ? row.movementIntensityColorOverride ?? null : null,
          dateCellText: row.dateCellText,
          destinationCellText: row.destinationCellText,
          timeCellText: row.timeCellText,
          scheduleCellText: row.scheduleCellText,
          lodgingCellText: row.lodgingCellText,
          mealCellText: row.mealCellText,
        };
      }),
    [mergedPlanStops],
  );
  const mainPlanRowPhysicalIndexes = useMemo(
    () => buildMainPlanRowPhysicalIndexes(planRows),
    [planRows],
  );
  const displayPlanRows = useMemo(() => {
    let mainRowIndex = 0;
    return buildMergedPlanStops(planRows, normalizedExternalTransfers, transportGroups).map((row) => {
      if (row.rowType === 'EXTERNAL_TRANSFER') {
        return { row, mainRowIndex: null as number | null, planRowIndex: null as number | null };
      }

      const currentMainRowIndex = mainRowIndex;
      const planRowIndex = mainPlanRowPhysicalIndexes[currentMainRowIndex] ?? currentMainRowIndex;
      mainRowIndex += 1;
      return { row, mainRowIndex: currentMainRowIndex, planRowIndex };
    });
  }, [mainPlanRowPhysicalIndexes, normalizedExternalTransfers, planRows, transportGroups]);

  const applyTemplate = (template: PlanTemplateRow, withConfirm = true): void => {
    const builderAllowsEarly =
      variantType === VariantType.Early || variantType === VariantType.EarlyExtend;
    if (
      !builderAllowsEarly &&
      templateUsesEarlyFirstDay({
        template,
        locationById: allLocationById,
        locationVersionById: allLocationVersionById,
      })
    ) {
      window.alert(
        '이 템플릿은 1일차에 얼리 일정을 사용하고 있습니다. Variant를 얼리 또는 얼리+연장으로 바꾼 뒤 다시 불러와주세요.',
      );
      return;
    }

    if (
      withConfirm &&
      !window.confirm(`템플릿 \"${template.name}\"을(를) 현재 빌더에 적용할까요?`)
    ) {
      return;
    }

    const orderedStops = sortTemplateStops(template.planStops);
    if (orderedStops.length === 0) {
      return;
    }

    dirtyPlanRowFieldKeysRef.current.clear();
    setSkipNextAutoRowsSync(true);
    setRegionSetId(template.regionSetId);
    setTotalDays(template.totalDays);
    setSelectedRoute(
      buildSelectedRouteFromStops(
        orderedStops.map((stop) => ({
          segmentId: stop.segmentId,
          segmentVersionId: stop.segmentVersionId,
          overnightStayId: stop.overnightStayId,
          overnightStayDayOrder: stop.overnightStayDayOrder,
          multiDayBlockId: stop.multiDayBlockId,
          multiDayBlockDayOrder: stop.multiDayBlockDayOrder,
          multiDayBlockConnectionId: stop.multiDayBlockConnectionId,
          multiDayBlockConnectionVersionId: stop.multiDayBlockConnectionVersionId,
          locationId: stop.locationId,
          locationVersionId: stop.locationVersionId,
        })),
      ),
    );
    setIsMultiDayBlockSectionOpen(false);
    setPlanRows(
      orderedStops.map((stop) =>
        buildDefaultLodgingRow({
          segmentId: stop.segmentId ?? undefined,
          segmentVersionId: stop.segmentVersionId ?? undefined,
          overnightStayId: stop.overnightStayId ?? undefined,
          overnightStayDayOrder: stop.overnightStayDayOrder ?? undefined,
          multiDayBlockId: stop.multiDayBlockId ?? undefined,
          multiDayBlockDayOrder: stop.multiDayBlockDayOrder ?? undefined,
          multiDayBlockConnectionId: stop.multiDayBlockConnectionId ?? undefined,
          multiDayBlockConnectionVersionId: stop.multiDayBlockConnectionVersionId ?? undefined,
          locationId: stop.locationId ?? undefined,
          locationVersionId: stop.locationVersionId ?? undefined,
          movementIntensity: stop.movementIntensity ?? null,
          dateCellText: stop.dateCellText,
          destinationCellText: stop.destinationCellText,
          timeCellText: stop.timeCellText,
          scheduleCellText: stop.scheduleCellText,
          lodgingCellText: stop.lodgingCellText,
          mealCellText: stop.mealCellText,
          baseLodgingName: stop.lodgingCellText,
        }),
      ),
    );
  };

  useEffect(() => {
    if (!initialTemplateId || hasAppliedInitialTemplate) {
      return;
    }
    if (!templateById) {
      return;
    }

    setRoutePresetTemplateId(templateById.id);
    applyTemplate(templateById, false);
    setHasAppliedInitialTemplate(true);
  }, [hasAppliedInitialTemplate, initialTemplateId, templateById]);

  const extraLodgings = useMemo<ExtraLodgingRow[]>(
    () =>
      extraLodgingCounts
        .map((lodgingCount, index) => ({ dayIndex: index + 1, lodgingCount }))
        .filter((item) => item.lodgingCount > 0),
    [extraLodgingCounts],
  );
  const extraLodgingSummary = useMemo(
    () => ({
      activeDayCount: extraLodgings.length,
      totalCount: extraLodgings.reduce((sum, item) => sum + item.lodgingCount, 0),
    }),
    [extraLodgings],
  );

  const extraLodgingDayLabels = useMemo(
    () => planRows.filter((r) => isMainPlanStopRow(r)).map((r) => r.destinationCellText.trim()),
    [planRows],
  );

  const normalizedManualAdjustments = useMemo(
    () => manualAdjustments.map(toManualAdjustmentInput).filter((item): item is NonNullable<ReturnType<typeof toManualAdjustmentInput>> => item !== null),
    [manualAdjustments],
  );
  const normalizedManualPricing = useMemo(
    () => normalizeManualPricingState(manualPricing),
    [manualPricing],
  );

  const manualAdjustmentSummary = useMemo(() => {
    const validRows = manualAdjustments
      .map((item) => ({
        kind: item.kind,
        signedTotal: getManualAdjustmentSignedTotal(item),
      }))
      .filter((item): item is { kind: 'ADD' | 'DISCOUNT'; signedTotal: number } => item.signedTotal !== null);

    const addCount = validRows.filter((item) => item.kind === 'ADD').length;
    const discountCount = validRows.filter((item) => item.kind === 'DISCOUNT').length;
    const addTotal = validRows
      .filter((item) => item.kind === 'ADD')
      .reduce((sum, item) => sum + Math.abs(item.signedTotal), 0);
    const discountTotal = validRows
      .filter((item) => item.kind === 'DISCOUNT')
      .reduce((sum, item) => sum + Math.abs(item.signedTotal), 0);

    return { addCount, discountCount, addTotal, discountTotal };
  }, [manualAdjustments]);

  const normalizedManualDepositAmountKrw = useMemo(() => {
    if (!hasEditedManualDeposit) {
      return undefined;
    }

    const text = manualDepositInput.trim();
    if (text.length === 0) {
      return undefined;
    }

    const value = Number(text);
    if (!Number.isInteger(value) || value < 0) {
      return undefined;
    }

    return value;
  }, [hasEditedManualDeposit, manualDepositInput]);

  const draftExternalPickupText = useMemo(
    () => buildExternalTransferDirectionText(externalTransfersDraft, transportGroups, 'PICKUP'),
    [externalTransfersDraft, transportGroups],
  );
  const draftExternalDropText = useMemo(
    () => buildExternalTransferDirectionText(externalTransfersDraft, transportGroups, 'DROP'),
    [externalTransfersDraft, transportGroups],
  );

  const headcountFemale = headcountTotal - headcountMale;
  const applyHeadcountTotalChange = (nextTotal: number): void => {
    const previousTotal = headcountTotal;
    setRentalItemsText((currentText) =>
      buildRentalItemsTextForHeadcountChange({
        includeRentalItems,
        currentText,
        nextTotal,
        preset: currentRentalItemPreset,
      }),
    );
    setHeadcountTotal(nextTotal);
    setTransportGroups((current) => applyHeadcountTotalToTransportGroups(current, nextTotal));
    setHeadcountMale((current) =>
      hasEditedHeadcountMaleRef.current
        ? Math.min(current, nextTotal)
        : buildDefaultMaleHeadcount(nextTotal),
    );
    setVehicleAssignments((current) =>
      resolveVehicleAssignmentsForHeadcount(nextTotal, current, PLAN_VEHICLES, previousTotal),
    );
  };

  const handleConsultationApply = useCallback(
    (draft: ConsultationDraft) => {
      setLeaderName(draft.leaderName);
      applyHeadcountTotalChange(Math.max(1, Math.min(30, draft.headcountTotal)));
      hasEditedHeadcountMaleRef.current = true;
      setHeadcountMale(Math.max(0, Math.min(draft.headcountMale, draft.headcountTotal)));
      const nextRegionSetId = draft.regionSetId ?? null;
      if (nextRegionSetId) {
        setRegionSetId(nextRegionSetId);
        setSelectedRoute([]);
        dirtyPlanRowFieldKeysRef.current.clear();
        setPlanRows([]);
        setIsMultiDayBlockSectionOpen(false);
      }
      setTravelStartDate(draft.travelStartDate);
      setTravelEndDate(draft.travelEndDate);
      setTotalDays(Math.max(2, Math.min(12, draft.totalDays)));
      setSelectedRoute((prev) => trimRouteSelectionsToTotalDays(prev, draft.totalDays));
      const draftHeadcount = Math.max(1, Math.min(30, draft.headcountTotal));
      setVehicleAssignments(
        resolveVehicleAssignmentsForHeadcount(
          draftHeadcount,
          normalizeVehicleAssignments(null, draft.vehicleType),
          PLAN_VEHICLES,
        ),
      );
      setSpecialNote(draft.specialNote);
      setRemark(draft.remark);
      const primaryGroup = createTransportGroupDraft({
        index: 0,
        headcount: draft.headcountTotal,
        travelStartDate: draft.travelStartDate,
        travelEndDate: draft.travelEndDate,
        flightInDate: draft.flightInDate ?? '',
        flightInTime: draft.flightInTime ?? '',
        flightOutDate: draft.flightOutDate ?? '',
        flightOutTime: draft.flightOutTime ?? '',
      });
      setTransportGroups([
        {
          ...primaryGroup,
          pickupDate: draft.travelStartDate || primaryGroup.pickupDate,
          dropDate: draft.travelEndDate || primaryGroup.dropDate,
        },
      ]);
      setManualPricingSplitTeamRows(false);
      const recTemplateId = draft.recommendedTemplateId ?? null;
      if (recTemplateId) {
        setRoutePresetTemplateId(recTemplateId);
        pendingConsultationTemplateApplyIdRef.current = recTemplateId;
      } else {
        pendingConsultationTemplateApplyIdRef.current = null;
      }
    },
    [applyHeadcountTotalChange],
  );

  useEffect(() => {
    const id = pendingConsultationTemplateApplyIdRef.current;
    if (!id) {
      return;
    }
    const template = routePresetOptions.find((t) => t.id === id);
    if (!template) {
      return;
    }
    pendingConsultationTemplateApplyIdRef.current = null;
    applyTemplate(template, false);
  }, [routePresetOptions, applyTemplate]);

  const canPreviewPricing = useMemo(
    () =>
      Boolean(
        regionSetId &&
        travelStartDate &&
        !manualAdjustments.some((item) => !isManualAdjustmentRowValid(item)) &&
        !lodgingSelections.some(
          (item) =>
            item.level === 'CUSTOM' &&
            (!item.customLodgingId || item.customLodgingId.trim().length === 0),
        ) &&
        !normalizedExternalTransfers.some((t) => !isExternalTransferComplete(t)) &&
        validateHiaceHeadcountForAssignments(vehicleAssignments, headcountTotal) === null,
      ),
    [
      regionSetId,
      travelStartDate,
      manualAdjustments,
      lodgingSelections,
      normalizedExternalTransfers,
      vehicleAssignments,
      headcountTotal,
    ],
  );

  const normalizedTransportGroups = useMemo(
    () => transportGroups.map((group) => toEstimateTransportGroup(group)),
    [transportGroups],
  );
  const primaryTransportGroup = normalizedTransportGroups[0];

  const {
    data: pricingPreviewData,
    previousData: pricingPreviewPreviousData,
    error: pricingPreviewError,
  } = useQuery<{ planPricingPreview: PricingPreviewRow }>(PLAN_PRICING_PREVIEW_QUERY, {
    skip: !canPreviewPricing,
    variables: {
      input: {
        regionSetId,
        variantType,
        totalDays,
        planStops: planStopsForMutation,
        travelStartDate: toIsoDateTime(travelStartDate),
        headcountTotal,
        transportGroupCount: normalizedTransportGroups.length,
        transportGroups: normalizedTransportGroups.map(mapTransportGroupToPlanMutationInput),
        vehicleType,
        vehicleAssignments,
        includeRentalItems,
        eventIds,
        extraLodgings,
        lodgingSelections,
        externalTransfers: normalizedExternalTransfers,
        manualAdjustments: normalizedManualAdjustments,
        manualDepositAmountKrw: normalizedManualDepositAmountKrw,
      },
    },
  });

  const pricingPreview = useMemo(() => {
    const raw =
      pricingPreviewData?.planPricingPreview ?? pricingPreviewPreviousData?.planPricingPreview ?? null;
    if (!raw) {
      return null;
    }
    if (raw.teamPricings.length !== normalizedTransportGroups.length) {
      return null;
    }
    return raw;
  }, [
    pricingPreviewData?.planPricingPreview,
    pricingPreviewPreviousData?.planPricingPreview,
    normalizedTransportGroups.length,
  ]);
  const pricingPreviewContext = useMemo(
    () => ({
      headcountTotal,
      totalDays,
    }),
    [headcountTotal, totalDays],
  );
  const effectivePricingPreview = useMemo<EffectivePricingRow | null>(() => {
    if (!pricingPreview) {
      return null;
    }
    return buildEffectivePricing(
      pricingPreview,
      pricingPreviewContext,
      normalizedManualPricing.enabled ? toManualPricingSnapshot(normalizedManualPricing) : null,
      normalizedManualDepositAmountKrw,
    ) as unknown as EffectivePricingRow;
  }, [normalizedManualDepositAmountKrw, normalizedManualPricing, pricingPreview, pricingPreviewContext]);
  const estimatePricingUiTotals = useMemo(() => {
    if (!effectivePricingPreview) {
      return null;
    }
    return sliceEffectiveTotalsForUi(effectivePricingPreview as EffectivePricingResult);
  }, [effectivePricingPreview]);
  const displayedPricingAdjustmentLines = useMemo(
    () =>
      effectivePricingPreview
        ? buildDisplayedPricingAdjustmentLines(effectivePricingPreview as EffectivePricingResult)
        : [],
    [effectivePricingPreview],
  );
  const serializedManualPricingSnapshot = useMemo(() => {
    if (!normalizedManualPricing.enabled) {
      return undefined;
    }
    if (!effectivePricingPreview) {
      return {
        ...toManualPricingSnapshot(normalizedManualPricing),
        expandTeamPricingSummaryRows: manualPricingSplitTeamRows,
      };
    }
    const totals = estimatePricingUiTotals;
    const base = toManualPricingSnapshot(
      normalizedManualPricing,
      totals
        ? {
            baseAmountKrw: totals.baseAmountKrw,
            totalAmountKrw: totals.totalAmountKrw,
            depositAmountKrw: totals.depositAmountKrw,
            balanceAmountKrw: totals.balanceAmountKrw,
            securityDepositAmountKrw:
              totals.securityDepositMode === 'PER_PERSON'
                ? totals.securityDepositUnitPriceKrw
                : totals.securityDepositAmountKrw,
            securityDepositMode: totals.securityDepositMode,
          }
        : null,
    );
    const customerPricingSnapshot = buildCustomerPricingSnapshot(
      effectivePricingPreview as EffectivePricingResult,
      displayedPricingAdjustmentLines,
    );
    return {
      ...base,
      customerPricingSnapshot,
      expandTeamPricingSummaryRows: manualPricingSplitTeamRows,
    };
  }, [
    displayedPricingAdjustmentLines,
    effectivePricingPreview,
    estimatePricingUiTotals,
    normalizedManualPricing,
    manualPricingSplitTeamRows,
  ]);
  const hiddenManualPricingAutoLines = useMemo(
    () =>
      normalizedManualPricing.adjustmentLines.filter(
        (line): line is ManualPricingAdjustmentLineRow =>
          line.type === 'AUTO' && line.deleted === true && typeof line.rowKey === 'string',
      ),
    [normalizedManualPricing],
  );
  const fullTeamPricingRows = effectivePricingPreview?.teamPricings ?? [];
  const amountsDifferAcrossTeams = useMemo(
    () =>
      fullTeamPricingRows.length > 1
        ? shouldShowTeamPrefixInPricingSummary(fullTeamPricingRows, builderTeamPricingRowSummarySignature)
        : false,
    [fullTeamPricingRows],
  );
  const basesDifferAcrossTeams = useMemo(
    () => fullTeamPricingRows.length > 1 && shouldShowTeamPrefixForBaseAmount(fullTeamPricingRows),
    [fullTeamPricingRows],
  );
  const teamsForBaseAmountInput = useMemo(() => {
    if (fullTeamPricingRows.length <= 1) {
      return fullTeamPricingRows;
    }
    if (basesDifferAcrossTeams) {
      return fullTeamPricingRows;
    }
    if (manualPricing.enabled && manualPricingSplitTeamRows) {
      return fullTeamPricingRows;
    }
    return teamPricingsForBaseAmountDisplay(fullTeamPricingRows);
  }, [
    basesDifferAcrossTeams,
    fullTeamPricingRows,
    manualPricing.enabled,
    manualPricingSplitTeamRows,
  ]);
  const baseAmountInputShowTeamPrefix = teamsForBaseAmountInput.length > 1;
  const manualPricingBaseAmountCollapsed =
    manualPricing.enabled &&
    fullTeamPricingRows.length > 1 &&
    !basesDifferAcrossTeams &&
    teamsForBaseAmountInput.length === 1;
  const teamsForAmountSummaryGrid = useMemo(() => {
    if (fullTeamPricingRows.length <= 1) {
      return fullTeamPricingRows;
    }
    if (amountsDifferAcrossTeams) {
      return fullTeamPricingRows;
    }
    if (manualPricing.enabled && manualPricingSplitTeamRows) {
      return fullTeamPricingRows;
    }
    return teamPricingsForSummaryDisplay(fullTeamPricingRows, builderTeamPricingRowSummarySignature);
  }, [
    amountsDifferAcrossTeams,
    fullTeamPricingRows,
    manualPricing.enabled,
    manualPricingSplitTeamRows,
  ]);
  const pricingSummaryShowTeamPrefix = teamsForAmountSummaryGrid.length > 1;
  const manualPricingAmountSummaryCollapsed =
    manualPricing.enabled &&
    fullTeamPricingRows.length > 1 &&
    !amountsDifferAcrossTeams &&
    teamsForAmountSummaryGrid.length === 1;
  const allTeamOrderIndexesForSummarySync = useMemo(
    () => fullTeamPricingRows.map((t) => t.teamOrderIndex),
    [fullTeamPricingRows],
  );
  const { data: pricingPolicyManualPresetsData } = useQuery<PricingPolicyManualPresetQueryRow>(
    PRICING_POLICY_MANUAL_PRESETS_QUERY,
    {
      skip: !pricingPreview?.policyId,
      variables: { id: pricingPreview?.policyId ?? '' },
    },
  );
  const manualPresetOptions = useMemo<ManualAdjustmentPresetOption[]>(
    () =>
      (pricingPolicyManualPresetsData?.pricingPolicy?.rules ?? [])
        .filter(
          (rule): rule is PricingPolicyManualPresetRuleRow =>
            rule.priceItemPreset === 'MANUAL_PRESET' && rule.isEnabled && rule.amountKrw != null,
        )
        .map((rule) => ({
          id: rule.id,
          title: rule.title,
          kind: (rule.amountKrw ?? 0) < 0 ? 'DISCOUNT' : 'ADD',
          chargeScope: rule.chargeScope === 'TEAM' ? 'TEAM' : 'PER_PERSON',
          personMode: rule.personMode ?? 'SINGLE',
          amountKrw: Math.abs(rule.amountKrw ?? 0),
          customDisplayText: rule.customDisplayText ?? '',
        })),
    [pricingPolicyManualPresetsData],
  );

  const validationResults = useBuilderValidation({
    planRows,
    selectedRoute,
    filteredSegments,
    transportGroups,
    headcountTotal,
    headcountMale,
    vehicleType,
    vehicleAssignments,
    travelStartDate,
    travelEndDate,
    manualAdjustments,
    lodgingSelections,
    externalTransfers: normalizedExternalTransfers,
    hasEditedManualDeposit,
    manualDepositInput,
    pricingPreview: effectivePricingPreview,
    manualPricingEnabled: manualPricing.enabled,
    specialMealDestinationRules,
  });
  const validationErrors = validationResults.filter((r) => r.severity === 'error');
  const hasValidation = (id: string) => validationResults.some((r) => r.id === id);

  const pricingPreviewErrorMessage =
    pricingPreviewError?.graphQLErrors?.[0]?.message ??
    pricingPreviewError?.message ??
    '금액 미리보기 계산 중 오류가 발생했습니다.';

  useEffect(() => {
    if (!effectivePricingPreview || hasEditedManualDeposit) {
      return;
    }
    setManualDepositInput(String(effectivePricingPreview.depositAmountKrw));
  }, [effectivePricingPreview, hasEditedManualDeposit]);

  useEffect(() => {
    if (!isPreviewEnabled && activePane === 'preview') {
      setActivePane('builder');
    }
  }, [activePane, isPreviewEnabled]);

  const movementIntensityRowColorInvalidIndexes = useMemo(
    () =>
      planRows
        .map((row, index) => {
          const value = row.movementIntensityColorOverride?.trim();
          if (!value) {
            return null;
          }
          return isMovementIntensityPaletteColor(value, settingsMovementIntensityColors) ? null : index + 1;
        })
        .filter((x): x is number => x !== null),
    [planRows, settingsMovementIntensityColors],
  );
  const overallMovementIntensityColorOverrideInvalid = useMemo(() => {
    const value = overallMovementIntensityColorOverride?.trim();
    if (!value) {
      return false;
    }
    return !isMovementIntensityPaletteColor(value, settingsMovementIntensityColors);
  }, [overallMovementIntensityColorOverride, settingsMovementIntensityColors]);

  const canCreate = Boolean(
    hasPlanContext &&
    regionSetId &&
    leaderName.trim() &&
    validationErrors.length === 0 &&
    movementIntensityRowColorInvalidIndexes.length === 0 &&
    !overallMovementIntensityColorOverrideInvalid &&
    (includeRentalItems ? rentalItemsText.trim() : true) &&
    selectedRoute.length > 0 &&
    selectedRoute.every(isRouteSelectionStopComplete) &&
    getConsumedRouteDayCount(selectedRoute) === totalDays &&
    countMainPlanStopRows(planRows) === totalDays &&
    (!isVersionMode ? planTitle.trim() : true) &&
    (!isVersionMode
      ? !planDocumentNumberBase.trim() || /^[0-9]{9}$/.test(planDocumentNumberBase.trim())
      : true),
  );

  const planCreateBlockedReasons = useMemo(() => {
    if (isTemplateOnlyMode) {
      return [];
    }
    const reasons: string[] = [];
    if (!userId) {
      reasons.push('고객(userId)가 지정되지 않았습니다. 고객 상세 등에서 일정 빌더를 열어 주세요.');
    } else if (isVersionMode && !parentVersionId) {
      reasons.push('기준이 되는 플랜 버전이 없습니다. 플랜·버전 상세에서 다시 진입해 주세요.');
    }
    if (!regionSetId) {
      reasons.push('지역 세트를 선택해 주세요.');
    }
    if (!leaderName.trim()) {
      reasons.push('대표자명을 입력해 주세요.');
    }
    for (const err of validationResults) {
      if (err.severity !== 'error') continue;
      reasons.push(err.message);
    }
    if (movementIntensityRowColorInvalidIndexes.length > 0) {
      reasons.push(
        `행별 이동강도 색상은 전역 기본 5색 중 하나여야 합니다. (${movementIntensityRowColorInvalidIndexes.join(', ')}행)`,
      );
    }
    if (overallMovementIntensityColorOverrideInvalid) {
      reasons.push('전체 이동강도 색상은 전역 기본 5색 중 하나여야 합니다.');
    }
    if (includeRentalItems && !rentalItemsText.trim()) {
      reasons.push('렌탈 항목 포함이 켜져 있으면 렌탈 항목 내용을 입력해 주세요.');
    }
    if (selectedRoute.length === 0) {
      reasons.push('여행 루트에서 일정에 넣을 장소를 한 구간 이상 선택해 주세요.');
    } else {
      const incompleteStopIndexes = selectedRoute
        .map((stop, i) => (isRouteSelectionStopComplete(stop) ? null : i + 1))
        .filter((x): x is number => x !== null);
      if (incompleteStopIndexes.length > 0) {
        reasons.push(
          `루트 ${incompleteStopIndexes.join(', ')}번째 구간의 장소·버전 선택을 마쳐 주세요.`,
        );
      }
      const consumedDays = getConsumedRouteDayCount(selectedRoute);
      if (consumedDays !== totalDays) {
        reasons.push(
          `루트에서 채운 일수(${consumedDays}일)가 총 여행 일수(${totalDays}일)와 같아야 합니다.`,
        );
      }
    }
    const mainPlanDayCount = countMainPlanStopRows(planRows);
    if (mainPlanDayCount !== totalDays) {
      reasons.push(
        `일정표가 ${totalDays}일 분량으로 맞춰져야 합니다. (현재 본 일정 ${mainPlanDayCount}일)`,
      );
    }
    if (!isVersionMode && !planTitle.trim()) {
      reasons.push('Plan 제목을 입력해 주세요.');
    }
    if (
      !isVersionMode &&
      planDocumentNumberBase.trim() &&
      !/^[0-9]{9}$/.test(planDocumentNumberBase.trim())
    ) {
      reasons.push('문서번호 기준은 비워 두거나 9자리 숫자만 입력할 수 있습니다.');
    }
    return reasons;
  }, [
    isTemplateOnlyMode,
    userId,
    isVersionMode,
    parentVersionId,
    regionSetId,
    leaderName,
    validationResults,
    includeRentalItems,
    rentalItemsText,
    selectedRoute,
    totalDays,
    planRows,
    planTitle,
    planDocumentNumberBase,
    movementIntensityRowColorInvalidIndexes.length,
    overallMovementIntensityColorOverrideInvalid,
  ]);
  const planCreateActionLabel = isVersionMode ? '새 버전 생성' : '생성';
  const shouldShowPlanCreateBlockedTooltip =
    !isTemplateOnlyMode && !canCreate && !creating && planCreateBlockedReasons.length > 0;
  const planCreateBlockedTooltipId = 'plan-create-blocked-tooltip';

  useEffect(() => {
    if (!shouldShowPlanCreateBlockedTooltip) {
      setIsCreateBlockedTooltipOpen(false);
    }
  }, [shouldShowPlanCreateBlockedTooltip]);

  const effectivePlanTitle = isVersionMode && planContext ? planContext.title : planTitle;
  const selectedEventNames = useMemo(
    () =>
      eventOptions
        .filter((eventOption) => eventIds.includes(eventOption.id))
        .map((eventOption) => eventOption.name),
    [eventIds, eventOptions],
  );
  const previewRegionName = useMemo(
    () => regionSets.find((set) => set.id === regionSetId)?.name ?? '',
    [regionSetId, regionSets],
  );
  const estimateGuidePageSplitsParsed = useMemo(() => {
    const p = parseEstimateGuidePageSplitsInput(estimateGuidePageSplitsText);
    return p && p.length > 0 ? p : null;
  }, [estimateGuidePageSplitsText]);
  const estimateDraftSnapshot = useMemo<EstimateBuilderDraftSnapshot>(
    () =>
      createEstimateDraftSnapshot({
        planTitle: effectivePlanTitle,
        leaderName: leaderName.trim(),
        regionName: previewRegionName,
        headcountTotal,
        headcountMale,
        headcountFemale,
        travelStartDate,
        travelEndDate,
        vehicleType,
        vehicleAssignments,
        transportGroups: normalizedTransportGroups,
        externalTransfers: normalizedExternalTransfers,
        specialNote: specialNote.trim(),
        includeRentalItems,
        rentalItemsText: rentalItemsText.trim(),
        eventNames: selectedEventNames,
        remark: remark.trim(),
        validUntilDate,
        planStops: mergedPlanStops,
        totalDays,
        pricingPreview: effectivePricingPreview,
        displayedPricingAdjustmentLines,
        expandTeamPricingSummaryRows: manualPricing.enabled && manualPricingSplitTeamRows,
        estimateGuideImagesPerPage,
        estimateGuidePageSplits: estimateGuidePageSplitsParsed,
        overallMovementIntensityColorOverride,
      }),
    [
      effectivePlanTitle,
      leaderName,
      previewRegionName,
      headcountTotal,
      headcountMale,
      headcountFemale,
      travelStartDate,
      travelEndDate,
      vehicleType,
      vehicleAssignments,
      normalizedTransportGroups,
      normalizedExternalTransfers,
      specialNote,
      includeRentalItems,
      rentalItemsText,
      selectedEventNames,
      remark,
      validUntilDate,
      mergedPlanStops,
      totalDays,
      effectivePricingPreview,
      displayedPricingAdjustmentLines,
      manualPricing.enabled,
      manualPricingSplitTeamRows,
      estimateGuideImagesPerPage,
      estimateGuidePageSplitsParsed,
      overallMovementIntensityColorOverride,
    ],
  );
  const { data: previewEstimateData, guidesLoading: previewGuidesLoading } =
    useBuilderEstimatePreview(estimateDraftSnapshot);

  const handlePreviewTransportGroupFieldChange: EstimatePage1Editor['onTransportGroupFieldChange'] =
    (index, field, value) => {
      updateTransportGroup(
        index,
        field as keyof TransportGroupDraft,
        value as TransportGroupDraft[keyof TransportGroupDraft],
      );
    };
  const previewPage1Editor: EstimatePage1Editor = {
    headcountTotal,
    headcountMale,
    travelStartDate,
    travelEndDate,
    vehicleType: vehicleDisplayText,
    vehicleAssignments,
    transportGroups: normalizedTransportGroups,
    eventIds,
    eventOptions: eventOptions.map((eventOption) => ({
      id: eventOption.id,
      name: eventOption.name,
    })),
    specialNoteText: specialNote,
    rentalItemsText,
    remarkText: remark,
    onHeadcountTotalChange: (value) => {
      const nextTotal = Math.max(1, value || 1);
      applyHeadcountTotalChange(nextTotal);
    },
    onHeadcountMaleChange: (value) => {
      hasEditedHeadcountMaleRef.current = true;
      const nextMale = Math.max(0, Math.min(value, headcountTotal));
      setHeadcountMale(nextMale);
    },
    onTravelStartDateChange: setTravelStartDate,
    onTravelEndDateChange: setTravelEndDate,
    onVehicleAssignmentsChange: setVehicleAssignments,
    onTransportGroupFieldChange: handlePreviewTransportGroupFieldChange,
    onAddTransportGroup: addTransportGroup,
    onRemoveTransportGroup: removeTransportGroupAt,
    onToggleEventId: handleToggleParticipationEvent,
    onSpecialNoteTextChange: setSpecialNote,
    onRentalItemsTextChange: (value) => {
      setIncludeRentalItems(true);
      setRentalItemsText(value);
    },
    onRemarkTextChange: setRemark,
  };
  const previewPage2Editor: EstimatePage2Editor = {
    onMovementIntensityColorOverrideChange: (mainRowIndex, color) => {
      updateMovementIntensityColorOverride(
        resolveMainPlanRowPhysicalIndex(planRows, mainRowIndex),
        color,
      );
    },
    onOverallMovementIntensityColorOverrideChange: (color) => {
      setOverallMovementIntensityColorOverride(color);
    },
  };

  if (!hasValidContext) {
    return (
      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">시작하기</h1>
          <p className="mt-1 text-sm text-slate-600">
            아래에서 고객 유형을 선택하면 다음 단계가 열립니다.
          </p>
        </header>

        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">고객 유형 선택</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setHomeEntryMode('new')}
              className={`min-h-[260px] rounded-2xl border p-6 text-left transition ${
                homeEntryMode === 'new'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-primary-500 hover:bg-primary-50'
              }`}
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="text-lg font-semibold">신규 고객</p>
                  <p
                    className={`mt-2 text-sm ${homeEntryMode === 'new' ? 'text-slate-100' : 'text-slate-600'}`}
                  >
                    고객을 새로 생성하고 일정 제작을 시작합니다.
                  </p>
                </div>
                <div
                  className={`text-xs font-medium ${homeEntryMode === 'new' ? 'text-slate-100' : 'text-slate-500'}`}
                >
                  선택
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="min-h-[260px] rounded-2xl border border-slate-200 bg-white p-6 text-left text-slate-900 transition hover:border-primary-500 hover:bg-primary-50"
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="text-lg font-semibold">기존 고객</p>
                  <p className="mt-2 text-sm text-slate-600">
                    고객 페이지로 이동해 기존 고객을 선택합니다.
                  </p>
                </div>
                <div className="text-xs font-medium text-slate-500">고객 페이지로 이동</div>
              </div>
            </button>
          </div>
        </Card>

        {homeEntryMode === 'new' ? (
          <>
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">1. 고객 생성</h2>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => navigate('/customers')}>
                      고객 목록
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setIsCreateUserModalOpen(true);
                        setHomeNewUserName('');
                        setHomeCreateUserError('');
                      }}
                    >
                      고객 생성
                    </Button>
                  </div>
                </div>
                {homeSelectedUserId ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    선택됨: {homeSelectedUserName || homeSelectedUserId}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">먼저 고객을 생성해 주세요.</p>
                )}
              </div>
            </Card>

            <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-3">
                <h2 className="text-sm font-semibold text-slate-900">2. 방법 선택</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900">빈 페이지 선택</h3>
                    <div className="mt-3">
                      <Button
                        disabled={!homeSelectedUserId}
                        onClick={() =>
                          navigate(
                            `/itinerary-builder?userId=${encodeURIComponent(homeSelectedUserId)}`,
                          )
                        }
                      >
                        빈 페이지로 시작
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900">템플릿에서 선택</h3>

                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-1 text-sm">
                        <span className="text-xs text-slate-600">지역 세트</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setHomeTemplateRegionSetId('')}
                            className={`rounded-xl border px-3 py-1.5 text-sm ${
                              homeTemplateRegionSetId === ''
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            전체
                          </button>
                          {regionSets
                            .filter((set) => set.isActive)
                            .map((set) => (
                              <button
                                key={`home-template-region-set-${set.id}`}
                                type="button"
                                onClick={() => setHomeTemplateRegionSetId(set.id)}
                                className={`rounded-xl border px-3 py-1.5 text-sm ${
                                  homeTemplateRegionSetId === set.id
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {set.name}
                              </button>
                            ))}
                        </div>
                      </div>
                      <div className="grid gap-1 text-sm">
                        <span className="text-xs text-slate-600">일수</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setHomeTemplateTotalDays(0)}
                            className={`rounded-xl border px-3 py-1.5 text-sm ${
                              homeTemplateTotalDays === 0
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            전체
                          </button>
                          {Array.from({ length: 12 }, (_, idx) => idx + 2).map((day) => (
                            <button
                              key={`home-template-day-${day}`}
                              type="button"
                              onClick={() => setHomeTemplateTotalDays(day)}
                              className={`rounded-xl border px-3 py-1.5 text-sm ${
                                homeTemplateTotalDays === day
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {day}일
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 max-h-48 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
                      <p className="px-1 text-xs text-slate-500">
                        총 {homeTemplateOptions.length}개의 템플릿
                      </p>
                      {homeTemplateOptions.map((template) => (
                        <div
                          key={`home-template-${template.id}`}
                          className={`flex items-center justify-between rounded-lg border px-2 py-1.5 ${
                            homeSelectedTemplateId === template.id
                              ? 'border-slate-900 bg-slate-100'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="text-xs text-slate-700">
                            <div className="font-medium text-slate-900">{template.name}</div>
                            <div>
                              {template.totalDays}일 · {template.isActive ? '활성' : '비활성'}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setHomeSelectedTemplateId(template.id)}
                          >
                            선택
                          </Button>
                        </div>
                      ))}
                      {homeTemplateOptions.length === 0 ? (
                        <p className="px-1 py-2 text-xs text-slate-500">
                          선택한 조건에 맞는 템플릿이 없습니다.
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <Button
                        disabled={!homeSelectedUserId || !homeSelectedTemplateId}
                        onClick={() =>
                          navigate(
                            `/itinerary-builder?userId=${encodeURIComponent(homeSelectedUserId)}&templateId=${encodeURIComponent(homeSelectedTemplateId)}`,
                          )
                        }
                      >
                        템플릿으로 시작
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </>
        ) : null}

        {isCreateUserModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <Card className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">고객 생성</h3>
              <p className="mt-1 text-sm text-slate-600">
                새 고객을 등록하면 바로 신규 고객 시작에 사용됩니다.
              </p>

              <div className="mt-4 grid gap-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-slate-600">고객명</span>
                  <input
                    value={homeNewUserName}
                    onChange={(event) => setHomeNewUserName(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="고객명 입력"
                  />
                </label>
                {homeCreateUserError ? (
                  <p className="text-xs text-rose-700">{homeCreateUserError}</p>
                ) : null}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateUserModalOpen(false);
                    setHomeCreateUserError('');
                  }}
                >
                  취소
                </Button>
                <Button
                  disabled={!homeNewUserName.trim() || creatingUser}
                  onClick={async () => {
                    const trimmedName = homeNewUserName.trim();
                    if (!trimmedName) {
                      return;
                    }

                    try {
                      const result = await createUser({
                        variables: {
                          input: {
                            name: trimmedName,
                            ownerEmployeeId: employee?.id ?? null,
                          },
                        },
                      });
                      const createdUserId = result.data?.createUser.id ?? '';
                      const createdUserName = result.data?.createUser.name ?? '';
                      if (createdUserId) {
                        setHomeSelectedUserId(createdUserId);
                        setHomeSelectedUserName(createdUserName);
                        setHomeEntryMode('new');
                      }
                      setHomeNewUserName('');
                      setHomeCreateUserError('');
                      setIsCreateUserModalOpen(false);
                    } catch (error) {
                      const message =
                        error instanceof Error ? error.message : '고객 생성에 실패했습니다.';
                      setHomeCreateUserError(message);
                    }
                  }}
                >
                  {creatingUser ? '생성 중...' : '생성'}
                </Button>
              </div>
            </Card>
          </div>
        ) : null}
      </section>
    );
  }

  if (isVersionMode && planContext && planContext.userId !== userId) {
    return (
      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-8">
        <Card className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <h1 className="text-xl font-semibold text-rose-900">유효하지 않은 요청입니다</h1>
          <p className="mt-2 text-sm text-rose-800">선택한 Plan과 userId가 일치하지 않습니다.</p>
          <div className="mt-4">
            <Button onClick={() => navigate('/customers')}>고객 목록으로 이동</Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <div
      className={`min-h-screen text-slate-900 ${isPreviewEnabled ? 'lg:h-screen lg:min-h-0' : ''}`}
    >
      <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          {isPreviewEnabled ? (
            <div className="grid flex-1 grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActivePane('builder')}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  activePane === 'builder' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                빌더
              </button>
              <button
                type="button"
                onClick={() => setActivePane('preview')}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  activePane === 'preview' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                미리보기
              </button>
            </div>
          ) : (
            <div className="flex-1 text-sm font-medium text-slate-700">빌더 전용 보기</div>
          )}
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => setIsPreviewEnabled((prev) => !prev)}
          >
            {isPreviewEnabled ? '미리보기 끄기' : '미리보기 켜기'}
          </Button>
        </div>
      </div>

      <div className={isPreviewEnabled ? 'lg:grid lg:h-full lg:grid-cols-2' : ''}>
        <div
          className={`${
            !isPreviewEnabled || activePane === 'builder' ? 'block' : 'hidden'
          } bg-slate-50 ${
            isPreviewEnabled
              ? 'border-b border-slate-200 lg:block lg:h-full lg:overflow-y-auto lg:border-b-0 lg:border-r'
              : ''
          }`}
        >
          <div
            className={`space-y-6 px-4 py-4 sm:px-6 lg:py-6 ${
              isPreviewEnabled ? 'lg:px-8' : 'mx-auto max-w-7xl lg:px-6'
            }`}
          >
            <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">여행 일정 빌더</h1>
              </div>
              <div className="flex max-w-xl flex-col items-stretch gap-2 md:items-end">
                <div className="relative flex flex-wrap justify-end gap-2 no-print">
                <Button variant="outline" onClick={() => setIsPreviewEnabled((prev) => !prev)}>
                  {isPreviewEnabled ? '미리보기 끄기' : '미리보기 켜기'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsConsultationPasteModalOpen(true)}
                  className="border-violet-600 bg-violet-600 font-medium text-white shadow-sm hover:border-violet-700 hover:bg-violet-700"
                >
                  상담 붙여넣기
                </Button>
                <Button
                  variant="primary"
                  disabled={!canCreate || creating}
                  onClick={async () => {
                    if (!canCreate) {
                      return;
                    }

                    setPlanSaveErrorMessages([]);

                    try {
                      if (isVersionMode) {
                        const result = await createPlanVersion({
                          variables: {
                            input: {
                              planId,
                              regionSetId,
                              parentVersionId,
                              variantType,
                              totalDays,
                              changeNote: changeNote.trim() || undefined,
                              meta: {
                                leaderName: leaderName.trim(),
                                travelStartDate: toIsoDateTime(travelStartDate),
                                travelEndDate: toIsoDateTime(travelEndDate),
                                headcountTotal,
                                headcountMale,
                                headcountFemale,
                                vehicleType,
                                vehicleAssignments,
                                ...primaryMetaFlightFields(primaryTransportGroup),
                                pickupDate: primaryTransportGroup?.pickupDate
                                  ? toIsoDateTime(primaryTransportGroup.pickupDate)
                                  : undefined,
                                pickupTime: primaryTransportGroup?.pickupTime.trim() || undefined,
                                dropDate: primaryTransportGroup?.dropDate
                                  ? toIsoDateTime(primaryTransportGroup.dropDate)
                                  : undefined,
                                dropTime: primaryTransportGroup?.dropTime.trim() || undefined,
                                pickupPlaceType:
                                  primaryTransportGroup?.pickupPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                pickupPlaceCustomText: normalizePickupDropCustomText(
                                  primaryTransportGroup?.pickupPlaceType ??
                                    DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                  primaryTransportGroup?.pickupPlaceCustomText,
                                ),
                                dropPlaceType:
                                  primaryTransportGroup?.dropPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                dropPlaceCustomText: normalizePickupDropCustomText(
                                  primaryTransportGroup?.dropPlaceType ??
                                    DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                  primaryTransportGroup?.dropPlaceCustomText,
                                ),
                                pickupDropNote: undefined,
                                externalPickupDropNote: undefined,
                                externalTransfers: normalizedExternalTransfers.map((transfer) => ({
                                  ...transfer,
                                  travelDate: toIsoDateTime(transfer.travelDate),
                                })),
                                specialNote: specialNote.trim() || undefined,
                                includeRentalItems,
                                rentalItemsText,
                                eventIds,
                                extraLodgings,
                                lodgingSelections,
                                transportGroups: normalizedTransportGroups.map((group) =>
                                  mapTransportGroupToPlanMutationInput(group),
                                ),
                                remark: remark.trim() || undefined,
                                estimateGuideImagesPerPage,
                                estimateGuidePageSplits: estimateGuidePageSplitsParsed ?? undefined,
                                movementIntensityColorOverride: overallMovementIntensityColorOverride,
                                validUntilDate: toIsoDateTime(validUntilDate),
                              },
                              planStops: planStopsForMutation,
                              manualAdjustments: normalizedManualAdjustments,
                              manualDepositAmountKrw: normalizedManualDepositAmountKrw,
                              manualPricing: serializedManualPricingSnapshot,
                            },
                          },
                        });

                        const createdVersionId = result.data?.createPlanVersion.id ?? '';
                        setCreatedId(createdVersionId);
                        if (createdVersionId) {
                          if (confirmedTripId) {
                            try {
                              await updateConfirmedTrip(confirmedTripId, {
                                planVersionId: createdVersionId,
                              });
                            } catch (error) {
                              setPlanSaveErrorMessages(mutationErrorMessages(error));
                              return;
                            }
                            setPlanSaveErrorMessages([]);
                            navigate(`/confirmed-trips/${confirmedTripId}`);
                            return;
                          }
                          setPlanSaveErrorMessages([]);
                          navigate(`/plans/${planId}/versions/${createdVersionId}`);
                        }
                        return;
                      }

                      const trimmedDocBase = planDocumentNumberBase.trim();
                      const result = await createPlan({
                        variables: {
                          input: {
                            userId,
                            regionSetId,
                            title: planTitle,
                            ...(trimmedDocBase.length > 0 ? { documentNumberBase: trimmedDocBase } : {}),
                            initialVersion: {
                              variantType,
                              totalDays,
                              changeNote: undefined,
                              meta: {
                                leaderName: leaderName.trim(),
                                travelStartDate: toIsoDateTime(travelStartDate),
                                travelEndDate: toIsoDateTime(travelEndDate),
                                headcountTotal,
                                headcountMale,
                                headcountFemale,
                                vehicleType,
                                vehicleAssignments,
                                ...primaryMetaFlightFields(primaryTransportGroup),
                                pickupDate: primaryTransportGroup?.pickupDate
                                  ? toIsoDateTime(primaryTransportGroup.pickupDate)
                                  : undefined,
                                pickupTime: primaryTransportGroup?.pickupTime.trim() || undefined,
                                dropDate: primaryTransportGroup?.dropDate
                                  ? toIsoDateTime(primaryTransportGroup.dropDate)
                                  : undefined,
                                dropTime: primaryTransportGroup?.dropTime.trim() || undefined,
                                pickupPlaceType:
                                  primaryTransportGroup?.pickupPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                pickupPlaceCustomText: normalizePickupDropCustomText(
                                  primaryTransportGroup?.pickupPlaceType ??
                                    DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                  primaryTransportGroup?.pickupPlaceCustomText,
                                ),
                                dropPlaceType:
                                  primaryTransportGroup?.dropPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                dropPlaceCustomText: normalizePickupDropCustomText(
                                  primaryTransportGroup?.dropPlaceType ??
                                    DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                  primaryTransportGroup?.dropPlaceCustomText,
                                ),
                                pickupDropNote: undefined,
                                externalPickupDropNote: undefined,
                                externalTransfers: normalizedExternalTransfers.map((transfer) => ({
                                  ...transfer,
                                  travelDate: toIsoDateTime(transfer.travelDate),
                                })),
                                specialNote: specialNote.trim() || undefined,
                                includeRentalItems,
                                rentalItemsText,
                                eventIds,
                                extraLodgings,
                                lodgingSelections,
                                transportGroups: normalizedTransportGroups.map((group) =>
                                  mapTransportGroupToPlanMutationInput(group),
                                ),
                                remark: remark.trim() || undefined,
                                estimateGuideImagesPerPage,
                                estimateGuidePageSplits: estimateGuidePageSplitsParsed ?? undefined,
                                movementIntensityColorOverride: overallMovementIntensityColorOverride,
                                validUntilDate: toIsoDateTime(validUntilDate),
                              },
                              planStops: planStopsForMutation,
                              manualAdjustments: normalizedManualAdjustments,
                              manualDepositAmountKrw: normalizedManualDepositAmountKrw,
                              manualPricing: serializedManualPricingSnapshot,
                            },
                          },
                        },
                      });

                      const createdPlan = result.data?.createPlan;
                      const createdPlanId = createdPlan?.id ?? '';
                      const linkedVersionId = createdPlan?.currentVersionId ?? '';
                      setCreatedId(createdPlanId);
                      if (createdPlanId) {
                        if (confirmedTripId) {
                          if (!linkedVersionId) {
                            setPlanSaveErrorMessages([
                              '생성된 견적 초기 버전 ID를 받지 못했습니다. 플랜 상세에서 수동으로 이 확정 건과 연결해 주세요.',
                            ]);
                            navigate(`/plans/${createdPlanId}`);
                            return;
                          }
                          try {
                            await updateConfirmedTrip(confirmedTripId, {
                              planVersionId: linkedVersionId,
                            });
                          } catch (error) {
                            setPlanSaveErrorMessages(mutationErrorMessages(error));
                            navigate(`/plans/${createdPlanId}`);
                            return;
                          }
                          setPlanSaveErrorMessages([]);
                          navigate(`/confirmed-trips/${confirmedTripId}`);
                          return;
                        }
                        setPlanSaveErrorMessages([]);
                        navigate(`/plans/${createdPlanId}`);
                      }
                    } catch (error) {
                      setPlanSaveErrorMessages(mutationErrorMessages(error));
                    }
                  }}
                >
                  {creating ? '저장 중...' : planCreateActionLabel}
                </Button>
                {shouldShowPlanCreateBlockedTooltip ? (
                  <>
                    <button
                      type="button"
                      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
                      aria-label={`${planCreateActionLabel} 제한 사유 ${planCreateBlockedReasons.length}개 보기`}
                      aria-expanded={isCreateBlockedTooltipOpen}
                      aria-controls={planCreateBlockedTooltipId}
                      onClick={() => setIsCreateBlockedTooltipOpen((prev) => !prev)}
                    >
                      <span aria-hidden="true">!</span>
                      <span className="absolute right-1 top-0.5 text-[10px] leading-none">
                        {planCreateBlockedReasons.length}
                      </span>
                    </button>
                    {isCreateBlockedTooltipOpen ? (
                      <div
                        id={planCreateBlockedTooltipId}
                        role="tooltip"
                        className="absolute right-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950 shadow-lg"
                      >
                        <p className="mb-1 font-medium">
                          {planCreateActionLabel}을 하려면 아래 {planCreateBlockedReasons.length}개를 완료해 주세요.
                        </p>
                        <ul className="list-inside list-disc space-y-0.5 text-amber-900">
                          {planCreateBlockedReasons.map((msg, index) => (
                            <li key={`${index}-${msg.slice(0, 48)}`}>{msg}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : null}
                </div>
                {planSaveErrorMessages.length > 0 ? (
                  <div
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
                    role="alert"
                  >
                    <p className="mb-1 font-medium text-rose-950">저장할 수 없습니다</p>
                    <ul className="list-inside list-disc space-y-0.5 text-rose-800">
                      {planSaveErrorMessages.map((msg, index) => (
                        <li key={`${index}-${msg.slice(0, 32)}`}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </header>

            {createdId ? (
              <Card>
                <p className="text-sm text-emerald-700">생성 완료: {createdId}</p>
              </Card>
            ) : null}

            {isTemplateOnlyMode ? (
              <Card className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                템플릿으로 진입한 상태입니다. Plan 생성은 고객 컨텍스트에서만 가능합니다.
              </Card>
            ) : null}

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    1
                  </span>
                  <span>기본정보</span>
                </h2>
                <div className="mt-4 grid gap-4 [&>*+*]:border-t [&>*+*]:border-slate-200 [&>*+*]:pt-4">
                  {isVersionMode ? (
                    <>
                      <PlanVersionContractCreateNotice documentNumber={parentVersion?.meta?.documentNumber} />
                      <label className="grid gap-1 text-sm">
                        <span className="text-xs text-slate-600">변경 메모</span>
                        <input
                          value={changeNote}
                          onChange={(event) => setChangeNote(event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="예: 숙소 동선 개선"
                        />
                      </label>
                    </>
                  ) : null}

                  <label className="grid gap-1 text-sm">
                    <span className="text-xs text-slate-600">대표자명</span>
                    <input
                      value={leaderName}
                      readOnly
                      disabled
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                      placeholder="고객명을 기준으로 자동 반영"
                    />
                  </label>

                  {!isVersionMode && hasPlanContext ? (
                    <label className="grid gap-1 text-sm">
                      <span className="text-xs text-slate-600">
                        제목 <span className="ml-1 text-slate-400">*우리끼리 구분용</span>
                      </span>
                      <input
                        value={planTitle}
                        onChange={(event) => setPlanTitle(event.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        placeholder={buildDefaultPlanTitle(leaderName)}
                      />
                    </label>
                  ) : null}

                  {!isVersionMode && hasPlanContext ? (
                    <label className="grid gap-1 text-sm">
                      <span className="text-xs text-slate-600">
                        문서번호 베이스 <span className="ml-1 text-slate-400">9자리 숫자, 비우면 자동</span>
                      </span>
                      <input
                        value={planDocumentNumberBase}
                        onChange={(event) => {
                          const next = event.target.value.replace(/\D/g, '').slice(0, 9);
                          setPlanDocumentNumberBase(next);
                        }}
                        inputMode="numeric"
                        autoComplete="off"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono tracking-wide"
                        placeholder="예: 260505001"
                      />
                    </label>
                  ) : null}

                  <div className="grid gap-1 text-sm">
                    <span className="text-xs text-slate-600">지역 세트</span>
                    <div className="flex flex-wrap content-start items-start gap-2">
                      {regionSets.map((set) => {
                        return (
                          <button
                            key={set.id}
                            type="button"
                            onClick={() => {
                              setRegionSetId(set.id);
                              setSelectedRoute([]);
                              dirtyPlanRowFieldKeysRef.current.clear();
                              setPlanRows([]);
                              setIsMultiDayBlockSectionOpen(false);
                            }}
                            className={`rounded-xl border px-3 py-1.5 text-left text-sm font-medium ${
                              regionSetId === set.id
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {set.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid w-full max-w-full gap-2 text-sm sm:max-w-[50%]">
                    <span className="text-xs text-slate-600">인원</span>
                    <div className="grid min-w-0 gap-3">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            const nextTotal = Math.max(1, headcountTotal - 1);
                            applyHeadcountTotalChange(nextTotal);
                          }}
                          disabled={headcountTotal <= 1}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="인원 감소"
                        >
                          -
                        </button>
                        <div className="min-w-0 flex-1 text-center text-base font-semibold text-slate-900">
                          {headcountTotal}명
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextTotal = Math.min(30, headcountTotal + 1);
                            applyHeadcountTotalChange(nextTotal);
                          }}
                          disabled={headcountTotal >= 30}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="인원 증가"
                        >
                          +
                        </button>
                      </div>
                      <div className="grid gap-2 pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-slate-600">성비 조절</div>
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              checked={headcountMale === 0}
                              onChange={(event) => {
                                hasEditedHeadcountMaleRef.current = true;
                                if (event.target.checked) {
                                  setHeadcountMale(0);
                                  return;
                                }
                                setHeadcountMale((prev) => (prev === 0 ? 1 : prev));
                              }}
                            />
                            남성없음
                          </label>
                        </div>
                        <div className="flex w-full flex-wrap gap-1">
                          {Array.from({ length: headcountTotal }, (_, index) => {
                            const count = index + 1;
                            const isMaleToken = count <= headcountMale;
                            return (
                              <button
                                key={`male-token-${count}`}
                                type="button"
                                onClick={() => {
                                  hasEditedHeadcountMaleRef.current = true;
                                  setHeadcountMale(count);
                                }}
                                className={`h-7 w-7 rounded-full border text-xs ${
                                  isMaleToken
                                    ? 'border-blue-700 bg-blue-600 text-white'
                                    : 'border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100'
                                }`}
                                title={
                                  isMaleToken ? `남 ${count}` : `여 ${count - headcountMale}`
                                }
                              >
                                {count}
                              </button>
                            );
                          })}
                        </div>
                        <div className="text-xs text-slate-600">
                          남 {headcountMale} / 여 {headcountFemale}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-1 text-sm">
                    <span className="text-xs text-slate-600">일수</span>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 12 }, (_, idx) => idx + 2).map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setTotalDays(day);
                            setSelectedRoute((prev) => trimRouteSelectionsToTotalDays(prev, day));
                            setIsMultiDayBlockSectionOpen(false);
                          }}
                          className={`rounded-xl border px-3 py-1.5 text-sm ${
                            totalDays === day
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {day}일
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2 text-sm">
                      <span className="text-xs text-slate-600">여행 기간</span>
                      <div className="grid gap-2">
                        <DateInputTrigger
                          value={travelStartDate}
                          placeholder="시작일 선택"
                          onClick={(event) =>
                            setDatePickerTarget({
                              kind: 'travelStartDate',
                              anchorEl: event.currentTarget,
                            })
                          }
                        />
                        <DateInputTrigger
                          value={travelEndDate}
                          placeholder="종료일 선택"
                          onClick={(event) =>
                            setDatePickerTarget({
                              kind: 'travelEndDate',
                              anchorEl: event.currentTarget,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-1 text-sm">
                      <span className="text-xs text-slate-600">차량</span>
                      <VehicleAssignmentsEditor
                        assignments={vehicleAssignments}
                        headcountTotal={headcountTotal}
                        onChange={setVehicleAssignments}
                      />
                      {hasValidation('hiace-headcount') ? (
                        <p className="text-xs text-rose-700">
                          하이에이스는 2인 이상부터 선택 가능하며, 7인 이상은 추가금이 없습니다.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">기본 대여물품</span>
                        <Button
                          variant="outline"
                          disabled={!includeRentalItems}
                          onClick={() =>
                            setRentalItemsText(buildRentalItemsText(headcountTotal))
                          }
                        >
                          초기화
                        </Button>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={includeRentalItems}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setIncludeRentalItems(checked);
                            if (!checked) {
                              setRentalItemsText('');
                            } else {
                              setRentalItemsText(buildRentalItemsText(headcountTotal));
                            }
                          }}
                        />
                        기본 물품 포함
                      </label>
                      <textarea
                        value={rentalItemsText}
                        onChange={(event) => setRentalItemsText(event.target.value)}
                        rows={4}
                        disabled={!includeRentalItems}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid gap-1 text-sm">
                      <span className="text-xs text-slate-600">참여 이벤트</span>
                      {travelStartDate && travelEndDate ? (
                        <RentalItemAvailabilityBadges
                          availability={rentalItemAvailability}
                          loading={rentalItemAvailabilityLoading}
                          compact
                          travelStartDate={travelStartDate}
                          travelEndDate={travelEndDate}
                        />
                      ) : (
                        <p className="text-xs text-slate-500">여행기간을 입력하면 장비 재고가 표시됩니다.</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {eventOptions.map((eventOption) => {
                          const active = eventIds.includes(eventOption.id);
                          const rentalAvailability = eventOption.tourListRentalItem
                            ? rentalItemAvailabilityByItem.get(eventOption.tourListRentalItem)
                            : null;
                          const rentalUnavailable = Boolean(
                            active &&
                              travelStartDate &&
                              travelEndDate &&
                              rentalAvailability &&
                              rentalAvailability.available <= 0,
                          );
                          return (
                            <button
                              key={eventOption.id}
                              type="button"
                              onClick={() => handleToggleParticipationEvent(eventOption.id)}
                              className={`rounded-xl border px-3 py-1.5 text-sm ${
                                rentalUnavailable
                                  ? 'border-rose-300 bg-rose-50 text-rose-800 ring-1 ring-rose-200'
                                  : active
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {eventOption.name}
                              {rentalUnavailable ? (
                                <span className="ml-1 text-xs font-medium">
                                  재고 부족
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                        {eventOptions.length === 0 ? (
                          <span className="text-xs text-slate-500">진행중 이벤트 없음</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <label className="grid gap-1 text-sm">
                    <span className="text-xs text-slate-600">
                      비고 <span className="ml-1 text-slate-400">*고객에게 노출됩니다</span>
                    </span>
                    <textarea
                      value={remark}
                      onChange={(event) => setRemark(event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="grid gap-1 text-sm">
                    <span className="text-xs text-slate-600">Variant</span>
                    <div className="flex flex-wrap gap-2">
                      {VARIANTS.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => {
                            setVariantTypeManualLocked(true);
                            setVariantType(variant.id);
                          }}
                          className={`rounded-xl border px-3 py-1.5 text-sm ${
                            variantType === variant.id
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {variant.label}
                        </button>
                      ))}
                    </div>
                    {variantTypeManualLocked &&
                    transportSuggestedVariant &&
                    transportSuggestedVariant !== variantType ? (
                      <p className="text-xs text-amber-700">
                        픽업/드랍 기준 추천은 {toVariantLabel(transportSuggestedVariant)}입니다. 현재 선택을
                        유지합니다.
                      </p>
                    ) : null}
                    {variantTypeManualLocked ? (
                      <button
                        type="button"
                        className="w-fit text-left text-xs text-slate-600 underline decoration-slate-400 hover:text-slate-900"
                        onClick={() => setVariantTypeManualLocked(false)}
                      >
                        운항 기준으로 다시 자동 맞춤
                      </button>
                    ) : null}
                  </div>
                </div>
              </Card>

              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    2
                  </span>
                  <span>항공 및 이동</span>
                </h2>
                <div className="mt-5 grid gap-5 [&>*+*]:border-t [&>*+*]:border-slate-200 [&>*+*]:pt-5">
                  <div className="grid gap-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-slate-600">팀별 항공 / 픽업 / 드랍</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {usesTransportTeamHeadcountModal(transportGroups.length) ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 shrink-0 whitespace-nowrap px-3 text-xs"
                            onClick={() => setTransportTeamHeadcountModalOpen(true)}
                          >
                            팀별 인원 설정
                          </Button>
                        ) : null}
                        <span className="text-[11px] text-slate-500">
                          「일정 연동」은 날짜만 여행 기간에 맞춥니다. 시각은 유지됩니다.
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {transportGroups.map((group, index) => (
                        <div
                          key={`transport-group-${index}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div>
                              {transportGroups.length > 1 ? (
                                <p className="text-sm font-semibold text-slate-900">
                                  {group.teamName || `${index + 1}번 팀`}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 shrink-0 whitespace-nowrap px-3 text-xs"
                                disabled={
                                  !travelStartDate ||
                                  !travelEndDate ||
                                  isTransportGroupTravelLinked(group, {
                                    travelStartDate,
                                    travelEndDate,
                                  })
                                }
                                onClick={() => resyncTransportGroupTravelSchedule(index)}
                              >
                                일정 연동
                              </Button>
                              {transportGroups.length > 1 ? (
                                <Button
                                  variant="outline"
                                  disabled={transportGroups.length <= 1}
                                  onClick={() => removeTransportGroupAt(index)}
                                >
                                  삭제
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          <div className="grid gap-3">
                            {transportGroups.length > 1 ? (
                              <div className="grid gap-2 md:grid-cols-2">
                                <label className="grid gap-1">
                                  <span className="text-xs text-slate-600">팀명</span>
                                  <input
                                    value={group.teamName}
                                    onChange={(event) =>
                                      updateTransportGroup(index, 'teamName', event.target.value)
                                    }
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                  />
                                </label>
                                <div className="grid gap-1">
                                  <span className="text-xs text-slate-600">인원</span>
                                  {usesTransportTeamHeadcountModal(transportGroups.length) ? (
                                    <div className="flex min-h-[42px] items-center rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900">
                                      {group.headcount}명
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateTransportGroup(index, 'headcount', group.headcount - 1)
                                        }
                                        disabled={group.headcount <= 1}
                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        aria-label={`${group.teamName || `${index + 1}번 팀`} 인원 감소`}
                                      >
                                        -
                                      </button>
                                      <div className="min-w-0 flex-1 text-center text-base font-semibold text-slate-900">
                                        {group.headcount}명
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateTransportGroup(index, 'headcount', group.headcount + 1)
                                        }
                                        disabled={
                                          group.headcount >=
                                          headcountTotal - (transportGroups.length - 1)
                                        }
                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        aria-label={`${group.teamName || `${index + 1}번 팀`} 인원 증가`}
                                      >
                                        +
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : null}

                            {!travelStartDate && !travelEndDate ? (
                              <p className="px-1 text-center text-xs font-medium text-emerald-700">
                                여행 기간을 먼저 선택해주면 자동으로 세팅돼요^^
                              </p>
                            ) : null}

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-slate-600">항공권 IN</span>
                                  <button
                                    type="button"
                                    onClick={() => clearTransportGroupFlightIn(index)}
                                    disabled={
                                      !group.flightInDate?.trim() && !group.flightInTime?.trim()
                                    }
                                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    미정
                                  </button>
                                </div>
                                <div className="grid gap-2">
                                  <DateInputTrigger
                                    value={group.flightInDate}
                                    onClick={(event) =>
                                      setDatePickerTarget({
                                        kind: 'flightInDate',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <TimeInputTrigger
                                    value={group.flightInTime}
                                    onClick={(event) =>
                                      setTimePickerTarget({
                                        kind: 'flightInTime',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    {FLIGHT_IN_TIME_OPTIONS.map((time) => (
                                      <button
                                        key={`builder-flight-in-${index}-${time}`}
                                        type="button"
                                        onClick={() =>
                                          updateTransportGroup(index, 'flightInTime', time)
                                        }
                                        className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                                          group.flightInTime === time
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        {time}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-slate-600">항공권 OUT</span>
                                  <button
                                    type="button"
                                    onClick={() => clearTransportGroupFlightOut(index)}
                                    disabled={
                                      !group.flightOutDate?.trim() && !group.flightOutTime?.trim()
                                    }
                                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    미정
                                  </button>
                                </div>
                                <div className="grid gap-2">
                                  <DateInputTrigger
                                    value={group.flightOutDate}
                                    onClick={(event) =>
                                      setDatePickerTarget({
                                        kind: 'flightOutDate',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <TimeInputTrigger
                                    value={group.flightOutTime}
                                    onClick={(event) =>
                                      setTimePickerTarget({
                                        kind: 'flightOutTime',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    {FLIGHT_OUT_TIME_OPTIONS.map((time) => (
                                      <button
                                        key={`builder-flight-out-${index}-${time}`}
                                        type="button"
                                        onClick={() =>
                                          updateTransportGroup(index, 'flightOutTime', time)
                                        }
                                        className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                                          group.flightOutTime === time
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        {time}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2">
                              <div className="grid gap-2">
                                <span className="text-xs text-slate-600">픽업</span>
                                <div className="grid gap-2">
                                  <DateInputTrigger
                                    value={group.pickupDate}
                                    onClick={(event) =>
                                      setDatePickerTarget({
                                        kind: 'pickupDate',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <TimeInputTrigger
                                    value={group.pickupTime}
                                    onClick={(event) =>
                                      setTimePickerTarget({
                                        kind: 'pickupTime',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    {PICKUP_DROP_TIME_OPTIONS.map((time) => (
                                      <button
                                        key={`builder-pickup-${index}-${time}`}
                                        type="button"
                                        onClick={() =>
                                          updateTransportGroup(index, 'pickupTime', time)
                                        }
                                        className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                                          group.pickupTime === time
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        {time}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <PlaceField
                                  label="픽업 장소"
                                  placeType={group.pickupPlaceType}
                                  customText={group.pickupPlaceCustomText}
                                  onPlaceTypeChange={(value) =>
                                    updateTransportGroup(index, 'pickupPlaceType', value)
                                  }
                                  onCustomTextChange={(value) =>
                                    updateTransportGroup(index, 'pickupPlaceCustomText', value)
                                  }
                                />
                              </div>

                              <div className="grid gap-2">
                                <span className="text-xs text-slate-600">드랍</span>
                                <div className="grid gap-2">
                                  <DateInputTrigger
                                    value={group.dropDate}
                                    onClick={(event) =>
                                      setDatePickerTarget({
                                        kind: 'dropDate',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <TimeInputTrigger
                                    value={group.dropTime}
                                    onClick={(event) =>
                                      setTimePickerTarget({
                                        kind: 'dropTime',
                                        index,
                                        anchorEl: event.currentTarget,
                                      })
                                    }
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    {PICKUP_DROP_TIME_OPTIONS.map((time) => (
                                      <button
                                        key={`builder-drop-${index}-${time}`}
                                        type="button"
                                        onClick={() =>
                                          updateTransportGroup(index, 'dropTime', time)
                                        }
                                        className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                                          group.dropTime === time
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        {time}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <PlaceField
                                  label="드랍 장소"
                                  placeType={group.dropPlaceType}
                                  customText={group.dropPlaceCustomText}
                                  onPlaceTypeChange={(value) =>
                                    updateTransportGroup(index, 'dropPlaceType', value)
                                  }
                                  onCustomTextChange={(value) =>
                                    updateTransportGroup(index, 'dropPlaceCustomText', value)
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="pt-1">
                        <button
                          type="button"
                          disabled={transportGroups.length >= headcountTotal}
                          title={
                            transportGroups.length >= headcountTotal
                              ? '팀당 최소 1명이므로, 더 추가하려면 전체 인원을 늘려 주세요.'
                              : undefined
                          }
                          onClick={() => {
                            addTransportGroup();
                          }}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          + 팀 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm">
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="min-w-0 w-1/2">
                        <span className="text-xs text-slate-600">실투어 외 픽업 / 드랍</span>
                        <p className="mt-1 text-xs text-slate-400">
                          외부 이동 항목 추가, 수정, 삭제를 모달에서 관리합니다.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {externalTransfers.length === 0
                            ? '아직 추가된 외부 이동 항목이 없습니다.'
                            : `${externalTransfers.length}건 · 픽업 ${externalTransfers.filter((item) => item.direction === 'PICKUP').length}건 · 드랍 ${
                                externalTransfers.filter((item) => item.direction === 'DROP').length
                              }건`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => {
                          setExternalTransfersDraft(normalizeExternalTransfers(externalTransfers.map(cloneExternalTransfer)));
                          setExternalTransfersManagerModalState({ open: true });
                        }}
                      >
                        실투어 외 픽드랍 설정
                      </Button>
                    </div>
                  </div>

                  <label className="grid gap-1 text-sm">
                    <span className="text-xs text-slate-600">
                      특이사항 <span className="ml-1 text-slate-400">*고객에게 노출됩니다</span>
                    </span>
                    <textarea
                      value={specialNote}
                      onChange={(event) => setSpecialNote(event.target.value)}
                      rows={3}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="줄바꿈 포함 입력 가능"
                    />
                  </label>
                </div>
              </Card>

              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    3
                  </span>
                  <span>일정 선택</span>
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  이전 일차와 연결 가능한 목적지만 버튼으로 노출됩니다.
                </p>
                <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="text-xs font-semibold text-slate-700">
                    템플릿 불러오기 (현재 지역 세트/일수)
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={routePresetTemplateId}
                      onChange={(event) => setRoutePresetTemplateId(event.target.value)}
                      disabled={!regionSetId || totalDays <= 0 || routePresetOptions.length === 0}
                      className="min-w-[260px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">템플릿 선택</option>
                      {routePresetOptions.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      disabled={
                        !regionSetId ||
                        totalDays <= 0 ||
                        routePresetOptions.length === 0 ||
                        !routePresetSelected
                      }
                      onClick={() => {
                        if (!routePresetSelected) {
                          return;
                        }
                        applyTemplate(routePresetSelected, true);
                      }}
                    >
                      불러오기
                    </Button>
                  </div>
                  {regionSetId && totalDays > 0 && routePresetOptions.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      선택 가능한 템플릿이 없습니다. 지역 세트와 일수를 확인하세요.
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 space-y-4 [&>*+*]:border-t [&>*+*]:border-slate-200 [&>*+*]:pt-4">
                  {selectedRoute.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-sm font-medium">1일차 시작</div>
                      <p className="mt-1 text-xs text-slate-500">
                        첫날 가능 목적지로 시작하거나, 연박/기차 블록으로 바로 시작할 수 있습니다.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                        {firstDayOptions.map((location) => (
                          <button
                            key={`start-${location.id}`}
                            type="button"
                            onClick={() => {
                              setSelectedRoute([
                                {
                                  kind: 'LOCATION',
                                  locationId: location.id,
                                  locationVersionId: getDefaultVersionId(location),
                                },
                              ]);
                              setIsMultiDayBlockSectionOpen(false);
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-100"
                          >
                            <span className="whitespace-pre-line">
                              {formatLocationNameMultiline(location.name)}
                            </span>
                          </button>
                        ))}
                      </div>
                      {firstDayOptions.length === 0 ? (
                        <p className="mt-3 text-xs text-amber-700">
                          첫날 가능으로 설정된 목적지가 없습니다.
                        </p>
                      ) : null}
                      <div
                        className="mt-4 border-t border-slate-200 pt-4"
                        role="group"
                        aria-label="연속 일정 블록 선택"
                      >
                        {!isMultiDayBlockSectionOpen ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              disabled={totalDays < 2}
                              onClick={() => setIsMultiDayBlockSectionOpen(true)}
                            >
                              연박/기차로 시작
                            </Button>
                            {totalDays < 2 ? (
                              <span className="text-xs text-slate-500">
                                여행 일수가 2일 이상일 때 블록으로 시작할 수 있습니다.
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 text-xs font-semibold text-slate-700">연속 일정 블록</div>
                              <button
                                type="button"
                                onClick={() => setIsMultiDayBlockSectionOpen(false)}
                                className="shrink-0 text-xs text-slate-500 underline"
                              >
                                접기
                              </button>
                            </div>
                            {overnightStayOptions.length > 0 ? (
                              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 md:grid-cols-3">
                                {overnightStayOptions.map((overnightStay) => (
                                  <button
                                    key={overnightStay.id}
                                    type="button"
                                    onClick={() => {
                                      const sortedDays = overnightStay.days
                                        .slice()
                                        .sort((left, right) => left.dayOrder - right.dayOrder);
                                      const lastDay = sortedDays[sortedDays.length - 1];
                                      const lastLocationId =
                                        lastDay?.displayLocationId ?? overnightStay.locationId;
                                      const loc = locationById.get(lastLocationId);
                                      setSelectedRoute([
                                        {
                                          kind: 'MULTI_DAY_BLOCK',
                                          multiDayBlockId: overnightStay.id,
                                          stayLength: overnightStay.days.length,
                                          locationId: lastLocationId,
                                          locationVersionId: getDefaultVersionId(loc) || '',
                                        },
                                      ]);
                                      setIsMultiDayBlockSectionOpen(false);
                                    }}
                                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100"
                                  >
                                    {overnightStay.title}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-amber-700">
                                선택 가능한 블록이 없습니다.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {selectedRoute.map((stop, index) => {
                    const isLastSelectedStop = index === selectedRoute.length - 1;
                    return (
                    <div
                      key={`selected-${index + 1}`}
                      className={`relative rounded-2xl border border-slate-200 bg-slate-50 p-3 ${
                        isLastSelectedStop ? 'pr-11' : ''
                      }`}
                    >
                      {isLastSelectedStop ? (
                        <button
                          type="button"
                          aria-label="이 일정 선택 취소"
                          title="이 일정 선택 취소"
                          onClick={() => {
                            setSelectedRoute((prev) =>
                              prev.length === 0 ? prev : prev.slice(0, -1),
                            );
                            setIsMultiDayBlockSectionOpen(false);
                          }}
                          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                        >
                          ×
                        </button>
                      ) : null}
                      {(() => {
                        const startDayIndex = getRouteStopStartDayIndex(selectedRoute, index);
                        const endDayIndex = getRouteStopEndDayIndex(selectedRoute, index);

                        if (stop.kind === 'MULTI_DAY_BLOCK') {
                          const isLastDay = endDayIndex === totalDays;
                          return (
                            <>
                              <div className="text-sm font-medium">
                                {startDayIndex === endDayIndex
                                  ? `${startDayIndex}일차`
                                  : `${startDayIndex}~${endDayIndex}일차`}{' '}
                                블록
                              </div>
                              <div className="mt-1 text-slate-700">
                                <span className="whitespace-pre-line">
                                {filteredOvernightStays.find((item) => item.id === stop.multiDayBlockId)?.title ??
                                  resolveTemplateStopDisplayName(
                                    stop.locationId,
                                    startDayIndex,
                                    locationById,
                                    planRows,
                                    templateStopByDayForDisplay.get(startDayIndex),
                                  )}
                                </span>
                                {isLastDay &&
                                  (variantType === VariantType.Extend ||
                                    variantType === VariantType.EarlyExtend) && (
                                    <span className="ml-2 text-xs text-amber-700">(연장 일정)</span>
                                  )}
                              </div>
                            </>
                          );
                        }

                        const previousStop = selectedRoute[index - 1];
                        if (previousStop?.kind === 'MULTI_DAY_BLOCK') {
                          const connection = findMultiDayBlockConnection(
                            filteredOvernightStayConnections,
                            previousStop.multiDayBlockId,
                            stop.locationId,
                          );
                          const versions = getMultiDayBlockConnectionVersions(connection);
                          const isLastDay = endDayIndex === totalDays;
                          const selectedVersion = resolveMultiDayBlockConnectionVersion(
                            connection,
                            stop.multiDayBlockConnectionVersionId,
                          );
                          return (
                            <>
                              <div className="text-sm font-medium">{startDayIndex}일차</div>
                              <div className="mt-1 text-slate-700">
                                <span className="whitespace-pre-line">
                                  {resolveTemplateStopDisplayName(
                                    stop.locationId,
                                    startDayIndex,
                                    locationById,
                                    planRows,
                                    templateStopByDayForDisplay.get(startDayIndex),
                                  )}
                                </span>
                                {isLastDay &&
                                  (variantType === VariantType.Extend ||
                                    variantType === VariantType.EarlyExtend) && (
                                    <span className="ml-2 text-xs text-amber-700">(연장 일정)</span>
                                  )}
                              </div>
                              {versions.length > 1 ? (
                                <div className="mt-3 grid gap-2">
                                  <div className="text-xs text-slate-500">시즌 버전</div>
                                  <div className="flex flex-wrap gap-2">
                                    {versions.map((version) => (
                                      <button
                                        key={`route-post-block-connection-version-${index}-${version.id}`}
                                        type="button"
                                        onClick={() =>
                                          setSelectedRoute((prev) =>
                                            prev.map((item, itemIndex) =>
                                              itemIndex === index && item.kind === 'LOCATION'
                                                ? {
                                                    ...item,
                                                    segmentId: undefined,
                                                    segmentVersionId: undefined,
                                                    multiDayBlockConnectionId: connection?.id,
                                                    multiDayBlockConnectionVersionId: version.id,
                                                  }
                                                : item,
                                            ),
                                          )
                                        }
                                        className={`rounded-lg border px-3 py-1 text-xs ${
                                          selectedVersion?.id === version.id
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                                        }`}
                                      >
                                        {formatMultiDayBlockConnectionVersionLabel(version)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </>
                          );
                        }

                        if (startDayIndex === 1 && stop.kind === 'LOCATION') {
                          const isLastDay = endDayIndex === totalDays;
                          return (
                            <>
                              <div className="text-sm font-medium">1일차</div>
                              <div className="mt-1 text-slate-700">
                                <span className="whitespace-pre-line">
                                  {resolveTemplateStopDisplayName(
                                    stop.locationId,
                                    startDayIndex,
                                    locationById,
                                    planRows,
                                    templateStopByDayForDisplay.get(startDayIndex),
                                  )}
                                </span>
                                {(variantType === VariantType.Early ||
                                  variantType === VariantType.EarlyExtend) && (
                                  <span className="ml-2 text-xs text-amber-700">(얼리 일정)</span>
                                )}
                                {isLastDay &&
                                  (variantType === VariantType.Extend ||
                                    variantType === VariantType.EarlyExtend) && (
                                    <span className="ml-2 text-xs text-amber-700">(연장 일정)</span>
                                  )}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(locationById.get(stop.locationId)?.variations ?? []).map((version) => {
                                  const versionLabel = formatLocationVersion(version);
                                  if (versionLabel === '기본' || !versionLabel) {
                                    return null;
                                  }
                                  return (
                                    <button
                                      key={`route-version-first-${index}-${version.id}`}
                                      type="button"
                                      onClick={() =>
                                        setSelectedRoute((prev) =>
                                          prev.map((item, itemIndex) =>
                                            itemIndex === index
                                              ? { ...item, locationVersionId: version.id }
                                              : item,
                                          ),
                                        )
                                      }
                                      className={`rounded-lg border px-3 py-1 text-xs ${
                                        stop.locationVersionId === version.id
                                          ? 'border-slate-900 bg-slate-900 text-white'
                                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                                      }`}
                                    >
                                      {versionLabel}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          );
                        }

                        const fromId = selectedRoute[index - 1]?.locationId ?? '';
                        const segment = findSegment(filteredSegments, fromId, stop.locationId);
                        const versions = getSegmentVersions(segment);
                        const isLastDay = endDayIndex === totalDays;
                        const selectedVersion = resolveSegmentVersionForContext({
                          segment,
                          targetDate: travelStartDate
                            ? getRouteDateForDayIndex(travelStartDate, startDayIndex)
                            : undefined,
                          segmentVersionId: stop.segmentVersionId,
                          flightOutTime: transportGroups[0]?.flightOutTime,
                          isLastRouteLeg: isLastDay,
                        });
                        return (
                          <>
                            <div className="text-sm font-medium">{startDayIndex}일차</div>
                            <div className="mt-1 text-slate-700">
                              <span className="whitespace-pre-line">
                                {resolveTemplateStopDisplayName(
                                  stop.locationId,
                                  startDayIndex,
                                  locationById,
                                  planRows,
                                  templateStopByDayForDisplay.get(startDayIndex),
                                )}
                              </span>
                              {isLastDay &&
                                (variantType === VariantType.Extend ||
                                  variantType === VariantType.EarlyExtend) && (
                                  <span className="ml-2 text-xs text-amber-700">(연장 일정)</span>
                                )}
                            </div>
                            {versions.length > 1 ? (
                              <div className="mt-3 grid gap-2">
                                <div className="text-xs text-slate-500">시즌 버전</div>
                                <div className="flex flex-wrap gap-2">
                                  {versions.map((version) => (
                                    <button
                                      key={`route-segment-version-${index}-${version.id}`}
                                      type="button"
                                      onClick={() =>
                                        setSelectedRoute((prev) =>
                                          prev.map((item, itemIndex) =>
                                            itemIndex === index && item.kind === 'LOCATION'
                                              ? {
                                                  ...item,
                                                  segmentId: segment?.id,
                                                  segmentVersionId: version.id,
                                                }
                                              : item,
                                          ),
                                        )
                                      }
                                      className={`rounded-lg border px-3 py-1 text-xs ${
                                        selectedVersion?.id === version.id
                                          ? 'border-slate-900 bg-slate-900 text-white'
                                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                                      }`}
                                    >
                                      {formatSegmentVersionLabel(version)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                    );
                  })}

                  {selectedRoute.length > 0 &&
                  selectedRoute.every(isRouteSelectionStopComplete) &&
                  getConsumedRouteDayCount(selectedRoute) < totalDays ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-4">
                      <div className="mb-3 text-sm font-medium">
                        {getConsumedRouteDayCount(selectedRoute) + 1}일차 선택
                      </div>
                      <div className="grid gap-3">
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                          {nextOptions.map((location) => (
                            <button
                              key={location.id}
                              type="button"
                              onClick={() =>
                                setSelectedRoute((prev) => {
                                  const lastStop = prev[prev.length - 1];
                                  if (lastStop?.kind === 'MULTI_DAY_BLOCK') {
                                    const connection = findMultiDayBlockConnection(
                                      filteredOvernightStayConnections,
                                      lastStop.multiDayBlockId,
                                      location.id,
                                    );
                                    return [
                                      ...prev,
                                      {
                                        kind: 'LOCATION',
                                        locationId: location.id,
                                        locationVersionId: getDefaultVersionId(location),
                                        multiDayBlockConnectionId: connection?.id,
                                        multiDayBlockConnectionVersionId:
                                          getDefaultMultiDayBlockConnectionVersionId(connection) || undefined,
                                      },
                                    ];
                                  }

                                  const fromId = prev[prev.length - 1]?.locationId ?? '';
                                  const segment = findSegment(
                                    filteredSegments,
                                    fromId,
                                    location.id,
                                  );
                                  return [
                                    ...prev,
                                    {
                                      kind: 'LOCATION',
                                      locationId: location.id,
                                      locationVersionId: getDefaultVersionId(location),
                                      segmentId: segment?.id,
                                      segmentVersionId: undefined,
                                    },
                                  ];
                                })
                              }
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-100"
                            >
                              <span className="whitespace-pre-line">
                                {formatLocationNameMultiline(location.name)}
                              </span>
                            </button>
                          ))}
                        </div>
                        {nextOptions.length === 0 ? (
                          <p className="text-xs text-amber-700">
                            선택 가능한 다음 목적지가 없습니다.
                          </p>
                        ) : null}
                        <div
                          className="mt-3 border-t border-slate-200 pt-4"
                          role="group"
                          aria-label="연속 일정 블록 선택"
                        >
                          {!isMultiDayBlockSectionOpen ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="outline"
                                disabled={totalDays - getConsumedRouteDayCount(selectedRoute) < 2}
                                onClick={() => setIsMultiDayBlockSectionOpen(true)}
                              >
                                연박/기차 추가
                              </Button>
                              {totalDays - getConsumedRouteDayCount(selectedRoute) < 2 ? (
                                <span className="text-xs text-slate-500">
                                  남은 일수에 맞는 블록만 선택할 수 있습니다.
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 text-xs font-semibold text-slate-700">연속 일정 블록</div>
                                <button
                                  type="button"
                                  onClick={() => setIsMultiDayBlockSectionOpen(false)}
                                  className="shrink-0 text-xs text-slate-500 underline"
                                >
                                  접기
                                </button>
                              </div>
                              {overnightStayOptions.length > 0 ? (
                                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 md:grid-cols-3">
                                  {overnightStayOptions.map((overnightStay) => (
                                    <button
                                      key={overnightStay.id}
                                      type="button"
                                      onClick={() => {
                                        const sortedDays = overnightStay.days.slice().sort((left, right) => left.dayOrder - right.dayOrder);
                                        const lastDay = sortedDays[sortedDays.length - 1];
                                        const lastLocationId = lastDay?.displayLocationId ?? overnightStay.locationId;
                                        const location = locationById.get(lastLocationId);
                                        setSelectedRoute((prev) => [
                                          ...prev,
                                          {
                                            kind: 'MULTI_DAY_BLOCK',
                                            multiDayBlockId: overnightStay.id,
                                            stayLength: overnightStay.days.length,
                                            locationId: lastLocationId,
                                            locationVersionId: getDefaultVersionId(location) || '',
                                          },
                                        ]);
                                        setIsMultiDayBlockSectionOpen(false);
                                      }}
                                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100"
                                    >
                                      {overnightStay.title}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-amber-700">
                                  선택 가능한 블록이 없습니다.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {selectedRoute.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoute([]);
                        dirtyPlanRowFieldKeysRef.current.clear();
                        setPlanRows([]);
                        setIsMultiDayBlockSectionOpen(false);
                      }}
                      className="text-xs text-red-500 underline"
                    >
                      전체 루트 초기화
                    </button>
                  ) : null}
                </div>
              </Card>

              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    4
                  </span>
                  <span>추가 설정</span>
                </h2>
                <div className="mt-4 grid gap-4 [&>*+*]:border-t [&>*+*]:border-slate-200 [&>*+*]:pt-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="min-w-0 w-1/2">
                        <span className="text-xs text-slate-600">숙소 업그레이드</span>
                        <p className="mt-1 text-xs text-slate-400">
                          버튼 또는 일정표 숙소 칸을 눌러 일차별 숙소를 설정합니다.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {planRows.length === 0
                            ? '아직 설정할 일차가 없습니다.'
                            : `총 ${planRows.length}일차 · 업그레이드 ${planRows.filter((row) => row.lodgingSelectionLevel !== 'LV3').length}건`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => openLodgingUpgradeModal()}
                        disabled={planRows.length === 0}
                      >
                        숙소 업그레이드 하기
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="min-w-0 w-1/2">
                        <span className="text-xs text-slate-600">특식 4종</span>
                        <p className="mt-1 text-xs text-slate-400">
                          샤브샤브·삼겹살파티·허르헉·샤슬릭을 규칙에 맞게 일차/식사별로 배치합니다.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {planRows.length === 0
                            ? '아직 설정할 일차가 없습니다.'
                            : (() => {
                                const mainRows = planRows.filter((r) => isMainPlanStopRow(r));
                                const assignments = getAssignmentsFromPlanRows(
                                  mainRows.map((r) => ({
                                    mealCellText: r.mealCellText,
                                    destinationCellText: r.destinationCellText,
                                    scheduleCellText: r.scheduleCellText,
                                  })),
                                );
                                const count = new Set(assignments.map((a) => a.specialMeal)).size;
                                return `4종 중 ${count}종 배치됨`;
                              })()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => setSpecialMealsModalState({ open: true })}
                        disabled={planRows.length === 0}
                      >
                        특식 배치 설정
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="min-w-0 w-1/2">
                        <span className="text-xs text-slate-600">숙소 추가</span>
                        <p className="mt-1 text-xs text-slate-400">
                          버튼을 눌러 모달에서 일차별 추가 숙소 수량을 한 화면에 모아 확인·수정합니다.
                          전 일차 동일 값 일괄 적용도 가능합니다.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {planRows.length === 0
                            ? '아직 설정할 일차가 없습니다.'
                            : `적용 일차 ${extraLodgingSummary.activeDayCount}일 · 총 ${extraLodgingSummary.totalCount}개`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => setExtraLodgingsModalState({ open: true })}
                        disabled={planRows.length === 0}
                      >
                        숙소 추가 설정
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="min-w-0 w-1/2">
                        <span className="text-xs text-slate-600">기타 금액</span>
                        <p className="mt-1 text-xs text-slate-400">
                          추가와 할인을 모달에서 분리해 관리합니다.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          추가 {manualAdjustmentSummary.addCount}건 (
                          {formatKrw(manualAdjustmentSummary.addTotal)}) · 할인{' '}
                          {manualAdjustmentSummary.discountCount}건 (
                          {formatKrw(manualAdjustmentSummary.discountTotal)})
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => setManualAdjustmentsModalState({ open: true })}
                      >
                        기타 금액 설정
                      </Button>
                    </div>
                    {hasValidation('invalid-manual-adjustments') ? (
                      <p className="text-xs text-rose-700">
                        기타 금액은 제목, 금액, 팀당/인당 기준과 필요한 일수·박수를 확인해주세요.
                      </p>
                    ) : null}
                  </div>
                </div>
              </Card>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <h2 className="text-lg font-bold text-slate-900">일정표 편집기</h2>
                <p className="mt-1 text-xs text-slate-600">
                  숙소 칸을 클릭하면 등급·표시명을 설정할 수 있습니다. 식사 칸은 아침/점심/저녁 3칸
                  입력으로 편집됩니다.
                </p>
              </div>

              <div className="overflow-auto">
                <Table className="min-w-[1280px] w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <Th className="w-[110px]">날짜</Th>
                      <Th className="w-[240px]">목적지</Th>
                      <Th className="w-[180px]">시간</Th>
                      <Th className="w-[280px]">일정</Th>
                      <Th className="w-[220px]">숙소</Th>
                      <Th className="w-[220px]">식사</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPlanRows.map(({ row, mainRowIndex, planRowIndex }, rowIndex) => {
                      const isExternalRow = mainRowIndex === null;
                      const mealFields = parseMealCellText(row.mealCellText);
                      const timeCellValidation =
                        mainRowIndex !== null &&
                        validationResults.find((r) =>
                          r.affectedCells?.some(
                            (c) => c.rowIndex === mainRowIndex && c.field === 'timeCellText',
                          ),
                        );
                      const mealCellValidation =
                        mainRowIndex !== null &&
                        validationResults.find((r) =>
                          r.affectedCells?.some(
                            (c) => c.rowIndex === mainRowIndex && c.field === 'mealCellText',
                          ),
                        );
                      const isTimeCellAffected = Boolean(timeCellValidation);
                      const isMealCellAffected = Boolean(mealCellValidation);
                      const cellClassName = `w-full resize-none overflow-hidden rounded-xl border border-slate-200 px-3 py-2 text-sm leading-5 whitespace-pre-wrap ${
                        isExternalRow ? 'bg-slate-50 text-slate-500' : 'bg-white'
                      }`;
                      const timeCellClassName = isTimeCellAffected
                        ? `${cellClassName} border-rose-400 bg-rose-50`
                        : cellClassName;
                      const mealCellWrapperClassName = `grid gap-2 rounded-xl border p-2 ${
                        isMealCellAffected
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-slate-200 bg-white'
                      }`;
                      const mealLabelClassName = `text-xs ${isMealCellAffected ? 'text-amber-900' : 'text-slate-500'}`;
                      const mealInputClassName = `min-w-0 rounded-lg border px-2 py-1.5 text-sm outline-none transition ${
                        isMealCellAffected
                          ? 'border-amber-300 bg-amber-50 text-amber-950 focus:border-amber-500'
                          : 'border-slate-200 text-slate-900 focus:border-slate-400'
                      }`;
                      const mealXButtonClassName = `rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                        isMealCellAffected
                          ? 'border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`;
                      return (
                        <tr
                          key={`day-row-${rowIndex + 1}`}
                          className={`border-t border-slate-200 align-top ${isExternalRow ? 'bg-slate-50/60' : ''}`}
                        >
                          <Td>
                            <textarea
                              value={row.dateCellText}
                              readOnly={isExternalRow}
                              disabled={isExternalRow}
                              onChange={(event) => {
                                if (planRowIndex === null) {
                                  return;
                                }
                                updateCell(planRowIndex, 'dateCellText', event.target.value);
                                autoResizeTextarea(event.currentTarget);
                              }}
                              onInput={(event) => autoResizeTextarea(event.currentTarget)}
                              rows={1}
                              data-plan-cell="true"
                              className={cellClassName}
                            />
                          </Td>
                          <Td>
                            <textarea
                              value={row.destinationCellText}
                              readOnly={isExternalRow}
                              disabled={isExternalRow}
                              onChange={(event) => {
                                if (planRowIndex === null) {
                                  return;
                                }
                                updateCell(planRowIndex, 'destinationCellText', event.target.value);
                                autoResizeTextarea(event.currentTarget);
                              }}
                              onInput={(event) => autoResizeTextarea(event.currentTarget)}
                              rows={1}
                              data-plan-cell="true"
                              className={cellClassName}
                            />
                          </Td>
                          <Td>
                            <div className="space-y-1">
                              <textarea
                                value={row.timeCellText}
                                readOnly={isExternalRow}
                                disabled={isExternalRow}
                                onChange={(event) => {
                                  if (planRowIndex === null) {
                                    return;
                                  }
                                  updateCell(planRowIndex, 'timeCellText', event.target.value);
                                  autoResizeTextarea(event.currentTarget);
                                }}
                                onInput={(event) => autoResizeTextarea(event.currentTarget)}
                                rows={1}
                                data-plan-cell="true"
                                className={timeCellClassName}
                              />
                              {isTimeCellAffected && timeCellValidation ? (
                                <p className="px-1 text-xs leading-4 text-rose-700">
                                  시간 확인 필요: {timeCellValidation.message}
                                </p>
                              ) : null}
                            </div>
                          </Td>
                          <Td>
                            <textarea
                              value={row.scheduleCellText}
                              readOnly={isExternalRow}
                              disabled={isExternalRow}
                              onChange={(event) => {
                                if (planRowIndex === null) {
                                  return;
                                }
                                updateCell(planRowIndex, 'scheduleCellText', event.target.value);
                                autoResizeTextarea(event.currentTarget);
                              }}
                              onInput={(event) => autoResizeTextarea(event.currentTarget)}
                              rows={1}
                              data-plan-cell="true"
                              className={cellClassName}
                            />
                          </Td>
                          <Td>
                            {isExternalRow ? (
                              <div className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm leading-5 whitespace-pre-wrap text-slate-500">
                                {row.lodgingCellText || '-'}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (planRowIndex === null) {
                                    return;
                                  }
                                  openLodgingUpgradeModal(planRowIndex);
                                }}
                                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm leading-5 whitespace-pre-wrap text-slate-900 transition hover:border-slate-400 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                                aria-label={`${row.destinationCellText.trim() || '해당 일차'} 숙소 설정`}
                              >
                                {row.lodgingCellText || '-'}
                              </button>
                            )}
                          </Td>
                          <Td>
                            {isExternalRow ? (
                              <div className="space-y-1">
                                <div
                                  className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm leading-5 whitespace-pre-wrap ${
                                    isMealCellAffected
                                      ? 'border-amber-400 bg-amber-50 text-amber-950'
                                      : isExternalRow
                                        ? 'border-slate-200 bg-slate-100 text-slate-500'
                                        : 'border-slate-200 bg-white'
                                  }`}
                                >
                                  {row.mealCellText || '-'}
                                </div>
                                {isMealCellAffected && mealCellValidation ? (
                                  <p className="px-1 text-xs leading-4 text-amber-900">
                                    식사 확인 필요: {mealCellValidation.message}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className={mealCellWrapperClassName}>
                                  {(
                                    [
                                      ['breakfast', '아침', mealFields.breakfast],
                                      ['lunch', '점심', mealFields.lunch],
                                      ['dinner', '저녁', mealFields.dinner],
                                    ] as const
                                  ).map(([field, label, mealValue]) => (
                                    <div
                                      key={field}
                                      className="grid grid-cols-[40px_minmax(0,1fr)_32px] items-center gap-2 text-sm"
                                    >
                                      <span className={mealLabelClassName}>{label}</span>
                                      <input
                                        type="text"
                                        value={mealValue}
                                        onChange={(event) => {
                                          if (planRowIndex === null) {
                                            return;
                                          }
                                          updateMealCellField(
                                            planRowIndex,
                                            field,
                                            event.target.value,
                                          );
                                        }}
                                        className={mealInputClassName}
                                        placeholder={`${label} 식사 입력`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (planRowIndex === null) {
                                            return;
                                          }
                                          updateMealCellField(planRowIndex, field, 'X');
                                        }}
                                        className={mealXButtonClassName}
                                        aria-label={`${label} 식사를 없음으로 표시`}
                                      >
                                        X
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                {isMealCellAffected && mealCellValidation ? (
                                  <p className="px-1 text-xs leading-4 text-amber-900">
                                    식사 확인 필요: {mealCellValidation.message}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </section>

            <section className="space-y-5">
              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-900">금액</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={manualPricing.enabled}
                        onChange={(event) =>
                          setManualPricing((current) => ({
                            ...current,
                            enabled: event.target.checked,
                          }))
                        }
                      />
                      금액 수동수정
                    </label>
                    <Button
                      variant="outline"
                      className="shrink-0 whitespace-nowrap"
                      onClick={() => setManualAdjustmentsModalState({ open: true })}
                    >
                      기타 금액 설정
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  수동수정 ON이면 현재 화면에 보이는 기본금/추가금 행 금액을 직접 입력합니다. 고객용 문서에는 수동 여부가 보이지 않습니다.
                </p>
                {hasValidation('invalid-manual-adjustments') ? (
                  <p className="mt-2 text-xs text-rose-700">
                    기타 금액은 내용과 0 이상 정수 금액을 함께 입력해주세요.
                  </p>
                ) : null}
                {pricingPreviewError ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                    {pricingPreviewErrorMessage}
                  </div>
                ) : null}
                {!effectivePricingPreview ? (
                  <p className="mt-3 text-sm text-slate-500">
                    요건이 충족되면 금액이 자동 계산됩니다.
                  </p>
                ) : (
                  <div className="mt-3">
                    <div
                      className={`rounded-2xl border p-3 ${
                        manualPricing.enabled ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {manualPricing.enabled ? '수동 금액' : '고객 안내용'}
                        </h3>
                        {manualPricing.enabled ? (
                          <Button
                            variant="outline"
                            className="h-8 shrink-0 whitespace-nowrap px-3 text-xs"
                            onClick={() =>
                              setManualPricing((current) => ({
                                ...current,
                                adjustmentLines: [...current.adjustmentLines, createManualPricingAdjustmentLine()],
                              }))
                            }
                          >
                            추가금 라인 추가
                          </Button>
                        ) : null}
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium text-slate-900">기본금</div>
                          {manualPricing.enabled &&
                          fullTeamPricingRows.length > 1 &&
                          !basesDifferAcrossTeams ? (
                            <button
                              type="button"
                              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                              onClick={() => setManualPricingSplitTeamRows((prev) => !prev)}
                            >
                              {manualPricingSplitTeamRows ? '한 줄로 보기' : '팀 분리해서 보기'}
                            </button>
                          ) : null}
                        </div>
                        {manualPricing.enabled ? (
                          <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                            <div className="space-y-2">
                              {teamsForBaseAmountInput.length <= 1 ? (
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    step={1}
                                    value={(estimatePricingUiTotals ?? effectivePricingPreview).baseAmountKrw}
                                    onChange={(event) => {
                                      const nextValue = Number(event.target.value);
                                      if (!Number.isInteger(nextValue)) {
                                        return;
                                      }
                                      setManualPricing((current) =>
                                        setManualPricingSummaryValue(current, 'baseAmountKrw', nextValue),
                                      );
                                    }}
                                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-[42px] shrink-0 whitespace-nowrap px-3 text-xs"
                                    disabled={!pricingPreview || !hasManualBaseAmountOverride(manualPricing)}
                                    onClick={() =>
                                      setManualPricing((current) => resetManualPricingBaseAmount(current))
                                    }
                                  >
                                    초기화
                                  </Button>
                                </div>
                              ) : (
                                teamsForBaseAmountInput.map((teamPricing) => (
                                  <div
                                    key={`base-${teamPricing.teamOrderIndex}`}
                                    className="flex flex-wrap items-center gap-2"
                                  >
                                    {baseAmountInputShowTeamPrefix ? (
                                      <div className="text-xs font-medium text-slate-500">{`${teamPricing.teamName})`}</div>
                                    ) : null}
                                    <input
                                      type="number"
                                      step={1}
                                      value={teamPricing.baseAmountKrw}
                                      onChange={(event) => {
                                        const nextValue = Number(event.target.value);
                                        if (!Number.isInteger(nextValue)) {
                                          return;
                                        }
                                        setManualPricing((current) =>
                                          manualPricingBaseAmountCollapsed
                                            ? setManualPricingAllTeamSummariesValue(
                                                current,
                                                allTeamOrderIndexesForSummarySync,
                                                'baseAmountKrw',
                                                nextValue,
                                              )
                                            : setManualPricingTeamSummaryValue(
                                                current,
                                                teamPricing.teamOrderIndex,
                                                'baseAmountKrw',
                                                nextValue,
                                              ),
                                        );
                                      }}
                                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                    />
                                  </div>
                                ))
                              )}
                              {teamsForBaseAmountInput.length > 1 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-[42px] shrink-0 whitespace-nowrap px-3 text-xs"
                                  disabled={!pricingPreview || !hasManualBaseAmountOverride(manualPricing)}
                                  onClick={() =>
                                    setManualPricing((current) => resetManualPricingBaseAmount(current))
                                  }
                                >
                                  초기화
                                </Button>
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-500 lg:max-w-xs">
                              {teamsForBaseAmountInput.length > 1
                                ? '팀마다 1인 기본금을 따로 지정할 수 있습니다. 총액을 별도로 수정하면 그 값이 우선합니다.'
                                : '기본금 단일값을 직접 수정하면 총액도 자동 재계산됩니다. 총액을 별도로 수정하면 그 값이 우선합니다.'}{' '}
                              일수 변경 후 자동 기본금을 다시 반영하려면 초기화를 누르세요.
                            </p>
                          </div>
                        ) : (
                          <div className="mt-2 space-y-1 text-slate-900">
                            {teamsForBaseAmountInput.length > 1 ? (
                              teamsForBaseAmountInput.map((teamPricing) => (
                                <div key={`base-read-${teamPricing.teamOrderIndex}`}>
                                  {`${baseAmountInputShowTeamPrefix ? `${teamPricing.teamName}) ` : ''}${formatKrw(teamPricing.baseAmountKrw)}`}
                                </div>
                              ))
                            ) : (
                              formatKrw((estimatePricingUiTotals ?? effectivePricingPreview).baseAmountKrw)
                            )}
                          </div>
                        )}
                        {pricingPreview && !manualPricing.enabled ? (
                          <PricingBaseLinesBreakdown
                            lines={pricingPreview.lines}
                            grandTotal={pricingPreview.totalAmountKrw}
                            headcountTotal={headcountTotal}
                            totalDays={totalDays}
                            showTeamPrefix={pricingSummaryShowTeamPrefix}
                          />
                        ) : null}
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-slate-900">추가 및 할인 사항</div>
                          <span className="text-xs text-slate-500">
                            {manualPricing.enabled
                              ? '적용 팀·항목·금액·표기를 직접 수정하면 1페이지에 즉시 반영됩니다.'
                              : '견적서 1페이지와 같은 출력 형식입니다.'}
                          </span>
                        </div>
                        {displayedPricingAdjustmentLines.length === 0 ? (
                          <p className="mt-2 text-xs text-slate-500">추가금 항목이 없습니다.</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {displayedPricingAdjustmentLines.map((line) => {
                              const adjustmentLineRowKey = `${line.id}-${line.teamOrderIndexes.join(',') || 'global'}`;
                              const assignedTeamOrderIndex = resolveDisplayedAdjustmentLineTeamOrderIndex(line);
                              const showAdjustmentLineTeamSelect =
                                manualPricing.enabled && fullTeamPricingRows.length > 1;
                              return (
                              <div
                                key={adjustmentLineRowKey}
                                className="grid gap-2 rounded-xl border border-slate-200 p-3 lg:grid-cols-[minmax(0,1.5fr)_160px_minmax(0,1fr)_auto]"
                              >
                                {manualPricing.enabled ? (
                                  <>
                                    <div className="grid gap-1">
                                      {showAdjustmentLineTeamSelect ? (
                                        <label className="grid gap-1">
                                          <span className="text-[11px] font-medium text-slate-500">적용 팀</span>
                                          <select
                                            disabled={line.strikethrough}
                                            value={
                                              line.isSharedAcrossTeams
                                                ? ''
                                                : assignedTeamOrderIndex ?? ''
                                            }
                                            onChange={(event) => {
                                              const raw = event.target.value;
                                              const nextTeamOrderIndex =
                                                raw === '' ? null : Number(raw);
                                              if (raw !== '' && !Number.isInteger(nextTeamOrderIndex)) {
                                                return;
                                              }
                                              setManualPricing((current) => ({
                                                ...current,
                                                ...assignDisplayedAdjustmentLineTeam(
                                                  current,
                                                  line,
                                                  nextTeamOrderIndex,
                                                  pricingPreview
                                                    ? {
                                                        pricingPreview,
                                                        totalDays,
                                                      }
                                                    : undefined,
                                                ),
                                              }));
                                            }}
                                            className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                                            aria-label="적용 팀"
                                          >
                                            <option value="">전체 (공통)</option>
                                            {fullTeamPricingRows.map((teamPricing) => (
                                              <option
                                                key={`team-opt-${teamPricing.teamOrderIndex}`}
                                                value={teamPricing.teamOrderIndex}
                                              >
                                                {teamPricing.teamName}
                                              </option>
                                            ))}
                                          </select>
                                        </label>
                                      ) : null}
                                      <input
                                        type="text"
                                        disabled={line.strikethrough}
                                        value={line.label}
                                        onChange={(event) =>
                                          setManualPricing((current) =>
                                            line.type === 'MANUAL'
                                              ? updateManualPricingCustomLine(current, line.sourceLines[0]!.id, {
                                                  label: event.target.value,
                                                })
                                              : line.sourceLines.reduce(
                                                  (nextState, sourceLine) =>
                                                    upsertManualPricingAutoOverride(nextState, sourceLine, {
                                                      label: event.target.value,
                                                    }),
                                                  current,
                                                ),
                                          )
                                        }
                                        className={`rounded-xl border px-3 py-2 text-sm ${
                                          line.strikethrough
                                            ? 'border-slate-100 bg-slate-50 text-slate-400 line-through disabled:cursor-not-allowed'
                                            : 'border-slate-200 bg-white'
                                        }`}
                                        placeholder="항목"
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      autoComplete="off"
                                      disabled={line.strikethrough}
                                      value={
                                        line.strikethrough
                                          ? String(line.leadAmountKrw)
                                          : manualPricingAdjustmentAmountDraft?.rowKey === adjustmentLineRowKey
                                            ? manualPricingAdjustmentAmountDraft.value
                                            : String(line.leadAmountKrw)
                                      }
                                      onFocus={() => {
                                        if (line.strikethrough) {
                                          return;
                                        }
                                        setManualPricingAdjustmentAmountDraft({
                                          rowKey: adjustmentLineRowKey,
                                          value: String(line.leadAmountKrw),
                                        });
                                      }}
                                      onBlur={(event) => {
                                        const nextAmount = commitManualPricingAdjustmentAmountInput(
                                          event.target.value,
                                        );
                                        setManualPricing((current) =>
                                          line.type === 'MANUAL'
                                            ? updateManualPricingCustomLine(current, line.sourceLines[0]!.id, {
                                                leadAmountKrw: nextAmount,
                                              })
                                            : line.sourceLines.reduce(
                                                (nextState, sourceLine) =>
                                                  upsertManualPricingAutoOverride(nextState, sourceLine, {
                                                    leadAmountKrw: nextAmount,
                                                  }),
                                                current,
                                              ),
                                        );
                                        setManualPricingAdjustmentAmountDraft((draft) =>
                                          draft?.rowKey === adjustmentLineRowKey ? null : draft,
                                        );
                                      }}
                                      onChange={(event) => {
                                        const nextRaw = event.target.value;
                                        if (!MANUAL_PRICING_ADJUSTMENT_AMOUNT_INPUT_PATTERN.test(nextRaw)) {
                                          return;
                                        }
                                        setManualPricingAdjustmentAmountDraft({
                                          rowKey: adjustmentLineRowKey,
                                          value: nextRaw,
                                        });
                                        if (nextRaw !== '' && nextRaw !== '-') {
                                          const nextAmount = Number(nextRaw);
                                          if (Number.isInteger(nextAmount)) {
                                            setManualPricing((current) =>
                                              line.type === 'MANUAL'
                                                ? updateManualPricingCustomLine(current, line.sourceLines[0]!.id, {
                                                    leadAmountKrw: nextAmount,
                                                  })
                                                : line.sourceLines.reduce(
                                                    (nextState, sourceLine) =>
                                                      upsertManualPricingAutoOverride(nextState, sourceLine, {
                                                        leadAmountKrw: nextAmount,
                                                      }),
                                                    current,
                                                  ),
                                            );
                                          }
                                        }
                                      }}
                                      className={`rounded-xl border px-3 py-2 text-sm ${
                                        line.strikethrough
                                          ? 'border-slate-100 bg-slate-50 text-slate-400 line-through disabled:cursor-not-allowed'
                                          : 'border-slate-200 bg-white'
                                      }`}
                                      placeholder="금액"
                                    />
                                    <input
                                      type="text"
                                      value={line.formula}
                                      onChange={(event) =>
                                        setManualPricing((current) =>
                                          line.type === 'MANUAL'
                                            ? updateManualPricingCustomLine(current, line.sourceLines[0]!.id, {
                                                formula: event.target.value,
                                              })
                                            : line.sourceLines.reduce(
                                                (nextState, sourceLine) =>
                                                  upsertManualPricingAutoOverride(nextState, sourceLine, {
                                                    formula: event.target.value,
                                                  }),
                                                current,
                                              ),
                                        )
                                      }
                                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                      placeholder="표기"
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        className={`rounded-lg border px-2 py-1 text-xs ${
                                          line.strikethrough
                                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                                            : 'border-slate-200 text-slate-700'
                                        }`}
                                        onClick={() =>
                                          setManualPricing((current) =>
                                            line.type === 'MANUAL'
                                              ? updateManualPricingCustomLine(current, line.sourceLines[0]!.id, {
                                                  strikethrough: !line.strikethrough,
                                                })
                                              : line.sourceLines.reduce(
                                                  (nextState, sourceLine) =>
                                                    upsertManualPricingAutoOverride(nextState, sourceLine, {
                                                      strikethrough: !line.strikethrough,
                                                    }),
                                                  current,
                                                ),
                                          )
                                        }
                                      >
                                        {line.strikethrough ? '할인해제' : '할인처리'}
                                      </button>
                                      {line.type === 'AUTO' && line.isManual ? (
                                        <button
                                          type="button"
                                          className="text-xs text-slate-500 underline"
                                          onClick={() =>
                                            setManualPricing((current) =>
                                              line.sourceLines.reduce(
                                                (nextState, sourceLine) =>
                                                  restoreManualPricingAutoLine(nextState, sourceLine.rowKey ?? ''),
                                                current,
                                              ),
                                            )
                                          }
                                        >
                                          자동값 복귀
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700"
                                        onClick={() =>
                                          setManualPricing((current) =>
                                            line.type === 'MANUAL'
                                              ? removeManualPricingCustomLine(current, line.sourceLines[0]!.id)
                                              : line.sourceLines.reduce(
                                                  (nextState, sourceLine) =>
                                                    upsertManualPricingAutoOverride(nextState, sourceLine, {
                                                      deleted: true,
                                                    }),
                                                  current,
                                                ),
                                          )
                                        }
                                      >
                                        삭제
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div
                                      className={`text-sm font-medium ${
                                        line.strikethrough ? 'text-slate-400 line-through' : 'text-slate-900'
                                      }`}
                                    >
                                      {fullTeamPricingRows.length > 1 && !line.isSharedAcrossTeams && line.teamNames[0] ? (
                                        <span className="mr-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                          {line.teamNames[0]}
                                        </span>
                                      ) : null}
                                      {fullTeamPricingRows.length > 1 && line.isSharedAcrossTeams ? (
                                        <span className="mr-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                          전체
                                        </span>
                                      ) : null}
                                      <span>{line.label}</span>
                                    </div>
                                    <div
                                      className={`text-sm font-semibold ${
                                        line.strikethrough ? 'text-slate-400 line-through' : 'text-slate-900'
                                      }`}
                                    >
                                      {formatSignedKrw(line.leadAmountKrw)}
                                    </div>
                                    <div className="text-sm text-slate-600">{line.formula || '-'}</div>
                                    <div />
                                  </>
                                )}
                              </div>
                            );
                            })}
                          </div>
                        )}
                        {manualPricing.enabled && hiddenManualPricingAutoLines.length > 0 ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                            <span className="text-xs font-medium text-slate-600">숨김된 자동 행</span>
                            {hiddenManualPricingAutoLines.map((line) => (
                              <button
                                key={line.id}
                                type="button"
                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                                onClick={() =>
                                  setManualPricing((current) =>
                                    restoreManualPricingAutoLine(current, line.rowKey ?? ''),
                                  )
                                }
                              >
                                {line.label || '삭제된 자동 행'} 복원
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {manualPricing.enabled &&
                      fullTeamPricingRows.length > 1 &&
                      !amountsDifferAcrossTeams &&
                      !basesDifferAcrossTeams ? (
                        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                            onClick={() => setManualPricingSplitTeamRows((prev) => !prev)}
                          >
                            {manualPricingSplitTeamRows ? '한 줄로 보기' : '팀 분리해서 보기'}
                          </button>
                        </div>
                      ) : null}

                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="grid grid-cols-4 bg-slate-100 text-center text-[11px] font-medium text-slate-600">
                          <div className="border-r border-slate-200 px-2 py-2">총액(1인)</div>
                          <div className="border-r border-slate-200 px-2 py-2">예약금(1인)</div>
                          <div className="border-r border-slate-200 px-2 py-2">잔금(1인)</div>
                          <div className="px-2 py-2">보증금(팀당/인당)</div>
                        </div>
                        <div className="grid grid-cols-4 gap-0 text-sm text-slate-900">
                          {(
                            [
                              ['totalAmountKrw', 'totalAmountKrw'],
                              ['depositAmountKrw', 'depositAmountKrw'],
                              ['balanceAmountKrw', 'balanceAmountKrw'],
                              ['securityDepositAmountKrw', 'securityDepositAmountKrw'],
                            ] as const
                          ).map(([key, field], index) => (
                            <div key={key} className={`${index < 3 ? 'border-r border-slate-200' : ''} px-2 py-3`}>
                              <div className="space-y-2">
                                {effectivePricingPreview.teamPricings.length === 0 ? (
                                  manualPricing.enabled &&
                                  field === 'securityDepositAmountKrw' &&
                                  effectivePricingPreview.securityDepositMode !== 'NONE' ? (
                                    <div className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-center sm:justify-center">
                                      <input
                                        type="number"
                                        step={1}
                                        value={
                                          effectivePricingPreview.securityDepositMode === 'PER_PERSON'
                                            ? effectivePricingPreview.securityDepositUnitPriceKrw
                                            : effectivePricingPreview.securityDepositAmountKrw
                                        }
                                        onChange={(event) => {
                                          const nextValue = Number(event.target.value);
                                          if (!Number.isInteger(nextValue)) {
                                            return;
                                          }
                                          setManualPricing((current) =>
                                            setManualPricingSummaryValue(
                                              current,
                                              'securityDepositAmountKrw',
                                              nextValue,
                                            ),
                                          );
                                        }}
                                        className="w-full max-w-[140px] rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm"
                                      />
                                      <select
                                        value={
                                          effectivePricingPreview.securityDepositMode === 'PER_TEAM'
                                            ? 'PER_TEAM'
                                            : 'PER_PERSON'
                                        }
                                        onChange={(event) => {
                                          const mode = event.target.value as 'PER_PERSON' | 'PER_TEAM';
                                          setManualPricing((current) =>
                                            setManualPricingSummarySecurityDepositMode(current, mode),
                                          );
                                        }}
                                        className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-xs text-slate-800"
                                        aria-label="보증금 단위"
                                      >
                                        <option value="PER_PERSON">인당</option>
                                        <option value="PER_TEAM">팀당</option>
                                      </select>
                                    </div>
                                  ) : (
                                    <div className="text-center">
                                      {field === 'securityDepositAmountKrw' &&
                                      effectivePricingPreview.securityDepositMode !== 'NONE'
                                        ? `${formatKrw(effectivePricingPreview.securityDepositUnitPriceKrw)} (${formatSecurityDepositScope(
                                            effectivePricingPreview.securityDepositMode,
                                          )})`
                                        : formatKrw(effectivePricingPreview[key])}
                                    </div>
                                  )
                                ) : (
                                  teamsForAmountSummaryGrid.map((teamPricing) => (
                                    <div key={`${field}-${teamPricing.teamOrderIndex}`} className="grid gap-1">
                                      {manualPricing.enabled ? (
                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                          {pricingSummaryShowTeamPrefix ? (
                                            <div className="text-xs font-medium text-slate-500">{`${teamPricing.teamName})`}</div>
                                          ) : null}
                                          {field === 'securityDepositAmountKrw' &&
                                          teamPricing.securityDepositMode !== 'NONE' ? (
                                            <>
                                              <input
                                                type="number"
                                                step={1}
                                                value={
                                                  teamPricing.securityDepositMode === 'PER_PERSON'
                                                    ? teamPricing.securityDepositUnitPriceKrw
                                                    : teamPricing.securityDepositAmountKrw
                                                }
                                                onChange={(event) => {
                                                  const nextValue = Number(event.target.value);
                                                  if (!Number.isInteger(nextValue)) {
                                                    return;
                                                  }
                                                  setManualPricing((current) =>
                                                    manualPricingAmountSummaryCollapsed
                                                      ? setManualPricingAllTeamSummariesValue(
                                                          current,
                                                          allTeamOrderIndexesForSummarySync,
                                                          field,
                                                          nextValue,
                                                        )
                                                      : setManualPricingTeamSummaryValue(
                                                          current,
                                                          teamPricing.teamOrderIndex,
                                                          field,
                                                          nextValue,
                                                        ),
                                                  );
                                                }}
                                                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm"
                                              />
                                              <select
                                                value={
                                                  teamPricing.securityDepositMode === 'PER_TEAM'
                                                    ? 'PER_TEAM'
                                                    : 'PER_PERSON'
                                                }
                                                onChange={(event) => {
                                                  const mode = event.target.value as 'PER_PERSON' | 'PER_TEAM';
                                                  setManualPricing((current) =>
                                                    manualPricingAmountSummaryCollapsed
                                                      ? setManualPricingAllTeamSummariesSecurityDepositMode(
                                                          current,
                                                          allTeamOrderIndexesForSummarySync,
                                                          mode,
                                                        )
                                                      : setManualPricingTeamSummarySecurityDepositMode(
                                                          current,
                                                          teamPricing.teamOrderIndex,
                                                          mode,
                                                        ),
                                                  );
                                                }}
                                                className="shrink-0 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-xs text-slate-800"
                                                aria-label="보증금 단위"
                                              >
                                                <option value="PER_PERSON">인당</option>
                                                <option value="PER_TEAM">팀당</option>
                                              </select>
                                            </>
                                          ) : (
                                            <input
                                              type="number"
                                              step={1}
                                              value={teamPricing[field]}
                                              onChange={(event) => {
                                                const nextValue = Number(event.target.value);
                                                if (!Number.isInteger(nextValue)) {
                                                  return;
                                                }
                                                setManualPricing((current) =>
                                                  manualPricingAmountSummaryCollapsed
                                                    ? setManualPricingAllTeamSummariesValue(
                                                        current,
                                                        allTeamOrderIndexesForSummarySync,
                                                        field,
                                                        nextValue,
                                                      )
                                                    : setManualPricingTeamSummaryValue(
                                                        current,
                                                        teamPricing.teamOrderIndex,
                                                        field,
                                                        nextValue,
                                                      ),
                                                );
                                              }}
                                              className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm"
                                            />
                                          )}
                                        </div>
                                      ) : field === 'securityDepositAmountKrw' && teamPricing.securityDepositMode !== 'NONE' ? (
                                        <div className="text-center">{`${pricingSummaryShowTeamPrefix ? `${teamPricing.teamName}) ` : ''}${formatKrw(
                                          teamPricing.securityDepositUnitPriceKrw,
                                        )} (${formatSecurityDepositScope(teamPricing.securityDepositMode)})`}</div>
                                      ) : (
                                        <div className="text-center">{`${pricingSummaryShowTeamPrefix ? `${teamPricing.teamName}) ` : ''}${formatKrw(teamPricing[field])}`}</div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">안내 이미지</h2>
                <p className="mt-2 text-xs text-slate-500">
                  여행지 안내 페이지 이미지 장수와 페이지별 분할입니다. 변경 내용은 미리보기에 즉시 반영됩니다.
                </p>
                <EstimateGuideLayoutControls
                  className="mt-4"
                  density="compact"
                  estimateGuideImagesPerPage={estimateGuideImagesPerPage}
                  onEstimateGuideImagesPerPage={setEstimateGuideImagesPerPage}
                  estimateGuidePageSplitsText={estimateGuidePageSplitsText}
                  onEstimateGuidePageSplitsText={setEstimateGuidePageSplitsText}
                  splitsInputId="estimate-guide-page-splits-builder"
                />
              </Card>

              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">견적 유효기간</h2>
                <p className="mt-2 text-xs text-slate-500">
                  견적서 1페이지 하단 유효기간입니다. 저장 시 버전 메타에 함께 기록됩니다.
                </p>
                <EstimateValidUntilControls
                  className="mt-4"
                  density="compact"
                  validUntilDate={validUntilDate}
                  onValidUntilDateChange={setValidUntilDate}
                />
              </Card>

              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  aria-expanded={isValidationOpen}
                  aria-controls="builder-validation-panel"
                  onClick={() => setIsValidationOpen((prev) => !prev)}
                >
                  <h2 className="text-lg font-bold text-slate-900">검증</h2>
                  <span className="text-xs text-slate-500">
                    {isValidationOpen ? '닫기' : '열기'}
                  </span>
                </button>
                {isValidationOpen ? (
                  <div id="builder-validation-panel" className="mt-3 space-y-2 text-sm">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      편집 행 수: {planRows.length}
                    </div>
                    {validationResults.length === 0 ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                        모든 검증 통과
                      </div>
                    ) : null}
                    {validationResults.map((result) => (
                      <div
                        key={result.id}
                        className={`rounded-2xl border p-3 ${
                          result.severity === 'error'
                            ? 'border-rose-200 bg-rose-50 text-rose-900'
                            : 'border-amber-200 bg-amber-50 text-amber-900'
                        }`}
                      >
                        {result.message}
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>

              <Card className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  aria-expanded={isPayloadPreviewOpen}
                  aria-controls="builder-payload-preview-panel"
                  onClick={() => setIsPayloadPreviewOpen((prev) => !prev)}
                >
                  <h2 className="text-lg font-bold text-slate-900">저장 데이터 미리보기</h2>
                  <span className="text-xs text-slate-500">
                    {isPayloadPreviewOpen ? '닫기' : '열기'}
                  </span>
                </button>
                {isPayloadPreviewOpen ? (
                  <>
                    <p className="mt-1 text-xs text-slate-600">
                      저장 시 서버로 전달되는 요약입니다.
                    </p>
                    <pre
                      id="builder-payload-preview-panel"
                      className="mt-3 max-h-[280px] overflow-auto rounded-2xl bg-slate-900 p-3 text-xs leading-5 text-slate-100"
                    >
                      {JSON.stringify(
                        isVersionMode
                          ? {
                              userId,
                              planId,
                              parentVersionId,
                              regionSetId,
                              variantType,
                              totalDays,
                              changeNote,
                              meta: {
                                leaderName,
                                travelStartDate,
                                travelEndDate,
                                headcountTotal,
                                headcountMale,
                                headcountFemale,
                                vehicleType,
                                vehicleAssignments,
                                ...primaryMetaFlightFields(primaryTransportGroup),
                                pickupDate: primaryTransportGroup?.pickupDate ?? '',
                                pickupTime: primaryTransportGroup?.pickupTime ?? '',
                                pickupPlaceType:
                                  primaryTransportGroup?.pickupPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                pickupPlaceCustomText:
                                  primaryTransportGroup?.pickupPlaceCustomText ?? '',
                                dropDate: primaryTransportGroup?.dropDate ?? '',
                                dropTime: primaryTransportGroup?.dropTime ?? '',
                                dropPlaceType:
                                  primaryTransportGroup?.dropPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                dropPlaceCustomText:
                                  primaryTransportGroup?.dropPlaceCustomText ?? '',
                                externalTransfers: normalizedExternalTransfers,
                                transportGroups: normalizedTransportGroups.map((group) =>
                                  mapTransportGroupToPlanMutationInput(group),
                                ),
                                specialNote,
                                includeRentalItems,
                                rentalItemsText,
                                eventIds,
                                extraLodgings,
                                lodgingSelections,
                                remark,
                                estimateGuideImagesPerPage,
                                estimateGuidePageSplits: estimateGuidePageSplitsParsed ?? undefined,
                                movementIntensityColorOverride: overallMovementIntensityColorOverride,
                              },
                              manualAdjustments: normalizedManualAdjustments,
                              manualDepositAmountKrw: normalizedManualDepositAmountKrw,
                              manualPricing: serializedManualPricingSnapshot,
                              selectedRoute,
                              planStops: planStopsForMutation,
                            }
                          : {
                              userId,
                              regionSetId,
                              title: planTitle,
                              documentNumberBase: planDocumentNumberBase.trim() || undefined,
                              variantType,
                              totalDays,
                              changeNote,
                              meta: {
                                leaderName,
                                travelStartDate,
                                travelEndDate,
                                headcountTotal,
                                headcountMale,
                                headcountFemale,
                                vehicleType,
                                vehicleAssignments,
                                ...primaryMetaFlightFields(primaryTransportGroup),
                                pickupDate: primaryTransportGroup?.pickupDate ?? '',
                                pickupTime: primaryTransportGroup?.pickupTime ?? '',
                                pickupPlaceType:
                                  primaryTransportGroup?.pickupPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                pickupPlaceCustomText:
                                  primaryTransportGroup?.pickupPlaceCustomText ?? '',
                                dropDate: primaryTransportGroup?.dropDate ?? '',
                                dropTime: primaryTransportGroup?.dropTime ?? '',
                                dropPlaceType:
                                  primaryTransportGroup?.dropPlaceType ??
                                  DEFAULT_PICKUP_DROP_PLACE_TYPE,
                                dropPlaceCustomText:
                                  primaryTransportGroup?.dropPlaceCustomText ?? '',
                                externalTransfers: normalizedExternalTransfers,
                                transportGroups: normalizedTransportGroups.map((group) =>
                                  mapTransportGroupToPlanMutationInput(group),
                                ),
                                specialNote,
                                includeRentalItems,
                                rentalItemsText,
                                eventIds,
                                extraLodgings,
                                lodgingSelections,
                                remark,
                                estimateGuideImagesPerPage,
                                estimateGuidePageSplits: estimateGuidePageSplitsParsed ?? undefined,
                                movementIntensityColorOverride: overallMovementIntensityColorOverride,
                              },
                              manualAdjustments: normalizedManualAdjustments,
                              manualDepositAmountKrw: normalizedManualDepositAmountKrw,
                              manualPricing: serializedManualPricingSnapshot,
                              selectedRoute,
                              initialVersion: {
                                planStops: planStopsForMutation,
                              },
                            },
                        null,
                        2,
                      )}
                    </pre>
                  </>
                ) : null}
              </Card>
            </section>
          </div>
        </div>

        {isPreviewEnabled ? (
          <aside
            className={`${activePane === 'preview' ? 'block' : 'hidden'} bg-slate-100/80 lg:block lg:h-full lg:overflow-y-auto`}
          >
            <div className="p-4 sm:p-6 lg:sticky lg:top-0 lg:p-6">
              <div className="estimate-preview-panel rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 pr-2 sm:max-w-[min(100%,calc(100%-11rem))]">
                    <h2 className="text-base font-semibold text-slate-900">
                      실시간 견적서 미리보기
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      좌측 입력값이 우측 문서에 바로 반영됩니다.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
                      {previewGuidesLoading ? '여행지 안내 동기화 중' : '실시간 반영'}
                    </div>
                  </div>
                </div>

                {previewEstimateData ? (
                  <div className="estimate-preview-frame">
                    <EstimatePreviewScaler>
                      <EstimateDocument
                        data={previewEstimateData}
                        viewMode="screen-preview"
                        guideSplitRemainderStrategy="chunk-per-page"
                        page1Editor={previewPage1Editor}
                        page2Editor={previewPage2Editor}
                        validUntilEditor={{
                          value: validUntilDate,
                          onChange: setValidUntilDate,
                        }}
                        screenPreviewGuideOverlay={
                          <EstimateGuideLayoutControls
                            density="compact"
                            estimateGuideImagesPerPage={estimateGuideImagesPerPage}
                            onEstimateGuideImagesPerPage={setEstimateGuideImagesPerPage}
                            estimateGuidePageSplitsText={estimateGuidePageSplitsText}
                            onEstimateGuidePageSplitsText={setEstimateGuidePageSplitsText}
                            splitsInputId="estimate-guide-page-splits-preview"
                          />
                        }
                      />
                    </EstimatePreviewScaler>
                  </div>
                ) : (
                  <Card className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                    미리보기 데이터를 준비 중입니다...
                  </Card>
                )}
              </div>
            </div>
          </aside>
        ) : null}

        <ExternalTransfersManagerModal
          open={externalTransfersManagerModalState.open}
          externalTransfers={externalTransfersDraft}
          transportGroups={transportGroups}
          externalPickupText={draftExternalPickupText}
          externalDropText={draftExternalDropText}
          onClose={() => {
            setExternalTransfersManagerModalState({ open: false });
            setExternalTransfersDraft([]);
            setExternalTransferModalState({
              open: false,
              editingIndex: null,
            });
          }}
          onComplete={() => {
            setExternalTransfers(normalizeExternalTransfers(externalTransfersDraft.map(cloneExternalTransfer)));
            setExternalTransfersManagerModalState({ open: false });
            setExternalTransfersDraft([]);
            setExternalTransferModalState({
              open: false,
              editingIndex: null,
            });
          }}
          onAdd={() =>
            setExternalTransferModalState({
              open: true,
              editingIndex: null,
            })
          }
          onEdit={(index) =>
            setExternalTransferModalState({
              open: true,
              editingIndex: index,
            })
          }
          onRemove={(index) =>
            setExternalTransfersDraft((current) =>
              current.filter((_item, transferIndex) => transferIndex !== index),
            )
          }
        />

        <ExternalTransferModal
          open={externalTransferModalState.open}
          transportGroups={transportGroups}
          initialValue={
            externalTransferModalState.editingIndex !== null
              ? (externalTransfersDraft[externalTransferModalState.editingIndex] ??
                buildEmptyExternalTransfer())
              : null
          }
          onClose={() =>
            setExternalTransferModalState({
              open: false,
              editingIndex: null,
            })
          }
          onSubmit={(value) => {
            setExternalTransfersDraft((current) => {
              if (externalTransferModalState.editingIndex === null) {
                return normalizeExternalTransfers([...current, value]);
              }

              return normalizeExternalTransfers(
                current.map((item, index) =>
                  index === externalTransferModalState.editingIndex ? value : item,
                ),
              );
            });
            setExternalTransferModalState({
              open: false,
              editingIndex: null,
            });
          }}
        />

        <LodgingUpgradeModal
          open={lodgingUpgradeModalState.open}
          rows={lodgingUpgradeRows}
          focusPlanRowIndex={lodgingUpgradeModalState.focusPlanRowIndex}
          onClose={() =>
            setLodgingUpgradeModalState({ open: false, focusPlanRowIndex: null })
          }
          onChooseLevel={(rowIndex, level) => {
            const row = lodgingUpgradeRows[rowIndex];
            if (!row) {
              return;
            }
            applyLodgingSelection(row.planRowIndex, level);
          }}
          onChooseCustom={(rowIndex) => {
            const row = lodgingUpgradeRows[rowIndex];
            if (!row) {
              return;
            }
            setLodgingSelectionModalState({
              open: true,
              rowIndex: row.planRowIndex,
            });
          }}
          onLodgingCellTextChange={(rowIndex, value) => {
            const row = lodgingUpgradeRows[rowIndex];
            if (!row) {
              return;
            }
            updateCell(row.planRowIndex, 'lodgingCellText', value);
          }}
        />

        <SpecialMealsModal
          open={specialMealsModalState.open}
          rows={planRows
            .filter((r) => isMainPlanStopRow(r))
            .map((r) => ({
              mealCellText: r.mealCellText,
              destinationCellText: r.destinationCellText,
              scheduleCellText: r.scheduleCellText,
            }))}
          specialMealDestinationRules={specialMealDestinationRules}
          onClose={() => setSpecialMealsModalState({ open: false })}
          onSave={(updatedRows) => {
            const mainIndices = planRows
              .map((r, i) => (isMainPlanStopRow(r) ? i : -1))
              .filter((i) => i >= 0);
            mainIndices.forEach((rowIndex) => {
              dirtyPlanRowFieldKeysRef.current.add(
                getDirtyPlanRowFieldKey(rowIndex, 'mealCellText'),
              );
            });
            setPlanRows((prev) =>
              prev.map((row, i) => {
                const j = mainIndices.indexOf(i);
                if (j < 0) return row;
                const updated = updatedRows[j];
                return updated ? { ...row, mealCellText: updated.mealCellText } : row;
              }),
            );
          }}
        />

        <ExtraLodgingsModal
          open={extraLodgingsModalState.open}
          counts={extraLodgingCounts}
          dayLabels={extraLodgingDayLabels}
          onClose={() => setExtraLodgingsModalState({ open: false })}
          onChangeCount={(index, nextValue) =>
            setExtraLodgingCounts((prev) =>
              prev.map((value, valueIndex) => (valueIndex === index ? nextValue : value)),
            )
          }
          onApplyUniform={(value) => setExtraLodgingCounts((prev) => prev.map(() => value))}
        />

        <TransportTeamHeadcountModal
          open={transportTeamHeadcountModalOpen}
          teams={transportGroups.map((group) => ({
            teamName: group.teamName,
            headcount: group.headcount,
          }))}
          headcountTotal={headcountTotal}
          onClose={() => setTransportTeamHeadcountModalOpen(false)}
          onSave={saveTransportTeamHeadcounts}
        />

        <ManualAdjustmentsModal
          open={manualAdjustmentsModalState.open}
          rows={manualAdjustments}
          presetOptions={manualPresetOptions}
          onClose={() => setManualAdjustmentsModalState({ open: false })}
          onAddRow={(kind) =>
            setManualAdjustments((prev) => [
              ...prev,
              createManualAdjustmentDraft(kind),
            ])
          }
          onAddPresetRow={(preset) =>
            setManualAdjustments((prev) => [...prev, createManualAdjustmentDraftFromPreset(preset)])
          }
          onUpdateRow={(index, nextRow) =>
            setManualAdjustments((prev) =>
              prev.map((row, rowIndex) => (rowIndex === index ? nextRow : row)),
            )
          }
          onRemoveRow={(index) =>
            setManualAdjustments((prev) => prev.filter((_row, rowIndex) => rowIndex !== index))
          }
        />

        <RegionLodgingSelectModal
          open={lodgingSelectionModalState.open}
          dayIndex={selectedLodgingUpgradeRow?.dayIndex ?? null}
          lodgings={regionLodgings}
          initialSelectedId={
            lodgingSelectionModalState.rowIndex !== null
              ? (planRows[lodgingSelectionModalState.rowIndex]?.customLodgingId ?? null)
              : null
          }
          onClose={() =>
            setLodgingSelectionModalState({
              open: false,
              rowIndex: null,
            })
          }
          onSubmit={(lodgingId) => {
            const lodging = regionLodgings.find((item) => item.id === lodgingId) ?? null;
            if (lodgingSelectionModalState.rowIndex === null || !lodging) {
              setLodgingSelectionModalState({
                open: false,
                rowIndex: null,
              });
              return;
            }

            applyLodgingSelection(lodgingSelectionModalState.rowIndex, 'CUSTOM', lodging);
            setLodgingSelectionModalState({
              open: false,
              rowIndex: null,
            });
          }}
        />

        <ConsultationPasteModal
          open={isConsultationPasteModalOpen}
          onClose={() => setIsConsultationPasteModalOpen(false)}
          onApply={handleConsultationApply}
        />
        <DatePickerModal
          open={datePickerTarget !== null}
          value={activeDatePickerValue}
          anchorEl={activeDatePickerAnchorEl}
          defaultYear={getCurrentLocalYear()}
          title={activeDatePickerTitle}
          onClose={() => setDatePickerTarget(null)}
          onChange={handleDatePickerChange}
        />
        <TimePickerModal
          open={timePickerTarget !== null}
          value={activeTimePickerValue}
          anchorEl={activeTimePickerAnchorEl}
          title={activeTimePickerTitle}
          allowedMinutes={activeTimePickerAllowedMinutes}
          onClose={() => setTimePickerTarget(null)}
          onChange={handleTimePickerChange}
        />
        <ConfirmDialog
          open={eventSecurityResyncModalEventId !== null}
          title="보증금을 다시 연동할까요?"
          description={
            eventSecurityResyncModalEventName
              ? `보증금을 수동으로 입력한 상태입니다. "${eventSecurityResyncModalEventName}" 참여 이벤트 변경에 맞춰 보증금을 다시 자동 연동할까요?`
              : '보증금을 수동으로 입력한 상태입니다. 참여 이벤트 변경에 맞춰 보증금을 다시 자동 연동할까요?'
          }
          cancelLabel="아니오"
          confirmLabel="예, 연동하기"
          onCancel={handleEventSecurityResyncCancel}
          onConfirm={handleEventSecurityResyncConfirm}
        />
      </div>
    </div>
  );
}
