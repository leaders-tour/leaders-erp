import type { PrismaClient } from '@prisma/client';
import { locationCreateSchema, locationUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { locationInclude } from './location.mapper';
import { LocationRepository } from './location.repository';
import type { LocationCreateDto, LocationUpdateDto } from './location.types';

export class LocationService {
  private readonly repository: LocationRepository;

  constructor(private readonly prisma: PrismaClient) {
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

  async update(id: string, input: LocationUpdateDto) {
    const parsed = locationUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid location update input');
    }

    if (!parsed.data.name) {
      return this.repository.update(id, parsed.data);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.location.update({
        where: { id },
        data: parsed.data,
        include: locationInclude,
      });

      await tx.lodging.updateMany({
        where: { locationId: id },
        data: { locationNameSnapshot: updated.name },
      });
      await tx.mealSet.updateMany({
        where: { locationId: id },
        data: { locationNameSnapshot: updated.name },
      });

      return updated;
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
