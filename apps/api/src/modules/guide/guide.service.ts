import type { PrismaClient } from '@prisma/client';
import { guideCreateSchema, guideUpdateSchema } from '@tour/validation';
import { DomainError, createValidationError } from '../../lib/errors';
import { GuideRepository } from './guide.repository';
import type { GuideCreateDto, GuidesFilterDto, GuideUpdateDto } from './guide.types';

export class GuideService {
  constructor(private readonly prisma: PrismaClient) {}

  list(filters?: GuidesFilterDto) {
    return new GuideRepository(this.prisma).findMany(filters);
  }

  async get(id: string) {
    const guide = await new GuideRepository(this.prisma).findById(id);
    if (!guide) {
      throw new DomainError('NOT_FOUND', 'Guide not found');
    }
    return guide;
  }

  async create(input: GuideCreateDto) {
    const parsed = guideCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid guide input', parsed.error);
    }
    return new GuideRepository(this.prisma).create(parsed.data);
  }

  async update(id: string, input: GuideUpdateDto) {
    const parsed = guideUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid guide update input', parsed.error);
    }
    const existing = await new GuideRepository(this.prisma).findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Guide not found');
    }
    return new GuideRepository(this.prisma).update(id, parsed.data);
  }

  async delete(id: string) {
    const existing = await new GuideRepository(this.prisma).findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Guide not found');
    }
    await new GuideRepository(this.prisma).delete(id);
    return true;
  }
}
