import type { PricingManualSnapshot } from '@tour/domain';
import {
  Event,
  PricingCalcType,
  PricingLineCode,
  PricingPolicy,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import type { VariantType } from '@tour/domain';
import { buildPricingManualPresentation } from '@tour/domain';
import { DomainError } from '../../lib/errors';
import type {
  LodgingSelectionPricingInputDto,
  OriginalPricingSnapshot,
  PricingComputationResult,
  PricingComputeInput,
  PricingComputedLine,
  PricingComputedLineDraft,
  PricingLodgingSelectionLevelValue,
  PricingPriceItemPresetValue,
  PricingPlanStopDto,
  PricingRuleTypeValue,
  PricingSnapshotPersistInput,
  TeamPricingResult,
} from './pricing.types';
import { buildPricingLineDisplay } from './pricing-line-display';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

type ComputeContext = {
  variantType: VariantType;
  totalDays: number;
  headcountTotal: number;
  vehicleType: string;
  travelStartDate: Date;
  transportGroups: PricingComputeInput['transportGroups'];
  externalTransfers: PricingComputeInput['externalTransfers'];
  longDistanceSegmentCount: number;
  nightTrainBlockCount: number;
  extraLodgingCount: number;
};

type TeamTransferCount = {
  teamOrderIndex: number;
  count: number;
};

type TeamScopedQuantityInput = {
  line: PricingComputedLine;
  chargeScope: 'TEAM' | 'PER_PERSON' | null;
  quantitySource: PricingQuantitySourceValue | null;
  teamHeadcount: number;
  teamOrderIndex: number;
};

type PricingQuantitySourceValue =
  | 'ONE'
  | 'HEADCOUNT'
  | 'TOTAL_DAYS'
  | 'LONG_DISTANCE_SEGMENT_COUNT'
  | 'NIGHT_TRAIN_BLOCK_COUNT'
  | 'SUM_EXTRA_LODGING_COUNTS';

type PricingRuleRecord = {
  id: string;
  priceItemPreset: PricingPriceItemPresetValue | null;
  ruleType: PricingRuleTypeValue | null;
  title: string | null;
  lineCode: PricingLineCode;
  calcType: PricingCalcType;
  targetLineCode: PricingLineCode | null;
  amountKrw: number | null;
  percentBps: number | null;
  quantitySource: PricingQuantitySourceValue;
  lodgingSelectionLevel: PricingLodgingSelectionLevelValue | null;
  headcountMin: number | null;
  headcountMax: number | null;
  dayMin: number | null;
  dayMax: number | null;
  travelDateFrom: Date | null;
  travelDateTo: Date | null;
  vehicleType: string | null;
  variantTypes: Prisma.JsonValue;
  flightInTimeBand: 'DAWN' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | null;
  flightOutTimeBand: 'DAWN' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | null;
  pickupPlaceType: string | null;
  dropPlaceType: string | null;
  externalTransferMode: 'ANY' | 'PICKUP_ONLY' | 'DROP_ONLY' | 'BOTH' | null;
  externalTransferMinCount: number | null;
  externalTransferPresetCodes: Prisma.JsonValue;
  nightTrainRequired: boolean | null;
  nightTrainMinCount: number | null;
  longDistanceMinCount: number | null;
  chargeScope: 'TEAM' | 'PER_PERSON' | null;
  personMode: 'SINGLE' | 'PER_DAY' | 'PER_NIGHT' | null;
  customDisplayText: string | null;
};

const HIACE_SHORT = '하이에이스(숏)';
const HIACE_LONG = '하이에이스(롱)';
const RENTAL_ITEM_DEPOSIT_PER_PERSON_KRW = 30_000;

export class PricingService {
  constructor(private readonly prisma: PrismaClient) {}

  private filterMainPlanStops(planStops: PricingPlanStopDto[]): PricingPlanStopDto[] {
    return planStops.filter((planStop) => planStop.rowType !== 'EXTERNAL_TRANSFER');
  }

  preview(input: PricingComputeInput): Promise<PricingComputationResult> {
    return this.computeWithPrisma(this.prisma, input);
  }

  computeWithTransaction(tx: Prisma.TransactionClient, input: PricingComputeInput): Promise<PricingComputationResult> {
    return this.computeWithPrisma(tx, input);
  }

  private buildOriginalPricingSnapshot(result: PricingComputationResult): OriginalPricingSnapshot {
    return {
      baseAmountKrw: result.baseAmountKrw,
      addonAmountKrw: result.addonAmountKrw,
      totalAmountKrw: result.totalAmountKrw,
      depositAmountKrw: result.depositAmountKrw,
      balanceAmountKrw: result.balanceAmountKrw,
      securityDepositAmountKrw: result.securityDepositAmountKrw,
      teamPricings: result.teamPricings,
    };
  }

  private normalizeManualPricingSnapshot(
    manualPricing?: PricingManualSnapshot | null,
  ): PricingManualSnapshot | null {
    if (!manualPricing?.enabled) {
      return null;
    }
    return {
      enabled: true,
      adjustmentLines: (manualPricing.adjustmentLines ?? []).filter(
        (row) =>
          typeof row?.id === 'string' &&
          (row.type === 'AUTO' || row.type === 'MANUAL') &&
          (row.teamOrderIndex == null || Number.isInteger(row.teamOrderIndex)) &&
          typeof row.label === 'string' &&
          Number.isInteger(row.leadAmountKrw) &&
          typeof row.formula === 'string' &&
          (row.type !== 'AUTO' || typeof row.rowKey === 'string'),
      ),
      summary:
        manualPricing.summary && typeof manualPricing.summary === 'object'
          ? {
              baseAmountKrw:
                typeof manualPricing.summary.baseAmountKrw === 'number'
                  ? manualPricing.summary.baseAmountKrw
                  : null,
              totalAmountKrw:
                typeof manualPricing.summary.totalAmountKrw === 'number'
                  ? manualPricing.summary.totalAmountKrw
                  : null,
              depositAmountKrw:
                typeof manualPricing.summary.depositAmountKrw === 'number'
                  ? manualPricing.summary.depositAmountKrw
                  : null,
              balanceAmountKrw:
                typeof manualPricing.summary.balanceAmountKrw === 'number'
                  ? manualPricing.summary.balanceAmountKrw
                  : null,
              securityDepositAmountKrw:
                typeof manualPricing.summary.securityDepositAmountKrw === 'number'
                  ? manualPricing.summary.securityDepositAmountKrw
                  : null,
            }
          : null,
      teamSummaries: (manualPricing.teamSummaries ?? []).filter(
        (summary) =>
          Number.isInteger(summary?.teamOrderIndex) &&
          (summary.baseAmountKrw == null || typeof summary.baseAmountKrw === 'number') &&
          (summary.totalAmountKrw == null || typeof summary.totalAmountKrw === 'number') &&
          (summary.depositAmountKrw == null || typeof summary.depositAmountKrw === 'number') &&
          (summary.balanceAmountKrw == null || typeof summary.balanceAmountKrw === 'number') &&
          (summary.securityDepositAmountKrw == null || typeof summary.securityDepositAmountKrw === 'number'),
      ),
      lineOverrides: (manualPricing.lineOverrides ?? []).filter(
        (row) => typeof row?.rowKey === 'string' && Number.isInteger(row?.amountKrw),
      ),
    };
  }

  async createSnapshot(tx: Prisma.TransactionClient, input: PricingSnapshotPersistInput): Promise<void> {
    const { planVersionId, result } = input;
    const manualPricingSnapshot = this.normalizeManualPricingSnapshot(input.manualPricing);
    const originalPricingSnapshot = input.originalPricing ?? this.buildOriginalPricingSnapshot(result);
    const presentation = buildPricingManualPresentation(result.lines, manualPricingSnapshot);
    const manualSummary = manualPricingSnapshot?.summary ?? null;
    const baseAmountKrw =
      typeof manualSummary?.baseAmountKrw === 'number'
        ? manualSummary.baseAmountKrw
        : presentation.effectiveBaseTotal;
    const manualDepositAmountKrw =
      typeof manualSummary?.depositAmountKrw === 'number'
        ? manualSummary.depositAmountKrw
        : typeof result.inputSnapshot.manualDepositAmountKrw === 'number'
          ? result.inputSnapshot.manualDepositAmountKrw
          : undefined;
    const totalAmountKrw =
      typeof manualSummary?.totalAmountKrw === 'number'
        ? manualSummary.totalAmountKrw
        : baseAmountKrw + presentation.effectiveAddonTotal;
    const { depositAmountKrw, balanceAmountKrw } =
      typeof manualSummary?.balanceAmountKrw === 'number' && manualDepositAmountKrw !== undefined
        ? {
            depositAmountKrw: manualDepositAmountKrw,
            balanceAmountKrw: manualSummary.balanceAmountKrw,
          }
        : this.computeDepositAndBalance(totalAmountKrw, manualDepositAmountKrw);
    const securityDepositAmountKrw =
      typeof manualSummary?.securityDepositAmountKrw === 'number'
        ? manualSummary.securityDepositAmountKrw
        : result.securityDepositAmountKrw;

    await tx.planVersionPricing.create({
      data: {
        planVersionId,
        policyId: result.policyId,
        currencyCode: result.currencyCode,
        baseAmountKrw,
        addonAmountKrw: totalAmountKrw - baseAmountKrw,
        totalAmountKrw,
        depositAmountKrw,
        balanceAmountKrw,
        securityDepositAmountKrw,
        securityDepositUnitPriceKrw: result.securityDepositUnitPriceKrw,
        securityDepositQuantity: result.securityDepositQuantity,
        securityDepositMode: result.securityDepositMode,
        securityDepositEventId: result.securityDepositEventId,
        inputSnapshot: result.inputSnapshot as Prisma.InputJsonValue,
        manualPricingSnapshot: manualPricingSnapshot
          ? (manualPricingSnapshot as unknown as Prisma.InputJsonValue)
          : undefined,
        originalPricingSnapshot: originalPricingSnapshot as unknown as Prisma.InputJsonValue,
        lines: {
          create: result.lines.map((line) => ({
            ruleType: line.ruleType,
            lineCode: line.lineCode,
            sourceType: line.sourceType,
            ruleId: line.ruleId,
            description: line.description,
            unitPriceKrw: line.unitPriceKrw,
            quantity: line.quantity,
            amountKrw: line.amountKrw,
            meta: line.meta as Prisma.InputJsonValue | undefined,
            displayBasis: line.display.basis,
            displayLabel: line.display.label,
            displayUnitAmountKrw: line.display.unitAmountKrw,
            displayCount: line.display.count,
            displayDivisorPerson: line.display.divisorPerson,
            displayText: line.display.text,
          })),
        },
      },
    });
  }

  private async computeWithPrisma(prisma: PrismaLike, input: PricingComputeInput): Promise<PricingComputationResult> {
    const mainPlanStops = this.filterMainPlanStops(input.planStops);
    const travelStartDate = new Date(input.travelStartDate);
    if (Number.isNaN(travelStartDate.getTime())) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid travelStartDate for pricing');
    }

    const [policy, longDistanceSegmentCount, nightTrainBlockIds, selectedEvents] = await Promise.all([
      this.loadActivePolicy(prisma, travelStartDate),
      this.countLongDistanceSegments(prisma, input.regionIds, mainPlanStops),
      this.detectNightTrainBlocks(prisma, mainPlanStops),
      input.eventIds.length > 0
        ? prisma.event.findMany({
            where: { id: { in: input.eventIds } },
            select: { id: true, name: true, securityDepositKrw: true, isActive: true, sortOrder: true },
          })
        : Promise.resolve([]),
    ]);

    if (!policy) {
      throw new DomainError('VALIDATION_FAILED', 'No active pricing policy found for travelStartDate');
    }
    if (selectedEvents.length !== input.eventIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more eventIds are invalid');
    }

    const rules = (await prisma.pricingRule.findMany({
      where: { policyId: policy.id, isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    })) as unknown as PricingRuleRecord[];

    const extraLodgingCount = input.extraLodgings.reduce((sum, item) => sum + item.lodgingCount, 0);

    const context: ComputeContext = {
      variantType: input.variantType,
      totalDays: input.totalDays,
      headcountTotal: input.headcountTotal,
      vehicleType: input.vehicleType,
      travelStartDate,
      transportGroups: input.transportGroups,
      externalTransfers: input.externalTransfers,
      longDistanceSegmentCount,
      nightTrainBlockCount: nightTrainBlockIds.size,
      extraLodgingCount,
    };

    if ((context.vehicleType === HIACE_SHORT || context.vehicleType === HIACE_LONG) && context.headcountTotal < 3) {
      throw new DomainError('VALIDATION_FAILED', '하이에이스 차량은 3인 이상부터 선택할 수 있습니다.');
    }

    const lines: PricingComputedLineDraft[] = [];

    const baseRule = this.findBaseRule(rules, context);
    const baseUnitPrice = this.ensureAmount(baseRule);
    const baseQuantity = this.resolveQuantity(baseRule.quantitySource, context);
    const baseRawAmount = baseUnitPrice * baseQuantity;

    lines.push({
      ruleType: 'BASE',
      lineCode: 'BASE',
      sourceType: 'RULE',
      ruleId: baseRule.id,
      description: baseRule.title,
      unitPriceKrw: baseUnitPrice,
      quantity: baseQuantity,
      amountKrw: baseRawAmount,
      meta: this.buildRuleMeta(baseRule),
    });

    let baseUpliftAmount = 0;
    this.findPercentUpliftRules(rules, context).forEach((rule) => {
      const upliftLine = this.buildPercentUpliftLine(rule, baseRawAmount);
      if (!upliftLine) {
        return;
      }
      baseUpliftAmount += upliftLine.amountKrw;
      lines.push(upliftLine);
    });

    let longDistanceAmount = 0;
    this.findLongDistanceRules(rules, context).forEach((rule) => {
      const longDistanceLine = this.buildAmountRuleLine(rule, context);
      if (!longDistanceLine) {
        return;
      }
      longDistanceAmount += longDistanceLine.amountKrw;
      lines.push(longDistanceLine);
    });

    this.findConditionalAddonRules(rules, context).forEach((rule) => {
      const addonLine = this.buildAmountRuleLine(rule, context);
      if (addonLine) {
        lines.push(addonLine);
      }
    });

    this.buildLodgingSelectionLines(rules, context, input.lodgingSelections, input.headcountTotal, input.transportGroupCount).forEach(
      (line) => {
        lines.push(line);
      },
    );

    input.manualAdjustments.forEach((adjustment, index) => {
      const sign = adjustment.kind === 'DISCOUNT' ? -1 : 1;
      const normalizedCount =
        adjustment.chargeScope === 'TEAM'
          ? 1
          : adjustment.personMode === 'PER_DAY' || adjustment.personMode === 'PER_NIGHT'
            ? adjustment.countValue ?? 1
            : 1;
      const signedUnitAmountKrw = sign * adjustment.amountKrw;
      lines.push({
        ruleType: 'MANUAL',
        lineCode: 'MANUAL_ADJUSTMENT',
        sourceType: 'MANUAL',
        ruleId: null,
        description: adjustment.title,
        unitPriceKrw: signedUnitAmountKrw,
        quantity: normalizedCount,
        amountKrw: this.computeDisplayAmountKrw({
          unitPriceKrw: signedUnitAmountKrw,
          quantity: normalizedCount,
          chargeScope: adjustment.chargeScope,
          headcountTotal: context.headcountTotal,
        }),
        meta: {
          order: index + 1,
          chargeScope: adjustment.chargeScope,
          personMode: adjustment.personMode ?? null,
          customDisplayText: adjustment.customDisplayText ?? null,
        },
      });
    });

    // 샤브샤브 누락 할인: mealCellText 전체에서 '샤브샤브' 미포함 시 18,000원 일괄 할인
    const allMealCellTexts = mainPlanStops
      .map((stop) => stop.mealCellText ?? '')
      .join(' ');
    const hasShabushabu = allMealCellTexts.includes('샤브샤브');
    if (!hasShabushabu) {
      const SHABUSHABU_DISCOUNT_KRW = -18_000;
      lines.push({
        ruleType: 'CONDITIONAL_ADDON',
        lineCode: 'MANUAL_ADJUSTMENT',
        sourceType: 'RULE',
        ruleId: null,
        description: '샤브샤브 누락 할인',
        unitPriceKrw: SHABUSHABU_DISCOUNT_KRW,
        quantity: 1,
        amountKrw: SHABUSHABU_DISCOUNT_KRW,
        meta: { reason: 'shabushabu_missing' },
      });
    }

    const linesWithDisplay: PricingComputedLine[] = lines.map((line) => ({
      ...line,
      display: buildPricingLineDisplay(line, {
        headcountTotal: input.headcountTotal,
        totalDays: input.totalDays,
      }),
    }));

    const baseAmountKrw = baseRawAmount + baseUpliftAmount + longDistanceAmount;
    const totalAmountKrw = linesWithDisplay.reduce((sum, line) => sum + line.amountKrw, 0);
    const addonAmountKrw = totalAmountKrw - baseAmountKrw;
    const { depositAmountKrw, balanceAmountKrw } = this.computeDepositAndBalance(totalAmountKrw, input.manualDepositAmountKrw);
    const securityDeposit = this.computeSecurityDeposit({
      includeRentalItems: input.includeRentalItems,
      headcountTotal: input.headcountTotal,
      events: selectedEvents,
    });
    const teamPricings = this.buildTeamPricings({
      input,
      totalDays: input.totalDays,
      lines: linesWithDisplay,
      events: selectedEvents,
    });

    return {
      policyId: policy.id,
      currencyCode: 'KRW',
      baseAmountKrw,
      addonAmountKrw,
      totalAmountKrw,
      depositAmountKrw,
      balanceAmountKrw,
      securityDepositAmountKrw: securityDeposit.amountKrw,
      securityDepositUnitPriceKrw: securityDeposit.unitPriceKrw,
      securityDepositQuantity: securityDeposit.quantity,
      securityDepositMode: securityDeposit.mode,
      securityDepositEventId: securityDeposit.event?.id ?? null,
      securityDepositEvent: securityDeposit.event,
      longDistanceSegmentCount,
      extraLodgingCount,
      lines: linesWithDisplay,
      teamPricings,
      inputSnapshot: {
        regionSetId: input.regionSetId,
        regionIds: input.regionIds,
        variantType: input.variantType,
        totalDays: input.totalDays,
        planStops: mainPlanStops,
        headcountTotal: input.headcountTotal,
        vehicleType: input.vehicleType,
        travelStartDate: input.travelStartDate,
        longDistanceSegmentCount,
        nightTrainBlockCount: context.nightTrainBlockCount,
        nightTrainBlockIds: Array.from(nightTrainBlockIds),
        extraLodgingCount,
        extraLodgings: input.extraLodgings,
        lodgingSelections: input.lodgingSelections,
        transportGroupCount: input.transportGroupCount,
        transportGroups: input.transportGroups,
        externalTransfers: input.externalTransfers,
        manualAdjustments: input.manualAdjustments,
        manualDepositAmountKrw: input.manualDepositAmountKrw ?? null,
        includeRentalItems: input.includeRentalItems,
        eventIds: input.eventIds,
        securityDeposit: {
          amountKrw: securityDeposit.amountKrw,
          unitPriceKrw: securityDeposit.unitPriceKrw,
          quantity: securityDeposit.quantity,
          mode: securityDeposit.mode,
          eventId: securityDeposit.event?.id ?? null,
        },
      },
    };
  }

  private buildLodgingSelectionLines(
    rules: PricingRuleRecord[],
    context: ComputeContext,
    lodgingSelections: LodgingSelectionPricingInputDto[],
    headcountTotal: number,
    transportGroupCount: number,
  ): PricingComputedLineDraft[] {
    const lines: PricingComputedLineDraft[] = [];

    lodgingSelections.forEach((selection) => {
      if (selection.level === 'LV3') {
        return;
      }

      if (selection.level !== 'CUSTOM') {
        const lodgingRule = this.findFixedLodgingSelectionRule(rules, selection.level, context);
        const unitPriceKrw = this.ensureAmount(lodgingRule);
        const quantity = 1;
        lines.push({
          ruleType: 'CONDITIONAL_ADDON',
          lineCode: 'LODGING_SELECTION',
          sourceType: 'RULE',
          ruleId: lodgingRule.id,
          description: `${selection.dayIndex}일차 ${selection.level}`,
          unitPriceKrw,
          quantity,
          amountKrw: unitPriceKrw * quantity,
          meta: this.buildRuleMeta(lodgingRule, {
            dayIndex: selection.dayIndex,
            level: selection.level,
          }),
        });
        return;
      }

      const price = selection.priceSnapshotKrw ?? 0;
      const pricingMode = selection.pricingModeSnapshot ?? 'FLAT';

      if (pricingMode === 'PER_PERSON') {
        lines.push({
          ruleType: 'CONDITIONAL_ADDON',
          lineCode: 'LODGING_SELECTION',
          sourceType: 'MANUAL',
          ruleId: null,
          description: `${selection.dayIndex}일차 숙소지정: ${selection.customLodgingNameSnapshot ?? '-'}`,
          unitPriceKrw: price,
          quantity: 1,
          amountKrw: price,
          meta: {
            dayIndex: selection.dayIndex,
            level: selection.level,
            customLodgingId: selection.customLodgingId ?? null,
            pricingModeSnapshot: pricingMode,
            chargeScope: 'PER_PERSON',
            personMode: 'SINGLE',
          },
        });
        return;
      }

      if (pricingMode === 'PER_TEAM') {
        const teamTotalKrw = price * transportGroupCount;
        const perPersonKrw =
          headcountTotal > 0 ? Math.round(teamTotalKrw / headcountTotal) : teamTotalKrw;
        lines.push({
          ruleType: 'CONDITIONAL_ADDON',
          lineCode: 'LODGING_SELECTION',
          sourceType: 'MANUAL',
          ruleId: null,
          description: `${selection.dayIndex}일차 숙소지정: ${selection.customLodgingNameSnapshot ?? '-'}`,
          unitPriceKrw: perPersonKrw,
          quantity: 1,
          amountKrw: perPersonKrw,
          meta: {
            dayIndex: selection.dayIndex,
            level: selection.level,
            customLodgingId: selection.customLodgingId ?? null,
            pricingModeSnapshot: pricingMode,
            chargeScope: 'TEAM',
          },
        });
        return;
      }

      lines.push({
        ruleType: 'CONDITIONAL_ADDON',
        lineCode: 'LODGING_SELECTION',
        sourceType: 'MANUAL',
        ruleId: null,
        description: `${selection.dayIndex}일차 숙소지정: ${selection.customLodgingNameSnapshot ?? '-'}`,
        unitPriceKrw: price,
        quantity: 1,
        amountKrw: price,
        meta: {
          dayIndex: selection.dayIndex,
          level: selection.level,
          customLodgingId: selection.customLodgingId ?? null,
          pricingModeSnapshot: pricingMode,
        },
      });
    });

    return lines;
  }

  private computeSecurityDeposit(input: {
    includeRentalItems: boolean;
    headcountTotal: number;
    events: Array<Pick<Event, 'id' | 'name' | 'securityDepositKrw' | 'isActive' | 'sortOrder'>>;
  }): {
    amountKrw: number;
    unitPriceKrw: number;
    quantity: number;
    mode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
    event: {
      id: string;
      name: string;
      securityDepositKrw: number;
      isActive: boolean;
      sortOrder: number;
    } | null;
  } {
    const topEvent =
      input.events.length > 0
        ? input.events
            .slice()
            .sort((a, b) => b.securityDepositKrw - a.securityDepositKrw || a.sortOrder - b.sortOrder)[0]
        : null;

    if (topEvent) {
      return {
        amountKrw: topEvent.securityDepositKrw,
        unitPriceKrw: topEvent.securityDepositKrw,
        quantity: 1,
        mode: 'PER_TEAM',
        event: topEvent,
      };
    }

    if (input.includeRentalItems) {
      const unitPriceKrw = RENTAL_ITEM_DEPOSIT_PER_PERSON_KRW;
      const quantity = input.headcountTotal;
      return {
        amountKrw: unitPriceKrw * quantity,
        unitPriceKrw,
        quantity,
        mode: 'PER_PERSON',
        event: null,
      };
    }

    return {
      amountKrw: 0,
      unitPriceKrw: 0,
      quantity: 0,
      mode: 'NONE',
      event: null,
    };
  }

  private computeTeamSecurityDeposit(input: {
    includeRentalItems: boolean;
    headcount: number;
    events: Array<Pick<Event, 'id' | 'name' | 'securityDepositKrw' | 'isActive' | 'sortOrder'>>;
  }): {
    amountKrw: number;
    unitPriceKrw: number;
    quantity: number;
    mode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
    event: {
      id: string;
      name: string;
    } | null;
  } {
    const topEvent =
      input.events.length > 0
        ? input.events
            .slice()
            .sort((a, b) => b.securityDepositKrw - a.securityDepositKrw || a.sortOrder - b.sortOrder)[0]
        : null;

    if (topEvent) {
      return {
        amountKrw: topEvent.securityDepositKrw,
        unitPriceKrw: topEvent.securityDepositKrw,
        quantity: 1,
        mode: 'PER_TEAM',
        event: { id: topEvent.id, name: topEvent.name },
      };
    }

    if (input.includeRentalItems) {
      return {
        amountKrw: RENTAL_ITEM_DEPOSIT_PER_PERSON_KRW * input.headcount,
        unitPriceKrw: RENTAL_ITEM_DEPOSIT_PER_PERSON_KRW,
        quantity: input.headcount,
        mode: 'PER_PERSON',
        event: null,
      };
    }

    return {
      amountKrw: 0,
      unitPriceKrw: 0,
      quantity: 0,
      mode: 'NONE',
      event: null,
    };
  }

  private buildTeamPricings(input: {
    input: PricingComputeInput;
    totalDays: number;
    lines: PricingComputedLine[];
    events: Array<Pick<Event, 'id' | 'name' | 'securityDepositKrw' | 'isActive' | 'sortOrder'>>;
  }): TeamPricingResult[] {
    return input.input.transportGroups.map((group, teamOrderIndex) => {
      const teamLines = input.lines
        .map((line) =>
          this.buildTeamLine(line, {
            teamOrderIndex,
            teamName: group.teamName,
            headcount: group.headcount,
            totalDays: input.totalDays,
          }),
        )
        .filter((line): line is PricingComputedLine => line !== null);
      const baseAmountKrw = teamLines
        .filter((line) => this.isBaseLine(line))
        .reduce((sum, line) => sum + line.amountKrw, 0);
      const totalAmountKrw = teamLines.reduce((sum, line) => sum + line.amountKrw, 0);
      const addonAmountKrw = totalAmountKrw - baseAmountKrw;
      const { depositAmountKrw, balanceAmountKrw } = this.computeDepositAndBalance(totalAmountKrw);
      const securityDeposit = this.computeTeamSecurityDeposit({
        includeRentalItems: input.input.includeRentalItems,
        headcount: group.headcount,
        events: input.events,
      });

      return {
        teamOrderIndex,
        teamName: group.teamName,
        headcount: group.headcount,
        baseAmountKrw,
        addonAmountKrw,
        totalAmountKrw,
        depositAmountKrw,
        balanceAmountKrw,
        securityDepositAmountKrw: securityDeposit.amountKrw,
        securityDepositUnitPriceKrw: securityDeposit.unitPriceKrw,
        securityDepositQuantity: securityDeposit.quantity,
        securityDepositMode: securityDeposit.mode,
        securityDepositEvent: securityDeposit.event,
        lines: teamLines,
      };
    });
  }

  private buildTeamLine(
    line: PricingComputedLine,
    input: { teamOrderIndex: number; teamName: string; headcount: number; totalDays: number },
  ): PricingComputedLine | null {
    const meta = line.meta ?? {};
    const chargeScope =
      meta && typeof meta === 'object' && 'chargeScope' in meta && (meta.chargeScope === 'TEAM' || meta.chargeScope === 'PER_PERSON')
        ? meta.chargeScope
        : null;
    const quantitySource =
      meta && typeof meta === 'object' && 'quantitySource' in meta && typeof meta.quantitySource === 'string'
        ? (meta.quantitySource as PricingQuantitySourceValue)
        : null;
    const matchedTeamCount = this.getMatchedTeamCount(meta, input.teamOrderIndex);
    const hasMatchedTeams = this.hasMatchedTeamCounts(meta);
    const matchedTransportGroup = this.matchesTransportGroupScope(meta, input.teamOrderIndex);

    if (hasMatchedTeams && matchedTeamCount <= 0) {
      return null;
    }
    if (!matchedTransportGroup) {
      return null;
    }

    const quantity = this.resolveTeamScopedQuantity({
      line,
      chargeScope,
      quantitySource,
      teamHeadcount: input.headcount,
      teamOrderIndex: input.teamOrderIndex,
    });
    if (quantity <= 0) {
      return null;
    }

    let amountKrw = line.amountKrw;
    if (chargeScope === 'TEAM') {
      const unitPriceKrw = line.unitPriceKrw ?? line.amountKrw;
      const allocationHeadcount = this.getAllocationHeadcount(meta, input.headcount);
      amountKrw = this.computeDisplayAmountKrw({
        unitPriceKrw,
        quantity,
        chargeScope,
        headcountTotal: allocationHeadcount,
      });
    } else if (hasMatchedTeams) {
      const unitPriceKrw = line.unitPriceKrw ?? line.amountKrw;
      amountKrw = unitPriceKrw * quantity;
    }

    const teamLine: PricingComputedLine = {
      ...line,
      quantity,
      amountKrw,
      teamOrderIndex: input.teamOrderIndex,
      teamName: input.teamName,
      headcount: input.headcount,
    };
    return {
      ...teamLine,
      display: buildPricingLineDisplay(teamLine, {
        headcountTotal: chargeScope === 'TEAM' ? this.getAllocationHeadcount(meta, input.headcount) : input.headcount,
        totalDays: input.totalDays,
      }),
    };
  }

  private getAllocationHeadcount(meta: Record<string, unknown> | null, fallbackHeadcount: number): number {
    if (typeof meta?.allocationHeadcount === 'number' && meta.allocationHeadcount > 0) {
      return meta.allocationHeadcount;
    }
    return fallbackHeadcount;
  }

  private hasMatchedTeamCounts(meta: Record<string, unknown> | null): boolean {
    return Array.isArray(meta?.matchedTeamCounts);
  }

  private matchesTransportGroupScope(meta: Record<string, unknown> | null, teamOrderIndex: number): boolean {
    if (!Array.isArray(meta?.matchedTransportGroupOrderIndexes)) {
      return true;
    }
    return meta.matchedTransportGroupOrderIndexes.includes(teamOrderIndex);
  }

  private getMatchedTeamCount(meta: Record<string, unknown> | null, teamOrderIndex: number): number {
    if (!Array.isArray(meta?.matchedTeamCounts)) {
      return 0;
    }
    const matched = meta.matchedTeamCounts.find(
      (value) =>
        value &&
        typeof value === 'object' &&
        'teamOrderIndex' in value &&
        'count' in value &&
        value.teamOrderIndex === teamOrderIndex &&
        typeof value.count === 'number',
    );
    return matched && typeof matched.count === 'number' ? matched.count : 0;
  }

  private resolveTeamScopedQuantity(input: TeamScopedQuantityInput): number {
    const matchedTeamCount = this.getMatchedTeamCount(input.line.meta ?? null, input.teamOrderIndex);
    if (matchedTeamCount > 0) {
      if (input.quantitySource === 'HEADCOUNT' && input.chargeScope !== 'TEAM') {
        return matchedTeamCount * input.teamHeadcount;
      }
      return matchedTeamCount;
    }

    if (Array.isArray(input.line.meta?.matchedTransportGroupOrderIndexes)) {
      if (input.quantitySource === 'HEADCOUNT') {
        return input.chargeScope === 'TEAM' ? 1 : input.teamHeadcount;
      }
      if (input.quantitySource === 'ONE') {
        return 1;
      }
    }

    if (input.chargeScope === 'TEAM' && input.quantitySource === 'HEADCOUNT') {
      return 1;
    }

    return input.line.quantity;
  }

  private buildTripFlatLine(
    rules: PricingRuleRecord[],
    lineCode: PricingLineCode,
    context: ComputeContext,
  ): PricingComputedLineDraft {
    const rule = this.findRequiredAmountRule(rules, lineCode, context);
    const unitPrice = this.ensureAmount(rule);
    const quantity = this.resolveQuantity(rule.quantitySource, context);

    return {
      ruleType: 'CONDITIONAL_ADDON',
      lineCode,
      sourceType: 'RULE',
      ruleId: rule.id,
      description: null,
      unitPriceKrw: unitPrice,
      quantity,
      amountKrw: unitPrice * quantity,
      meta: this.buildRuleMeta(rule),
    };
  }

  private buildRuleMeta(rule: PricingRuleRecord, extra: Record<string, unknown> = {}): Record<string, unknown> {
    const externalTransferPresetCodes = this.getExternalTransferPresetCodes(rule);
    return {
      ruleType: this.getEffectiveRuleType(rule),
      title: rule.title,
      lineCode: rule.lineCode,
      ...(rule.priceItemPreset ? { priceItemPreset: rule.priceItemPreset } : {}),
      quantitySource: rule.quantitySource,
      ...(rule.chargeScope ? { chargeScope: rule.chargeScope } : {}),
      ...(rule.personMode ? { personMode: rule.personMode } : {}),
      ...(rule.customDisplayText ? { customDisplayText: rule.customDisplayText } : {}),
      ...(rule.lodgingSelectionLevel ? { lodgingSelectionLevel: rule.lodgingSelectionLevel } : {}),
      ...(rule.externalTransferMode ? { externalTransferMode: rule.externalTransferMode } : {}),
      ...(rule.externalTransferMinCount != null ? { externalTransferMinCount: rule.externalTransferMinCount } : {}),
      ...(externalTransferPresetCodes.length > 0 ? { externalTransferPresetCodes } : {}),
      ...extra,
    };
  }

  private getEffectiveRuleType(rule: Pick<PricingRuleRecord, 'ruleType' | 'lineCode'>): PricingRuleTypeValue {
    if (rule.ruleType) {
      return rule.ruleType;
    }
    switch (rule.lineCode) {
      case 'BASE':
        return 'BASE';
      case 'BASE_PERCENT':
      case 'BASE_UPLIFT_5PLUS_5PCT':
      case 'BASE_UPLIFT_5PLUS_10PCT':
        return 'PERCENT_UPLIFT';
      case 'LONG_DISTANCE':
        return 'LONG_DISTANCE';
      case 'MANUAL_ADJUSTMENT':
        return 'MANUAL';
      default:
        return 'CONDITIONAL_ADDON';
    }
  }

  private isBaseLine(line: Pick<PricingComputedLine, 'ruleType' | 'lineCode'>): boolean {
    return line.ruleType === 'BASE' || line.ruleType === 'PERCENT_UPLIFT' || line.ruleType === 'LONG_DISTANCE';
  }

  private findBaseRule(rules: PricingRuleRecord[], context: ComputeContext): PricingRuleRecord {
    const matched = rules.find((rule) => this.getEffectiveRuleType(rule) === 'BASE' && this.matchesRule(rule, context));
    if (!matched) {
      throw new DomainError('VALIDATION_FAILED', 'No pricing rule found for BASE');
    }
    return matched;
  }

  private findPercentUpliftRules(rules: PricingRuleRecord[], context: ComputeContext): PricingRuleRecord[] {
    return rules.filter((rule) => this.getEffectiveRuleType(rule) === 'PERCENT_UPLIFT' && this.matchesRule(rule, context));
  }

  private findLongDistanceRules(rules: PricingRuleRecord[], context: ComputeContext): PricingRuleRecord[] {
    return rules.filter((rule) => this.getEffectiveRuleType(rule) === 'LONG_DISTANCE' && this.matchesRule(rule, context));
  }

  private buildPercentUpliftLine(rule: PricingRuleRecord, baseAmountKrw: number): PricingComputedLineDraft | null {
    const percentBps = this.ensurePercent(rule);
    const upliftAmount = Math.round((baseAmountKrw * percentBps) / 10_000);
    if (upliftAmount === 0) {
      return null;
    }
    return {
      ruleType: 'PERCENT_UPLIFT',
      lineCode: rule.lineCode,
      sourceType: 'RULE',
      ruleId: rule.id,
      description: rule.title,
      unitPriceKrw: null,
      quantity: 1,
      amountKrw: upliftAmount,
      meta: this.buildRuleMeta(rule, { percentBps }),
    };
  }

  private findConditionalAddonRules(rules: PricingRuleRecord[], context: ComputeContext): PricingRuleRecord[] {
    return rules.filter(
      (rule) =>
        this.getEffectiveRuleType(rule) === 'CONDITIONAL_ADDON' &&
        rule.lodgingSelectionLevel === null &&
        this.matchesRule(rule, context),
    );
  }

  private findFixedLodgingSelectionRule(
    rules: PricingRuleRecord[],
    level: PricingLodgingSelectionLevelValue,
    context: ComputeContext,
  ): PricingRuleRecord {
    const matched =
      rules.find(
        (rule) =>
          rule.lineCode === 'LODGING_SELECTION' &&
          rule.calcType === 'AMOUNT' &&
          rule.lodgingSelectionLevel === level &&
          this.matchesRule(rule, context),
      ) ?? null;
    if (!matched) {
      throw new DomainError('VALIDATION_FAILED', `No pricing rule found for lodging selection ${level}`);
    }
    return matched;
  }

  private buildAmountRuleLine(rule: PricingRuleRecord, context: ComputeContext): PricingComputedLineDraft | null {
    const unitPrice = this.ensureAmount(rule);
    const quantity = this.resolveConditionalAddonQuantity(rule, context);
    if (quantity <= 0) {
      return null;
    }
    const effectiveRuleType = this.getEffectiveRuleType(rule);
    const extraMeta: Record<string, unknown> = {};
    if (rule.lineCode === 'LONG_DISTANCE') {
      extraMeta.longDistanceSegmentCount = context.longDistanceSegmentCount;
    }
    if (rule.lineCode === 'NIGHT_TRAIN') {
      extraMeta.nightTrainBlockCount = context.nightTrainBlockCount;
    }
    const matchedTransportGroupOrderIndexes = this.getAllocationTransportGroupOrderIndexes(rule, context);
    if (matchedTransportGroupOrderIndexes.length > 0) {
      extraMeta.matchedTransportGroupOrderIndexes = matchedTransportGroupOrderIndexes;
    }
    const matchedTeamCounts = this.hasExternalTransferFilter(rule)
      ? this.getMatchedExternalTransferTeamCounts(rule, context)
      : [];
    if (matchedTeamCounts.length > 0) {
      extraMeta.matchedTeamCounts = matchedTeamCounts;
    }
    if (rule.chargeScope === 'TEAM' && matchedTeamCounts.length === 0) {
      const allocationHeadcount =
        matchedTransportGroupOrderIndexes.length > 0
          ? this.getMatchedTransportGroupHeadcount(context, matchedTransportGroupOrderIndexes)
          : context.headcountTotal;
      if (allocationHeadcount > 0) {
        extraMeta.allocationHeadcount = allocationHeadcount;
        extraMeta.allocationScope = matchedTransportGroupOrderIndexes.length === 1 ? 'TEAM' : 'COMMON';
      }
    }
    return {
      ruleType: effectiveRuleType,
      lineCode: rule.lineCode,
      sourceType: 'RULE',
      ruleId: rule.id,
      description: rule.title,
      unitPriceKrw: unitPrice,
      quantity,
      amountKrw: this.computeDisplayAmountKrw({
        unitPriceKrw: unitPrice,
        quantity,
        chargeScope: rule.chargeScope,
        headcountTotal: context.headcountTotal,
      }),
      meta: this.buildRuleMeta(rule, extraMeta),
    };
  }

  private computeDisplayAmountKrw(input: {
    unitPriceKrw: number;
    quantity: number;
    chargeScope: 'TEAM' | 'PER_PERSON' | null;
    headcountTotal: number;
  }): number {
    if (input.chargeScope !== 'TEAM') {
      return input.unitPriceKrw * input.quantity;
    }
    const perPersonAmountKrw = this.computeTeamPerPersonAmountKrw(input.unitPriceKrw, input.headcountTotal);
    return perPersonAmountKrw * input.quantity;
  }

  private computeTeamPerPersonAmountKrw(teamUnitAmountKrw: number, headcountTotal: number): number {
    if (headcountTotal <= 0) {
      return teamUnitAmountKrw;
    }
    return this.roundToHundred(teamUnitAmountKrw / headcountTotal);
  }

  private roundToHundred(value: number): number {
    return Math.round(value / 100) * 100;
  }

  private shouldApplyEarly(variantType: VariantType): boolean {
    return variantType === 'early' || variantType === 'earlyExtend';
  }

  private shouldApplyExtend(variantType: VariantType): boolean {
    return variantType === 'extend' || variantType === 'earlyExtend';
  }

  private computeDepositAndBalance(
    totalAmountKrw: number,
    manualDepositAmountKrw?: number,
  ): { depositAmountKrw: number; balanceAmountKrw: number } {
    if (manualDepositAmountKrw !== undefined) {
      if (!Number.isInteger(manualDepositAmountKrw)) {
        throw new DomainError('VALIDATION_FAILED', 'manualDepositAmountKrw must be an integer');
      }
      if (manualDepositAmountKrw < 0) {
        throw new DomainError('VALIDATION_FAILED', 'manualDepositAmountKrw must be greater than or equal to 0');
      }

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

  private ensureAmount(rule: PricingRuleRecord): number {
    if (rule.amountKrw === null) {
      throw new DomainError('VALIDATION_FAILED', `Missing amountKrw for pricing rule ${rule.id}`);
    }
    return rule.amountKrw;
  }

  private ensurePercent(rule: PricingRuleRecord): number {
    if (rule.percentBps === null) {
      throw new DomainError('VALIDATION_FAILED', `Missing percentBps for pricing rule ${rule.id}`);
    }
    return rule.percentBps;
  }

  private resolveQuantity(source: PricingQuantitySourceValue, context: ComputeContext): number {
    switch (source) {
      case 'ONE':
        return 1;
      case 'HEADCOUNT':
        return context.headcountTotal;
      case 'TOTAL_DAYS':
        return context.totalDays;
      case 'LONG_DISTANCE_SEGMENT_COUNT':
        return context.longDistanceSegmentCount;
      case 'NIGHT_TRAIN_BLOCK_COUNT':
        return context.nightTrainBlockCount;
      case 'SUM_EXTRA_LODGING_COUNTS':
        return context.extraLodgingCount;
      default:
        return 1;
    }
  }

  private findRequiredAmountRule(rules: PricingRuleRecord[], lineCode: PricingLineCode, context: ComputeContext): PricingRuleRecord {
    const matched = this.findMatchingRule(rules, lineCode, 'AMOUNT', context);
    if (!matched) {
      throw new DomainError('VALIDATION_FAILED', `No pricing rule found for ${lineCode}`);
    }
    return matched;
  }

  private findOptionalPercentRule(
    rules: PricingRuleRecord[],
    lineCode: PricingLineCode,
    targetLineCode: PricingLineCode,
    context: ComputeContext,
  ): PricingRuleRecord | null {
    return (
      rules.find(
        (rule) =>
          rule.lineCode === lineCode &&
          rule.calcType === 'PERCENT_OF_LINE' &&
          rule.targetLineCode === targetLineCode &&
          this.matchesRule(rule, context),
      ) ?? null
    );
  }

  private buildOptionalPercentLine(
    rules: PricingRuleRecord[],
    lineCode: PricingLineCode,
    targetLineCode: PricingLineCode,
    context: ComputeContext,
    baseAmountKrw: number,
  ): PricingComputedLineDraft | null {
    const rule = this.findOptionalPercentRule(rules, lineCode, targetLineCode, context);
    if (!rule) {
      return null;
    }

    const percentBps = this.ensurePercent(rule);
    const upliftAmount = Math.round((baseAmountKrw * percentBps) / 10_000);
    if (upliftAmount === 0) {
      return null;
    }

    return {
      ruleType: 'PERCENT_UPLIFT',
      lineCode,
      sourceType: 'RULE',
      ruleId: rule.id,
      description: null,
      unitPriceKrw: null,
      quantity: 1,
      amountKrw: upliftAmount,
      meta: this.buildRuleMeta(rule, { percentBps }),
    };
  }

  private findMatchingRule(
    rules: PricingRuleRecord[],
    lineCode: PricingLineCode,
    calcType: PricingCalcType,
    context: ComputeContext,
  ): PricingRuleRecord | null {
    return rules.find((rule) => rule.lineCode === lineCode && rule.calcType === calcType && this.matchesRule(rule, context)) ?? null;
  }

  private matchesRule(rule: PricingRuleRecord, context: ComputeContext): boolean {
    if (rule.headcountMin !== null && context.headcountTotal < rule.headcountMin) {
      return false;
    }
    if (rule.headcountMax !== null && context.headcountTotal > rule.headcountMax) {
      return false;
    }
    if (rule.dayMin !== null && context.totalDays < rule.dayMin) {
      return false;
    }
    if (rule.dayMax !== null && context.totalDays > rule.dayMax) {
      return false;
    }
    if (rule.travelDateFrom !== null && context.travelStartDate < rule.travelDateFrom) {
      return false;
    }
    if (rule.travelDateTo !== null && context.travelStartDate > rule.travelDateTo) {
      return false;
    }
    if (rule.vehicleType !== null && context.vehicleType !== rule.vehicleType) {
      return false;
    }
    if (rule.variantTypes && !this.matchesVariantTypes(rule.variantTypes, context.variantType)) {
      return false;
    }
    if (!this.matchesFlightConditions(rule, context)) {
      return false;
    }
    if (!this.matchesExternalTransferCondition(rule, context)) {
      return false;
    }
    if (!this.matchesLegacyRuleFallback(rule, context)) {
      return false;
    }
    return true;
  }

  private matchesFlightConditions(rule: PricingRuleRecord, context: ComputeContext): boolean {
    if (
      rule.flightInTimeBand === null &&
      rule.flightOutTimeBand === null &&
      rule.pickupPlaceType === null &&
      rule.dropPlaceType === null
    ) {
      return true;
    }

    return context.transportGroups.some((group) => {
      if (rule.flightInTimeBand !== null && !this.matchesTimeBand(group.flightInTime, rule.flightInTimeBand)) {
        return false;
      }
      if (rule.flightOutTimeBand !== null && !this.matchesTimeBand(group.flightOutTime, rule.flightOutTimeBand)) {
        return false;
      }
      if (rule.pickupPlaceType !== null && (group.pickupPlaceType ?? null) !== rule.pickupPlaceType) {
        return false;
      }
      if (rule.dropPlaceType !== null && (group.dropPlaceType ?? null) !== rule.dropPlaceType) {
        return false;
      }
      return true;
    });
  }

  private getMatchedTransportGroupOrderIndexes(rule: PricingRuleRecord, context: ComputeContext): number[] {
    if (
      rule.flightInTimeBand === null &&
      rule.flightOutTimeBand === null &&
      rule.pickupPlaceType === null &&
      rule.dropPlaceType === null
    ) {
      return [];
    }
    return context.transportGroups.flatMap((group, index) => {
      if (rule.flightInTimeBand !== null && !this.matchesTimeBand(group.flightInTime, rule.flightInTimeBand)) {
        return [];
      }
      if (rule.flightOutTimeBand !== null && !this.matchesTimeBand(group.flightOutTime, rule.flightOutTimeBand)) {
        return [];
      }
      if (rule.pickupPlaceType !== null && (group.pickupPlaceType ?? null) !== rule.pickupPlaceType) {
        return [];
      }
      if (rule.dropPlaceType !== null && (group.dropPlaceType ?? null) !== rule.dropPlaceType) {
        return [];
      }
      return [index];
    });
  }

  private getAllocationTransportGroupOrderIndexes(rule: PricingRuleRecord, context: ComputeContext): number[] {
    if (rule.lineCode === 'EARLY' || rule.lineCode === 'EXTEND') {
      const variantScopedIndexes = this.getVariantScopedTransportGroupOrderIndexes(rule, context);
      if (variantScopedIndexes.length > 0) {
        return variantScopedIndexes;
      }
    }
    return this.getMatchedTransportGroupOrderIndexes(rule, context);
  }

  private getVariantScopedTransportGroupOrderIndexes(rule: PricingRuleRecord, context: ComputeContext): number[] {
    if (rule.lineCode === 'EARLY') {
      if (!this.shouldApplyEarly(context.variantType)) {
        return [];
      }
      if (rule.flightInTimeBand !== null) {
        return context.transportGroups.flatMap((group, index) =>
          this.matchesTimeBand(group.flightInTime, rule.flightInTimeBand) ? [index] : [],
        );
      }
      return context.transportGroups.map((_, index) => index);
    }

    if (rule.lineCode === 'EXTEND') {
      if (!this.shouldApplyExtend(context.variantType)) {
        return [];
      }
      if (rule.flightOutTimeBand !== null) {
        return context.transportGroups.flatMap((group, index) =>
          this.matchesTimeBand(group.flightOutTime, rule.flightOutTimeBand) ? [index] : [],
        );
      }
      return context.transportGroups.map((_, index) => index);
    }

    return [];
  }

  private getMatchedTransportGroupHeadcount(context: ComputeContext, indexes: number[]): number {
    const uniqueIndexes = Array.from(new Set(indexes));
    return uniqueIndexes.reduce((sum, index) => sum + (context.transportGroups[index]?.headcount ?? 0), 0);
  }

  private matchesExternalTransferCondition(rule: PricingRuleRecord, context: ComputeContext): boolean {
    const matchedTransfers = this.getMatchedExternalTransfers(rule, context);
    if (rule.externalTransferMode === null) {
      if (this.getExternalTransferPresetCodes(rule).length === 0 && rule.externalTransferMinCount === null) {
        return true;
      }
      if (matchedTransfers.length === 0) {
        return false;
      }
      if (rule.externalTransferMinCount !== null && matchedTransfers.length < rule.externalTransferMinCount) {
        return false;
      }
      return true;
    }

    const pickupCount = matchedTransfers.filter((item) => item.direction === 'PICKUP').length;
    const dropCount = matchedTransfers.filter((item) => item.direction === 'DROP').length;
    const matchedCount =
      rule.externalTransferMode === 'PICKUP_ONLY'
        ? pickupCount
        : rule.externalTransferMode === 'DROP_ONLY'
          ? dropCount
          : rule.externalTransferMode === 'BOTH'
            ? Math.min(pickupCount, dropCount)
            : pickupCount + dropCount;

    if (rule.externalTransferMode === 'BOTH' && (pickupCount === 0 || dropCount === 0)) {
      return false;
    }
    if ((rule.externalTransferMode === 'PICKUP_ONLY' && pickupCount === 0) || (rule.externalTransferMode === 'DROP_ONLY' && dropCount === 0)) {
      return false;
    }
    if (rule.externalTransferMode === 'ANY' && pickupCount + dropCount === 0) {
      return false;
    }
    if (rule.externalTransferMinCount !== null && matchedCount < rule.externalTransferMinCount) {
      return false;
    }
    return true;
  }

  private resolveConditionalAddonQuantity(rule: PricingRuleRecord, context: ComputeContext): number {
    if (!this.hasExternalTransferFilter(rule)) {
      return this.resolveQuantity(rule.quantitySource, context);
    }
    return this.countMatchedExternalTransferTeams(rule, context);
  }

  private hasExternalTransferFilter(rule: PricingRuleRecord): boolean {
    return (
      rule.externalTransferMode !== null ||
      rule.externalTransferMinCount !== null ||
      this.getExternalTransferPresetCodes(rule).length > 0
    );
  }

  private getExternalTransferPresetCodes(rule: Pick<PricingRuleRecord, 'externalTransferPresetCodes'>): string[] {
    if (!Array.isArray(rule.externalTransferPresetCodes)) {
      return [];
    }
    return rule.externalTransferPresetCodes.filter((value): value is string => typeof value === 'string');
  }

  private normalizeSelectedTeamOrderIndexes(selectedTeamOrderIndexes: number[]): number[] {
    return Array.from(new Set(selectedTeamOrderIndexes.filter((value) => Number.isInteger(value)))).sort((left, right) => left - right);
  }

  private getExternalTransferSignature(transfer: PricingComputeInput['externalTransfers'][number]): string {
    return [
      transfer.direction,
      transfer.presetCode,
      transfer.travelDate,
      transfer.departureTime,
      transfer.arrivalTime,
      transfer.departurePlace,
      transfer.arrivalPlace,
      this.normalizeSelectedTeamOrderIndexes(transfer.selectedTeamOrderIndexes).join(','),
    ].join('|');
  }

  private dedupeExternalTransfers(
    transfers: PricingComputeInput['externalTransfers'],
  ): PricingComputeInput['externalTransfers'] {
    const seen = new Set<string>();
    return transfers.filter((transfer) => {
      const signature = this.getExternalTransferSignature(transfer);
      if (seen.has(signature)) {
        return false;
      }
      seen.add(signature);
      return true;
    });
  }

  private getMatchedExternalTransfers(rule: PricingRuleRecord, context: ComputeContext): PricingComputeInput['externalTransfers'] {
    const presetCodes = this.getExternalTransferPresetCodes(rule);
    const transfersByPreset =
      presetCodes.length > 0
        ? context.externalTransfers.filter((item) => presetCodes.includes(item.presetCode))
        : context.externalTransfers;

    const filteredTransfers = (() => {
      switch (rule.externalTransferMode) {
        case 'PICKUP_ONLY':
          return transfersByPreset.filter((item) => item.direction === 'PICKUP');
        case 'DROP_ONLY':
          return transfersByPreset.filter((item) => item.direction === 'DROP');
        case 'BOTH':
        case 'ANY':
        case null:
          return transfersByPreset;
        default:
          return transfersByPreset;
      }
    })();

    return this.dedupeExternalTransfers(filteredTransfers);
  }

  private countMatchedExternalTransferTeams(rule: PricingRuleRecord, context: ComputeContext): number {
    if (!this.hasExternalTransferFilter(rule)) {
      return 0;
    }
    return this.getMatchedExternalTransfers(rule, context).reduce(
      (count, transfer) => count + this.normalizeSelectedTeamOrderIndexes(transfer.selectedTeamOrderIndexes).length,
      0,
    );
  }

  private getMatchedExternalTransferTeamCounts(rule: PricingRuleRecord, context: ComputeContext): TeamTransferCount[] {
    if (!this.hasExternalTransferFilter(rule)) {
      return [];
    }
    const counts = new Map<number, number>();
    this.getMatchedExternalTransfers(rule, context).forEach((transfer) => {
      this.normalizeSelectedTeamOrderIndexes(transfer.selectedTeamOrderIndexes).forEach((teamOrderIndex) => {
        counts.set(teamOrderIndex, (counts.get(teamOrderIndex) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([teamOrderIndex, count]) => ({ teamOrderIndex, count }));
  }

  private matchesTimeBand(time: string | null | undefined, band: PricingRuleRecord['flightInTimeBand']): boolean {
    if (!band) {
      return true;
    }
    const minutes = this.parseTimeToMinutes(time);
    if (minutes === null) {
      return false;
    }
    if (minutes < 5 * 60) {
      return band === 'DAWN';
    }
    if (minutes < 12 * 60) {
      return band === 'MORNING';
    }
    if (minutes < 18 * 60) {
      return band === 'AFTERNOON';
    }
    if (minutes < 22 * 60) {
      return band === 'EVENING';
    }
    return band === 'NIGHT';
  }

  private parseTimeToMinutes(value: string | null | undefined): number | null {
    const trimmed = value?.trim() ?? '';
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
    if (!match) {
      return null;
    }
    return Number(match[1]) * 60 + Number(match[2]);
  }

  private matchesLegacyRuleFallback(rule: PricingRuleRecord, context: ComputeContext): boolean {
    if (this.getEffectiveRuleType(rule) !== 'CONDITIONAL_ADDON') {
      return true;
    }
    if (rule.lineCode === 'HIACE' && rule.vehicleType === null) {
      return (context.vehicleType === HIACE_SHORT || context.vehicleType === HIACE_LONG) && context.headcountTotal >= 3 && context.headcountTotal <= 6;
    }
    if (rule.lineCode === 'EARLY' && (!rule.variantTypes || (Array.isArray(rule.variantTypes) && rule.variantTypes.length === 0))) {
      return this.shouldApplyEarly(context.variantType);
    }
    if (rule.lineCode === 'EXTEND' && (!rule.variantTypes || (Array.isArray(rule.variantTypes) && rule.variantTypes.length === 0))) {
      return this.shouldApplyExtend(context.variantType);
    }
    return true;
  }

  private matchesVariantTypes(value: Prisma.JsonValue, variantType: VariantType): boolean {
    if (!Array.isArray(value)) {
      return false;
    }
    if (value.length === 0) {
      return true;
    }
    return value.some((item) => typeof item === 'string' && item === variantType);
  }

  private async loadActivePolicy(prisma: PrismaLike, travelStartDate: Date): Promise<PricingPolicy | null> {
    return prisma.pricingPolicy.findFirst({
      where: {
        status: 'ACTIVE',
        effectiveFrom: { lte: travelStartDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: travelStartDate } }],
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private async detectNightTrainBlocks(
    prisma: PrismaLike,
    planStops: PricingPlanStopDto[],
  ): Promise<Set<string>> {
    const blockIds = Array.from(
      new Set(
        planStops
          .map((stop) => stop.multiDayBlockId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );
    if (blockIds.length === 0) {
      return new Set();
    }
    const blocks = await prisma.overnightStay.findMany({
      where: { id: { in: blockIds } },
      select: { id: true, blockType: true, isNightTrain: true },
    });
    const nightTrainBlockIds = new Set<string>();
    blocks.forEach((block) => {
      if (block.isNightTrain || block.blockType === 'TRANSFER') {
        nightTrainBlockIds.add(block.id);
      }
    });
    return nightTrainBlockIds;
  }

  private async countLongDistanceSegments(
    prisma: PrismaLike,
    _regionIds: string[],
    planStops: PricingPlanStopDto[],
  ): Promise<number> {
    const segmentTransitions: Array<{ fromLocationId: string; toLocationId: string }> = [];
    const blockConnectionIds = new Set<string>();

    for (let index = 1; index < planStops.length; index += 1) {
      const currentStop = planStops[index];
      const blockDayOrder = currentStop?.multiDayBlockDayOrder ?? 0;
      if (blockDayOrder > 1) {
        continue;
      }

      const prevStop = planStops[index - 1];
      const fromLocationId = prevStop?.blockEndLocationId ?? prevStop?.locationId;
      const toLocationId = currentStop?.locationId;

      if (!fromLocationId || !toLocationId) {
        continue;
      }

      if (currentStop?.multiDayBlockConnectionId) {
        blockConnectionIds.add(currentStop.multiDayBlockConnectionId);
        continue;
      }

      segmentTransitions.push({ fromLocationId, toLocationId });
    }

    const uniqueTransitions = Array.from(
      new Map(
        segmentTransitions.map((item) => [`${item.fromLocationId}::${item.toLocationId}`, item] as const),
      ).values(),
    );

    const segments =
      uniqueTransitions.length > 0
        ? await prisma.segment.findMany({
            where: {
              OR: uniqueTransitions.map((item) => ({
                fromLocationId: item.fromLocationId,
                toLocationId: item.toLocationId,
              })),
            },
            select: {
              fromLocationId: true,
              toLocationId: true,
              isLongDistance: true,
            },
          })
        : [];

    const segmentByKey = new Map<string, boolean>(
      segments.map((segment) => [`${segment.fromLocationId}::${segment.toLocationId}`, segment.isLongDistance]),
    );
    const longDistanceSegmentCount = segmentTransitions.reduce((count, transition) => {
      const key = `${transition.fromLocationId}::${transition.toLocationId}`;
      return count + (segmentByKey.get(key) ? 1 : 0);
    }, 0);

    if (blockConnectionIds.size === 0) {
      return longDistanceSegmentCount;
    }

    const blockConnections = await prisma.overnightStayConnection.findMany({
      where: { id: { in: Array.from(blockConnectionIds) } },
      select: { id: true, isLongDistance: true },
    });
    const longDistanceBlockConnectionCount = blockConnections.reduce(
      (count, connection) => count + (connection.isLongDistance ? 1 : 0),
      0,
    );

    return longDistanceSegmentCount + longDistanceBlockConnectionCount;
  }
}
