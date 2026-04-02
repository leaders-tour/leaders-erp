import type { PricingViewLine } from './view-model';

/** Matches backend `buildLodgingSelectionLines` fixed-tier descriptions. */
const FIXED_LODGING_DAY_LEVEL = /^(\d+)일차 (LV[124])$/;

export type LodgingSelectionLevelKey = 'LV1' | 'LV2' | 'LV4';

const DISPLAY_LABEL_BY_LEVEL: Record<LodgingSelectionLevelKey, string> = {
  LV1: '숙소 할인 (LV1)',
  LV2: '숙소 할인 (LV2)',
  LV4: '숙소 업그레이드',
};

export type PricingLineDisplayExtensions = {
  /** When set, quantity column shows e.g. "2박" instead of "2". */
  quantityDisplaySuffix?: '박';
};

type MergeGroup<T> = {
  firstIndex: number;
  members: T[];
};

function parseFixedTierLodgingLine(line: PricingViewLine): { level: LodgingSelectionLevelKey; groupKey: string } | null {
  if (line.lineCode !== 'LODGING_SELECTION') {
    return null;
  }
  if (line.quantity !== 1) {
    return null;
  }
  if (line.unitPriceKrw === null) {
    return null;
  }
  const text = line.description?.trim();
  if (!text) {
    return null;
  }
  const match = text.match(FIXED_LODGING_DAY_LEVEL);
  if (!match) {
    return null;
  }
  const level = match[2] as LodgingSelectionLevelKey;
  return { level, groupKey: `${level}|${line.unitPriceKrw}` };
}

function buildMergeGroups<T extends PricingViewLine>(lines: T[]): Map<string, MergeGroup<T>> {
  const groups = new Map<string, MergeGroup<T>>();
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === undefined) {
      continue;
    }
    const parsed = parseFixedTierLodgingLine(line);
    if (!parsed) {
      continue;
    }
    const existing = groups.get(parsed.groupKey);
    if (!existing) {
      groups.set(parsed.groupKey, { firstIndex: i, members: [line] });
    } else {
      existing.members.push(line);
    }
  }
  return groups;
}

/**
 * Merges per-day fixed-tier lodging selection lines (e.g. "5일차 LV4", "6일차 LV4")
 * into one row for UI/estimate display. Totals are unchanged.
 */
export function mergeLodgingSelectionDisplayLines<T extends PricingViewLine>(
  lines: T[],
): Array<T & PricingLineDisplayExtensions> {
  const groups = buildMergeGroups(lines);
  const result: Array<T & PricingLineDisplayExtensions> = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === undefined) {
      continue;
    }
    const parsed = parseFixedTierLodgingLine(line);
    if (!parsed) {
      result.push(line);
      continue;
    }

    const group = groups.get(parsed.groupKey);
    if (!group || group.firstIndex !== i) {
      continue;
    }

    if (group.members.length === 1) {
      result.push({
        ...line,
        displayBasis: 'PER_NIGHT',
        displayUnitAmountKrw: line.unitPriceKrw,
        displayCount: 1,
        displayDivisorPerson: null,
        displayText: null,
        displayLabel: null,
      } as T & PricingLineDisplayExtensions);
      continue;
    }

    const first = group.members[0];
    if (!first) {
      result.push(line);
      continue;
    }
    const nights = group.members.length;
    const amountKrw = group.members.reduce((sum, member) => sum + member.amountKrw, 0);

    result.push({
      ...first,
      description: DISPLAY_LABEL_BY_LEVEL[parsed.level],
      quantity: nights,
      amountKrw,
      quantityDisplaySuffix: '박',
      displayBasis: 'PER_NIGHT',
      displayUnitAmountKrw: first.unitPriceKrw,
      displayCount: nights,
      displayDivisorPerson: null,
      displayText: null,
      displayLabel: null,
    } as T & PricingLineDisplayExtensions);
  }

  return result;
}
