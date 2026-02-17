import type { PrismaClient } from '@prisma/client';
import { activityCreateSchema, activityUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { ActivityRepository } from './activity.repository';
import type { ActivityCreateDto, ActivityUpdateDto } from './activity.types';

export class ActivityService {
  private readonly repository: ActivityRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new ActivityRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  create(input: ActivityCreateDto) {
    const parsed = activityCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid activity input');
    }

    return this.repository.create(parsed.data);
  }

  update(id: string, input: ActivityUpdateDto) {
    const parsed = activityUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid activity update input');
    }

    return this.repository.update(id, parsed.data);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
