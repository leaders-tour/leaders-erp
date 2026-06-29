import { buildPricingViewBuckets, getPricingLineLabel, type PricingViewLine } from '../view-model';
import {
  formatPricingLineLeadAmountDisplay,
  formatPricingLineQuantityDisplay,
  formatPricingLineUnitDisplay,
  lineContextForPricingRow,
} from '../pricing-line-table-display';

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
              const lineCtx = lineContextForPricingRow(line, ctx);
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
                    {formatPricingLineLeadAmountDisplay(line, lineCtx)}
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
