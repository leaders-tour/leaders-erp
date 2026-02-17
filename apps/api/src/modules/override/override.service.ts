import type { PrismaClient } from '@prisma/client';
import { overrideCreateSchema, overrideUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { OverrideRepository } from './override.repository';
import type { OverrideCreateDto, OverrideUpdateDto } from './override.types';

export class OverrideService {
  private readonly repository: OverrideRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new OverrideRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  create(input: OverrideCreateDto) {
    const parsed = overrideCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid override input');
    }

    return this.repository.create(parsed.data);
  }

  update(id: string, input: OverrideUpdateDto) {
    const parsed = overrideUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid override update input');
    }

    return this.repository.update(id, parsed.data);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
