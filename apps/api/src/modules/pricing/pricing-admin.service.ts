import type { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  pricingPolicyCreateSchema,
  pricingPolicyDuplicateSchema,
  pricingPolicyUpdateSchema,
  pricingRuleCreateSchema,
  pricingRuleUpdateSchema,
} from '@tour/validation';
import { createValidationError, DomainError } from '../../lib/errors';
import type {
  PricingPolicyCreateDto,
  PricingPolicyDuplicateDto,
  PricingPolicyUpdateDto,
  PricingRuleCreateDto,
  PricingRuleUpdateDto,
} from './pricing-admin.types';

const pricingPolicyInclude = {
  rules: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
} satisfies Prisma.PricingPolicyInclude;

type PricingRuleTypeValue = 'BASE' | 'PERCENT_UPLIFT' | 'CONDITIONAL_ADDON' | 'LONG_DISTANCE' | 'AUTO_EXCEPTION' | 'MANUAL';
type PricingPriceItemPresetValue =
  | 'BASE'
  | 'BASE_PERCENT'
  | 'LONG_DISTANCE'
  | 'NIGHT_TRAIN'
  | 'EXTRA_LODGING'
  | 'LODGING_SELECTION'
  | 'PICKUP_DROP'
  | 'CONDITIONAL'
  | 'MANUAL_PRESET';

type PricingRuleAdminRecord = {
  id: string;
  priceItemPreset: PricingPriceItemPresetValue;
  ruleType: PricingRuleTypeValue | null;
  title: string | null;
  lineCode: string;
  calcType: string;
  targetLineCode: string | null;
  amountKrw: number | null;
  percentBps: number | null;
  quantitySource: string;
  lodgingSelectionLevel: 'LV1' | 'LV2' | 'LV4' | null;
  headcountMin: number | null;
  headcountMax: number | null;
  dayMin: number | null;
  dayMax: number | null;
  travelDateFrom: Date | null;
  travelDateTo: Date | null;
  vehicleType: string | null;
  variantTypes: Prisma.JsonValue;
  flightInTimeBand: string | null;
  flightOutTimeBand: string | null;
  pickupPlaceType: string | null;
  dropPlaceType: string | null;
  externalTransferMode: string | null;
  externalTransferMinCount: number | null;
  externalTransferPresetCodes: Prisma.JsonValue;
  nightTrainRequired: boolean | null;
  nightTrainMinCount: number | null;
  longDistanceMinCount: number | null;
  chargeScope: string | null;
  personMode: string | null;
  customDisplayText: string | null;
  isEnabled: boolean;
  sortOrder: number;
};

function resolvePriceItemPresetConfig(input: {
  priceItemPreset: PricingPriceItemPresetValue;
  quantitySource?: string | null;
  lodgingSelectionLevel?: 'LV1' | 'LV2' | 'LV4' | null;
}) {
  switch (input.priceItemPreset) {
    case 'BASE':
      return {
        ruleType: 'BASE' as const,
        lineCode: 'BASE' as const,
        calcType: 'AMOUNT' as const,
        targetLineCode: null,
        quantitySource: input.quantitySource ?? 'ONE',
      };
    case 'BASE_PERCENT':
      return {
        ruleType: 'PERCENT_UPLIFT' as const,
        lineCode: 'BASE_PERCENT' as const,
        calcType: 'PERCENT_OF_LINE' as const,
        targetLineCode: 'BASE' as const,
        quantitySource: 'ONE' as const,
      };
    case 'LONG_DISTANCE':
      return {
        ruleType: 'LONG_DISTANCE' as const,
        lineCode: 'LONG_DISTANCE' as const,
        calcType: 'AMOUNT' as const,
        targetLineCode: null,
        quantitySource: 'LONG_DISTANCE_SEGMENT_COUNT' as const,
      };
    case 'NIGHT_TRAIN':
      return {
        ruleType: 'CONDITIONAL_ADDON' as const,
        lineCode: 'NIGHT_TRAIN' as const,
        calcType: 'AMOUNT' as const,
        targetLineCode: null,
        quantitySource: 'NIGHT_TRAIN_BLOCK_COUNT' as const,
      };
    case 'EXTRA_LODGING':
      return {
        ruleType: 'CONDITIONAL_ADDON' as const,
        lineCode: 'EXTRA_LODGING' as const,
        calcType: 'AMOUNT' as const,
        targetLineCode: null,
        quantitySource: 'SUM_EXTRA_LODGING_COUNTS' as const,
      };
    case 'LODGING_SELECTION':
      return {
        ruleType: 'CONDITIONAL_ADDON' as const,
        lineCode: 'LODGING_SELECTION' as const,
        calcType: 'AMOUNT' as const,
        targetLineCode: null,
        quantitySource: input.lodgingSelectionLevel ? ('ONE' as const) : input.quantitySource ?? 'ONE',
      };
    case 'PICKUP_DROP':
      return {
        ruleType: 'CONDITIONAL_ADDON' as const,
        lineCode: 'PICKUP_DROP' as const,
        calcType: 'AMOUNT' as const,
        targetLineCode: null,
        quantitySource: input.quantitySource ?? 'ONE',
      };
    case 'MANUAL_PRESET':
      return {
        ruleType: 'MANUAL' as const,
        lineCode: 'MANUAL_ADJUSTMENT' as const,
        calcType: 'AMOUNT' as const,
        targetLineCode: null,
        quantitySource: 'ONE' as const,
      };
    case 'CONDITIONAL':
    default:
      return {
        ruleType: 'CONDITIONAL_ADDON' as const,
        lineCode: 'CONDITIONAL' as const,
        calcType: 'AMOUNT' as const,
        targetLineCode: null,
        quantitySource: input.quantitySource ?? 'ONE',
      };
  }
}

