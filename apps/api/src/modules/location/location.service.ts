import type { Prisma, PrismaClient } from '@prisma/client';
import {
  locationCreateSchema,
  locationProfileCreateSchema,
  locationProfileUpdateSchema,
  locationUpdateSchema,
  locationVersionCreateSchema,
  type LocationProfileLodgingInput,
  type LocationProfileMealsInput,
  type LocationProfileTimeSlotInput,
} from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { locationInclude, locationVersionInclude } from './location.mapper';
import { LocationRepository } from './location.repository';
import type {
  LocationCreateDto,
  LocationProfileCreateDto,
  LocationProfileUpdateDto,
  LocationUpdateDto,
  LocationVersionCreateDto,
} from './location.types';

type FacilityAvailability = 'YES' | 'LIMITED' | 'NO';
type Transaction = Prisma.TransactionClient;

interface NormalizedLodging {
  isUnspecified: boolean;
  name: string;
  hasElectricity: FacilityAvailability;
  hasShower: FacilityAvailability;
  hasInternet: FacilityAvailability;
}

interface VersionProfilePayload {
  locationId: string;
  locationNameSnapshot: string;
  regionNameSnapshot: string;
  versionNumber: number;
  label: string;
  changeNote?: string;
  parentVersionId?: string;
  internalMovementDistance?: number | null;
  timeSlots: LocationProfileTimeSlotInput[];
  lodging: LocationProfileLodgingInput;
  meals: LocationProfileMealsInput;
}

