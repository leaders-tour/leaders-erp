import {
  buildPricingManualPresentation,
  resolveEffectiveDepositAndBalanceKrw,
  type PricingManualAdjustmentLine,
  type PricingManualSnapshot,
  type PricingManualSourceLine,
  type PricingManualTeamSummarySnapshot,
} from '@tour/domain';
import { formatPricingDetailFormula, resolveDisplayLeadAmount } from './pricing-line-presenter';
import { getPricingLineLabel } from './view-model';

type SecurityDepositScopeMode = 'NONE' | 'PER_PERSON' | 'PER_TEAM';

interface PricingSummaryAmounts {
  baseAmountKrw: number;
  addonAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
}

export interface OriginalTeamPricingSnapshot extends PricingSummaryAmounts {
  teamOrderIndex: number;
  teamName: string;
  headcount: number;
  securityDepositUnitPriceKrw: number;
  securityDepositQuantity: number;
  securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
}

export interface OriginalPricingSnapshot extends PricingSummaryAmounts {
  teamPricings?: OriginalTeamPricingSnapshot[];
}

export interface PricingAdjustmentLineRow {
  id: string;
  type: 'AUTO' | 'MANUAL';
  rowKey: string | null;
  teamOrderIndex?: number | null;
  teamName?: string | null;
  headcount?: number | null;
  label: string;
  leadAmountKrw: number;
  formula: string;
  strikethrough: boolean;
  deleted: boolean;
  isManual: boolean;
  autoLabel?: string | null;
  autoLeadAmountKrw?: number | null;
  autoFormula?: string | null;
}

/** 일정 빌더·견적서 공통: 팀별 `adjustmentLines`를 고객용 목록으로 묶는다. */
export interface DisplayedPricingAdjustmentLineRow extends PricingAdjustmentLineRow {
  sourceLines: PricingAdjustmentLineRow[];
  teamOrderIndexes: number[];
  teamNames: string[];
  isSharedAcrossTeams: boolean;
}

function buildAdjustmentGroupingKey(line: PricingAdjustmentLineRow): string {
  return [
    line.type,
    line.label,
    line.leadAmountKrw,
    line.formula,
    line.strikethrough ? 'strikethrough' : '',
    line.isManual ? 'manual' : 'auto',
    line.autoLabel ?? '',
    line.autoLeadAmountKrw ?? '',
    line.autoFormula ?? '',
  ].join('|');
}

function aggregateSameKeyAdjustmentLines(
  sourceLines: PricingAdjustmentLineRow[],
  options: { sumLeadAmounts: boolean },
): PricingAdjustmentLineRow {
  const first = sourceLines[0];
  if (!first) {
    throw new Error('aggregateSameKeyAdjustmentLines requires at least one line');
  }
  if (sourceLines.length === 1) {
    return first;
  }
  const leadAmountKrw = options.sumLeadAmounts
    ? sourceLines.reduce((sum, item) => sum + (item.strikethrough ? 0 : item.leadAmountKrw), 0)
    : first.leadAmountKrw;
  const autoLeadAmountKrw = options.sumLeadAmounts
    ? first.autoLeadAmountKrw == null
      ? null
      : sourceLines.reduce((sum, item) => sum + (item.autoLeadAmountKrw ?? 0), 0)
    : first.autoLeadAmountKrw;
  return {
    ...first,
    leadAmountKrw,
    autoLeadAmountKrw,
    isManual:
      first.isManual ||
      sourceLines.some(
        (item) =>
          item.label !== first.label ||
          item.leadAmountKrw !== first.leadAmountKrw ||
          item.formula !== first.formula ||
          item.isManual,
      ),
  };
}

