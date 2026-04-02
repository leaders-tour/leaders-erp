import type { PricingLineCode } from '@prisma/client';
import type { PricingComputedLine, PricingLineDisplay } from './pricing.types';

function formatKrwNumber(value: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}

type DisplayContext = {
  headcountTotal: number;
  totalDays: number;
};

function configuredDisplayFromMeta(
  line: Pick<PricingComputedLine, 'unitPriceKrw' | 'quantity' | 'amountKrw' | 'meta'>,
): PricingLineDisplay | null {
  const meta = line.meta;
  if (!meta || typeof meta !== 'object') {
    return null;
  }

  const customDisplayText =
    'customDisplayText' in meta && typeof meta.customDisplayText === 'string' && meta.customDisplayText.trim().length > 0
      ? meta.customDisplayText.trim()
      : null;
  const chargeScope =
    'chargeScope' in meta && (meta.chargeScope === 'TEAM' || meta.chargeScope === 'PER_PERSON')
      ? meta.chargeScope
      : null;
  const personMode =
    'personMode' in meta &&
    (meta.personMode === 'SINGLE' || meta.personMode === 'PER_DAY' || meta.personMode === 'PER_NIGHT')
      ? meta.personMode
      : null;
  const ruleType =
    'ruleType' in meta &&
    (meta.ruleType === 'BASE' ||
      meta.ruleType === 'PERCENT_UPLIFT' ||
      meta.ruleType === 'CONDITIONAL_ADDON' ||
      meta.ruleType === 'AUTO_EXCEPTION' ||
      meta.ruleType === 'MANUAL')
      ? meta.ruleType
      : null;
  const percentBps = 'percentBps' in meta && typeof meta.percentBps === 'number' ? meta.percentBps : null;

  if (ruleType === 'PERCENT_UPLIFT' && percentBps !== null) {
    return emptyDisplay('PERCENT', {
      text: `기본금의 ${percentBps / 100}%`,
    });
  }

  if (customDisplayText) {
    return emptyDisplay('CUSTOM', {
      text: customDisplayText,
    });
  }

  if (chargeScope === 'TEAM') {
    return emptyDisplay('TEAM_DIV_PERSON');
  }

  if (chargeScope === 'PER_PERSON') {
    if (personMode === 'PER_DAY') {
      return emptyDisplay('PER_DAY', {
        unitAmountKrw: line.unitPriceKrw,
        count: line.quantity,
      });
    }
    if (personMode === 'PER_NIGHT') {
      return emptyDisplay('PER_NIGHT', {
        unitAmountKrw: line.unitPriceKrw,
        count: line.quantity,
      });
    }
    return emptyDisplay('PER_PERSON_SINGLE', {
      unitAmountKrw: line.unitPriceKrw ?? line.amountKrw,
      count: 1,
    });
  }

  return null;
}

function emptyDisplay(basis: PricingLineDisplay['basis'], partial: Partial<PricingLineDisplay> = {}): PricingLineDisplay {
  return {
    basis,
    label: partial.label ?? null,
    unitAmountKrw: partial.unitAmountKrw ?? null,
    count: partial.count ?? null,
    divisorPerson: partial.divisorPerson ?? null,
    text: partial.text ?? null,
  };
}

/**
 * 계산된 한 줄에 대한 표시 메타. amountKrw는 항상 실제 합산값.
 */
