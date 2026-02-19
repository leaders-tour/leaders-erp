import type { PrismaClient } from '@prisma/client';
import { mealSetCreateSchema, mealSetUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { MealSetRepository } from './meal-set.repository';
import type { MealSetCreateDto, MealSetUpdateDto } from './meal-set.types';

export class MealSetService {
  private readonly repository: MealSetRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new MealSetRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  async create(input: MealSetCreateDto) {
    const parsed = mealSetCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid meal set input');
    }

    const location = await this.prisma.location.findUnique({
      where: { id: parsed.data.locationId },
      select: { name: true },
    });
    if (!location) {
      throw new DomainError('VALIDATION_FAILED', 'Location not found for meal set');
    }

    return this.repository.create({
      ...parsed.data,
      locationNameSnapshot: location.name,
    });
  }

  async update(id: string, input: MealSetUpdateDto) {
    const parsed = mealSetUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid meal set update input');
    }

    if (!parsed.data.locationId) {
      return this.repository.update(id, parsed.data);
    }

    const location = await this.prisma.location.findUnique({
      where: { id: parsed.data.locationId },
      select: { name: true },
    });
    if (!location) {
      throw new DomainError('VALIDATION_FAILED', 'Location not found for meal set');
    }

    return this.repository.update(id, {
      ...parsed.data,
      locationNameSnapshot: location.name,
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