export function buildDisplayedPricingAdjustmentLines<TLine extends PricingManualSourceLine>(
  effective: EffectivePricingResult<TLine>,
): DisplayedPricingAdjustmentLineRow[] {
  if (!effective.teamPricings || effective.teamPricings.length === 0) {
    return effective.adjustmentLines.map((line) => ({
      ...line,
      sourceLines: [line],
      teamOrderIndexes: line.teamOrderIndex != null ? [line.teamOrderIndex] : [],
      teamNames: line.teamName ? [line.teamName] : [],
      isSharedAcrossTeams: false,
    }));
  }

  const rawTeamLines = effective.teamPricings.flatMap((teamPricing) =>
    teamPricing.adjustmentLines.map((line) => ({
      ...line,
      teamOrderIndex: teamPricing.teamOrderIndex,
      teamName: teamPricing.teamName,
      headcount: teamPricing.headcount,
    })),
  );
  const grouped = new Map<string, PricingAdjustmentLineRow[]>();
  rawTeamLines.forEach((line) => {
    const key = buildAdjustmentGroupingKey(line);
    const current = grouped.get(key);
    if (current) {
      current.push(line);
      return;
    }
    grouped.set(key, [line]);
  });

  const result: DisplayedPricingAdjustmentLineRow[] = [];
  const teamCount = effective.teamPricings.length;
  rawTeamLines.forEach((line) => {
    const key = buildAdjustmentGroupingKey(line);
    const sourceLines = grouped.get(key);
    if (!sourceLines || sourceLines.length === 0) {
      return;
    }
    grouped.delete(key);
    const uniqueTeamOrderIndexes = Array.from(
      new Set(
        sourceLines
          .map((item) => item.teamOrderIndex)
          .filter((value): value is number => typeof value === 'number'),
      ),
    );
    const uniqueTeamNames = Array.from(
      new Set(sourceLines.map((item) => item.teamName).filter((value): value is string => typeof value === 'string')),
    );
    const isSharedAcrossTeams =
      teamCount > 1 &&
      uniqueTeamOrderIndexes.length === teamCount &&
      sourceLines.length === teamCount;
    if (isSharedAcrossTeams) {
      result.push({
        ...aggregateSameKeyAdjustmentLines(sourceLines, { sumLeadAmounts: false }),
        teamOrderIndex: null,
        teamName: null,
        sourceLines,
        teamOrderIndexes: uniqueTeamOrderIndexes,
        teamNames: uniqueTeamNames,
        isSharedAcrossTeams: true,
      });
      return;
    }
    if (sourceLines.length > 1 && uniqueTeamOrderIndexes.length <= 1) {
      const aggregatedLine = aggregateSameKeyAdjustmentLines(sourceLines, { sumLeadAmounts: true });
      result.push({
        ...aggregatedLine,
        teamOrderIndex: aggregatedLine.teamOrderIndex ?? uniqueTeamOrderIndexes[0] ?? null,
        teamName: aggregatedLine.teamName ?? uniqueTeamNames[0] ?? null,
        sourceLines,
        teamOrderIndexes: uniqueTeamOrderIndexes,
        teamNames: uniqueTeamNames,
        isSharedAcrossTeams: false,
      });
      return;
    }
    sourceLines.forEach((sourceLine) => {
      result.push({
        ...sourceLine,
        sourceLines: [sourceLine],
        teamOrderIndexes:
          typeof sourceLine.teamOrderIndex === 'number' ? [sourceLine.teamOrderIndex] : [],
        teamNames: sourceLine.teamName ? [sourceLine.teamName] : [],
        isSharedAcrossTeams: false,
      });
    });
  });
  return result;
}

function displayedLineToPricingRow(line: DisplayedPricingAdjustmentLineRow): PricingAdjustmentLineRow {
  const {
    sourceLines: _sourceLines,
    teamOrderIndexes: _teamOrderIndexes,
    teamNames: _teamNames,
    isSharedAcrossTeams: _isSharedAcrossTeams,
    ...rest
  } = line;
  return rest;
}