export function buildPricingLineDisplay(
  line: Pick<
    PricingComputedLine,
    'ruleType' | 'lineCode' | 'sourceType' | 'description' | 'unitPriceKrw' | 'quantity' | 'amountKrw' | 'meta'
  >,
  ctx: DisplayContext,
): PricingLineDisplay {
  const configured = configuredDisplayFromMeta(line);
  if (configured) {
    return configured;
  }

  const meta = line.meta;
  const desc = line.description?.trim() ?? '';

  switch (line.lineCode as PricingLineCode) {
    case 'BASE': {
      if (
        line.unitPriceKrw !== null &&
        ctx.totalDays > 0 &&
        line.quantity === ctx.totalDays
      ) {
        return emptyDisplay('PER_DAY', {
          unitAmountKrw: line.unitPriceKrw,
          count: line.quantity,
        });
      }
      if (line.unitPriceKrw !== null) {
        return emptyDisplay('PER_PERSON_SINGLE', {
          unitAmountKrw: line.unitPriceKrw,
          count: 1,
        });
      }
      return emptyDisplay('CUSTOM', {
        text: `${formatKrwNumber(line.amountKrw)}`,
      });
    }
    case 'LONG_DISTANCE': {
      if (line.unitPriceKrw !== null && line.quantity > 0) {
        return emptyDisplay('CUSTOM', {
          text: `${formatKrwNumber(line.unitPriceKrw)}×${line.quantity}구간`,
        });
      }
      return emptyDisplay('CUSTOM', { text: formatKrwNumber(line.amountKrw) });
    }
    case 'HIACE': {
      if (line.unitPriceKrw !== null && line.quantity > 0) {
        return emptyDisplay('PER_DAY', {
          unitAmountKrw: line.unitPriceKrw,
          count: line.quantity,
        });
      }
      return emptyDisplay('CUSTOM', { text: formatKrwNumber(line.amountKrw) });
    }
    case 'EXTRA_LODGING': {
      if (line.unitPriceKrw !== null && line.quantity > 0) {
        return emptyDisplay('PER_NIGHT', {
          unitAmountKrw: line.unitPriceKrw,
          count: line.quantity,
        });
      }
      return emptyDisplay('CUSTOM', { text: formatKrwNumber(line.amountKrw) });
    }
    case 'EARLY':
    case 'EXTEND': {
      if (
        ctx.headcountTotal > 0 &&
        line.quantity === ctx.headcountTotal &&
        line.unitPriceKrw !== null
      ) {
        return emptyDisplay('TEAM_DIV_PERSON', {
          divisorPerson: ctx.headcountTotal,
        });
      }
      if (
        line.unitPriceKrw !== null &&
        ctx.totalDays > 0 &&
        line.quantity === ctx.totalDays
      ) {
        return emptyDisplay('PER_DAY', {
          unitAmountKrw: line.unitPriceKrw,
          count: line.quantity,
        });
      }
      if (line.unitPriceKrw !== null) {
        return emptyDisplay('CUSTOM', {
          text: `${formatKrwNumber(line.unitPriceKrw)}×${line.quantity}`,
        });
      }
      return emptyDisplay('CUSTOM', { text: formatKrwNumber(line.amountKrw) });
    }
    case 'BASE_UPLIFT_5PLUS_5PCT':
    case 'BASE_UPLIFT_5PLUS_10PCT': {
      const bps = meta && typeof meta.percentBps === 'number' ? meta.percentBps : null;
      const pct = bps !== null ? bps / 100 : null;
      return emptyDisplay('PERCENT', {
        text: pct !== null ? `기본금의 ${pct}%` : null,
      });
    }
    case 'LODGING_SELECTION': {
      const mode =
        meta && typeof meta === 'object' && 'pricingModeSnapshot' in meta
          ? (meta as { pricingModeSnapshot?: string }).pricingModeSnapshot
          : undefined;
      if (mode === 'PER_TEAM') {
        return emptyDisplay('PER_PERSON_SINGLE', {
          unitAmountKrw: line.unitPriceKrw ?? line.amountKrw,
          count: 1,
        });
      }
      if (line.unitPriceKrw !== null && line.quantity > 0) {
        return emptyDisplay('PER_NIGHT', {
          unitAmountKrw: line.unitPriceKrw,
          count: line.quantity,
        });
      }
      return emptyDisplay('CUSTOM', { text: formatKrwNumber(line.amountKrw) });
    }
    case 'MANUAL_ADJUSTMENT': {
      if (meta && typeof meta === 'object' && 'reason' in meta && meta.reason === 'shabushabu_missing') {
        return emptyDisplay('PER_PERSON_SINGLE', {
          unitAmountKrw: line.unitPriceKrw ?? line.amountKrw,
          count: 1,
        });
      }
      if (
        desc === '야간열차' ||
        (meta && typeof meta === 'object' && 'nightTrainBlockIds' in meta)
      ) {
        const hp = ctx.headcountTotal > 0 ? ctx.headcountTotal : null;
        return emptyDisplay('TEAM_DIV_PERSON', {
          divisorPerson: hp,
        });
      }
      if (line.sourceType === 'MANUAL') {
        if (line.unitPriceKrw !== null) {
          return emptyDisplay('CUSTOM', {
            text: `${formatKrwNumber(line.unitPriceKrw)}×${line.quantity}`,
          });
        }
        return emptyDisplay('CUSTOM', { text: formatKrwNumber(line.amountKrw) });
      }
      if (line.unitPriceKrw !== null && line.quantity > 1 && ctx.headcountTotal > 0) {
        return emptyDisplay('TEAM_DIV_PERSON', {
          divisorPerson: ctx.headcountTotal,
        });
      }
      if (line.unitPriceKrw !== null) {
        return emptyDisplay('CUSTOM', {
          text: `${formatKrwNumber(line.unitPriceKrw)}×${line.quantity}`,
        });
      }
      return emptyDisplay('CUSTOM', { text: formatKrwNumber(line.amountKrw) });
    }
    default:
      return emptyDisplay('CUSTOM', { text: formatKrwNumber(line.amountKrw) });
  }
}
