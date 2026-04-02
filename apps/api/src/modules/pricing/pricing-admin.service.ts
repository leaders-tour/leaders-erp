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

type PricingRuleTypeValue = 'BASE' | 'PERCENT_UPLIFT' | 'CONDITIONAL_ADDON' | 'AUTO_EXCEPTION' | 'MANUAL';

type PricingRuleAdminRecord = {
  id: string;
  ruleType: PricingRuleTypeValue | null;
  title: string | null;
  lineCode: string;
  calcType: string;
  targetLineCode: string | null;
  amountKrw: number | null;
  percentBps: number | null;
  quantitySource: string;
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
  displayLabelOverride: string | null;
  chargeScope: string | null;
  personMode: string | null;
  customDisplayText: string | null;
  isEnabled: boolean;
  sortOrder: number;
};

function resolveLegacyLineCode(input: {
  ruleType: PricingRuleTypeValue;
  percentBps?: number | null;
}): Prisma.PricingRuleCreateInput['lineCode'] {
  if (input.ruleType === 'BASE') {
    return 'BASE';
  }
  if (input.ruleType === 'PERCENT_UPLIFT') {
    if (input.percentBps === 500) {
      return 'BASE_UPLIFT_5PLUS_5PCT';
    }
    if (input.percentBps === 1000) {
      return 'BASE_UPLIFT_5PLUS_10PCT';
    }
    return 'MANUAL_ADJUSTMENT';
  }
  return 'MANUAL_ADJUSTMENT';
}