export interface TeamPricingLike<TLine extends PricingManualSourceLine = PricingManualSourceLine> extends PricingSummaryAmounts {
  teamOrderIndex: number;
  teamName: string;
  headcount: number;
  securityDepositEvent?: {
    id: string;
    name: string;
  } | null;
  securityDepositUnitPriceKrw: number;
  securityDepositQuantity: number;
  securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
  lines: TLine[];
}

export interface PricingLike<TLine extends PricingManualSourceLine = PricingManualSourceLine>
  extends PricingSummaryAmounts {
  securityDepositEvent?: {
    id: string;
    name: string;
  } | null;
  securityDepositUnitPriceKrw: number;
  securityDepositQuantity: number;
  securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
  lines: TLine[];
  originalPricing?: OriginalPricingSnapshot | null;
  teamPricings?: TeamPricingLike<TLine>[];
}

export interface EffectiveTeamPricingResult<TLine extends PricingManualSourceLine = PricingManualSourceLine>
  extends TeamPricingLike<TLine> {
  originalPricing: OriginalTeamPricingSnapshot;
  manualPricing: PricingManualSnapshot | null;
  adjustmentLines: PricingAdjustmentLineRow[];
}

export interface EffectivePricingResult<TLine extends PricingManualSourceLine = PricingManualSourceLine>
  extends PricingLike<TLine> {
  originalPricing: OriginalPricingSnapshot;
  manualPricing: PricingManualSnapshot | null;
  adjustmentLines: PricingAdjustmentLineRow[];
  teamPricings: EffectiveTeamPricingResult<TLine>[];
}

function hasNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

/**
 * 팀 단위 수동 요약만 넣어둔 스냅샷에서 `baseAmountKrw` 등이 비어 있으면
 * 글로벌 `summary`를 폴백한다. 그렇지 않으면 단일 팀일 때 `sliceEffectiveTotalsForUi`가
 * 팀 라인 자동 합(천 원 반올림 기본금)만 쓰게 되어 빌더에서 저장한 수동 기본금이 상세 UI에서 빠진다.
 *
 * 총액·예약금·잔금은 글로벌 폴백을 하지 않는다. 저장 스냅샷에 남은 글로벌 요약이
 * 팀 줄 재계산보다 우선하면 할인/추가 줄을 넣어도 총액이 고정되는 현상이 생긴다.
 * (팀별 `teamSummaries`에 사용자가 입력한 값만 핀으로 유지한다.)
 */
function mergeManualSummaryForTeamScope(
  globalSummary: PricingManualSnapshot['summary'] | null | undefined,
  teamRow: PricingManualTeamSummarySnapshot | null | undefined,
): PricingManualSnapshot['summary'] | null {
  if (!globalSummary && !teamRow) {
    return null;
  }

  const mergeSecurityDepositMode = (
    teamInner: PricingManualTeamSummarySnapshot | null | undefined,
    globalInner: PricingManualSnapshot['summary'] | null | undefined,
  ): SecurityDepositScopeMode | null => {
    const teamMode = teamInner?.securityDepositMode;
    const globalMode = globalInner?.securityDepositMode;
    if (teamMode === 'NONE' || teamMode === 'PER_PERSON' || teamMode === 'PER_TEAM') {
      return teamMode;
    }
    if (globalMode === 'NONE' || globalMode === 'PER_PERSON' || globalMode === 'PER_TEAM') {
      return globalMode;
    }
    return null;
  };

  const pickSharedWithGlobal = (
    teamVal: number | null | undefined,
    globalVal: number | null | undefined,
  ): number | null => {
    if (hasNumber(teamVal)) {
      return teamVal;
    }
    if (hasNumber(globalVal)) {
      return globalVal;
    }
    return null;
  };

  /** 예약금·잔금·총액: 팀 행에만 허용 (글로벌 폴백 금지) */
  const pickTeamPinnedOnly = (teamVal: number | null | undefined): number | null =>
    hasNumber(teamVal) ? teamVal : null;

  if (!teamRow) {
    if (!globalSummary) {
      return null;
    }
    return {
      baseAmountKrw: pickSharedWithGlobal(null, globalSummary.baseAmountKrw),
      totalAmountKrw: null,
      depositAmountKrw: null,
      balanceAmountKrw: null,
      securityDepositAmountKrw: pickSharedWithGlobal(null, globalSummary.securityDepositAmountKrw),
      securityDepositMode: mergeSecurityDepositMode(null, globalSummary),
    };
  }
  if (!globalSummary) {
    const { teamOrderIndex: _t, ...rest } = teamRow;
    return rest;
  }

  return {
    baseAmountKrw: pickSharedWithGlobal(teamRow.baseAmountKrw, globalSummary.baseAmountKrw),
    totalAmountKrw: pickTeamPinnedOnly(teamRow.totalAmountKrw),
    depositAmountKrw: pickTeamPinnedOnly(teamRow.depositAmountKrw),
    balanceAmountKrw: pickTeamPinnedOnly(teamRow.balanceAmountKrw),
    securityDepositAmountKrw: pickSharedWithGlobal(teamRow.securityDepositAmountKrw, globalSummary.securityDepositAmountKrw),
    securityDepositMode: mergeSecurityDepositMode(teamRow, globalSummary),
  };
}