function isAutoDisplayPreset(priceItemPreset: PricingPriceItemPresetValue): boolean {
  return (
    priceItemPreset === 'BASE' ||
    priceItemPreset === 'BASE_PERCENT' ||
    priceItemPreset === 'LONG_DISTANCE' ||
    priceItemPreset === 'NIGHT_TRAIN' ||
    priceItemPreset === 'EXTRA_LODGING'
  );
}

/** DB 유일 제약용. 운영 식별은 GraphQL id·name 을 사용합니다. */
function generatedPricingPolicyCode(): string {
  return `pol_${randomUUID().replace(/-/g, '')}`;
}

export class PricingAdminService {
  constructor(private readonly prisma: PrismaClient) {}

  listPolicies() {
    return this.prisma.pricingPolicy.findMany({
      include: pricingPolicyInclude,
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });
  }

  getPolicy(id: string) {
    return this.prisma.pricingPolicy.findUnique({
      where: { id },
      include: pricingPolicyInclude,
    });
  }

  async createPolicy(input: PricingPolicyCreateDto) {
    const parsed = pricingPolicyCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid pricing policy input', parsed.error);
    }
    return this.prisma.pricingPolicy.create({
      data: {
        code: generatedPricingPolicyCode(),
        name: parsed.data.name.trim(),
        status: parsed.data.status,
        effectiveFrom: new Date(parsed.data.effectiveFrom),
        effectiveTo: parsed.data.effectiveTo ? new Date(parsed.data.effectiveTo) : null,
      },
      include: pricingPolicyInclude,
    });
  }

  async updatePolicy(id: string, input: PricingPolicyUpdateDto) {
    const parsed = pricingPolicyUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid pricing policy update input', parsed.error);
    }
    const existing = await this.getPolicy(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Pricing policy not found');
    }
    return this.prisma.pricingPolicy.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.effectiveFrom !== undefined ? { effectiveFrom: new Date(parsed.data.effectiveFrom) } : {}),
        ...(parsed.data.effectiveTo !== undefined
          ? { effectiveTo: parsed.data.effectiveTo ? new Date(parsed.data.effectiveTo) : null }
          : {}),
      },
      include: pricingPolicyInclude,
    });
  }

  async deletePolicy(id: string) {
    const existing = await this.getPolicy(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Pricing policy not found');
    }
    const linkedSnapshotCount = await this.prisma.planVersionPricing.count({
      where: { policyId: id },
    });
    if (linkedSnapshotCount > 0) {
      throw new DomainError('VALIDATION_FAILED', '이미 사용된 가격 정책은 삭제할 수 없습니다.');
    }
    await this.prisma.pricingPolicy.delete({ where: { id } });
    return true;
  }

  async duplicatePolicy(id: string, input: PricingPolicyDuplicateDto) {
    const parsed = pricingPolicyDuplicateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid pricing policy duplicate input', parsed.error);
    }
    const source = await this.getPolicy(id);
    if (!source) {
      throw new DomainError('NOT_FOUND', 'Pricing policy not found');
    }
    const sourceRules = (source.rules ?? []) as unknown as PricingRuleAdminRecord[];
    return this.prisma.pricingPolicy.create({
      data: {
        code: generatedPricingPolicyCode(),
        name: parsed.data.name.trim(),
        status: parsed.data.status ?? source.status,
        effectiveFrom: parsed.data.effectiveFrom ? new Date(parsed.data.effectiveFrom) : source.effectiveFrom,
        effectiveTo:
          parsed.data.effectiveTo !== undefined
            ? parsed.data.effectiveTo
              ? new Date(parsed.data.effectiveTo)
              : null
            : source.effectiveTo,
        rules: {
          create: sourceRules.map((rule) => ({
            priceItemPreset: rule.priceItemPreset,
            ruleType: rule.ruleType,
            title: rule.title,
            lineCode: rule.lineCode,
            calcType: rule.calcType,
            targetLineCode: rule.targetLineCode,
            amountKrw: rule.amountKrw,
            percentBps: rule.percentBps,
            quantitySource: rule.quantitySource,
            lodgingSelectionLevel: rule.lodgingSelectionLevel,
            headcountMin: rule.headcountMin,
            headcountMax: rule.headcountMax,
            dayMin: rule.dayMin,
            dayMax: rule.dayMax,
            travelDateFrom: rule.travelDateFrom,
            travelDateTo: rule.travelDateTo,
            vehicleType: rule.vehicleType,
            variantTypes: rule.variantTypes as Prisma.InputJsonValue | undefined,
            flightInTimeBand: rule.flightInTimeBand,
            flightOutTimeBand: rule.flightOutTimeBand,
            pickupPlaceType: rule.pickupPlaceType,
            dropPlaceType: rule.dropPlaceType,
            externalTransferMode: rule.externalTransferMode,
            externalTransferMinCount: rule.externalTransferMinCount,
            externalTransferPresetCodes: rule.externalTransferPresetCodes as Prisma.InputJsonValue | undefined,
            nightTrainRequired: rule.nightTrainRequired,
            nightTrainMinCount: rule.nightTrainMinCount,
            longDistanceMinCount: rule.longDistanceMinCount,
            chargeScope: rule.chargeScope,
            personMode: rule.personMode,
            customDisplayText: rule.customDisplayText,
            isEnabled: rule.isEnabled,
            sortOrder: rule.sortOrder,
          })) as never,
        },
      },
      include: pricingPolicyInclude,
    });
  }

  async createRule(input: PricingRuleCreateDto) {
    const parsed = pricingRuleCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid pricing rule input', parsed.error);
    }
    const policy = await this.prisma.pricingPolicy.findUnique({
      where: { id: parsed.data.policyId },
      select: { id: true },
    });
    if (!policy) {
      throw new DomainError('NOT_FOUND', 'Pricing policy not found');
    }
    const priceItemConfig = resolvePriceItemPresetConfig({
      priceItemPreset: parsed.data.priceItemPreset,
      quantitySource: parsed.data.quantitySource,
      lodgingSelectionLevel: parsed.data.lodgingSelectionLevel ?? null,
    });
    const lodgingSelectionLevel =
      parsed.data.priceItemPreset === 'LODGING_SELECTION' ? parsed.data.lodgingSelectionLevel ?? null : null;
    const autoDisplayPreset = isAutoDisplayPreset(parsed.data.priceItemPreset);
    const data = {
      policyId: parsed.data.policyId,
      priceItemPreset: parsed.data.priceItemPreset,
      ruleType: priceItemConfig.ruleType,
      title: parsed.data.title.trim(),
      lineCode: priceItemConfig.lineCode,
      calcType: priceItemConfig.calcType,
      targetLineCode: priceItemConfig.targetLineCode,
      amountKrw: parsed.data.amountKrw ?? null,
      percentBps: parsed.data.percentBps ?? null,
      quantitySource: priceItemConfig.quantitySource,
      lodgingSelectionLevel,
      headcountMin: parsed.data.priceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.headcountMin ?? null,
      headcountMax: parsed.data.priceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.headcountMax ?? null,
      dayMin: parsed.data.priceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.dayMin ?? null,
      dayMax: parsed.data.priceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.dayMax ?? null,
      travelDateFrom:
        parsed.data.priceItemPreset === 'MANUAL_PRESET'
          ? null
          : parsed.data.travelDateFrom
            ? new Date(parsed.data.travelDateFrom)
            : null,
      travelDateTo:
        parsed.data.priceItemPreset === 'MANUAL_PRESET'
          ? null
          : parsed.data.travelDateTo
            ? new Date(parsed.data.travelDateTo)
            : null,
      vehicleType: parsed.data.priceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.vehicleType?.trim() || null,
      variantTypes:
        parsed.data.priceItemPreset === 'MANUAL_PRESET'
          ? ([] as Prisma.InputJsonValue)
          : (parsed.data.variantTypes as Prisma.InputJsonValue),
      flightInTimeBand: parsed.data.priceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.flightInTimeBand ?? null,
      flightOutTimeBand: parsed.data.priceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.flightOutTimeBand ?? null,
      pickupPlaceType: parsed.data.priceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.pickupPlaceType ?? null,
      dropPlaceType: parsed.data.priceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.dropPlaceType ?? null,
      externalTransferMode:
        parsed.data.priceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.externalTransferMode ?? null,
      externalTransferMinCount:
        parsed.data.priceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.externalTransferMinCount ?? null,
      externalTransferPresetCodes:
        parsed.data.priceItemPreset === 'MANUAL_PRESET'
          ? ([] as Prisma.InputJsonValue)
          : (parsed.data.externalTransferPresetCodes as Prisma.InputJsonValue),
      nightTrainRequired: null,
      nightTrainMinCount: null,
      longDistanceMinCount: null,
      chargeScope:
        parsed.data.priceItemPreset === 'LODGING_SELECTION'
          ? 'PER_PERSON'
          : autoDisplayPreset
            ? null
            : parsed.data.chargeScope ?? null,
      personMode:
        parsed.data.priceItemPreset === 'LODGING_SELECTION'
          ? 'PER_NIGHT'
          : autoDisplayPreset
            ? null
            : parsed.data.personMode ?? null,
      customDisplayText: autoDisplayPreset || parsed.data.priceItemPreset === 'LODGING_SELECTION'
        ? null
        : parsed.data.customDisplayText?.trim() || null,
      isEnabled: parsed.data.isEnabled,
      sortOrder: parsed.data.sortOrder,
    };
    return this.prisma.pricingRule.create({ data: data as never });
  }

  async updateRule(id: string, input: PricingRuleUpdateDto) {
    const parsed = pricingRuleUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid pricing rule update input', parsed.error);
    }
    const existing = (await this.prisma.pricingRule.findUnique({
      where: { id },
      select: {
        id: true,
        priceItemPreset: true,
        ruleType: true,
        percentBps: true,
        quantitySource: true,
        lodgingSelectionLevel: true,
        headcountMin: true,
        headcountMax: true,
        dayMin: true,
        dayMax: true,
        travelDateFrom: true,
        travelDateTo: true,
        vehicleType: true,
        variantTypes: true,
        flightInTimeBand: true,
        flightOutTimeBand: true,
        pickupPlaceType: true,
        dropPlaceType: true,
        externalTransferMode: true,
        externalTransferMinCount: true,
        externalTransferPresetCodes: true,
        chargeScope: true,
        personMode: true,
        customDisplayText: true,
      } as never,
    })) as {
      id: string;
      priceItemPreset: PricingPriceItemPresetValue;
      ruleType: PricingRuleTypeValue | null;
      percentBps: number | null;
      quantitySource: string | null;
      lodgingSelectionLevel: 'LV1' | 'LV2' | 'LV4' | null;
      headcountMin: number | null;
      headcountMax: number | null;
      dayMin: number | null;
      dayMax: number | null;
      travelDateFrom: Date | null;
      travelDateTo: Date | null;
      vehicleType: string | null;
      variantTypes: Prisma.JsonValue;
      flightInTimeBand: string | null;
      flightOutTimeBand: string | null;
      pickupPlaceType: string | null;
      dropPlaceType: string | null;
      externalTransferMode: string | null;
      externalTransferMinCount: number | null;
      externalTransferPresetCodes: Prisma.JsonValue;
      chargeScope: string | null;
      personMode: string | null;
      customDisplayText: string | null;
    } | null;
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Pricing rule not found');
    }
    const nextPriceItemPreset = parsed.data.priceItemPreset ?? existing.priceItemPreset;
    const nextLodgingSelectionLevel =
      nextPriceItemPreset === 'LODGING_SELECTION'
        ? parsed.data.lodgingSelectionLevel !== undefined
          ? parsed.data.lodgingSelectionLevel ?? null
          : existing.lodgingSelectionLevel
        : null;
    const priceItemConfig = resolvePriceItemPresetConfig({
      priceItemPreset: nextPriceItemPreset,
      quantitySource: parsed.data.quantitySource ?? existing.quantitySource ?? undefined,
      lodgingSelectionLevel: nextLodgingSelectionLevel,
    });
    const autoDisplayPreset = isAutoDisplayPreset(nextPriceItemPreset);
    const data = {
        ...(parsed.data.priceItemPreset !== undefined ? { priceItemPreset: parsed.data.priceItemPreset } : {}),
        ...((parsed.data.ruleType !== undefined ||
          parsed.data.priceItemPreset !== undefined ||
          parsed.data.quantitySource !== undefined ||
          parsed.data.lodgingSelectionLevel !== undefined)
          ? {
              ruleType: priceItemConfig.ruleType,
              lineCode: priceItemConfig.lineCode,
              calcType: priceItemConfig.calcType,
              targetLineCode: priceItemConfig.targetLineCode,
              quantitySource: priceItemConfig.quantitySource,
            }
          : {}),
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.amountKrw !== undefined ? { amountKrw: parsed.data.amountKrw ?? null } : {}),
        ...(parsed.data.percentBps !== undefined ? { percentBps: parsed.data.percentBps ?? null } : {}),
        ...((parsed.data.lodgingSelectionLevel !== undefined ||
          parsed.data.ruleType !== undefined ||
          parsed.data.priceItemPreset !== undefined)
          ? { lodgingSelectionLevel: nextLodgingSelectionLevel ?? null }
          : {}),
        ...(parsed.data.headcountMin !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              headcountMin:
                nextPriceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.headcountMin ?? existing.headcountMin,
            }
          : {}),
        ...(parsed.data.headcountMax !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              headcountMax:
                nextPriceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.headcountMax ?? existing.headcountMax,
            }
          : {}),
        ...(parsed.data.dayMin !== undefined || parsed.data.priceItemPreset !== undefined
          ? { dayMin: nextPriceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.dayMin ?? existing.dayMin }
          : {}),
        ...(parsed.data.dayMax !== undefined || parsed.data.priceItemPreset !== undefined
          ? { dayMax: nextPriceItemPreset === 'MANUAL_PRESET' ? null : parsed.data.dayMax ?? existing.dayMax }
          : {}),
        ...(parsed.data.travelDateFrom !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              travelDateFrom:
                nextPriceItemPreset === 'MANUAL_PRESET'
                  ? null
                  : parsed.data.travelDateFrom !== undefined
                    ? parsed.data.travelDateFrom
                      ? new Date(parsed.data.travelDateFrom)
                      : null
                    : existing.travelDateFrom,
            }
          : {}),
        ...(parsed.data.travelDateTo !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              travelDateTo:
                nextPriceItemPreset === 'MANUAL_PRESET'
                  ? null
                  : parsed.data.travelDateTo !== undefined
                    ? parsed.data.travelDateTo
                      ? new Date(parsed.data.travelDateTo)
                      : null
                    : existing.travelDateTo,
            }
          : {}),
        ...(parsed.data.vehicleType !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              vehicleType:
                nextPriceItemPreset === 'MANUAL_PRESET'
                  ? null
                  : parsed.data.vehicleType !== undefined
                    ? parsed.data.vehicleType?.trim() || null
                    : existing.vehicleType,
            }
          : {}),
        ...(parsed.data.variantTypes !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              variantTypes:
                nextPriceItemPreset === 'MANUAL_PRESET'
                  ? ([] as Prisma.InputJsonValue)
                  : ((parsed.data.variantTypes ?? existing.variantTypes) as Prisma.InputJsonValue),
            }
          : {}),
        ...(parsed.data.flightInTimeBand !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              flightInTimeBand:
                nextPriceItemPreset === 'MANUAL_PRESET'
                  ? null
                  : parsed.data.flightInTimeBand ?? existing.flightInTimeBand,
            }
          : {}),
        ...(parsed.data.flightOutTimeBand !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              flightOutTimeBand:
                nextPriceItemPreset === 'MANUAL_PRESET'
                  ? null
                  : parsed.data.flightOutTimeBand ?? existing.flightOutTimeBand,
            }
          : {}),
        ...(parsed.data.pickupPlaceType !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              pickupPlaceType:
                nextPriceItemPreset === 'MANUAL_PRESET'
                  ? null
                  : parsed.data.pickupPlaceType ?? existing.pickupPlaceType,
            }
          : {}),
        ...(parsed.data.dropPlaceType !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              dropPlaceType:
                nextPriceItemPreset === 'MANUAL_PRESET'
                  ? null
                  : parsed.data.dropPlaceType ?? existing.dropPlaceType,
            }
          : {}),
        ...(parsed.data.externalTransferMode !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              externalTransferMode:
                nextPriceItemPreset === 'MANUAL_PRESET'
                  ? null
                  : parsed.data.externalTransferMode ?? existing.externalTransferMode,
            }
          : {}),
        ...(parsed.data.externalTransferMinCount !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              externalTransferMinCount:
                nextPriceItemPreset === 'MANUAL_PRESET'
                  ? null
                  : parsed.data.externalTransferMinCount ?? existing.externalTransferMinCount,
            }
          : {}),
        ...(parsed.data.externalTransferPresetCodes !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              externalTransferPresetCodes:
                nextPriceItemPreset === 'MANUAL_PRESET'
                  ? ([] as Prisma.InputJsonValue)
                  : ((parsed.data.externalTransferPresetCodes ?? existing.externalTransferPresetCodes) as Prisma.InputJsonValue),
            }
          : {}),
        nightTrainRequired: null,
        nightTrainMinCount: null,
        longDistanceMinCount: null,
        ...((parsed.data.chargeScope !== undefined ||
          parsed.data.lodgingSelectionLevel !== undefined ||
          parsed.data.ruleType !== undefined ||
          parsed.data.priceItemPreset !== undefined)
          ? {
              chargeScope:
                nextPriceItemPreset === 'LODGING_SELECTION'
                  ? 'PER_PERSON'
                  : autoDisplayPreset
                    ? null
                    : parsed.data.chargeScope ?? existing.chargeScope,
            }
          : {}),
        ...((parsed.data.personMode !== undefined ||
          parsed.data.lodgingSelectionLevel !== undefined ||
          parsed.data.ruleType !== undefined ||
          parsed.data.priceItemPreset !== undefined)
          ? {
              personMode:
                nextPriceItemPreset === 'LODGING_SELECTION'
                  ? 'PER_NIGHT'
                  : autoDisplayPreset
                    ? null
                    : parsed.data.personMode ?? existing.personMode,
            }
          : {}),
        ...(parsed.data.customDisplayText !== undefined || parsed.data.priceItemPreset !== undefined
          ? {
              customDisplayText:
                autoDisplayPreset || nextPriceItemPreset === 'LODGING_SELECTION'
                  ? null
                  : parsed.data.customDisplayText !== undefined
                    ? parsed.data.customDisplayText?.trim() || null
                    : existing.customDisplayText,
            }
          : {}),
        ...(parsed.data.isEnabled !== undefined ? { isEnabled: parsed.data.isEnabled } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      };
    return this.prisma.pricingRule.update({ where: { id }, data: data as never });
  }

  async deleteRule(id: string) {
    const existing = await this.prisma.pricingRule.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Pricing rule not found');
    }
    await this.prisma.pricingRule.delete({ where: { id } });
    return true;
  }
}