function resolveLegacyCalcType(ruleType: PricingRuleTypeValue) {
  return ruleType === 'PERCENT_UPLIFT' ? 'PERCENT_OF_LINE' : 'AMOUNT';
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
            ruleType: rule.ruleType,
            title: rule.title,
            lineCode: rule.lineCode,
            calcType: rule.calcType,
            targetLineCode: rule.targetLineCode,
            amountKrw: rule.amountKrw,
            percentBps: rule.percentBps,
            quantitySource: rule.quantitySource,
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
            displayLabelOverride: rule.displayLabelOverride,
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
    const data = {
        policyId: parsed.data.policyId,
        ruleType: parsed.data.ruleType,
        title: parsed.data.title.trim(),
        lineCode: resolveLegacyLineCode(parsed.data),
        calcType: resolveLegacyCalcType(parsed.data.ruleType),
        targetLineCode: parsed.data.ruleType === 'PERCENT_UPLIFT' ? 'BASE' : null,
        amountKrw: parsed.data.amountKrw ?? null,
        percentBps: parsed.data.percentBps ?? null,
        quantitySource: parsed.data.quantitySource,
        headcountMin: parsed.data.headcountMin ?? null,
        headcountMax: parsed.data.headcountMax ?? null,
        dayMin: parsed.data.dayMin ?? null,
        dayMax: parsed.data.dayMax ?? null,
        travelDateFrom: parsed.data.travelDateFrom ? new Date(parsed.data.travelDateFrom) : null,
        travelDateTo: parsed.data.travelDateTo ? new Date(parsed.data.travelDateTo) : null,
        vehicleType: parsed.data.vehicleType?.trim() || null,
        variantTypes: parsed.data.variantTypes as Prisma.InputJsonValue,
        flightInTimeBand: parsed.data.flightInTimeBand ?? null,
        flightOutTimeBand: parsed.data.flightOutTimeBand ?? null,
        pickupPlaceType: parsed.data.pickupPlaceType ?? null,
        dropPlaceType: parsed.data.dropPlaceType ?? null,
        externalTransferMode: parsed.data.externalTransferMode ?? null,
        externalTransferMinCount: parsed.data.externalTransferMinCount ?? null,
        displayLabelOverride: parsed.data.displayLabelOverride?.trim() || null,
        chargeScope: parsed.data.chargeScope ?? null,
        personMode: parsed.data.personMode ?? null,
        customDisplayText: parsed.data.customDisplayText?.trim() || null,
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
      select: { id: true, ruleType: true, percentBps: true } as never,
    })) as { id: string; ruleType: PricingRuleTypeValue | null; percentBps: number | null } | null;
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Pricing rule not found');
    }
    const nextRuleType = (parsed.data.ruleType ?? existing.ruleType) as
      | 'BASE'
      | 'PERCENT_UPLIFT'
      | 'CONDITIONAL_ADDON'
      | 'AUTO_EXCEPTION'
      | 'MANUAL';
    const nextPercentBps = parsed.data.percentBps ?? existing.percentBps ?? undefined;
    const data = {
        ...(parsed.data.ruleType !== undefined ? { ruleType: parsed.data.ruleType } : {}),
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...((parsed.data.ruleType !== undefined || parsed.data.percentBps !== undefined)
          ? {
              lineCode: resolveLegacyLineCode({ ruleType: nextRuleType, percentBps: nextPercentBps }),
              calcType: resolveLegacyCalcType(nextRuleType),
              targetLineCode: nextRuleType === 'PERCENT_UPLIFT' ? 'BASE' : null,
            }
          : {}),
        ...(parsed.data.amountKrw !== undefined ? { amountKrw: parsed.data.amountKrw ?? null } : {}),
        ...(parsed.data.percentBps !== undefined ? { percentBps: parsed.data.percentBps ?? null } : {}),
        ...(parsed.data.quantitySource !== undefined ? { quantitySource: parsed.data.quantitySource } : {}),
        ...(parsed.data.headcountMin !== undefined ? { headcountMin: parsed.data.headcountMin ?? null } : {}),
        ...(parsed.data.headcountMax !== undefined ? { headcountMax: parsed.data.headcountMax ?? null } : {}),
        ...(parsed.data.dayMin !== undefined ? { dayMin: parsed.data.dayMin ?? null } : {}),
        ...(parsed.data.dayMax !== undefined ? { dayMax: parsed.data.dayMax ?? null } : {}),
        ...(parsed.data.travelDateFrom !== undefined
          ? { travelDateFrom: parsed.data.travelDateFrom ? new Date(parsed.data.travelDateFrom) : null }
          : {}),
        ...(parsed.data.travelDateTo !== undefined
          ? { travelDateTo: parsed.data.travelDateTo ? new Date(parsed.data.travelDateTo) : null }
          : {}),
        ...(parsed.data.vehicleType !== undefined ? { vehicleType: parsed.data.vehicleType?.trim() || null } : {}),
        ...(parsed.data.variantTypes !== undefined
          ? { variantTypes: parsed.data.variantTypes as Prisma.InputJsonValue }
          : {}),
        ...(parsed.data.flightInTimeBand !== undefined ? { flightInTimeBand: parsed.data.flightInTimeBand ?? null } : {}),
        ...(parsed.data.flightOutTimeBand !== undefined ? { flightOutTimeBand: parsed.data.flightOutTimeBand ?? null } : {}),
        ...(parsed.data.pickupPlaceType !== undefined ? { pickupPlaceType: parsed.data.pickupPlaceType ?? null } : {}),
        ...(parsed.data.dropPlaceType !== undefined ? { dropPlaceType: parsed.data.dropPlaceType ?? null } : {}),
        ...(parsed.data.externalTransferMode !== undefined
          ? { externalTransferMode: parsed.data.externalTransferMode ?? null }
          : {}),
        ...(parsed.data.externalTransferMinCount !== undefined
          ? { externalTransferMinCount: parsed.data.externalTransferMinCount ?? null }
          : {}),
        ...(parsed.data.displayLabelOverride !== undefined
          ? { displayLabelOverride: parsed.data.displayLabelOverride?.trim() || null }
          : {}),
        ...(parsed.data.chargeScope !== undefined ? { chargeScope: parsed.data.chargeScope ?? null } : {}),
        ...(parsed.data.personMode !== undefined ? { personMode: parsed.data.personMode ?? null } : {}),
        ...(parsed.data.customDisplayText !== undefined
          ? { customDisplayText: parsed.data.customDisplayText?.trim() || null }
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
