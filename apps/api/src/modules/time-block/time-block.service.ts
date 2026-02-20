import type { PrismaClient } from '@prisma/client';
import { LOCATION_TIMETABLE_SLOTS, timeBlockCreateSchema, timeBlockUpdateSchema } from '@tour/validation';
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
    if (!LOCATION_TIMETABLE_SLOTS.includes(parsed.data.startTime as (typeof LOCATION_TIMETABLE_SLOTS)[number])) {
      throw new DomainError('VALIDATION_FAILED', 'TimeBlock startTime must be one of 08:00, 12:00, 18:00');
    }

    return this.repository.create(parsed.data);
  }

  update(id: string, input: TimeBlockUpdateDto) {
    const parsed = timeBlockUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid time block update input');
    }
    if (
      parsed.data.startTime &&
      !LOCATION_TIMETABLE_SLOTS.includes(parsed.data.startTime as (typeof LOCATION_TIMETABLE_SLOTS)[number])
    ) {
      throw new DomainError('VALIDATION_FAILED', 'TimeBlock startTime must be one of 08:00, 12:00, 18:00');
    }

    return this.repository.update(id, parsed.data);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
