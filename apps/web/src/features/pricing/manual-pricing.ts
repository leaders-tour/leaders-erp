import {
  buildPricingManualPresentation,
  type PricingManualAdjustmentLine,
  type PricingManualSnapshot,
  type PricingManualSourceLine,
} from '@tour/domain';
import { formatPricingDetailFormula, resolveDisplayLeadAmount } from './pricing-line-presenter';
import { getPricingLineLabel } from './view-model';

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

function computeDepositAndBalance(
  totalAmountKrw: number,
  manualDepositAmountKrw?: number,
): { depositAmountKrw: number; balanceAmountKrw: number } {
  if (manualDepositAmountKrw !== undefined) {
    return {
      depositAmountKrw: manualDepositAmountKrw,
      balanceAmountKrw: totalAmountKrw - manualDepositAmountKrw,
    };
  }

  const tenPercent = Math.round(totalAmountKrw * 0.1);
  const rawBalance = totalAmountKrw - tenPercent;
  const balanceSubTenThousand = rawBalance % 10_000;
  const rawDeposit = tenPercent + balanceSubTenThousand;
  const depositAmountKrw = Math.min(rawDeposit, totalAmountKrw);
  const balanceAmountKrw = totalAmountKrw - depositAmountKrw;
  return { depositAmountKrw, balanceAmountKrw };
}

function hasNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
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

  const summary =
    teamOrderIndex === null
      ? manualPricing.summary ?? null
      : (manualPricing.teamSummaries ?? []).find((item) => item.teamOrderIndex === teamOrderIndex) ?? null;

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
  const { depositAmountKrw, balanceAmountKrw } =
    balanceOverride !== undefined && depositOverride !== undefined
      ? {
          depositAmountKrw: depositOverride,
          balanceAmountKrw: balanceOverride,
        }
      : computeDepositAndBalance(totalAmountKrw, depositOverride);
  const securityDepositAmountKrw = hasNumber(summary?.securityDepositAmountKrw)
    ? summary.securityDepositAmountKrw
    : pricing.securityDepositAmountKrw;
  const securityDepositUnitPriceKrw =
    pricing.securityDepositMode === 'NONE'
      ? 0
      : pricing.securityDepositQuantity > 0
        ? Math.round(securityDepositAmountKrw / pricing.securityDepositQuantity)
        : securityDepositAmountKrw;

  return {
    baseAmountKrw,
    addonAmountKrw: totalAmountKrw - baseAmountKrw,
    totalAmountKrw,
    depositAmountKrw,
    balanceAmountKrw,
    securityDepositAmountKrw,
    securityDepositUnitPriceKrw,
    securityDepositQuantity: pricing.securityDepositQuantity,
    securityDepositMode: pricing.securityDepositMode,
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
