import type {
  Event,
  PricingCalcType,
  PricingLineCode,
  PricingPolicy,
  PricingQuantitySource,
  PricingRule,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import type { VariantType } from '@tour/domain';
import { DomainError } from '../../lib/errors';
import type {
  LodgingSelectionPricingInputDto,
  PricingComputationResult,
  PricingComputeInput,
  PricingComputedLine,
  PricingPlanStopDto,
} from './pricing.types';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

type ComputeContext = {
  variantType: VariantType;
  totalDays: number;
  headcountTotal: number;
  vehicleType: string;
  longDistanceSegmentCount: number;
  extraLodgingCount: number;
};

const HIACE = '하이에이스';
const LONG_DISTANCE_BASE_POOL_KRW = 320_000;
const RENTAL_ITEM_DEPOSIT_PER_PERSON_KRW = 30_000;
const FIXED_LODGING_SELECTION_AMOUNTS: Record<'LV1' | 'LV2' | 'LV3' | 'LV4', number> = {
  LV1: -50_000,
  LV2: -30_000,
  LV3: 0,
  LV4: 50_000,
};

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

  async createSnapshot(
    tx: Prisma.TransactionClient,
    planVersionId: string,
    result: PricingComputationResult,
  ): Promise<void> {
    await tx.planVersionPricing.create({
      data: {
        planVersionId,
        policyId: result.policyId,
        currencyCode: result.currencyCode,
        baseAmountKrw: result.baseAmountKrw,
        addonAmountKrw: result.addonAmountKrw,
        totalAmountKrw: result.totalAmountKrw,
        depositAmountKrw: result.depositAmountKrw,
        balanceAmountKrw: result.balanceAmountKrw,
        securityDepositAmountKrw: result.securityDepositAmountKrw,
        securityDepositUnitPriceKrw: result.securityDepositUnitPriceKrw,
        securityDepositQuantity: result.securityDepositQuantity,
        securityDepositMode: result.securityDepositMode,
        securityDepositEventId: result.securityDepositEventId,
        inputSnapshot: result.inputSnapshot as Prisma.InputJsonValue,
        lines: {
          create: result.lines.map((line) => ({
            lineCode: line.lineCode,
            sourceType: line.sourceType,
            ruleId: line.ruleId,
            description: line.description,
            unitPriceKrw: line.unitPriceKrw,
            quantity: line.quantity,
            amountKrw: line.amountKrw,
            meta: line.meta as Prisma.InputJsonValue | undefined,
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

    const [policy, longDistanceSegmentCount, selectedEvents] = await Promise.all([
      this.loadActivePolicy(prisma, travelStartDate),
      this.countLongDistanceSegments(prisma, input.regionIds, mainPlanStops),
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

    const rules = await prisma.pricingRule.findMany({
      where: { policyId: policy.id, isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    });

    const extraLodgingCount = input.extraLodgings.reduce((sum, item) => sum + item.lodgingCount, 0);

    const context: ComputeContext = {
      variantType: input.variantType,
      totalDays: input.totalDays,
      headcountTotal: input.headcountTotal,
      vehicleType: input.vehicleType,
      longDistanceSegmentCount,
      extraLodgingCount,
    };

    const lines: PricingComputedLine[] = [];

    const baseRule = this.findRequiredAmountRule(rules, 'BASE', context);
    const baseUnitPrice = this.ensureAmount(baseRule);
    const baseQuantity = this.resolveQuantity(baseRule.quantitySource, context);
    const baseRawAmount = baseUnitPrice * baseQuantity;

    lines.push({
      lineCode: 'BASE',
      sourceType: 'RULE',
      ruleId: baseRule.id,
      description: null,
      unitPriceKrw: baseUnitPrice,
      quantity: baseQuantity,
      amountKrw: baseRawAmount,
      meta: null,
    });

    let baseUpliftAmount = 0;
    const baseUplift5Pct = this.buildOptionalPercentLine(rules, 'BASE_UPLIFT_5PLUS_5PCT', 'BASE', context, baseRawAmount);
    if (baseUplift5Pct) {
      baseUpliftAmount += baseUplift5Pct.amountKrw;
      lines.push(baseUplift5Pct);
    }
    const baseUplift10Pct = this.buildOptionalPercentLine(rules, 'BASE_UPLIFT_5PLUS_10PCT', 'BASE', context, baseRawAmount);
    if (baseUplift10Pct) {
      baseUpliftAmount += baseUplift10Pct.amountKrw;
      lines.push(baseUplift10Pct);
    }

    if (context.longDistanceSegmentCount > 0) {
      const unitPrice = Math.ceil((LONG_DISTANCE_BASE_POOL_KRW / context.headcountTotal) / 1000) * 1000;
      const quantity = context.longDistanceSegmentCount;
      lines.push({
        lineCode: 'LONG_DISTANCE',
        sourceType: 'RULE',
        ruleId: null,
        description: null,
        unitPriceKrw: unitPrice,
        quantity,
        amountKrw: unitPrice * quantity,
        meta: {
          longDistanceSegmentCount: context.longDistanceSegmentCount,
          basePoolKrw: LONG_DISTANCE_BASE_POOL_KRW,
        },
      });
    }

    if (context.vehicleType === HIACE) {
      if (context.headcountTotal < 3) {
        throw new DomainError('VALIDATION_FAILED', '하이에이스 차량은 3인 이상부터 선택할 수 있습니다.');
      }

      if (context.headcountTotal <= 6) {
        const hiaceRule = this.findRequiredAmountRule(rules, 'HIACE', context);
        const unitPrice = this.ensureAmount(hiaceRule);
        const quantity = this.resolveQuantity(hiaceRule.quantitySource, context);
        lines.push({
          lineCode: 'HIACE',
          sourceType: 'RULE',
          ruleId: hiaceRule.id,
          description: null,
          unitPriceKrw: unitPrice,
          quantity,
          amountKrw: unitPrice * quantity,
          meta: null,
        });
      }
    }

    if (context.extraLodgingCount > 0) {
      const extraLodgingRule = this.findRequiredAmountRule(rules, 'EXTRA_LODGING', context);
      const unitPrice = this.ensureAmount(extraLodgingRule);
      const quantity = this.resolveQuantity(extraLodgingRule.quantitySource, context);
      lines.push({
        lineCode: 'EXTRA_LODGING',
        sourceType: 'RULE',
        ruleId: extraLodgingRule.id,
        description: null,
        unitPriceKrw: unitPrice,
        quantity,
        amountKrw: unitPrice * quantity,
        meta: { extraLodgingCount: context.extraLodgingCount },
      });
    }

    this.buildLodgingSelectionLines(input.lodgingSelections, input.headcountTotal, input.transportGroupCount).forEach((line) => {
      lines.push(line);
    });

    if (this.shouldApplyEarly(input.variantType)) {
      lines.push(this.buildTripFlatLine(rules, 'EARLY', context));
    }

    if (this.shouldApplyExtend(input.variantType)) {
      lines.push(this.buildTripFlatLine(rules, 'EXTEND', context));
    }

    input.manualAdjustments.forEach((adjustment, index) => {
      lines.push({
        lineCode: 'MANUAL_ADJUSTMENT',
        sourceType: 'MANUAL',
        ruleId: null,
        description: adjustment.description,
        unitPriceKrw: adjustment.amountKrw,
        quantity: 1,
        amountKrw: adjustment.amountKrw,
        meta: { order: index + 1 },
      });
    });

    // 야간열차 판정: 이동형 멀티데이 블록(TRANSFER) 자동 감지
    const nightTrainBlockIds = await this.detectNightTrainBlocks(prisma, mainPlanStops);
    if (nightTrainBlockIds.size > 0) {
      const NIGHT_TRAIN_FIXED_AMOUNT_PER_TEAM_KRW = 420_000;
      // 견적서 표시를 위해 인당 금액으로 정규화
      const normalizedAmountKrw =
        input.headcountTotal > 0 ? Math.round(NIGHT_TRAIN_FIXED_AMOUNT_PER_TEAM_KRW / input.headcountTotal) : NIGHT_TRAIN_FIXED_AMOUNT_PER_TEAM_KRW;
      lines.push({
        lineCode: 'MANUAL_ADJUSTMENT',
        sourceType: 'RULE',
        ruleId: null,
        description: '야간열차',
        unitPriceKrw: NIGHT_TRAIN_FIXED_AMOUNT_PER_TEAM_KRW,
        quantity: input.headcountTotal > 0 ? input.headcountTotal : 1,
        amountKrw: normalizedAmountKrw,
        meta: { nightTrainBlockIds: Array.from(nightTrainBlockIds) },
      });
    }

    // 샤브샤브 누락 할인: mealCellText 전체에서 '샤브샤브' 미포함 시 인당 15,000원 할인
    const allMealCellTexts = mainPlanStops
      .map((stop) => stop.mealCellText ?? '')
      .join(' ');
    const hasShabushabu = allMealCellTexts.includes('샤브샤브');
    if (!hasShabushabu) {
      const SHABUSHABU_DISCOUNT_PER_PERSON_KRW = -15_000;
      const normalizedDiscountKrw = SHABUSHABU_DISCOUNT_PER_PERSON_KRW;
      lines.push({
        lineCode: 'MANUAL_ADJUSTMENT',
        sourceType: 'RULE',
        ruleId: null,
        description: '샤브샤브 누락 할인',
        unitPriceKrw: SHABUSHABU_DISCOUNT_PER_PERSON_KRW,
        quantity: input.headcountTotal > 0 ? input.headcountTotal : 1,
        amountKrw: normalizedDiscountKrw,
        meta: { reason: 'shabushabu_missing' },
      });
    }

    const baseAmountKrw = baseRawAmount + baseUpliftAmount;
    const totalAmountKrw = lines.reduce((sum, line) => sum + line.amountKrw, 0);
    const addonAmountKrw = totalAmountKrw - baseAmountKrw;
    const { depositAmountKrw, balanceAmountKrw } = this.computeDepositAndBalance(totalAmountKrw, input.manualDepositAmountKrw);
    const securityDeposit = this.computeSecurityDeposit({
      includeRentalItems: input.includeRentalItems,
      headcountTotal: input.headcountTotal,
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
      lines,
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
        extraLodgingCount,
        extraLodgings: input.extraLodgings,
        lodgingSelections: input.lodgingSelections,
        transportGroupCount: input.transportGroupCount,
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
    lodgingSelections: LodgingSelectionPricingInputDto[],
    headcountTotal: number,
    transportGroupCount: number,
  ): PricingComputedLine[] {
    const lines: PricingComputedLine[] = [];

    lodgingSelections.forEach((selection) => {
      if (selection.level === 'LV3') {
        return;
      }

      if (selection.level !== 'CUSTOM') {
        const unitPriceKrw = FIXED_LODGING_SELECTION_AMOUNTS[selection.level];
        const quantity = 1;
        lines.push({
          lineCode: 'LODGING_SELECTION',
          sourceType: 'MANUAL',
          ruleId: null,
          description: `${selection.dayIndex}일차 ${selection.level}`,
          unitPriceKrw,
          quantity,
          amountKrw: unitPriceKrw * quantity,
          meta: { dayIndex: selection.dayIndex, level: selection.level },
        });
        return;
      }

      const price = selection.priceSnapshotKrw ?? 0;
      const pricingMode = selection.pricingModeSnapshot ?? 'FLAT';
      const quantity = pricingMode === 'PER_PERSON' ? headcountTotal : pricingMode === 'PER_TEAM' ? transportGroupCount : 1;
      lines.push({
        lineCode: 'LODGING_SELECTION',
        sourceType: 'MANUAL',
        ruleId: null,
        description: `${selection.dayIndex}일차 숙소지정: ${selection.customLodgingNameSnapshot ?? '-'}`,
        unitPriceKrw: price,
        quantity,
        amountKrw: price * quantity,
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

  private buildTripFlatLine(
    rules: PricingRule[],
    lineCode: PricingLineCode,
    context: ComputeContext,
  ): PricingComputedLine {
    const rule = this.findRequiredAmountRule(rules, lineCode, context);
    const unitPrice = this.ensureAmount(rule);
    const quantity = this.resolveQuantity(rule.quantitySource, context);

    return {
      lineCode,
      sourceType: 'RULE',
      ruleId: rule.id,
      description: null,
      unitPriceKrw: unitPrice,
      quantity,
      amountKrw: unitPrice * quantity,
      meta: null,
    };
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
      if (manualDepositAmountKrw > totalAmountKrw) {
        throw new DomainError('VALIDATION_FAILED', 'manualDepositAmountKrw must be less than or equal to totalAmountKrw');
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

  private ensureAmount(rule: PricingRule): number {
    if (rule.amountKrw === null) {
      throw new DomainError('VALIDATION_FAILED', `Missing amountKrw for pricing rule ${rule.id}`);
    }
    return rule.amountKrw;
  }

  private ensurePercent(rule: PricingRule): number {
    if (rule.percentBps === null) {
      throw new DomainError('VALIDATION_FAILED', `Missing percentBps for pricing rule ${rule.id}`);
    }
    return rule.percentBps;
  }

  private resolveQuantity(source: PricingQuantitySource, context: ComputeContext): number {
    switch (source) {
      case 'ONE':
        return 1;
      case 'TOTAL_DAYS':
        return context.totalDays;
      case 'LONG_DISTANCE_SEGMENT_COUNT':
        return context.longDistanceSegmentCount;
      case 'SUM_EXTRA_LODGING_COUNTS':
        return context.extraLodgingCount;
      default:
        return 1;
    }
  }

  private findRequiredAmountRule(rules: PricingRule[], lineCode: PricingLineCode, context: ComputeContext): PricingRule {
    const matched = this.findMatchingRule(rules, lineCode, 'AMOUNT', context);
    if (!matched) {
      throw new DomainError('VALIDATION_FAILED', `No pricing rule found for ${lineCode}`);
    }
    return matched;
  }

  private findOptionalPercentRule(
    rules: PricingRule[],
    lineCode: PricingLineCode,
    targetLineCode: PricingLineCode,
    context: ComputeContext,
  ): PricingRule | null {
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
    rules: PricingRule[],
    lineCode: PricingLineCode,
    targetLineCode: PricingLineCode,
    context: ComputeContext,
    baseAmountKrw: number,
  ): PricingComputedLine | null {
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
      lineCode,
      sourceType: 'RULE',
      ruleId: rule.id,
      description: null,
      unitPriceKrw: null,
      quantity: 1,
      amountKrw: upliftAmount,
      meta: { percentBps },
    };
  }

  private findMatchingRule(
    rules: PricingRule[],
    lineCode: PricingLineCode,
    calcType: PricingCalcType,
    context: ComputeContext,
  ): PricingRule | null {
    return rules.find((rule) => rule.lineCode === lineCode && rule.calcType === calcType && this.matchesRule(rule, context)) ?? null;
  }

  private matchesRule(rule: PricingRule, context: ComputeContext): boolean {
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
    if (rule.vehicleType !== null && context.vehicleType !== rule.vehicleType) {
      return false;
    }
    if (rule.variantTypes && !this.matchesVariantTypes(rule.variantTypes, context.variantType)) {
      return false;
    }
    return true;
  }

  private matchesVariantTypes(value: Prisma.JsonValue, variantType: VariantType): boolean {
    if (!Array.isArray(value)) {
      return false;
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
      orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }],
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
      select: { id: true, blockType: true },
    });
    const nightTrainBlockIds = new Set<string>();
    blocks.forEach((block) => {
      if (block.blockType === 'TRANSFER') {
        nightTrainBlockIds.add(block.id);
      }
    });
    return nightTrainBlockIds;
  }

  private async countLongDistanceSegments(
    prisma: PrismaLike,
    regionIds: string[],
    planStops: PricingPlanStopDto[],
  ): Promise<number> {
    const segmentTransitions: Array<{ fromLocationId: string; toLocationId: string }> = [];
    const overnightStayConnectionIds = new Set<string>();

    for (let index = 1; index < planStops.length; index += 1) {
      const currentStop = planStops[index];
      const blockDayOrder = currentStop?.multiDayBlockDayOrder ?? 0;
      if (blockDayOrder > 1) {
        continue;
      }

      const connectionId = currentStop?.multiDayBlockConnectionId;
      if (connectionId) {
        overnightStayConnectionIds.add(connectionId);
        continue;
      }

      const prevStop = planStops[index - 1];
      const fromLocationId = prevStop?.blockEndLocationId ?? prevStop?.locationId;
      const toLocationId = currentStop?.locationId;

      if (!fromLocationId || !toLocationId) {
        continue;
      }

      segmentTransitions.push({ fromLocationId, toLocationId });
    }

    const uniqueTransitions = Array.from(
      new Map(
        segmentTransitions.map((item) => [`${item.fromLocationId}::${item.toLocationId}`, item] as const),
      ).values(),
    );

    const regionFilter =
      regionIds.length === 1 ? { regionId: regionIds[0]! } : { regionId: { in: regionIds } };

    const [segments, overnightStayConnections] = await Promise.all([
      uniqueTransitions.length > 0
        ? prisma.segment.findMany({
            where: {
              ...regionFilter,
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
        : Promise.resolve([]),
      overnightStayConnectionIds.size > 0
        ? prisma.overnightStayConnection.findMany({
            where: {
              ...regionFilter,
              id: { in: Array.from(overnightStayConnectionIds) },
            },
            select: {
              id: true,
              isLongDistance: true,
            },
          })
        : Promise.resolve([]),
    ]);

    if (segmentTransitions.length === 0 && overnightStayConnections.length === 0) {
      return 0;
    }

    const segmentByKey = new Map<string, boolean>(
      segments.map((segment) => [`${segment.fromLocationId}::${segment.toLocationId}`, segment.isLongDistance]),
    );
    const overnightStayConnectionById = new Map<string, boolean>(
      overnightStayConnections.map((connection) => [connection.id, connection.isLongDistance]),
    );

    const segmentCount = segmentTransitions.reduce((count, transition) => {
      const key = `${transition.fromLocationId}::${transition.toLocationId}`;
      return count + (segmentByKey.get(key) ? 1 : 0);
    }, 0);
    const overnightStayConnectionCount = planStops.reduce((count, stop) => {
      const connectionId = stop.multiDayBlockConnectionId;
      if (!connectionId) {
        return count;
      }
      return count + (overnightStayConnectionById.get(connectionId) ? 1 : 0);
    }, 0);

    return segmentCount + overnightStayConnectionCount;
  }
}
