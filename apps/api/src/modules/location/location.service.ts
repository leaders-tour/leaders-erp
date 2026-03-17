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
type TimeBlockProfile = 'DEFAULT' | 'FIRST_DAY' | 'FIRST_DAY_EARLY';

interface NormalizedLodging {
  isUnspecified: boolean;
  name: string;
  hasElectricity: FacilityAvailability;
  hasShower: FacilityAvailability;
  hasInternet: FacilityAvailability;
}

interface VersionProfilePayload {
  locationId: string;
  locationNameSnapshot: string[];
  regionNameSnapshot: string;
  versionNumber: number;
  label: string;
  changeNote?: string;
  firstDayTimeSlots?: LocationProfileTimeSlotInput[];
  firstDayEarlyTimeSlots?: LocationProfileTimeSlotInput[];
  lodging: LocationProfileLodgingInput;
  meals: LocationProfileMealsInput;
}

interface VersionProfileSnapshot {
  firstDayTimeSlots?: LocationProfileTimeSlotInput[];
  firstDayEarlyTimeSlots?: LocationProfileTimeSlotInput[];
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

  private normalizeLocationName(name: string[]): string[] {
    return name.map((line) => line.trim()).filter((line) => line.length > 0);
  }

  private coerceLocationName(value: Prisma.JsonValue | null | undefined): string[] {
    if (Array.isArray(value)) {
      return value.filter((line): line is string => typeof line === 'string').map((line) => line.trim()).filter((line) => line.length > 0);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return [value.trim()];
    }
    return [];
  }

  private cloneTimeSlots(timeSlots: LocationProfileTimeSlotInput[]): LocationProfileTimeSlotInput[] {
    return timeSlots.map((slot) => ({
      startTime: slot.startTime,
      activities: [...slot.activities],
    }));
  }

  private mapTimeBlocksToTimeSlots(
    timeBlocks: Array<{
      profile: TimeBlockProfile;
      startTime: string;
      orderIndex: number;
      activities: Array<{
        description: string;
        orderIndex: number;
      }>;
    }>,
    profile: TimeBlockProfile,
  ): LocationProfileTimeSlotInput[] {
    return timeBlocks
      .filter((timeBlock) => timeBlock.profile === profile)
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((timeBlock) => ({
        startTime: timeBlock.startTime,
        activities: timeBlock.activities
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((activity) => activity.description),
      }));
  }

  private async getNextVersionNumber(tx: Transaction, locationId: string): Promise<number> {
    const result = await tx.locationVersion.aggregate({
      where: { locationId },
      _max: { versionNumber: true },
    });

    return (result._max.versionNumber ?? 0) + 1;
  }

  private validateFirstDayProfile(input: {
    isFirstDayEligible: boolean;
    profile: Pick<VersionProfilePayload, 'firstDayTimeSlots' | 'firstDayEarlyTimeSlots'>;
  }): void {
    if (!input.isFirstDayEligible) {
      return;
    }

    if (!input.profile.firstDayTimeSlots || input.profile.firstDayTimeSlots.length === 0) {
      throw new DomainError('VALIDATION_FAILED', 'firstDayTimeSlots is required when isFirstDayEligible is true');
    }

    if (!input.profile.firstDayEarlyTimeSlots || input.profile.firstDayEarlyTimeSlots.length === 0) {
      throw new DomainError('VALIDATION_FAILED', 'firstDayEarlyTimeSlots is required when isFirstDayEligible is true');
    }
  }

