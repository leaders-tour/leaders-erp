export interface PricingViewLine {
  lineCode: string;
  sourceType: string;
  description: string | null;
  unitPriceKrw: number | null;
  quantity: number;
  amountKrw: number;
}

export interface PricingViewBuckets<TLine extends PricingViewLine> {
  baseLines: TLine[];
  addonLines: TLine[];
  baseTotal: number;
  addonTotal: number;
  grandTotal: number;
}

const BASE_LINE_CODES = new Set(['BASE', 'BASE_UPLIFT_5PLUS_5PCT', 'BASE_UPLIFT_5PLUS_10PCT', 'LONG_DISTANCE']);

const LINE_CODE_LABELS: Record<string, string> = {
  BASE: 'BASE 금액',
  BASE_UPLIFT_5PLUS_5PCT: '5% 추가',
  BASE_UPLIFT_5PLUS_10PCT: '10% 추가',
  LONG_DISTANCE: '장거리 구간 합계',
  HIACE: '하이에이스 추가',
  EXTRA_LODGING: '숙소 추가',
  LODGING_SELECTION: '숙소 선택',
  EARLY: '얼리',
  EXTEND: '연장',
  MANUAL_ADJUSTMENT: '기타금액',
};

export function buildPricingViewBuckets<TLine extends PricingViewLine>(
  lines: TLine[],
  grandTotal: number,
): PricingViewBuckets<TLine> {
  const baseLines: TLine[] = [];
  const addonLines: TLine[] = [];

  lines.forEach((line) => {
    if (BASE_LINE_CODES.has(line.lineCode)) {
      baseLines.push(line);
      return;
    }
    addonLines.push(line);
  });

  const baseTotal = baseLines.reduce((sum, line) => sum + line.amountKrw, 0);
  const addonTotal = addonLines.reduce((sum, line) => sum + line.amountKrw, 0);

  return {
    baseLines,
    addonLines,
    baseTotal,
    addonTotal,
    grandTotal,
  };
}

export function getPricingLineLabel(line: Pick<PricingViewLine, 'lineCode' | 'description' | 'quantity'>): string {
  if (line.lineCode === 'MANUAL_ADJUSTMENT' || line.lineCode === 'LODGING_SELECTION') {
    const custom = line.description?.trim();
    if (custom) {
      return custom;
    }
  }

  if (line.lineCode === 'LONG_DISTANCE') {
    return `장거리 구간 합계 (장거리 ${line.quantity}개)`;
  }

  return LINE_CODE_LABELS[line.lineCode] ?? line.lineCode;
}