export class LocationService {
  private readonly repository: LocationRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new LocationRepository(prisma);
  }

  private normalizeLodging(lodging: LocationProfileLodgingInput): NormalizedLodging {
    const isUnspecified = lodging.isUnspecified ?? false;
    const name = isUnspecified ? '숙소 미지정' : lodging.name?.trim() ? lodging.name.trim() : '여행자 캠프';

    return {
      isUnspecified,
      name,
      hasElectricity: isUnspecified ? 'NO' : ((lodging.hasElectricity ?? 'NO') as FacilityAvailability),
      hasShower: isUnspecified ? 'NO' : ((lodging.hasShower ?? 'NO') as FacilityAvailability),
      hasInternet: isUnspecified ? 'NO' : ((lodging.hasInternet ?? 'NO') as FacilityAvailability),
    };
  }

  private async getNextVersionNumber(tx: Transaction, locationId: string): Promise<number> {
    const result = await tx.locationVersion.aggregate({
      where: { locationId },
      _max: { versionNumber: true },
    });

    return (result._max.versionNumber ?? 0) + 1;
  }

  private async createVersionWithProfile(tx: Transaction, payload: VersionProfilePayload) {
    const normalizedLodging = this.normalizeLodging(payload.lodging);

    const locationVersion = await tx.locationVersion.create({
      data: {
        locationId: payload.locationId,
        parentVersionId: payload.parentVersionId,
        versionNumber: payload.versionNumber,
        label: payload.label.trim(),
        changeNote: payload.changeNote?.trim() ? payload.changeNote.trim() : null,
        locationNameSnapshot: payload.locationNameSnapshot,
        regionNameSnapshot: payload.regionNameSnapshot,
        internalMovementDistance: payload.internalMovementDistance ?? null,
        defaultLodgingType: normalizedLodging.name,
      },
    });

    for (const [index, slot] of payload.timeSlots.entries()) {
      const timeBlock = await tx.timeBlock.create({
        data: {
          locationId: payload.locationId,
          locationVersionId: locationVersion.id,
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
            safetyGuidelinesMd: null,
          })),
        });
      }
    }

    await tx.lodging.create({
      data: {
        locationId: payload.locationId,
        locationVersionId: locationVersion.id,
        locationNameSnapshot: payload.locationNameSnapshot,
        name: normalizedLodging.name,
        specialNotes: null,
        isUnspecified: normalizedLodging.isUnspecified,
        hasElectricity: normalizedLodging.hasElectricity,
        hasShower: normalizedLodging.hasShower,
        hasInternet: normalizedLodging.hasInternet,
      },
    });

    await tx.mealSet.create({
      data: {
        locationId: payload.locationId,
        locationVersionId: locationVersion.id,
        locationNameSnapshot: payload.locationNameSnapshot,
        setName: '기본 세트',
        breakfast: payload.meals.breakfast ?? null,
        lunch: payload.meals.lunch ?? null,
        dinner: payload.meals.dinner ?? null,
      },
    });

    return locationVersion;
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  listVersions(locationId: string) {
    return this.repository.findVersionsByLocation(locationId);
  }

  getVersion(id: string) {
    return this.repository.findVersionById(id);
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

      const normalizedLodging = this.normalizeLodging(parsed.data.lodging);

      const location = await tx.location.create({
        data: {
          regionId: parsed.data.regionId,
          regionName: region.name,
          name: parsed.data.name,
          defaultLodgingType: normalizedLodging.name,
          internalMovementDistance: parsed.data.internalMovementDistance ?? null,
          latitude: null,
          longitude: null,
        },
      });

      const createdVersion = await this.createVersionWithProfile(tx, {
        locationId: location.id,
        locationNameSnapshot: location.name,
        regionNameSnapshot: region.name,
        versionNumber: 1,
        label: '기본',
        internalMovementDistance: parsed.data.internalMovementDistance,
        timeSlots: parsed.data.timeSlots,
        lodging: parsed.data.lodging,
        meals: parsed.data.meals,
      });

      await tx.location.update({
        where: { id: location.id },
        data: { currentVersionId: createdVersion.id },
      });

      return tx.location.findUnique({
        where: { id: location.id },
        include: locationInclude,
      });
    });
  }

  async createVersion(input: LocationVersionCreateDto) {
    const parsed = locationVersionCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid location version input');
    }

    return this.prisma.$transaction(async (tx) => {
      const location = await tx.location.findUnique({
        where: { id: parsed.data.locationId },
        select: { id: true, name: true, regionName: true },
      });
      if (!location) {
        throw new DomainError('NOT_FOUND', 'Location not found');
      }

      if (parsed.data.parentVersionId) {
        const parentVersion = await tx.locationVersion.findUnique({
          where: { id: parsed.data.parentVersionId },
          select: { id: true, locationId: true },
        });

        if (!parentVersion || parentVersion.locationId !== parsed.data.locationId) {
          throw new DomainError('VALIDATION_FAILED', 'parentVersionId must belong to the same location');
        }
      }

      const versionNumber = await this.getNextVersionNumber(tx, parsed.data.locationId);

      const createdVersion = await this.createVersionWithProfile(tx, {
        locationId: parsed.data.locationId,
        locationNameSnapshot: location.name,
        regionNameSnapshot: location.regionName,
        versionNumber,
        label: parsed.data.label,
        parentVersionId: parsed.data.parentVersionId,
        changeNote: parsed.data.changeNote,
        internalMovementDistance: parsed.data.profile.internalMovementDistance,
        timeSlots: parsed.data.profile.timeSlots,
        lodging: parsed.data.profile.lodging,
        meals: parsed.data.profile.meals,
      });

      return tx.locationVersion.findUnique({ where: { id: createdVersion.id }, include: locationVersionInclude });
    });
  }

  async setCurrentVersion(locationId: string, versionId: string) {
    const [location, version] = await Promise.all([
      this.repository.findById(locationId),
      this.prisma.locationVersion.findUnique({ where: { id: versionId }, select: { id: true, locationId: true } }),
    ]);

    if (!location) {
      throw new DomainError('NOT_FOUND', 'Location not found');
    }

    if (!version || version.locationId !== locationId) {
      throw new DomainError('VALIDATION_FAILED', 'versionId must belong to the same location');
    }

    return this.prisma.location.update({
      where: { id: locationId },
      data: { currentVersionId: versionId },
      include: locationInclude,
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

      return tx.location.update({
        where: { id },
        data: {
          ...parsed.data,
          ...(nextRegionName ? { regionName: nextRegionName } : {}),
        },
        include: locationInclude,
      });
    });
  }

  async updateProfile(id: string, input: LocationProfileUpdateDto) {
    const parsed = locationProfileUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid location profile update input');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.location.findUnique({
        where: { id },
        select: { id: true, currentVersionId: true },
      });
      if (!existing) {
        throw new DomainError('NOT_FOUND', 'Location not found');
      }

      if (!existing.currentVersionId) {
        throw new DomainError('VALIDATION_FAILED', 'Location currentVersion is required');
      }

      const region = await tx.region.findUnique({
        where: { id: parsed.data.regionId },
        select: { name: true },
      });
      if (!region) {
        throw new DomainError('VALIDATION_FAILED', 'Region not found for location profile update');
      }

      const normalizedLodging = this.normalizeLodging(parsed.data.lodging);

      await tx.location.update({
        where: { id },
        data: {
          regionId: parsed.data.regionId,
          regionName: region.name,
          name: parsed.data.name,
          defaultLodgingType: normalizedLodging.name,
          internalMovementDistance: parsed.data.internalMovementDistance ?? null,
        },
      });

      await tx.locationVersion.update({
        where: { id: existing.currentVersionId },
        data: {
          locationNameSnapshot: parsed.data.name,
          regionNameSnapshot: region.name,
          internalMovementDistance: parsed.data.internalMovementDistance ?? null,
          defaultLodgingType: normalizedLodging.name,
        },
      });

      await tx.activity.deleteMany({
        where: {
          timeBlock: {
            locationVersionId: existing.currentVersionId,
          },
        },
      });
      await tx.timeBlock.deleteMany({ where: { locationVersionId: existing.currentVersionId } });
      await tx.lodging.deleteMany({ where: { locationVersionId: existing.currentVersionId } });
      await tx.mealSet.deleteMany({ where: { locationVersionId: existing.currentVersionId } });

      for (const [index, slot] of parsed.data.timeSlots.entries()) {
        const timeBlock = await tx.timeBlock.create({
          data: {
            locationId: id,
            locationVersionId: existing.currentVersionId,
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
              safetyGuidelinesMd: null,
            })),
          });
        }
      }

      await tx.lodging.create({
        data: {
          locationId: id,
          locationVersionId: existing.currentVersionId,
          locationNameSnapshot: parsed.data.name,
          name: normalizedLodging.name,
          specialNotes: null,
          isUnspecified: normalizedLodging.isUnspecified,
          hasElectricity: normalizedLodging.hasElectricity,
          hasShower: normalizedLodging.hasShower,
          hasInternet: normalizedLodging.hasInternet,
        },
      });

      await tx.mealSet.create({
        data: {
          locationId: id,
          locationVersionId: existing.currentVersionId,
          locationNameSnapshot: parsed.data.name,
          setName: '기본 세트',
          breakfast: parsed.data.meals.breakfast ?? null,
          lunch: parsed.data.meals.lunch ?? null,
          dinner: parsed.data.meals.dinner ?? null,
        },
      });

      const location = await tx.location.findUnique({
        where: { id },
        include: locationInclude,
      });
      if (!location) {
        throw new DomainError('NOT_FOUND', 'Location not found');
      }
      return location;
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
