/**
 * 견적·빌더 공통: API가 내려준 display 필드 또는 구 라인(표시 필드 없음)에서
 * 오른쪽 산식 문자열을 만든다. apps/api pricing-line-display.ts와 규칙 동기화.
 */

export type PricingDisplayBasis =
  | 'TEAM_DIV_PERSON'
  | 'PER_NIGHT'
  | 'PER_DAY'
  | 'PER_PERSON_SINGLE'
  | 'PERCENT'
  | 'CUSTOM';

export interface PricingLineDisplayResolved {
  basis: PricingDisplayBasis;
  label: string | null;
  unitAmountKrw: number | null;
  count: number | null;
  divisorPerson: number | null;
  text: string | null;
}

export type PricingLineLike = {
  ruleType?: string | null;
  lineCode: string;
  sourceType: string;
  description: string | null;
  unitPriceKrw: number | null;
  quantity: number;
  amountKrw: number;
  displayBasis?: string | null;
  displayLabel?: string | null;
  displayUnitAmountKrw?: number | null;
  displayCount?: number | null;
  displayDivisorPerson?: number | null;
  displayText?: string | null;
};

function formatKrw(value: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}

function emptyResolved(
  basis: PricingDisplayBasis,
  partial: Partial<PricingLineDisplayResolved> = {},
): PricingLineDisplayResolved {
  return {
    basis,
    label: partial.label ?? null,
    unitAmountKrw: partial.unitAmountKrw ?? null,
    count: partial.count ?? null,
    divisorPerson: partial.divisorPerson ?? null,
    text: partial.text ?? null,
  };
}

/** GraphQL/DB에 표시 필드가 있으면 그대로, 없으면 구 라인에서 추론 */
export function resolvePricingLineDisplay(
  line: PricingLineLike,
  ctx: { headcountTotal: number; totalDays: number },
): PricingLineDisplayResolved {
  if (line.displayBasis && isPricingDisplayBasis(line.displayBasis)) {
    return {
      basis: line.displayBasis,
      label: line.displayLabel ?? null,
      unitAmountKrw: line.displayUnitAmountKrw ?? null,
      count: line.displayCount ?? null,
      divisorPerson: line.displayDivisorPerson ?? null,
      text: line.displayText ?? null,
    };
  }
  return inferLegacyPricingLineDisplay(line, ctx);
}

function isPricingDisplayBasis(v: string): v is PricingDisplayBasis {
  return (
    v === 'TEAM_DIV_PERSON' ||
    v === 'PER_NIGHT' ||
    v === 'PER_DAY' ||
    v === 'PER_PERSON_SINGLE' ||
    v === 'PERCENT' ||
    v === 'CUSTOM'
  );
}

