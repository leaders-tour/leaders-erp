import type { Prisma, PrismaClient } from '@prisma/client';
import { planCreateSchema, planUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { PlanRepository } from './plan.repository';
import type { PlanCreateDto, PlanUpdateDto } from './plan.types';

export class PlanService {
  constructor(private readonly prisma: PrismaClient) {}

  list() {
    return new PlanRepository(this.prisma).findMany();
  }

  get(id: string) {
    return new PlanRepository(this.prisma).findById(id);
  }

  async create(input: PlanCreateDto) {
    const parsed = planCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid plan input');
    }

    if (parsed.data.planStops.length !== parsed.data.totalDays) {
      throw new DomainError('VALIDATION_FAILED', 'totalDays must match planStops length');
    }

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

    if (parsed.data.totalDays && parsed.data.planStops && parsed.data.totalDays !== parsed.data.planStops.length) {
      throw new DomainError('VALIDATION_FAILED', 'totalDays must match planStops length');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return new PlanRepository(tx).replaceNested(id, parsed.data);
    });
  }

  delete(id: string) {
    return new PlanRepository(this.prisma).delete(id);
  }
}