  private async createTimeBlocksForProfile(
    tx: Transaction,
    input: {
      locationId: string;
      locationVersionId: string;
      profile: TimeBlockProfile;
      timeSlots: LocationProfileTimeSlotInput[];
    },
  ): Promise<void> {
    for (const [index, slot] of input.timeSlots.entries()) {
      const timeBlock = await tx.timeBlock.create({
        data: {
          locationId: input.locationId,
          locationVersionId: input.locationVersionId,
          profile: input.profile,
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
  }

  private async replaceVersionProfileData(
    tx: Transaction,
    input: {
      locationId: string;
      locationVersionId: string;
      locationNameSnapshot: string[];
      isFirstDayEligible: boolean;
      firstDayTimeSlots?: LocationProfileTimeSlotInput[];
      firstDayEarlyTimeSlots?: LocationProfileTimeSlotInput[];
      lodging: LocationProfileLodgingInput;
      meals: LocationProfileMealsInput;
    },
  ): Promise<void> {
    const normalizedLodging = this.normalizeLodging(input.lodging);

    await tx.activity.deleteMany({
      where: {
        timeBlock: {
          locationVersionId: input.locationVersionId,
        },
      },
    });
    await tx.timeBlock.deleteMany({ where: { locationVersionId: input.locationVersionId } });
    await tx.lodging.deleteMany({ where: { locationVersionId: input.locationVersionId } });
    await tx.mealSet.deleteMany({ where: { locationVersionId: input.locationVersionId } });

    if (input.isFirstDayEligible) {
      await this.createTimeBlocksForProfile(tx, {
        locationId: input.locationId,
        locationVersionId: input.locationVersionId,
        profile: 'FIRST_DAY',
        timeSlots: input.firstDayTimeSlots ?? [],
      });
      await this.createTimeBlocksForProfile(tx, {
        locationId: input.locationId,
        locationVersionId: input.locationVersionId,
        profile: 'FIRST_DAY_EARLY',
        timeSlots: input.firstDayEarlyTimeSlots ?? [],
      });
    }

    await tx.lodging.create({
      data: {
        locationId: input.locationId,
        locationVersionId: input.locationVersionId,
        locationNameSnapshot: input.locationNameSnapshot,
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
        locationId: input.locationId,
        locationVersionId: input.locationVersionId,
        locationNameSnapshot: input.locationNameSnapshot,
        setName: '기본 세트',
        breakfast: input.meals.breakfast ?? null,
        lunch: input.meals.lunch ?? null,
        dinner: input.meals.dinner ?? null,
      },
    });
  }

  private async createVersionWithProfile(
    tx: Transaction,
    payload: VersionProfilePayload & { isFirstDayEligible: boolean },
  ) {
    const normalizedLodging = this.normalizeLodging(payload.lodging);

    const locationVersion = await tx.locationVersion.create({
      data: {
        locationId: payload.locationId,
        versionNumber: payload.versionNumber,
        label: payload.label.trim(),
        changeNote: payload.changeNote?.trim() ? payload.changeNote.trim() : null,
        locationNameSnapshot: payload.locationNameSnapshot,
        regionNameSnapshot: payload.regionNameSnapshot,
        defaultLodgingType: normalizedLodging.name,
      },
    });

    await this.replaceVersionProfileData(tx, {
      locationId: payload.locationId,
      locationVersionId: locationVersion.id,
      locationNameSnapshot: payload.locationNameSnapshot,
      isFirstDayEligible: payload.isFirstDayEligible,
      firstDayTimeSlots: payload.firstDayTimeSlots,
      firstDayEarlyTimeSlots: payload.firstDayEarlyTimeSlots,
      lodging: payload.lodging,
      meals: payload.meals,
    });

    return locationVersion;
  }

  private buildProfileFromVersion(
    sourceVersion: {
      timeBlocks: Array<{
        profile: TimeBlockProfile;
        startTime: string;
        orderIndex: number;
        activities: Array<{
          description: string;
          orderIndex: number;
        }>;
      }>;
      lodgings: Array<{
        isUnspecified: boolean;
        name: string;
        hasElectricity: FacilityAvailability;
        hasShower: FacilityAvailability;
        hasInternet: FacilityAvailability;
      }>;
      mealSets: Array<{
        breakfast: unknown;
        lunch: unknown;
        dinner: unknown;
      }>;
    },
  ): VersionProfileSnapshot {
    const primaryLodging = sourceVersion.lodgings[0];
    const primaryMealSet = sourceVersion.mealSets[0];

    return {
      firstDayTimeSlots: this.mapTimeBlocksToTimeSlots(sourceVersion.timeBlocks, 'FIRST_DAY'),
      firstDayEarlyTimeSlots: this.mapTimeBlocksToTimeSlots(sourceVersion.timeBlocks, 'FIRST_DAY_EARLY'),
      lodging: {
        isUnspecified: primaryLodging?.isUnspecified ?? false,
        name: primaryLodging?.name ?? '여행자 캠프',
        hasElectricity: primaryLodging?.hasElectricity ?? 'NO',
        hasShower: primaryLodging?.hasShower ?? 'NO',
        hasInternet: primaryLodging?.hasInternet ?? 'NO',
      },
      meals: {
        breakfast: (primaryMealSet?.breakfast ?? null) as LocationProfileMealsInput['breakfast'],
        lunch: (primaryMealSet?.lunch ?? null) as LocationProfileMealsInput['lunch'],
        dinner: (primaryMealSet?.dinner ?? null) as LocationProfileMealsInput['dinner'],
      },
    };
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

      const normalizedName = this.normalizeLocationName(parsed.data.name);

      return tx.location.create({
        data: {
          regionId: parsed.data.regionId,
          name: normalizedName,
          defaultLodgingType: parsed.data.defaultLodgingType,
          isFirstDayEligible: parsed.data.isFirstDayEligible,
          isLastDayEligible: parsed.data.isLastDayEligible,
          latitude: parsed.data.latitude ?? null,
          longitude: parsed.data.longitude ?? null,
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

    this.validateFirstDayProfile({
      isFirstDayEligible: parsed.data.isFirstDayEligible,
      profile: parsed.data,
    });

    return this.prisma.$transaction(async (tx) => {
      const region = await tx.region.findUnique({
        where: { id: parsed.data.regionId },
        select: { name: true },
      });
      if (!region) {
        throw new DomainError('VALIDATION_FAILED', 'Region not found for location profile');
      }

      const normalizedLodging = this.normalizeLodging(parsed.data.lodging);
      const normalizedName = this.normalizeLocationName(parsed.data.name);

      const location = await tx.location.create({
        data: {
          regionId: parsed.data.regionId,
          regionName: region.name,
          name: normalizedName,
          defaultLodgingType: normalizedLodging.name,
          isFirstDayEligible: parsed.data.isFirstDayEligible,
          isLastDayEligible: parsed.data.isLastDayEligible,
          latitude: null,
          longitude: null,
        },
      });

      const createdVersion = await this.createVersionWithProfile(tx, {
        locationId: location.id,
        locationNameSnapshot: normalizedName,
        regionNameSnapshot: region.name,
        versionNumber: 1,
        label: '기본',
        isFirstDayEligible: parsed.data.isFirstDayEligible,
        firstDayTimeSlots: parsed.data.firstDayTimeSlots,
        firstDayEarlyTimeSlots: parsed.data.firstDayEarlyTimeSlots,
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
        select: {
          id: true,
          name: true,
          regionName: true,
          isFirstDayEligible: true,
          isLastDayEligible: true,
        },
      });
      if (!location) {
        throw new DomainError('NOT_FOUND', 'Location not found');
      }

      const nextIsFirstDayEligible = parsed.data.isFirstDayEligible ?? location.isFirstDayEligible;
      const nextIsLastDayEligible = parsed.data.isLastDayEligible ?? location.isLastDayEligible;
      const normalizedLocationName = this.coerceLocationName(location.name);

      let sourceProfile: VersionProfileSnapshot | null = null;

      if (parsed.data.sourceVersionId) {
        const sourceVersion = await tx.locationVersion.findUnique({
          where: { id: parsed.data.sourceVersionId },
          include: locationVersionInclude,
        });
        if (!sourceVersion || sourceVersion.locationId !== parsed.data.locationId) {
          throw new DomainError('VALIDATION_FAILED', 'sourceVersionId must belong to the same location');
        }

        sourceProfile = this.buildProfileFromVersion(sourceVersion);
      }

      const profile = parsed.data.profile ?? sourceProfile;
      if (!profile) {
        throw new DomainError('VALIDATION_FAILED', 'profile is required when sourceVersionId is not provided');
      }

      this.validateFirstDayProfile({
        isFirstDayEligible: nextIsFirstDayEligible,
        profile,
      });

      const versionNumber = await this.getNextVersionNumber(tx, parsed.data.locationId);

      const createdVersion = await this.createVersionWithProfile(tx, {
        locationId: parsed.data.locationId,
        locationNameSnapshot: normalizedLocationName,
        regionNameSnapshot: location.regionName,
        versionNumber,
        label: parsed.data.label,
        changeNote: parsed.data.changeNote,
        isFirstDayEligible: nextIsFirstDayEligible,
        firstDayTimeSlots: profile.firstDayTimeSlots ? this.cloneTimeSlots(profile.firstDayTimeSlots) : undefined,
        firstDayEarlyTimeSlots: profile.firstDayEarlyTimeSlots ? this.cloneTimeSlots(profile.firstDayEarlyTimeSlots) : undefined,
        lodging: profile.lodging,
        meals: profile.meals,
      });

      if (
        parsed.data.isFirstDayEligible !== undefined ||
        parsed.data.isLastDayEligible !== undefined
      ) {
        await tx.location.update({
          where: { id: parsed.data.locationId },
          data: {
            isFirstDayEligible: nextIsFirstDayEligible,
            isLastDayEligible: nextIsLastDayEligible,
          },
        });
      }

      return tx.locationVersion.findUnique({ where: { id: createdVersion.id }, include: locationVersionInclude });
    });
  }

  async setDefaultVersion(locationId: string, versionId: string) {
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
      const normalizedName = parsed.data.name ? this.normalizeLocationName(parsed.data.name) : undefined;

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
          ...(parsed.data.regionId !== undefined ? { regionId: parsed.data.regionId } : {}),
          ...(normalizedName ? { name: normalizedName } : {}),
          ...(parsed.data.defaultLodgingType !== undefined ? { defaultLodgingType: parsed.data.defaultLodgingType } : {}),
          ...(parsed.data.isFirstDayEligible !== undefined ? { isFirstDayEligible: parsed.data.isFirstDayEligible } : {}),
          ...(parsed.data.isLastDayEligible !== undefined ? { isLastDayEligible: parsed.data.isLastDayEligible } : {}),
          ...(parsed.data.latitude !== undefined ? { latitude: parsed.data.latitude } : {}),
          ...(parsed.data.longitude !== undefined ? { longitude: parsed.data.longitude } : {}),
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

    this.validateFirstDayProfile({
      isFirstDayEligible: parsed.data.isFirstDayEligible,
      profile: parsed.data,
    });

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
      const normalizedName = this.normalizeLocationName(parsed.data.name);

      await tx.location.update({
        where: { id },
        data: {
          regionId: parsed.data.regionId,
          regionName: region.name,
          name: normalizedName,
          defaultLodgingType: normalizedLodging.name,
          isFirstDayEligible: parsed.data.isFirstDayEligible,
          isLastDayEligible: parsed.data.isLastDayEligible,
        },
      });

      await tx.locationVersion.update({
        where: { id: existing.currentVersionId },
        data: {
          locationNameSnapshot: normalizedName,
          regionNameSnapshot: region.name,
          defaultLodgingType: normalizedLodging.name,
        },
      });

      await this.replaceVersionProfileData(tx, {
        locationId: id,
        locationVersionId: existing.currentVersionId,
        locationNameSnapshot: normalizedName,
        isFirstDayEligible: parsed.data.isFirstDayEligible,
        firstDayTimeSlots: parsed.data.firstDayTimeSlots,
        firstDayEarlyTimeSlots: parsed.data.firstDayEarlyTimeSlots,
        lodging: parsed.data.lodging,
        meals: parsed.data.meals,
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