function filterManualPricingForScope(
  manualPricing: PricingManualSnapshot | null | undefined,
  teamOrderIndex: number | null,
): PricingManualSnapshot | null {
  if (!manualPricing?.enabled) {
    return null;
  }

  const scopedAdjustmentLines = (manualPricing.adjustmentLines ?? []).filter((row) => {
    const rowTeamOrderIndex = typeof row.teamOrderIndex === 'number' ? row.teamOrderIndex : null;
    if (teamOrderIndex === null) {
      return rowTeamOrderIndex === null;
    }
    return rowTeamOrderIndex === null || rowTeamOrderIndex === teamOrderIndex;
  });

  const rawGlobalSummary = manualPricing.summary ?? null;
  /** 팀별 요약 행이 있으면 글로벌 총액·예약금·잔금은 롤업으로 신뢰하지 않는다. */
  const globalSummaryForScope =
    teamOrderIndex === null && (manualPricing.teamSummaries?.length ?? 0) > 0 && rawGlobalSummary
      ? {
          ...rawGlobalSummary,
          totalAmountKrw: null,
          depositAmountKrw: null,
          balanceAmountKrw: null,
        }
      : rawGlobalSummary;

  const summary =
    teamOrderIndex === null
      ? globalSummaryForScope
      : mergeManualSummaryForTeamScope(
          manualPricing.summary ?? null,
          (manualPricing.teamSummaries ?? []).find((item) => item.teamOrderIndex === teamOrderIndex) ?? null,
        );

  return {
    enabled: true,
    adjustmentLines: scopedAdjustmentLines,
    summary,
    teamSummaries: teamOrderIndex === null ? manualPricing.teamSummaries ?? [] : [],
    lineOverrides: manualPricing.lineOverrides ?? [],
  };
}

function buildAutoAdjustmentLines<TLine extends PricingManualSourceLine>(
  pricing: Pick<PricingLike<TLine>, 'lines'>,
  manualPricing: PricingManualSnapshot | null | undefined,
  ctx: { headcountTotal: number; totalDays: number },
): { baseAmountKrw: number; adjustmentLines: PricingAdjustmentLineRow[] } {
  const presentation = buildPricingManualPresentation(pricing.lines, manualPricing);
  return {
    baseAmountKrw: presentation.effectiveBaseTotal,
    adjustmentLines: presentation.addonRows.map((row) => ({
      id: row.rowKey,
      type: 'AUTO' as const,
      rowKey: row.rowKey,
      teamOrderIndex: row.teamOrderIndex ?? null,
      teamName: row.teamName ?? null,
      headcount: row.headcount ?? null,
      label: getPricingLineLabel(row),
      leadAmountKrw: resolveDisplayLeadAmount(row, ctx),
      formula: formatPricingDetailFormula(row, ctx),
      strikethrough: false,
      deleted: false,
      isManual: row.isManualOverride,
      autoLabel: getPricingLineLabel(row),
      autoLeadAmountKrw: resolveDisplayLeadAmount(row, ctx),
      autoFormula: formatPricingDetailFormula(row, ctx),
    })),
  };
}

