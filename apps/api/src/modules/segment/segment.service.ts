import type { PrismaClient } from '@prisma/client';
import { segmentCreateSchema, segmentUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { SegmentRepository } from './segment.repository';
import type { SegmentCreateDto, SegmentUpdateDto } from './segment.types';

export class SegmentService {
  private readonly repository: SegmentRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new SegmentRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  create(input: SegmentCreateDto) {
    const parsed = segmentCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid segment input');
    }

    return this.repository.create(parsed.data);
  }

  update(id: string, input: SegmentUpdateDto) {
    const parsed = segmentUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid segment update input');
    }

    return this.repository.update(id, parsed.data);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
