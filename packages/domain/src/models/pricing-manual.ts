const BASE_RULE_TYPES = new Set(['BASE', 'PERCENT_UPLIFT', 'LONG_DISTANCE']);
const BASE_LINE_CODES = new Set(['BASE', 'BASE_PERCENT', 'BASE_UPLIFT_5PLUS_5PCT', 'BASE_UPLIFT_5PLUS_10PCT', 'LONG_DISTANCE']);
const FIXED_LODGING_DAY_LEVEL = /^(\d+)일차 (LV[124])$/;

export type PricingManualRowCategory = 'BASE' | 'ADDON';
export type PricingMergedQuantitySuffix = '박';
export type LodgingSelectionLevelKey = 'LV1' | 'LV2' | 'LV4';

const DISPLAY_LABEL_BY_LEVEL: Record<LodgingSelectionLevelKey, string> = {
  LV1: '숙소 할인 (LV1)',
  LV2: '숙소 할인 (LV2)',
  LV4: '숙소 업그레이드',
};

export interface PricingManualSourceLine {
  ruleType?: string | null;
  lineCode: string;
  sourceType: string;
  description: string | null;
  ruleId?: string | null;
  unitPriceKrw: number | null;
  quantity: number;
  amountKrw: number;
  displayBasis?: string | null;
  displayLabel?: string | null;
  displayUnitAmountKrw?: number | null;
  displayCount?: number | null;
  displayDivisorPerson?: number | null;
  displayText?: string | null;
  quantityDisplaySuffix?: PricingMergedQuantitySuffix;
}

export interface PricingManualLineOverride {
  rowKey: string;
  amountKrw: number;
}

export type PricingManualAdjustmentLineType = 'AUTO' | 'MANUAL';

export interface PricingManualAdjustmentLine {
  id: string;
  type: PricingManualAdjustmentLineType;
  rowKey?: string | null;
  label: string;
  leadAmountKrw: number;
  formula: string;
  deleted?: boolean;
}

export interface PricingManualSummarySnapshot {
  baseAmountKrw?: number | null;
  totalAmountKrw?: number | null;
  depositAmountKrw?: number | null;
  balanceAmountKrw?: number | null;
  securityDepositAmountKrw?: number | null;
}

export interface PricingManualSnapshot {
  enabled: boolean;
  adjustmentLines?: PricingManualAdjustmentLine[];
  summary?: PricingManualSummarySnapshot | null;
  /**
   * Legacy field kept for backward compatibility with early manual-pricing saves.
   * New writes should use `adjustmentLines`.
   */
  lineOverrides?: PricingManualLineOverride[];
}

export type PricingManualDisplayRow<TLine extends PricingManualSourceLine = PricingManualSourceLine> = TLine & {
  rowKey: string;
  category: PricingManualRowCategory;
  originalAmountKrw: number;
  isManualOverride: boolean;
};

export interface PricingManualPresentation<TLine extends PricingManualSourceLine = PricingManualSourceLine> {
  baseRows: Array<PricingManualDisplayRow<TLine>>;
  addonRows: Array<PricingManualDisplayRow<TLine>>;
  originalBaseTotal: number;
  originalAddonTotal: number;
  originalTotal: number;
  effectiveBaseTotal: number;
  effectiveAddonTotal: number;
  effectiveTotal: number;
}

type MergeGroup<TLine extends PricingManualSourceLine> = {
  firstIndex: number;
  members: TLine[];
};

function normalizeSignaturePart(value: string | number | null | undefined): string {
  if (value == null) {
    return '';
  }
  return String(value).trim();
}

function isBaseLine(line: PricingManualSourceLine): boolean {
  if (line.ruleType && BASE_RULE_TYPES.has(line.ruleType)) {
    return true;
  }
  return BASE_LINE_CODES.has(line.lineCode);
}

function parseFixedTierLodgingLine(line: PricingManualSourceLine): { level: LodgingSelectionLevelKey; groupKey: string } | null {
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
  return {
    level,
    groupKey: `${level}|${line.unitPriceKrw}`,
  };
}

function buildMergeGroups<TLine extends PricingManualSourceLine>(lines: TLine[]): Map<string, MergeGroup<TLine>> {
  const groups = new Map<string, MergeGroup<TLine>>();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }
    const parsed = parseFixedTierLodgingLine(line);
    if (!parsed) {
      continue;
    }
    const existing = groups.get(parsed.groupKey);
    if (!existing) {
      groups.set(parsed.groupKey, {
        firstIndex: index,
        members: [line],
      });
      continue;
    }
    existing.members.push(line);
  }
  return groups;
}

