import { resolveDisplayLeadAmount } from './pricing-line-presenter';
import type { PricingViewLine } from './view-model';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

export function formatPricingTableKrw(value: number): string {
  return `${currencyFormatter.format(value)}원`;
}

export function lineContextForPricingRow<TLine extends PricingViewLine & { headcount?: number | null }>(
  line: TLine,
  ctx: { headcountTotal: number; totalDays: number },
): { headcountTotal: number; totalDays: number } {
  const lineHeadcount = line.headcount;
  if (typeof lineHeadcount === 'number' && lineHeadcount > 0) {
    return { headcountTotal: lineHeadcount, totalDays: ctx.totalDays };
  }
  return ctx;
}

export function formatPricingLineUnitDisplay(
  line: {
    lineCode: string;
    sourceType: string;
    unitPriceKrw: number | null;
    amountKrw: number;
    quantity: number;
    displayBasis?: string | null;
    displayUnitAmountKrw?: number | null;
    displayDivisorPerson?: number | null;
  },
  headcountTotal: number,
): string {
  const divisorPerson = line.displayDivisorPerson ?? headcountTotal;
  if (line.displayBasis === 'TEAM_DIV_PERSON' && divisorPerson > 0) {
    const unitAmount = line.displayUnitAmountKrw ?? line.unitPriceKrw ?? line.amountKrw;
    return `${formatPricingTableKrw(unitAmount)}/${divisorPerson}인`;
  }
  if (line.lineCode === 'MANUAL_ADJUSTMENT' && line.sourceType === 'RULE' && line.quantity > 1 && headcountTotal > 0) {
    return `${formatPricingTableKrw(line.unitPriceKrw ?? line.amountKrw)}/${headcountTotal}인`;
  }
  return line.unitPriceKrw !== null ? formatPricingTableKrw(line.unitPriceKrw) : '-';
}

export function formatPricingLineQuantityDisplay(
  line: {
    lineCode: string;
    sourceType: string;
    quantity: number;
    displayBasis?: string | null;
    displayCount?: number | null;
    quantityDisplaySuffix?: '박';
  },
  headcountTotal: number,
): string {
  if (line.displayBasis === 'TEAM_DIV_PERSON') {
    const count = line.displayCount ?? line.quantity;
    return count === 1 ? '1회' : `${count}회`;
  }
  if (line.lineCode === 'MANUAL_ADJUSTMENT' && line.sourceType === 'RULE' && line.quantity > 1 && headcountTotal > 0) {
    return `${headcountTotal}인`;
  }
  if (line.quantityDisplaySuffix === '박') {
    return `${line.quantity}박`;
  }
  return String(line.quantity);
}

export function formatPricingLineLeadAmountDisplay(
  line: Parameters<typeof resolveDisplayLeadAmount>[0],
  ctx: { headcountTotal: number; totalDays: number },
): string {
  return formatPricingTableKrw(resolveDisplayLeadAmount(line, ctx));
}
