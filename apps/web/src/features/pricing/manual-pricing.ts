import {
  buildPricingManualPresentation,
  type PricingManualAdjustmentLine,
  type PricingManualSnapshot,
  type PricingManualSourceLine,
} from '@tour/domain';
import { formatPricingDetailFormula, resolveDisplayLeadAmount } from './pricing-line-presenter';
import { getPricingLineLabel } from './view-model';

export interface OriginalPricingSnapshot {
  baseAmountKrw: number;
  addonAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
}

export interface PricingAdjustmentLineRow {
  id: string;
  type: 'AUTO' | 'MANUAL';
  rowKey: string | null;
  label: string;
  leadAmountKrw: number;
  formula: string;
  deleted: boolean;
  isManual: boolean;
  autoLabel?: string | null;
  autoLeadAmountKrw?: number | null;
  autoFormula?: string | null;
}

export interface PricingLike<TLine extends PricingManualSourceLine = PricingManualSourceLine> {
  baseAmountKrw: number;
  addonAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositEvent?: {
    id: string;
    name: string;
  } | null;
  securityDepositUnitPriceKrw: number;
  securityDepositQuantity: number;
  securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
  lines: TLine[];
  originalPricing?: OriginalPricingSnapshot | null;
}

export interface EffectivePricingResult<TLine extends PricingManualSourceLine = PricingManualSourceLine>
  extends PricingLike<TLine> {
  originalPricing: OriginalPricingSnapshot;
  manualPricing: PricingManualSnapshot | null;
  adjustmentLines: PricingAdjustmentLineRow[];
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

function buildAutoAdjustmentLines<TLine extends PricingManualSourceLine>(
  pricing: PricingLike<TLine>,
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
      label: getPricingLineLabel(row),
      leadAmountKrw: resolveDisplayLeadAmount(row, ctx),
      formula: formatPricingDetailFormula(row, ctx),
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
      label: row.label,
      leadAmountKrw: row.leadAmountKrw,
      formula: row.formula,
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
        label: override.label,
        leadAmountKrw: override.leadAmountKrw,
        formula: override.formula,
        isManual:
          override.label !== line.autoLabel ||
          override.leadAmountKrw !== line.autoLeadAmountKrw ||
          override.formula !== line.autoFormula,
      },
    ];
  });

  return [...mergedAutoLines, ...manualRows];
}

export function buildEffectivePricing<TLine extends PricingManualSourceLine>(
  pricing: PricingLike<TLine>,
  ctx: { headcountTotal: number; totalDays: number },
  manualPricing?: PricingManualSnapshot | null,
  manualDepositAmountKrw?: number,
): EffectivePricingResult<TLine> {
  const { baseAmountKrw, adjustmentLines: autoAdjustmentLines } = buildAutoAdjustmentLines(pricing, manualPricing, ctx);
  const adjustmentLines = mergeAdjustmentLines(autoAdjustmentLines, manualPricing);
  const computedTotalAmountKrw = baseAmountKrw + adjustmentLines.reduce((sum, line) => sum + line.leadAmountKrw, 0);
  const summary = manualPricing?.summary ?? null;
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
    securityDepositEvent: pricing.securityDepositEvent ?? null,
    securityDepositUnitPriceKrw,
    securityDepositQuantity: pricing.securityDepositQuantity,
    securityDepositMode: pricing.securityDepositMode,
    lines: pricing.lines,
    originalPricing: pricing.originalPricing ?? {
      baseAmountKrw: pricing.baseAmountKrw,
      addonAmountKrw: pricing.addonAmountKrw,
      totalAmountKrw: pricing.totalAmountKrw,
      depositAmountKrw: pricing.depositAmountKrw,
      balanceAmountKrw: pricing.balanceAmountKrw,
      securityDepositAmountKrw: pricing.securityDepositAmountKrw,
    },
    manualPricing: manualPricing?.enabled ? manualPricing : null,
    adjustmentLines,
  };
}
