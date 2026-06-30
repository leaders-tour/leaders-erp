import { roundBaseAmountKrwToThousands } from '../lib/round-base-amount-krw';

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
  teamOrderIndex?: number | null;
  teamName?: string | null;
  headcount?: number | null;
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
  teamOrderIndex?: number | null;
  label: string;
  leadAmountKrw: number;
  formula: string;
  strikethrough?: boolean;
  deleted?: boolean;
}

export type SecurityDepositScopeMode = 'NONE' | 'PER_PERSON' | 'PER_TEAM';

export interface PricingManualSummarySnapshot {
  baseAmountKrw?: number | null;
  totalAmountKrw?: number | null;
  depositAmountKrw?: number | null;
  balanceAmountKrw?: number | null;
  securityDepositAmountKrw?: number | null;
  /** Omit or null to follow computed pricing `securityDepositMode`. */
  securityDepositMode?: SecurityDepositScopeMode | null;
}

export interface PricingManualTeamSummarySnapshot extends PricingManualSummarySnapshot {
  teamOrderIndex: number;
}

/** 빌더 PDF/견적서에 그대로 쓰는 고객용 금액 출력 (재해석 금지). */
export interface CustomerPricingAdjustmentLineSnapshot {
  teamName?: string | null;
  label: string;
  leadAmountKrw: number;
  formula: string;
  strikethrough?: boolean;
}

export interface CustomerPricingTeamRowSnapshot {
  teamOrderIndex: number;
  teamName: string;
  /** 신규 저장부터 포함. 레거시 스냅샷은 resolve 시 effective/headline으로 보완 */
  baseAmountKrw?: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitKrw: number;
  /** 견적 PDF 표시용: `-` | `인당` | `팀당` */
  securityDepositScope: string;
}

export interface CustomerPricingSnapshot {
  baseAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositTotalKrw: number;
  securityDepositUnitKrw: number;
  securityDepositMode: SecurityDepositScopeMode;
  adjustmentLines: CustomerPricingAdjustmentLineSnapshot[];
  teamPricings: CustomerPricingTeamRowSnapshot[];
}

