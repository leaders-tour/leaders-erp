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

    return this.prisma.$transaction(async (tx) => {
      const region = await tx.region.findUnique({
        where: { id: parsed.data.regionId },
        select: { name: true },
      });
      if (!region) {
        throw new DomainError('VALIDATION_FAILED', 'Region not found for location');
      }

      return tx.location.create({
        data: {
          ...parsed.data,
          regionName: region.name,
        },
        include: locationInclude,
      });
    });
  }

  async update(id: string, input: LocationUpdateDto) {
    const parsed = locationUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid location update input');
    }

    return this.prisma.$transaction(async (tx) => {
      const nextRegionId = parsed.data.regionId;
      let nextRegionName: string | undefined;

      if (nextRegionId) {
        const nextRegion = await tx.region.findUnique({
          where: { id: nextRegionId },
          select: { name: true },
        });
        if (!nextRegion) {
          throw new DomainError('VALIDATION_FAILED', 'Region not found for location update');
        }
        nextRegionName = nextRegion.name;
      }

      const updated = await tx.location.update({
        where: { id },
        data: {
          ...parsed.data,
          ...(nextRegionName ? { regionName: nextRegionName } : {}),
        },
        include: locationInclude,
      });

      if (parsed.data.name) {
        await tx.lodging.updateMany({
          where: { locationId: id },
          data: { locationNameSnapshot: updated.name },
        });
        await tx.mealSet.updateMany({
          where: { locationId: id },
          data: { locationNameSnapshot: updated.name },
        });
      }

      return updated;
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
