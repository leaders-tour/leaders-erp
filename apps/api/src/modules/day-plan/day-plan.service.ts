import type { PrismaClient } from '@prisma/client';
import { dayPlanCreateSchema, dayPlanUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { DayPlanRepository } from './day-plan.repository';
import type { DayPlanCreateDto, DayPlanUpdateDto } from './day-plan.types';

export class DayPlanService {
  private readonly repository: DayPlanRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new DayPlanRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  create(input: DayPlanCreateDto) {
    const parsed = dayPlanCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid day plan input');
    }

    return this.repository.create(parsed.data);
  }

  update(id: string, input: DayPlanUpdateDto) {
    const parsed = dayPlanUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid day plan update input');
    }

    return this.repository.update(id, parsed.data);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