function mergeAdjustmentLines(
  autoLines: PricingAdjustmentLineRow[],
  manualPricing?: PricingManualSnapshot | null,
): PricingAdjustmentLineRow[] {
  if (!manualPricing?.enabled) {
    return autoLines;
  }

  const manualAdjustmentLines = Array.isArray(manualPricing.adjustmentLines) ? manualPricing.adjustmentLines : [];
  const autoOverrideMap = new Map<string, PricingManualAdjustmentLine>();
  const manualRows: PricingAdjustmentLineRow[] = [];

  manualAdjustmentLines.forEach((row) => {
    if (row.type === 'AUTO' && typeof row.rowKey === 'string') {
      autoOverrideMap.set(row.rowKey, row);
      return;
    }
    if (row.type !== 'MANUAL' || row.deleted) {
      return;
    }
    manualRows.push({
      id: row.id,
      type: 'MANUAL',
      rowKey: null,
      teamOrderIndex: row.teamOrderIndex ?? null,
      label: row.label,
      leadAmountKrw: row.leadAmountKrw,
      formula: row.formula,
      strikethrough: row.strikethrough === true,
      deleted: false,
      isManual: true,
      autoLabel: null,
      autoLeadAmountKrw: null,
      autoFormula: null,
    });
  });

  const mergedAutoLines = autoLines.flatMap((line) => {
    const override = line.rowKey ? autoOverrideMap.get(line.rowKey) : undefined;
    if (override?.deleted) {
      return [];
    }
    if (!override) {
      return [line];
    }
    return [
      {
        ...line,
        id: override.id,
        teamOrderIndex: override.teamOrderIndex ?? line.teamOrderIndex ?? null,
        label: override.label,
        leadAmountKrw: override.leadAmountKrw,
        formula: override.formula,
        strikethrough: override.strikethrough === true,
        isManual:
          override.label !== line.autoLabel ||
          override.leadAmountKrw !== line.autoLeadAmountKrw ||
          override.formula !== line.autoFormula ||
          override.strikethrough === true,
      },
    ];
  });

  return [...mergedAutoLines, ...manualRows];
}

function resolveManualSecurityDepositMode(
  summary: PricingManualSnapshot['summary'] | null | undefined,
  fallback: SecurityDepositScopeMode,
): SecurityDepositScopeMode {
  const mode = summary?.securityDepositMode;
  if (mode === 'NONE' || mode === 'PER_PERSON' || mode === 'PER_TEAM') {
    return mode;
  }
  return fallback;
}

function resolveSecurityDepositHeadcount<TLine extends PricingManualSourceLine>(
  pricing: PricingLike<TLine> | TeamPricingLike<TLine>,
  ctx: { headcountTotal: number; totalDays: number },
): number {
  if ('teamOrderIndex' in pricing && Number.isInteger(pricing.headcount)) {
    return pricing.headcount;
  }
  return ctx.headcountTotal;
}