function buildRowKey<TLine extends PricingManualSourceLine>(
  category: PricingManualRowCategory,
  line: TLine,
  occurrenceBySignature: Map<string, number>,
  mergedLevel?: LodgingSelectionLevelKey,
): string {
  const signature = [
    category,
    normalizeSignaturePart(line.lineCode),
    normalizeSignaturePart(line.ruleType),
    normalizeSignaturePart(line.ruleId),
    normalizeSignaturePart(line.displayLabel),
    normalizeSignaturePart(line.description),
    normalizeSignaturePart(line.displayBasis),
    normalizeSignaturePart(line.displayText),
    normalizeSignaturePart(line.unitPriceKrw),
    normalizeSignaturePart(line.displayUnitAmountKrw),
    normalizeSignaturePart(line.displayCount),
    normalizeSignaturePart(line.displayDivisorPerson),
    normalizeSignaturePart(line.quantity),
    normalizeSignaturePart(mergedLevel),
  ].join('|');
  const nextOccurrence = (occurrenceBySignature.get(signature) ?? 0) + 1;
  occurrenceBySignature.set(signature, nextOccurrence);
  return `${signature}#${nextOccurrence}`;
}

function buildAddonRows<TLine extends PricingManualSourceLine>(
  lines: TLine[],
  occurrenceBySignature: Map<string, number>,
): Array<PricingManualDisplayRow<TLine>> {
  const groups = buildMergeGroups(lines);
  const result: Array<PricingManualDisplayRow<TLine>> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }
    const parsed = parseFixedTierLodgingLine(line);
    if (!parsed) {
      result.push({
        ...line,
        rowKey: buildRowKey('ADDON', line, occurrenceBySignature),
        category: 'ADDON',
        originalAmountKrw: line.amountKrw,
        isManualOverride: false,
      });
      continue;
    }

    const group = groups.get(parsed.groupKey);
    if (!group || group.firstIndex !== index) {
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
        rowKey: buildRowKey('ADDON', line, occurrenceBySignature, parsed.level),
        category: 'ADDON',
        originalAmountKrw: line.amountKrw,
        isManualOverride: false,
      });
      continue;
    }

    const first = group.members[0];
    if (!first) {
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
      rowKey: buildRowKey('ADDON', first, occurrenceBySignature, parsed.level),
      category: 'ADDON',
      originalAmountKrw: amountKrw,
      isManualOverride: false,
    });
  }

  return result;
}

function applyOverridesToRows<TLine extends PricingManualSourceLine>(
  rows: Array<PricingManualDisplayRow<TLine>>,
  manualPricing?: PricingManualSnapshot | null,
): Array<PricingManualDisplayRow<TLine>> {
  const legacyLineOverrides = manualPricing?.lineOverrides ?? [];
  if (!manualPricing?.enabled || legacyLineOverrides.length === 0) {
    return rows;
  }
  const overrideMap = new Map(
    legacyLineOverrides
      .filter((row) => typeof row?.rowKey === 'string' && Number.isInteger(row?.amountKrw))
      .map((row) => [row.rowKey, row.amountKrw] as const),
  );
  return rows.map((row) => {
    const overriddenAmount = overrideMap.get(row.rowKey);
    if (overriddenAmount == null) {
      return row;
    }
    return {
      ...row,
      amountKrw: overriddenAmount,
      isManualOverride: true,
    };
  });
}

export function buildPricingManualPresentation<TLine extends PricingManualSourceLine>(
  lines: TLine[],
  manualPricing?: PricingManualSnapshot | null,
): PricingManualPresentation<TLine> {
  const baseLines = lines.filter((line) => isBaseLine(line));
  const addonLines = lines.filter((line) => !isBaseLine(line));
  const occurrenceBySignature = new Map<string, number>();

  const originalBaseRows: Array<PricingManualDisplayRow<TLine>> = baseLines.map((line) => ({
    ...line,
    rowKey: buildRowKey('BASE', line, occurrenceBySignature),
    category: 'BASE',
    originalAmountKrw: line.amountKrw,
    isManualOverride: false,
  }));
  const originalAddonRows = buildAddonRows(addonLines, occurrenceBySignature);

  const baseRows = applyOverridesToRows(originalBaseRows, manualPricing);
  const addonRows = applyOverridesToRows(originalAddonRows, manualPricing);

  const originalBaseTotal = originalBaseRows.reduce((sum, row) => sum + row.originalAmountKrw, 0);
  const originalAddonTotal = originalAddonRows.reduce((sum, row) => sum + row.originalAmountKrw, 0);
  const effectiveBaseTotal = baseRows.reduce((sum, row) => sum + row.amountKrw, 0);
  const effectiveAddonTotal = addonRows.reduce((sum, row) => sum + row.amountKrw, 0);

  return {
    baseRows,
    addonRows,
    originalBaseTotal,
    originalAddonTotal,
    originalTotal: originalBaseTotal + originalAddonTotal,
    effectiveBaseTotal,
    effectiveAddonTotal,
    effectiveTotal: effectiveBaseTotal + effectiveAddonTotal,
  };
}