function inferLegacyPricingLineDisplay(
  line: PricingLineLike,
  ctx: { headcountTotal: number; totalDays: number },
): PricingLineDisplayResolved {
  const desc = line.description?.trim() ?? '';

  if (line.ruleType === 'PERCENT_UPLIFT') {
    return emptyResolved('PERCENT', {
      text: desc.length > 0 ? desc : formatKrw(line.amountKrw),
    });
  }

  switch (line.lineCode) {
    case 'BASE': {
      if (line.unitPriceKrw !== null && ctx.totalDays > 0 && line.quantity === ctx.totalDays) {
        return emptyResolved('PER_DAY', {
          unitAmountKrw: line.unitPriceKrw,
          count: line.quantity,
        });
      }
      if (line.unitPriceKrw !== null) {
        return emptyResolved('PER_PERSON_SINGLE', {
          unitAmountKrw: line.unitPriceKrw,
          count: 1,
        });
      }
      return emptyResolved('CUSTOM', { text: formatKrw(line.amountKrw) });
    }
    case 'LONG_DISTANCE': {
      if (line.unitPriceKrw !== null && line.quantity > 0) {
        return emptyResolved('CUSTOM', {
          text: `${formatKrw(line.unitPriceKrw)}×${line.quantity}구간`,
        });
      }
      return emptyResolved('CUSTOM', { text: formatKrw(line.amountKrw) });
    }
    case 'HIACE': {
      if (line.unitPriceKrw !== null && line.quantity > 0) {
        return emptyResolved('PER_DAY', {
          unitAmountKrw: line.unitPriceKrw,
          count: line.quantity,
        });
      }
      return emptyResolved('CUSTOM', { text: formatKrw(line.amountKrw) });
    }
    case 'EXTRA_LODGING': {
      if (line.unitPriceKrw !== null && line.quantity > 0) {
        return emptyResolved('PER_NIGHT', {
          unitAmountKrw: line.unitPriceKrw,
          count: line.quantity,
        });
      }
      return emptyResolved('CUSTOM', { text: formatKrw(line.amountKrw) });
    }
    case 'EARLY':
    case 'EXTEND': {
      if (
        ctx.headcountTotal > 0 &&
        line.quantity === ctx.headcountTotal &&
        line.unitPriceKrw !== null
      ) {
        return emptyResolved('TEAM_DIV_PERSON', {
          divisorPerson: ctx.headcountTotal,
        });
      }
      if (line.unitPriceKrw !== null && ctx.totalDays > 0 && line.quantity === ctx.totalDays) {
        return emptyResolved('PER_DAY', {
          unitAmountKrw: line.unitPriceKrw,
          count: line.quantity,
        });
      }
      if (line.unitPriceKrw !== null) {
        return emptyResolved('CUSTOM', {
          text: `${formatKrw(line.unitPriceKrw)}×${line.quantity}`,
        });
      }
      return emptyResolved('CUSTOM', { text: formatKrw(line.amountKrw) });
    }
    case 'BASE_UPLIFT_5PLUS_5PCT':
      return emptyResolved('PERCENT', { text: '기본금의 5%' });
    case 'BASE_UPLIFT_5PLUS_10PCT':
      return emptyResolved('PERCENT', { text: '기본금의 10%' });
    case 'LODGING_SELECTION': {
      if (desc.includes('숙소지정') && line.quantity === 1) {
        return emptyResolved('PER_PERSON_SINGLE', {
          unitAmountKrw: line.unitPriceKrw ?? line.amountKrw,
          count: 1,
        });
      }
      if (line.unitPriceKrw !== null && line.quantity > 0) {
        return emptyResolved('PER_NIGHT', {
          unitAmountKrw: line.unitPriceKrw,
          count: line.quantity,
        });
      }
      return emptyResolved('CUSTOM', { text: formatKrw(line.amountKrw) });
    }
    case 'MANUAL_ADJUSTMENT': {
      if (desc.includes('샤브') && desc.includes('누락')) {
        return emptyResolved('PER_PERSON_SINGLE', {
          unitAmountKrw: line.unitPriceKrw ?? line.amountKrw,
          count: 1,
        });
      }
      if (desc === '야간열차') {
        return emptyResolved('TEAM_DIV_PERSON', {
          divisorPerson: ctx.headcountTotal > 0 ? ctx.headcountTotal : null,
        });
      }
      if (line.sourceType === 'MANUAL') {
        if (line.unitPriceKrw !== null) {
          return emptyResolved('CUSTOM', {
            text: `${formatKrw(line.unitPriceKrw)}×${line.quantity}`,
          });
        }
        return emptyResolved('CUSTOM', { text: formatKrw(line.amountKrw) });
      }
      if (line.unitPriceKrw !== null && line.quantity > 1 && ctx.headcountTotal > 0) {
        return emptyResolved('TEAM_DIV_PERSON', {
          divisorPerson: ctx.headcountTotal,
        });
      }
      if (line.unitPriceKrw !== null) {
        return emptyResolved('CUSTOM', {
          text: `${formatKrw(line.unitPriceKrw)}×${line.quantity}`,
        });
      }
      return emptyResolved('CUSTOM', { text: formatKrw(line.amountKrw) });
    }
    default:
      return emptyResolved('CUSTOM', { text: formatKrw(line.amountKrw) });
  }
}

/** 오른쪽 산식 필드 (견적 추가/할인 열, 빌더 가격 표 등) */
export function formatPricingDetailFormula(
  line: PricingLineLike,
  ctx: { headcountTotal: number; totalDays: number },
): string {
  const d = resolvePricingLineDisplay(line, ctx);
  switch (d.basis) {
    case 'TEAM_DIV_PERSON': {
      const div = d.divisorPerson ?? ctx.headcountTotal;
      if (div <= 0) {
        return formatKrw(line.amountKrw);
      }
      return `${formatKrw(line.amountKrw)}/${div}인`;
    }
    case 'PER_NIGHT': {
      if (d.unitAmountKrw !== null && d.count !== null) {
        return `${formatKrw(d.unitAmountKrw)}*${d.count}박`;
      }
      return formatKrw(line.amountKrw);
    }
    case 'PER_DAY': {
      if (d.unitAmountKrw !== null && d.count !== null) {
        return `${formatKrw(d.unitAmountKrw)}*${d.count}일`;
      }
      return formatKrw(line.amountKrw);
    }
    case 'PER_PERSON_SINGLE': {
      if (d.unitAmountKrw !== null) {
        return `${formatKrw(d.unitAmountKrw)}*1`;
      }
      return formatKrw(line.amountKrw);
    }
    case 'PERCENT':
      return d.text?.trim() && d.text.length > 0 ? d.text : formatKrw(line.amountKrw);
    case 'CUSTOM':
    default:
      return d.text?.trim() && d.text.length > 0 ? d.text : formatKrw(line.amountKrw);
  }
}