function normalizeEffectiveSecurityDeposit(input: {
  manualUnitKrw: number | null;
  pricingTotalKrw: number;
  pricingUnitKrw: number;
  mode: SecurityDepositScopeMode;
  quantity: number;
}): {
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
  securityDepositQuantity: number;
} {
  const { manualUnitKrw, pricingTotalKrw, pricingUnitKrw, mode, quantity } = input;
  if (mode === 'NONE') {
    return {
      securityDepositAmountKrw: 0,
      securityDepositUnitPriceKrw: 0,
      securityDepositQuantity: 0,
    };
  }
  if (manualUnitKrw != null) {
    if (mode === 'PER_PERSON') {
      const unit = manualUnitKrw;
      const effectiveQuantity = Math.max(1, quantity);
      return {
        securityDepositAmountKrw: unit * effectiveQuantity,
        securityDepositUnitPriceKrw: unit,
        securityDepositQuantity: effectiveQuantity,
      };
    }
    return {
      securityDepositAmountKrw: manualUnitKrw,
      securityDepositUnitPriceKrw: manualUnitKrw,
      securityDepositQuantity: 1,
    };
  }
  const effectiveQuantity = mode === 'PER_PERSON' ? Math.max(1, quantity) : 1;
  const total = pricingTotalKrw;
  const unit =
    pricingUnitKrw > 0
      ? pricingUnitKrw
      : effectiveQuantity > 0
        ? Math.round(total / effectiveQuantity)
        : total;
  return {
    securityDepositAmountKrw: total,
    securityDepositUnitPriceKrw: unit,
    securityDepositQuantity: effectiveQuantity,
  };
}

function buildSingleEffectivePricing<TLine extends PricingManualSourceLine>(
  pricing: PricingLike<TLine> | TeamPricingLike<TLine>,
  ctx: { headcountTotal: number; totalDays: number },
  manualPricing?: PricingManualSnapshot | null,
  manualDepositAmountKrw?: number,
) {
  const { baseAmountKrw: autoBaseAmountKrw, adjustmentLines: autoAdjustmentLines } = buildAutoAdjustmentLines(
    pricing,
    manualPricing,
    ctx,
  );
  const adjustmentLines = mergeAdjustmentLines(autoAdjustmentLines, manualPricing);
  const summary = manualPricing?.summary ?? null;
  const baseAmountKrw = hasNumber(summary?.baseAmountKrw) ? summary.baseAmountKrw : autoBaseAmountKrw;
  const computedTotalAmountKrw =
    baseAmountKrw +
    adjustmentLines.reduce((sum, line) => sum + (line.strikethrough ? 0 : line.leadAmountKrw), 0);
  const totalAmountKrw = hasNumber(summary?.totalAmountKrw) ? summary.totalAmountKrw : computedTotalAmountKrw;
  const depositOverride = hasNumber(summary?.depositAmountKrw)
    ? summary.depositAmountKrw
    : hasNumber(summary?.balanceAmountKrw)
      ? totalAmountKrw - summary.balanceAmountKrw
      : manualDepositAmountKrw;
  const balanceOverride = hasNumber(summary?.balanceAmountKrw) ? summary.balanceAmountKrw : undefined;
  const { depositAmountKrw, balanceAmountKrw } = resolveEffectiveDepositAndBalanceKrw({
    storedDepositAmountKrw: pricing.depositAmountKrw,
    storedBalanceAmountKrw: pricing.balanceAmountKrw,
    totalAmountKrw,
    depositOverride,
    balanceOverride,
  });
  const manualSecurityDepositUnitKrw = hasNumber(summary?.securityDepositAmountKrw)
    ? summary.securityDepositAmountKrw
    : null;
  const securityDepositMode = resolveManualSecurityDepositMode(summary, pricing.securityDepositMode);
  const securityHeadcount = resolveSecurityDepositHeadcount(pricing, ctx);
  const securityDepositQuantity =
    securityDepositMode === 'NONE'
      ? 0
      : securityDepositMode === 'PER_PERSON'
        ? Math.max(1, securityHeadcount)
        : 1;
  const {
    securityDepositAmountKrw,
    securityDepositUnitPriceKrw,
    securityDepositQuantity: normalizedSecurityDepositQuantity,
  } = normalizeEffectiveSecurityDeposit({
    manualUnitKrw: manualSecurityDepositUnitKrw,
    pricingTotalKrw: pricing.securityDepositAmountKrw,
    pricingUnitKrw: pricing.securityDepositUnitPriceKrw,
    mode: securityDepositMode,
    quantity: securityDepositQuantity,
  });

  return {
    baseAmountKrw,
    addonAmountKrw: totalAmountKrw - baseAmountKrw,
    totalAmountKrw,
    depositAmountKrw,
    balanceAmountKrw,
    securityDepositAmountKrw,
    securityDepositUnitPriceKrw,
    securityDepositQuantity: normalizedSecurityDepositQuantity,
    securityDepositMode,
    adjustmentLines,
  };
}

