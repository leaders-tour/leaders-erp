import type { PrismaClient } from '@prisma/client';
import { locationCreateSchema, locationProfileCreateSchema, locationUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { locationInclude } from './location.mapper';
import { LocationRepository } from './location.repository';
import type { LocationCreateDto, LocationProfileCreateDto, LocationUpdateDto } from './location.types';

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

  async createProfile(input: LocationProfileCreateDto) {
    const parsed = locationProfileCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid location profile input');
    }

    return this.prisma.$transaction(async (tx) => {
      const region = await tx.region.findUnique({
        where: { id: parsed.data.regionId },
        select: { name: true },
      });
      if (!region) {
        throw new DomainError('VALIDATION_FAILED', 'Region not found for location profile');
      }

      const isUnspecified = parsed.data.lodging.isUnspecified ?? false;
      const lodgingName = isUnspecified
        ? '숙소 미지정'
        : parsed.data.lodging.name?.trim()
          ? parsed.data.lodging.name.trim()
          : '여행자 캠프';

      const location = await tx.location.create({
        data: {
          regionId: parsed.data.regionId,
          regionName: region.name,
          name: parsed.data.name,
          defaultLodgingType: lodgingName,
          latitude: null,
          longitude: null,
        },
      });

      for (const [index, slot] of parsed.data.timeSlots.entries()) {
        const timeBlock = await tx.timeBlock.create({
          data: {
            locationId: location.id,
            startTime: slot.startTime,
            label: slot.startTime,
            orderIndex: index,
          },
        });

        const activities = slot.activities
          .map((activity) => activity.trim())
          .filter((activity) => activity.length > 0);

        if (activities.length > 0) {
          await tx.activity.createMany({
            data: activities.map((description, activityIndex) => ({
              timeBlockId: timeBlock.id,
              description,
              orderIndex: activityIndex,
              isOptional: false,
              conditionNote: null,
            })),
          });
        }
      }

      await tx.lodging.create({
        data: {
          locationId: location.id,
          locationNameSnapshot: location.name,
          name: lodgingName,
          specialNotes: null,
          isUnspecified,
          hasElectricity: isUnspecified ? false : (parsed.data.lodging.hasElectricity ?? false),
          hasShower: isUnspecified ? false : (parsed.data.lodging.hasShower ?? false),
          hasInternet: isUnspecified ? false : (parsed.data.lodging.hasInternet ?? false),
        },
      });

      await tx.mealSet.create({
        data: {
          locationId: location.id,
          locationNameSnapshot: location.name,
          setName: '기본 세트',
          breakfast: parsed.data.meals.breakfast ?? null,
          lunch: parsed.data.meals.lunch ?? null,
          dinner: parsed.data.meals.dinner ?? null,
        },
      });

      return tx.location.findUnique({
        where: { id: location.id },
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
