import type { Prisma, PrismaClient } from '@prisma/client';
import { planCreateSchema, planUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { PlanRepository } from './plan.repository';
import type { PlanCreateDto, PlanUpdateDto } from './plan.types';

function ensureUniqueIndexes(values: number[]): boolean {
  const set = new Set(values);
  return set.size === values.length;
}

export class PlanService {
  constructor(private readonly prisma: PrismaClient) {}

  list() {
    return new PlanRepository(this.prisma).findMany();
  }

  get(id: string) {
    return new PlanRepository(this.prisma).findById(id);
  }

  private async validateRouteConsistency(input: PlanCreateDto | PlanUpdateDto, regionId?: string): Promise<void> {
    if (!input.dayPlans || input.dayPlans.length === 0) {
      return;
    }

    for (let index = 1; index < input.dayPlans.length; index += 1) {
      const previous = input.dayPlans[index - 1];
      const current = input.dayPlans[index];
      if (!previous || !current) {
        continue;
      }
      if (previous.toLocationId !== current.fromLocationId) {
        throw new DomainError('ROUTE_INVALID', 'DayPlan chain is not continuous');
      }
    }

    for (const dayPlan of input.dayPlans) {
      if (!ensureUniqueIndexes(dayPlan.timeBlocks.map((timeBlock) => timeBlock.orderIndex))) {
        throw new DomainError('ORDER_INDEX_CONFLICT', 'Duplicate TimeBlock orderIndex in a day');
      }
      for (const timeBlock of dayPlan.timeBlocks) {
        if (!ensureUniqueIndexes(timeBlock.activities.map((activity) => activity.orderIndex))) {
          throw new DomainError('ORDER_INDEX_CONFLICT', 'Duplicate Activity orderIndex in a time block');
        }
      }

      if (regionId) {
        const segment = await this.prisma.segment.findFirst({
          where: {
            regionId,
            fromLocationId: dayPlan.fromLocationId,
            toLocationId: dayPlan.toLocationId,
          },
        });

        if (!segment) {
          throw new DomainError('ROUTE_INVALID', 'Segment not found for day plan route in selected region');
        }
      }
    }
  }

  async create(input: PlanCreateDto) {
    const parsed = planCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid plan input');
    }

    if (parsed.data.dayPlans.length !== parsed.data.totalDays) {
      throw new DomainError('VALIDATION_FAILED', 'totalDays must match dayPlans length');
    }

    await this.validateRouteConsistency(parsed.data, parsed.data.regionId);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return new PlanRepository(tx).create(parsed.data);
    });
  }

  async update(id: string, input: PlanUpdateDto) {
    const parsed = planUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid plan update input');
    }

    const existing = await new PlanRepository(this.prisma).findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Plan not found');
    }

    if (parsed.data.totalDays && parsed.data.dayPlans && parsed.data.totalDays !== parsed.data.dayPlans.length) {
      throw new DomainError('VALIDATION_FAILED', 'totalDays must match dayPlans length');
    }

    await this.validateRouteConsistency(parsed.data, existing.regionId);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return new PlanRepository(tx).replaceNested(id, parsed.data);
    });
  }

  delete(id: string) {
    return new PlanRepository(this.prisma).delete(id);
  }
}
