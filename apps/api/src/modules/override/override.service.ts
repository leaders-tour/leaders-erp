import type { PrismaClient } from '@prisma/client';
import { overrideCreateSchema, overrideUpdateSchema } from '@tour/validation';
import { createValidationError } from '../../lib/errors';
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
      throw createValidationError('Invalid override input', parsed.error);
    }

    return this.repository.create(parsed.data);
  }

  update(id: string, input: OverrideUpdateDto) {
    const parsed = overrideUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid override update input', parsed.error);
    }

    return this.repository.update(id, parsed.data);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
