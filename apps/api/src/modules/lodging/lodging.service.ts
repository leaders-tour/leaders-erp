import type { PrismaClient } from '@prisma/client';
import { lodgingCreateSchema, lodgingUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { LodgingRepository } from './lodging.repository';
import type { LodgingCreateDto, LodgingUpdateDto } from './lodging.types';

function normalizeLodgingInput<T extends { isUnspecified?: boolean; hasElectricity?: boolean; hasShower?: boolean; hasInternet?: boolean }>(
  input: T,
) {
  const isUnspecified = input.isUnspecified ?? false;
  return {
    ...input,
    isUnspecified,
    hasElectricity: isUnspecified ? false : (input.hasElectricity ?? false),
    hasShower: isUnspecified ? false : (input.hasShower ?? false),
    hasInternet: isUnspecified ? false : (input.hasInternet ?? false),
  };
}

export class LodgingService {
  private readonly repository: LodgingRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new LodgingRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  async create(input: LodgingCreateDto) {
    const parsed = lodgingCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid lodging input');
    }

    const location = await this.prisma.location.findUnique({
      where: { id: parsed.data.locationId },
      select: { name: true },
    });
    if (!location) {
      throw new DomainError('VALIDATION_FAILED', 'Location not found for lodging');
    }

    return this.repository.create({
      ...normalizeLodgingInput(parsed.data),
      locationNameSnapshot: location.name,
    });
  }

  async update(id: string, input: LodgingUpdateDto) {
    const parsed = lodgingUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid lodging update input');
    }

    if (!parsed.data.locationId) {
      return this.repository.update(id, normalizeLodgingInput(parsed.data));
    }

    const location = await this.prisma.location.findUnique({
      where: { id: parsed.data.locationId },
      select: { name: true },
    });
    if (!location) {
      throw new DomainError('VALIDATION_FAILED', 'Location not found for lodging');
    }

    return this.repository.update(id, {
      ...normalizeLodgingInput(parsed.data),
      locationNameSnapshot: location.name,
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
