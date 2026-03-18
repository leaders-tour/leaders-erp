import type { PrismaClient } from '@prisma/client';
import { eventCreateSchema, eventUpdateSchema } from '@tour/validation';
import { createValidationError, DomainError } from '../../lib/errors';
import { EventRepository } from './event.repository';
import type { EventCreateDto, EventUpdateDto } from './event.types';

export class EventService {
  private readonly repository: EventRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new EventRepository(prisma);
  }

  list(activeOnly?: boolean) {
    return this.repository.findMany(activeOnly);
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  create(input: EventCreateDto) {
    const parsed = eventCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid event input', parsed.error);
    }

    return this.repository.create(parsed.data);
  }

  update(id: string, input: EventUpdateDto) {
    const parsed = eventUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid event update input', parsed.error);
    }

    return this.repository.update(id, parsed.data);
  }

  async delete(id: string) {
    const refCount = await this.repository.countPlanVersionReferences(id);
    if (refCount > 0) {
      throw new DomainError('VALIDATION_FAILED', '이미 일정 버전에서 사용 중인 이벤트는 삭제할 수 없습니다. 비활성화로 처리해주세요.');
    }

    return this.repository.delete(id);
  }
}
