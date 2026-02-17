import type { PrismaClient } from '@prisma/client';
import { locationCreateSchema, locationUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { LocationRepository } from './location.repository';
import type { LocationCreateDto, LocationUpdateDto } from './location.types';

export class LocationService {
  private readonly repository: LocationRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new LocationRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  create(input: LocationCreateDto) {
    const parsed = locationCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid location input');
    }

    return this.repository.create(parsed.data);
  }

  update(id: string, input: LocationUpdateDto) {
    const parsed = locationUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid location update input');
    }

    return this.repository.update(id, parsed.data);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