export interface PricingManualSnapshot {
  enabled: boolean;
  adjustmentLines?: PricingManualAdjustmentLine[];
  summary?: PricingManualSummarySnapshot | null;
  teamSummaries?: PricingManualTeamSummarySnapshot[];
  /** 견적 요약 표에서 동일 금액이어도 팀별로 펼침 */
  expandTeamPricingSummaryRows?: boolean | null;
  /**
   * 일정 빌더 저장 시점의 고객용 금액/라인 스냅샷. 있으면 상세·PDF는 이 값을 우선한다.
   */
  customerPricingSnapshot?: CustomerPricingSnapshot | null;
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

type ParsedLodgingSelectionLine =
  | { kind: 'fixed'; level: LodgingSelectionLevelKey; groupKey: string }
  | { kind: 'custom'; lodgingName: string; groupKey: string };

function parseLodgingSelectionLine(line: PricingManualSourceLine): ParsedLodgingSelectionLine | null {
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
  const fixedMatch = text.match(FIXED_LODGING_DAY_LEVEL);
  if (fixedMatch) {
    const level = fixedMatch[2] as LodgingSelectionLevelKey;
    return {
      kind: 'fixed',
      level,
      groupKey: `${level}|${line.unitPriceKrw}`,
    };
  }
  if (line.sourceType === 'MANUAL') {
    return {
      kind: 'custom',
      lodgingName: text,
      groupKey: `CUSTOM|${text}|${line.unitPriceKrw}`,
    };
  }
  return null;
}

const TEAM_DIV_MERGEABLE_LINE_CODES = new Set(['PICKUP_DROP', 'CONDITIONAL']);

const VEHICLE_ADDON_MERGEABLE_LINE_CODES = new Set(['HIACE']);

type ParsedTeamDivMergeLine = {
  groupKey: string;
  displayLabel: string;
};

type ParsedVehicleAddonMergeLine = {
  groupKey: string;
  displayLabel: string;
};

function parseVehicleAddonMergeLine(line: PricingManualSourceLine): ParsedVehicleAddonMergeLine | null {
  if (!VEHICLE_ADDON_MERGEABLE_LINE_CODES.has(line.lineCode)) {
    return null;
  }
  if (line.displayBasis !== 'PER_DAY') {
    return null;
  }
  const displayLabel = line.displayLabel?.trim() || line.description?.trim();
  if (!displayLabel) {
    return null;
  }
  const unitAmount = line.displayUnitAmountKrw ?? line.unitPriceKrw;
  if (unitAmount === null) {
    return null;
  }
  return {
    displayLabel,
    groupKey: `VEHICLE_ADDON|${line.lineCode}|${displayLabel}|${unitAmount}|${line.quantity}`,
  };
}

function parseTeamDivPersonMergeLine(line: PricingManualSourceLine): ParsedTeamDivMergeLine | null {
  if (!TEAM_DIV_MERGEABLE_LINE_CODES.has(line.lineCode)) {
    return null;
  }
  if (line.displayBasis !== 'TEAM_DIV_PERSON') {
    return null;
  }
  const displayLabel = line.displayLabel?.trim() || line.description?.trim();
  if (!displayLabel) {
    return null;
  }
  const unitAmount = line.displayUnitAmountKrw ?? line.unitPriceKrw;
  if (unitAmount === null) {
    return null;
  }
  const teamKey = line.teamOrderIndex ?? 'global';
  return {
    displayLabel,
    groupKey: `TEAM_DIV|${line.lineCode}|${displayLabel}|${unitAmount}|${teamKey}`,
  };
}

function buildIndexedMergeGroups<TLine extends PricingManualSourceLine>(
  lines: TLine[],
  parse: (line: TLine) => { groupKey: string } | null,
): Map<string, MergeGroup<TLine>> {
  const groups = new Map<string, MergeGroup<TLine>>();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }
    const parsed = parse(line);
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

function buildMergeGroups<TLine extends PricingManualSourceLine>(lines: TLine[]): Map<string, MergeGroup<TLine>> {
  return buildIndexedMergeGroups(lines, parseLodgingSelectionLine);
}

function buildTeamDivMergeGroups<TLine extends PricingManualSourceLine>(lines: TLine[]): Map<string, MergeGroup<TLine>> {
  return buildIndexedMergeGroups(lines, parseTeamDivPersonMergeLine);
}

function buildVehicleAddonMergeGroups<TLine extends PricingManualSourceLine>(lines: TLine[]): Map<string, MergeGroup<TLine>> {
  return buildIndexedMergeGroups(lines, parseVehicleAddonMergeLine);
}

function mergedLodgingDescription(parsed: ParsedLodgingSelectionLine): string {
  if (parsed.kind === 'fixed') {
    return DISPLAY_LABEL_BY_LEVEL[parsed.level];
  }
  return parsed.lodgingName;
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
    normalizeSignaturePart(line.teamOrderIndex),
    normalizeSignaturePart(line.teamName),
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

/**
 * Merges addon lines for customer-facing display (lodging tiers, same-label team pickup/drop, etc.).
 * Billing totals are unchanged — only row presentation is collapsed.
 */
export function mergeAddonSourceLines<TLine extends PricingManualSourceLine>(lines: TLine[]): TLine[] {
  const lodgingGroups = buildMergeGroups(lines);
  const teamDivGroups = buildTeamDivMergeGroups(lines);
  const vehicleAddonGroups = buildVehicleAddonMergeGroups(lines);
  const result: TLine[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }

    const lodgingParsed = parseLodgingSelectionLine(line);
    if (lodgingParsed) {
      const group = lodgingGroups.get(lodgingParsed.groupKey);
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
        } as TLine);
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
        description: mergedLodgingDescription(lodgingParsed),
        quantity: nights,
        amountKrw,
        quantityDisplaySuffix: '박',
        displayBasis: 'PER_NIGHT',
        displayUnitAmountKrw: first.unitPriceKrw,
        displayCount: nights,
        displayDivisorPerson: null,
        displayText: null,
        displayLabel: null,
      } as TLine);
      continue;
    }

    const teamDivParsed = parseTeamDivPersonMergeLine(line);
    if (teamDivParsed) {
      const group = teamDivGroups.get(teamDivParsed.groupKey);
      if (!group || group.firstIndex !== index) {
        continue;
      }

      if (group.members.length === 1) {
        result.push(line);
        continue;
      }

      const first = group.members[0];
      if (!first) {
        continue;
      }
      const amountKrw = group.members.reduce((sum, member) => sum + member.amountKrw, 0);
      const quantity = group.members.reduce((sum, member) => sum + member.quantity, 0);
      const totalTeamAmountKrw = group.members.reduce((sum, member) => {
        const teamUnit = member.displayUnitAmountKrw ?? member.unitPriceKrw ?? 0;
        return sum + teamUnit * member.quantity;
      }, 0);
      result.push({
        ...first,
        description: teamDivParsed.displayLabel,
        displayLabel: teamDivParsed.displayLabel,
        quantity,
        amountKrw,
        displayBasis: 'TEAM_DIV_PERSON',
        displayUnitAmountKrw: totalTeamAmountKrw,
        displayCount: 1,
        displayDivisorPerson: first.displayDivisorPerson ?? first.headcount ?? null,
        displayText: null,
      } as TLine);
      continue;
    }

    const vehicleAddonParsed = parseVehicleAddonMergeLine(line);
    if (vehicleAddonParsed) {
      const group = vehicleAddonGroups.get(vehicleAddonParsed.groupKey);
      if (!group || group.firstIndex !== index) {
        continue;
      }

      if (group.members.length === 1) {
        result.push(line);
        continue;
      }

      const first = group.members[0];
      if (!first) {
        continue;
      }
      const vehicleCount = group.members.length;
      const amountKrw = group.members.reduce((sum, member) => sum + member.amountKrw, 0);
      const unitPriceKrw = first.unitPriceKrw ?? 0;
      result.push({
        ...first,
        description: vehicleAddonParsed.displayLabel,
        displayLabel: vehicleAddonParsed.displayLabel,
        quantity: first.quantity,
        amountKrw,
        displayBasis: 'PER_DAY',
        displayUnitAmountKrw: unitPriceKrw * vehicleCount,
        displayCount: first.displayCount ?? first.quantity,
        displayDivisorPerson: null,
        displayText: null,
      } as TLine);
      continue;
    }

    result.push(line);
  }

  return result;
}

function buildAddonRows<TLine extends PricingManualSourceLine>(
  lines: TLine[],
  occurrenceBySignature: Map<string, number>,
): Array<PricingManualDisplayRow<TLine>> {
  const mergedLines = mergeAddonSourceLines(lines);

  return mergedLines.map((line) => {
    const lodgingParsed = parseLodgingSelectionLine(line);
    const mergedLevel = lodgingParsed?.kind === 'fixed' ? lodgingParsed.level : undefined;
    return {
      ...line,
      rowKey: buildRowKey('ADDON', line, occurrenceBySignature, mergedLevel),
      category: 'ADDON',
      originalAmountKrw: line.amountKrw,
      isManualOverride: false,
    };
  });
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
  const effectiveBaseTotalRaw = baseRows.reduce((sum, row) => sum + row.amountKrw, 0);
  const effectiveBaseTotal = roundBaseAmountKrwToThousands(effectiveBaseTotalRaw);
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
