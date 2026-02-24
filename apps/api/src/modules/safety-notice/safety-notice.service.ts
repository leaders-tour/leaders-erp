import type { PrismaClient } from '@prisma/client';
import { safetyNoticeCreateSchema, safetyNoticeUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { SafetyNoticeRepository } from './safety-notice.repository';
import type { SafetyNoticeCreateDto, SafetyNoticeUpdateDto } from './safety-notice.types';

export class SafetyNoticeService {
  private readonly repository: SafetyNoticeRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new SafetyNoticeRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  create(input: SafetyNoticeCreateDto) {
    const parsed = safetyNoticeCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid safety notice input');
    }

    return this.repository.create({
      title: parsed.data.title.trim(),
      contentMd: parsed.data.contentMd.trim(),
      imageUrls: parsed.data.imageUrls ?? [],
    });
  }

  async update(id: string, input: SafetyNoticeUpdateDto) {
    const parsed = safetyNoticeUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid safety notice update input');
    }

    const current = await this.repository.findById(id);
    if (!current) {
      throw new DomainError('NOT_FOUND', 'Safety notice not found');
    }

    return this.repository.update(id, {
      title: parsed.data.title?.trim(),
      contentMd: parsed.data.contentMd?.trim(),
      imageUrls: parsed.data.imageUrls,
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
