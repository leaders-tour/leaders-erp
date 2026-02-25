import type {
  PricingCalcType,
  PricingLineCode,
  PricingPolicy,
  PricingQuantitySource,
  PricingRule,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import type { VariantType } from '@tour/domain';
import type { PlanPricingPreviewInput } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import type { PricingComputationResult, PricingComputeInput, PricingComputedLine, PricingPlanStopDto } from './pricing.types';

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

export class PricingService {
  constructor(private readonly prisma: PrismaClient) {}

  preview(input: PlanPricingPreviewInput): Promise<PricingComputationResult> {
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
    const travelStartDate = new Date(input.travelStartDate);
    if (Number.isNaN(travelStartDate.getTime())) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid travelStartDate for pricing');
    }

    const [policy, longDistanceSegmentCount] = await Promise.all([
      this.loadActivePolicy(prisma, travelStartDate),
      this.countLongDistanceSegments(prisma, input.regionId, input.planStops),
    ]);

    if (!policy) {
      throw new DomainError('VALIDATION_FAILED', 'No active pricing policy found for travelStartDate');
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

    if (this.shouldApplyEarlyNight(input.variantType)) {
      lines.push(this.buildTripFlatLine(rules, 'EARLY_NIGHT', context));
    }

    if (this.shouldApplyEarlyMorning(input.variantType)) {
      lines.push(this.buildTripFlatLine(rules, 'EARLY_MORNING', context));
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

    const baseAmountKrw = baseRawAmount + baseUpliftAmount;
    const totalAmountKrw = lines.reduce((sum, line) => sum + line.amountKrw, 0);
    const addonAmountKrw = totalAmountKrw - baseAmountKrw;
    const { depositAmountKrw, balanceAmountKrw } = this.computeDepositAndBalance(totalAmountKrw);

    return {
      policyId: policy.id,
      currencyCode: 'KRW',
      baseAmountKrw,
      addonAmountKrw,
      totalAmountKrw,
      depositAmountKrw,
      balanceAmountKrw,
      longDistanceSegmentCount,
      extraLodgingCount,
      lines,
      inputSnapshot: {
        regionId: input.regionId,
        variantType: input.variantType,
        totalDays: input.totalDays,
        headcountTotal: input.headcountTotal,
        vehicleType: input.vehicleType,
        travelStartDate: input.travelStartDate,
        longDistanceSegmentCount,
        extraLodgingCount,
        extraLodgings: input.extraLodgings,
        manualAdjustments: input.manualAdjustments,
      },
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

  private shouldApplyEarlyNight(variantType: VariantType): boolean {
    return variantType === 'earlyNight' || variantType === 'earlyNightExtend';
  }

  private shouldApplyEarlyMorning(variantType: VariantType): boolean {
    return variantType === 'earlyMorning' || variantType === 'earlyMorningExtend';
  }

  private shouldApplyExtend(variantType: VariantType): boolean {
    return variantType === 'extend' || variantType === 'earlyNightExtend' || variantType === 'earlyMorningExtend';
  }

  private computeDepositAndBalance(totalAmountKrw: number): { depositAmountKrw: number; balanceAmountKrw: number } {
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

  private async countLongDistanceSegments(
    prisma: PrismaLike,
    regionId: string,
    planStops: PricingPlanStopDto[],
  ): Promise<number> {
    const transitions: Array<{ fromLocationId: string; toLocationId: string }> = [];

    for (let index = 1; index < planStops.length; index += 1) {
      const fromLocationId = planStops[index - 1]?.locationId;
      const toLocationId = planStops[index]?.locationId;

      if (!fromLocationId || !toLocationId) {
        continue;
      }

      transitions.push({ fromLocationId, toLocationId });
    }

    if (transitions.length === 0) {
      return 0;
    }

    const uniqueTransitions = Array.from(
      new Map(
        transitions.map((item) => [`${item.fromLocationId}::${item.toLocationId}`, item] as const),
      ).values(),
    );

    const segments = await prisma.segment.findMany({
      where: {
        regionId,
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
    });

    const segmentByKey = new Map<string, boolean>(
      segments.map((segment) => [`${segment.fromLocationId}::${segment.toLocationId}`, segment.isLongDistance]),
    );

    return transitions.reduce((count, transition) => {
      const key = `${transition.fromLocationId}::${transition.toLocationId}`;
      return count + (segmentByKey.get(key) ? 1 : 0);
    }, 0);
  }
}