export function buildEffectivePricing<TLine extends PricingManualSourceLine>(
  pricing: PricingLike<TLine>,
  ctx: { headcountTotal: number; totalDays: number },
  manualPricing?: PricingManualSnapshot | null,
  manualDepositAmountKrw?: number,
): EffectivePricingResult<TLine> {
  const globalManualPricing = filterManualPricingForScope(manualPricing, null);
  const globalEffective = buildSingleEffectivePricing(pricing, ctx, globalManualPricing, manualDepositAmountKrw);
  const teamPricings = (pricing.teamPricings ?? []).map<EffectiveTeamPricingResult<TLine>>((teamPricing) => {
    const teamManualPricing = filterManualPricingForScope(manualPricing, teamPricing.teamOrderIndex);
    const effective = buildSingleEffectivePricing(
      teamPricing,
      { headcountTotal: teamPricing.headcount, totalDays: ctx.totalDays },
      teamManualPricing,
    );
    return {
      ...teamPricing,
      ...effective,
      originalPricing: {
        teamOrderIndex: teamPricing.teamOrderIndex,
        teamName: teamPricing.teamName,
        headcount: teamPricing.headcount,
        baseAmountKrw: teamPricing.baseAmountKrw,
        addonAmountKrw: teamPricing.addonAmountKrw,
        totalAmountKrw: teamPricing.totalAmountKrw,
        depositAmountKrw: teamPricing.depositAmountKrw,
        balanceAmountKrw: teamPricing.balanceAmountKrw,
        securityDepositAmountKrw: teamPricing.securityDepositAmountKrw,
        securityDepositUnitPriceKrw: teamPricing.securityDepositUnitPriceKrw,
        securityDepositQuantity: teamPricing.securityDepositQuantity,
        securityDepositMode: teamPricing.securityDepositMode,
      },
      manualPricing: teamManualPricing?.enabled ? teamManualPricing : null,
    };
  });

  return {
    ...pricing,
    ...globalEffective,
    originalPricing: pricing.originalPricing ?? {
      baseAmountKrw: pricing.baseAmountKrw,
      addonAmountKrw: pricing.addonAmountKrw,
      totalAmountKrw: pricing.totalAmountKrw,
      depositAmountKrw: pricing.depositAmountKrw,
      balanceAmountKrw: pricing.balanceAmountKrw,
      securityDepositAmountKrw: pricing.securityDepositAmountKrw,
      teamPricings: (pricing.teamPricings ?? []).map((teamPricing) => ({
        teamOrderIndex: teamPricing.teamOrderIndex,
        teamName: teamPricing.teamName,
        headcount: teamPricing.headcount,
        baseAmountKrw: teamPricing.baseAmountKrw,
        addonAmountKrw: teamPricing.addonAmountKrw,
        totalAmountKrw: teamPricing.totalAmountKrw,
        depositAmountKrw: teamPricing.depositAmountKrw,
        balanceAmountKrw: teamPricing.balanceAmountKrw,
        securityDepositAmountKrw: teamPricing.securityDepositAmountKrw,
        securityDepositUnitPriceKrw: teamPricing.securityDepositUnitPriceKrw,
        securityDepositQuantity: teamPricing.securityDepositQuantity,
        securityDepositMode: teamPricing.securityDepositMode,
      })),
    },
    manualPricing: globalManualPricing?.enabled ? globalManualPricing : null,
    teamPricings,
  };
}

