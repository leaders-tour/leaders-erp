import type { PrismaClient } from '@prisma/client';
import { regionCreateSchema, regionUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { RegionRepository } from './region.repository';
import type { RegionCreateDto, RegionUpdateDto } from './region.types';

export class RegionService {
  private readonly repository: RegionRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new RegionRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  create(input: RegionCreateDto) {
    const parsed = regionCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid region input');
    }

    return this.repository.create(parsed.data);
  }

  update(id: string, input: RegionUpdateDto) {
    const parsed = regionUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid region update input');
    }

    return this.repository.update(id, parsed.data);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
