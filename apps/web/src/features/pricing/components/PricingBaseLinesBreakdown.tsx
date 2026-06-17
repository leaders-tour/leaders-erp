import { resolveDisplayLeadAmount } from '../pricing-line-presenter';
import { buildPricingViewBuckets, getPricingLineLabel, type PricingViewLine } from '../view-model';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

function formatKrw(value: number): string {
  return `${currencyFormatter.format(value)}원`;
}

function formatPricingLineUnitDisplay(
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
    return `${formatKrw(unitAmount)}/${divisorPerson}인`;
  }
  if (line.lineCode === 'MANUAL_ADJUSTMENT' && line.sourceType === 'RULE' && line.quantity > 1 && headcountTotal > 0) {
    return `${formatKrw(line.unitPriceKrw ?? line.amountKrw)}/${headcountTotal}인`;
  }
  return line.unitPriceKrw !== null ? formatKrw(line.unitPriceKrw) : '-';
}

function formatPricingLineQuantityDisplay(
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

function lineContextForRow<TLine extends PricingViewLine & { headcount?: number | null }>(
  line: TLine,
  ctx: { headcountTotal: number; totalDays: number },
): { headcountTotal: number; totalDays: number } {
  const lineHeadcount = line.headcount;
  if (typeof lineHeadcount === 'number' && lineHeadcount > 0) {
    return { headcountTotal: lineHeadcount, totalDays: ctx.totalDays };
  }
  return ctx;
}

export function PricingBaseLinesBreakdown<TLine extends PricingViewLine & {
  teamName?: string | null;
  headcount?: number | null;
}>({
  lines,
  grandTotal,
  headcountTotal,
  totalDays,
  showTeamPrefix = false,
}: {
  lines: TLine[];
  grandTotal: number;
  headcountTotal: number;
  totalDays: number;
  showTeamPrefix?: boolean;
}): JSX.Element {
  const { baseLines } = buildPricingViewBuckets(lines, grandTotal);
  const ctx = { headcountTotal, totalDays };

  if (baseLines.length === 0) {
    return <p className="mt-2 text-xs text-slate-500">기본금 항목이 없습니다.</p>;
  }

  return (
    <div className="mt-2">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="py-2 pl-2 pr-3">항목</th>
              <th className="py-2 pr-3">가격</th>
              <th className="py-2 pr-3">개수</th>
              <th className="py-2 pr-2">금액</th>
            </tr>
          </thead>
          <tbody>
            {baseLines.map((line, index) => {
              const lineCtx = lineContextForRow(line, ctx);
              const label = getPricingLineLabel(line);
              const teamPrefix =
                showTeamPrefix && line.teamName?.trim() ? `${line.teamName.trim()}) ` : '';
              return (
                <tr
                  key={`${line.lineCode}-${line.amountKrw}-${line.teamName ?? 'global'}-${index}`}
                  className="border-b border-slate-100"
                >
                  <td className="py-2 pl-2 pr-3 text-slate-900">
                    {teamPrefix}
                    {label}
                  </td>
                  <td className="py-2 pr-3 text-slate-700">
                    {formatPricingLineUnitDisplay(line, lineCtx.headcountTotal)}
                  </td>
                  <td className="py-2 pr-3 text-slate-700">
                    {formatPricingLineQuantityDisplay(line, lineCtx.headcountTotal)}
                  </td>
                  <td className="py-2 pr-2 text-slate-900">
                    {formatKrw(resolveDisplayLeadAmount(line, lineCtx))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