/** 글로벌 요약 vs 팀 1개 요약 — 수동 줄이 팀 스코프만 있을 때 slice가 빌더·확정 카드와 동일한 금액 행이 된다 */
type EffectivePricingTotalsSlice<TLine extends PricingManualSourceLine = PricingManualSourceLine> = Pick<
  EffectivePricingResult<TLine>,
  | 'baseAmountKrw'
  | 'totalAmountKrw'
  | 'depositAmountKrw'
  | 'balanceAmountKrw'
  | 'securityDepositAmountKrw'
  | 'securityDepositUnitPriceKrw'
  | 'securityDepositMode'
>;

function hasSameTeamPricingSummary<TLine extends PricingManualSourceLine>(
  teams: EffectiveTeamPricingResult<TLine>[],
): boolean {
  if (teams.length <= 1) {
    return true;
  }
  const first = teams[0];
  if (!first) {
    return false;
  }
  return teams.every(
    (team) =>
      team.baseAmountKrw === first.baseAmountKrw &&
      team.totalAmountKrw === first.totalAmountKrw &&
      team.depositAmountKrw === first.depositAmountKrw &&
      team.balanceAmountKrw === first.balanceAmountKrw &&
      team.securityDepositAmountKrw === first.securityDepositAmountKrw &&
      team.securityDepositUnitPriceKrw === first.securityDepositUnitPriceKrw &&
      team.securityDepositMode === first.securityDepositMode,
  );
}

export function sliceEffectiveTotalsForUi<TLine extends PricingManualSourceLine>(
  effective: EffectivePricingResult<TLine>,
): EffectivePricingTotalsSlice<TLine> {
  const teams = effective.teamPricings ?? [];
  if (teams.length > 0 && teams[0] && hasSameTeamPricingSummary(teams)) {
    const t = teams[0];
    return {
      baseAmountKrw: t.baseAmountKrw,
      totalAmountKrw: t.totalAmountKrw,
      depositAmountKrw: t.depositAmountKrw,
      balanceAmountKrw: t.balanceAmountKrw,
      securityDepositAmountKrw: t.securityDepositAmountKrw,
      securityDepositUnitPriceKrw: t.securityDepositUnitPriceKrw,
      securityDepositMode: t.securityDepositMode,
    };
  }
  return {
    baseAmountKrw: effective.baseAmountKrw,
    totalAmountKrw: effective.totalAmountKrw,
    depositAmountKrw: effective.depositAmountKrw,
    balanceAmountKrw: effective.balanceAmountKrw,
    securityDepositAmountKrw: effective.securityDepositAmountKrw,
    securityDepositUnitPriceKrw: effective.securityDepositUnitPriceKrw,
    securityDepositMode: effective.securityDepositMode,
  };
}

/**
 * 견적서·버전 상세의 「추가 및 할인」 줄.
 * `effective.adjustmentLines`(글로벌 스코프)만 쓰면 `teamOrderIndex`가 있는 AUTO·MANUAL 줄이
 * 빠져 총액(`sliceEffectiveTotalsForUi`)에는 반영되는데 목록에는 안 나온다.
 */
export function resolveAdjustmentLinesForCustomerDocument<TLine extends PricingManualSourceLine>(
  effective: EffectivePricingResult<TLine>,
): PricingAdjustmentLineRow[] {
  const teams = effective.teamPricings ?? [];
  if (teams.length === 1 && teams[0]) {
    return teams[0].adjustmentLines;
  }
  if (teams.length > 1) {
    return buildDisplayedPricingAdjustmentLines(effective).map(displayedLineToPricingRow);
  }
  return effective.adjustmentLines;
}
