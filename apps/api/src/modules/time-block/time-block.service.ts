import type { PrismaClient } from '@prisma/client';
import { timeBlockCreateSchema, timeBlockUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { TimeBlockRepository } from './time-block.repository';
import type { TimeBlockCreateDto, TimeBlockUpdateDto } from './time-block.types';

export class TimeBlockService {
  private readonly repository: TimeBlockRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new TimeBlockRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  create(input: TimeBlockCreateDto) {
    const parsed = timeBlockCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid time block input');
    }

    return this.repository.create(parsed.data);
  }

  update(id: string, input: TimeBlockUpdateDto) {
    const parsed = timeBlockUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid time block update input');
    }

    return this.repository.update(id, parsed.data);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
