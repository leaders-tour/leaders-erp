import type { MovementIntensity, Prisma, PrismaClient } from '@prisma/client';
import {
  multiDayBlockConnectionBulkCreateSchema,
  multiDayBlockConnectionCreateSchema,
  multiDayBlockConnectionUpdateSchema,
  multiDayBlockConnectionUpdateWithAdditionalFromsSchema,
  multiDayBlockCreateSchema,
  multiDayBlockUpdateSchema,
  type MultiDayBlockConnectionTimeSlotInput,
  type MultiDayBlockConnectionUpdateInput,
  type MultiDayBlockConnectionVersionInput,
} from '@tour/validation';
import { createValidationError, DomainError } from '../../lib/errors';
import { calculateMovementIntensity } from '../../lib/movement-intensity';
import { MultiDayBlockConnectionRepository, MultiDayBlockRepository } from './multi-day-block.repository';
import type {
  MultiDayBlockConnectionBulkCreateDto,
  MultiDayBlockConnectionCreateDto,
  MultiDayBlockConnectionUpdateDto,
  MultiDayBlockConnectionUpdateWithAdditionalFromsDto,
  MultiDayBlockCreateDto,
  MultiDayBlockUpdateDto,
} from './multi-day-block.types';

type SegmentScheduleVariant = 'basic' | 'early' | 'extend' | 'earlyExtend';

interface OvernightStayListFilter {
  regionIds?: string[];
  activeOnly?: boolean;
}

interface MultiDayBlockConnectionListFilter {
  regionIds?: string[];
  fromMultiDayBlockId?: string;
}

type NormalizedBlockDay = {
  dayOrder: number;
  displayLocationId: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  movementIntensity: ReturnType<typeof calculateMovementIntensity>;
  timeCellText: string;
  scheduleCellText: string;
  lodgingCellText: string;
  mealCellText: string;
};

interface NormalizedTimeSlot {
  startTime: string;
  label: string;
  activities: string[];
}

interface VariantTimeSlotMap {
  basic: MultiDayBlockConnectionTimeSlotInput[];
  early?: MultiDayBlockConnectionTimeSlotInput[];
  extend?: MultiDayBlockConnectionTimeSlotInput[];
  earlyExtend?: MultiDayBlockConnectionTimeSlotInput[];
}

interface NormalizedConnectionVersion {
  name: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  movementIntensity: MovementIntensity;
  isLongDistance: boolean;
  isDefault: boolean;
  timeSlotsByVariant: VariantTimeSlotMap;
}

interface ExistingConnectionLike {
  defaultVersionId: string | null;
  regionId: string;
  fromOvernightStayId: string;
  toLocationId: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  scheduleTimeBlocks: Array<{
    variant: SegmentScheduleVariant;
    startTime: string;
    orderIndex: number;
    activities: Array<{
      description: string;
      orderIndex: number;
    }>;
  }>;
  versions: Array<{
    id: string;
    name: string;
    averageDistanceKm: number;
    averageTravelHours: number;
    isLongDistance: boolean;
    sortOrder: number;
    isDefault: boolean;
    scheduleTimeBlocks: Array<{
      variant: SegmentScheduleVariant;
      startTime: string;
      orderIndex: number;
      activities: Array<{
        description: string;
        orderIndex: number;
      }>;
    }>;
  }>;
}

interface ConnectionTargetLocation {
  id: string;
  regionId: string;
  isLastDayEligible: boolean;
}

interface PreparedMdbConnectionUpdate {
  nextFromMultiDayBlockId: string;
  nextToLocationId: string;
  endpoints: { fromBlockRegionId: string; toLocation: ConnectionTargetLocation };
  owningRegion: { id: string; name: string };
  nextVersions: NormalizedConnectionVersion[];
  defaultVersion: NormalizedConnectionVersion;
  hasLegacyDirectUpdates: boolean;
  shouldSyncOwningRegion: boolean;
  data: MultiDayBlockConnectionUpdateInput;
}

const SEGMENT_SCHEDULE_VARIANTS: SegmentScheduleVariant[] = ['basic', 'early', 'extend', 'earlyExtend'];

export class MultiDayBlockService {
  private readonly repository: MultiDayBlockRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new MultiDayBlockRepository(prisma);
  }

  list(filter: OvernightStayListFilter = {}) {
    return this.repository.findMany(filter);
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  private async getDayLocationRegionMap(dayLocationIds: string[]): Promise<Map<string, string>> {
    const uniqueLocationIds = Array.from(new Set(dayLocationIds));
    const locations = await this.prisma.location.findMany({
      where: { id: { in: uniqueLocationIds } },
      select: { id: true, regionId: true },
    });
    if (locations.length !== uniqueLocationIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more day locations are invalid');
    }

    return new Map(locations.map((location) => [location.id, location.regionId]));
  }

  private resolveRepresentativeRegionId(
    days: Array<{ dayOrder: number; displayLocationId: string }>,
    locationRegionById: Map<string, string>,
  ): string {
    const firstDay = days
      .slice()
      .sort((left, right) => left.dayOrder - right.dayOrder)[0];

    if (!firstDay) {
      throw new DomainError('VALIDATION_FAILED', 'Multi-day block requires at least one day');
    }

    const representativeRegionId = locationRegionById.get(firstDay.displayLocationId);
    if (!representativeRegionId) {
      throw new DomainError('VALIDATION_FAILED', 'Representative region could not be derived from block days');
    }

    return representativeRegionId;
  }

  private normalizeDays(
    days: Array<{
      dayOrder: number;
      displayLocationId: string;
      averageDistanceKm: number;
      averageTravelHours: number;
      timeCellText: string;
      scheduleCellText: string;
      lodgingCellText: string;
      mealCellText: string;
    }>,
  ): NormalizedBlockDay[] {
    return days
      .slice()
      .sort((left, right) => left.dayOrder - right.dayOrder)
      .map((day) => ({
        ...day,
        movementIntensity: calculateMovementIntensity(day.averageTravelHours),
      }));
  }

  private deriveLegacyLocationFields(days: NormalizedBlockDay[]) {
    const firstDay = days[0];
    const lastDay = days[days.length - 1];
    if (!firstDay || !lastDay) {
      throw new DomainError('VALIDATION_FAILED', 'Multi-day block requires at least one day');
    }
    return {
      locationId: firstDay.displayLocationId,
      startLocationId: firstDay.displayLocationId,
      endLocationId: lastDay.displayLocationId,
    };
  }

  async create(input: MultiDayBlockCreateDto) {
    const parsed = multiDayBlockCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid multi-day block input', parsed.error);
    }

    const normalizedDays = this.normalizeDays(parsed.data.days);
    const locationRegionById = await this.getDayLocationRegionMap(normalizedDays.map((day) => day.displayLocationId));
    const representativeRegionId = this.resolveRepresentativeRegionId(normalizedDays, locationRegionById);
    const legacyLocations = this.deriveLegacyLocationFields(normalizedDays);
    const isNightTrain = parsed.data.isNightTrain ?? false;

    return this.prisma.$transaction(async (tx) => {
      const repository = new MultiDayBlockRepository(tx);
      const created = await tx.overnightStay.create({
        data: {
          regionId: representativeRegionId,
          locationId: legacyLocations.locationId,
          blockType: isNightTrain ? 'TRANSFER' : 'STAY',
          startLocationId: legacyLocations.startLocationId,
          endLocationId: legacyLocations.endLocationId,
          name: parsed.data.name.trim(),
          isNightTrain,
          sortOrder: parsed.data.sortOrder,
          isActive: parsed.data.isActive,
        },
      });

      await repository.replaceDays(created.id, normalizedDays);
      const result = await repository.findById(created.id);
      if (!result) {
        throw new DomainError('INTERNAL', 'Failed to load created multi-day block');
      }
      return result;
    });
  }

  async update(id: string, input: MultiDayBlockUpdateDto) {
    const parsed = multiDayBlockUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid multi-day block update input', parsed.error);
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Multi-day block not found');
    }

    const normalizedDays = parsed.data.days
      ? this.normalizeDays(parsed.data.days)
      : this.normalizeDays(
          existing.days.map((day) => ({
            dayOrder: day.dayOrder,
            displayLocationId: day.displayLocationId,
            averageDistanceKm: day.averageDistanceKm,
            averageTravelHours: day.averageTravelHours,
            timeCellText: day.timeCellText,
            scheduleCellText: day.scheduleCellText,
            lodgingCellText: day.lodgingCellText,
            mealCellText: day.mealCellText,
          })),
        );

    const representativeRegionId = parsed.data.days
      ? this.resolveRepresentativeRegionId(
          normalizedDays,
          await this.getDayLocationRegionMap(normalizedDays.map((day) => day.displayLocationId)),
        )
      : existing.days[0]?.displayLocation?.regionId ?? existing.regionId;

    const legacyLocations = this.deriveLegacyLocationFields(normalizedDays);
    const isNightTrain = parsed.data.isNightTrain ?? existing.isNightTrain ?? existing.blockType === 'TRANSFER';

    return this.prisma.$transaction(async (tx) => {
      const repository = new MultiDayBlockRepository(tx);
      await tx.overnightStay.update({
        where: { id },
        data: {
          regionId: representativeRegionId,
          locationId: legacyLocations.locationId,
          blockType: isNightTrain ? 'TRANSFER' : 'STAY',
          startLocationId: legacyLocations.startLocationId,
          endLocationId: legacyLocations.endLocationId,
          ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
          isNightTrain,
          ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        },
      });

      if (parsed.data.days) {
        await repository.replaceDays(id, normalizedDays);
      }

      const result = await repository.findById(id);
      if (!result) {
        throw new DomainError('INTERNAL', 'Failed to load updated multi-day block');
      }
      return result;
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}

export class MultiDayBlockConnectionService {
  private readonly repository: MultiDayBlockConnectionRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new MultiDayBlockConnectionRepository(prisma);
  }

  list(filter: MultiDayBlockConnectionListFilter = {}) {
    return this.repository.findMany(filter);
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  private normalizeTimeSlots(timeSlots: MultiDayBlockConnectionTimeSlotInput[]): NormalizedTimeSlot[] {
    return timeSlots.map((slot) => ({
      startTime: slot.startTime,
      label: slot.startTime,
      activities: slot.activities.map((activity) => activity.trim()).filter((activity) => activity.length > 0),
    }));
  }

  private cloneTimeSlots(
    timeSlots: MultiDayBlockConnectionTimeSlotInput[] | undefined,
  ): MultiDayBlockConnectionTimeSlotInput[] | undefined {
    if (!timeSlots) {
      return undefined;
    }

    return timeSlots.map((slot) => ({
      startTime: slot.startTime,
      activities: [...slot.activities],
    }));
  }

  private normalizeVariantTimeSlots(input: {
    timeSlots: MultiDayBlockConnectionTimeSlotInput[];
    earlyTimeSlots?: MultiDayBlockConnectionTimeSlotInput[];
    extendTimeSlots?: MultiDayBlockConnectionTimeSlotInput[];
    earlyExtendTimeSlots?: MultiDayBlockConnectionTimeSlotInput[];
  }): VariantTimeSlotMap {
    return {
      basic: this.cloneTimeSlots(input.timeSlots) ?? [],
      early: this.cloneTimeSlots(input.earlyTimeSlots),
      extend: this.cloneTimeSlots(input.extendTimeSlots),
      earlyExtend: this.cloneTimeSlots(input.earlyExtendTimeSlots),
    };
  }

  private mapScheduleTimeBlocksToTimeSlots(
    timeBlocks:
      | ExistingConnectionLike['scheduleTimeBlocks']
      | ExistingConnectionLike['versions'][number]['scheduleTimeBlocks'],
    variant: SegmentScheduleVariant,
  ): MultiDayBlockConnectionTimeSlotInput[] {
    return timeBlocks
      .filter((timeBlock) => timeBlock.variant === variant)
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

  private mapTimeBlocksToVariantTimeSlots(
    timeBlocks:
      | ExistingConnectionLike['scheduleTimeBlocks']
      | ExistingConnectionLike['versions'][number]['scheduleTimeBlocks'],
  ): VariantTimeSlotMap {
    const basic = this.mapScheduleTimeBlocksToTimeSlots(timeBlocks, 'basic');
    const early = this.mapScheduleTimeBlocksToTimeSlots(timeBlocks, 'early');
    const extend = this.mapScheduleTimeBlocksToTimeSlots(timeBlocks, 'extend');
    const earlyExtend = this.mapScheduleTimeBlocksToTimeSlots(timeBlocks, 'earlyExtend');

    return {
      basic,
      ...(early.length > 0 ? { early } : {}),
      ...(extend.length > 0 ? { extend } : {}),
      ...(earlyExtend.length > 0 ? { earlyExtend } : {}),
    };
  }

  private buildLegacyDirectVersionFromInput(input: {
    averageDistanceKm: number;
    averageTravelHours: number;
    isLongDistance: boolean;
    timeSlots: MultiDayBlockConnectionTimeSlotInput[];
    earlyTimeSlots?: MultiDayBlockConnectionTimeSlotInput[];
    extendTimeSlots?: MultiDayBlockConnectionTimeSlotInput[];
    earlyExtendTimeSlots?: MultiDayBlockConnectionTimeSlotInput[];
  }): NormalizedConnectionVersion {
    return {
      name: '기본',
      averageDistanceKm: input.averageDistanceKm,
      averageTravelHours: input.averageTravelHours,
      movementIntensity: calculateMovementIntensity(input.averageTravelHours),
      isLongDistance: input.isLongDistance,
      isDefault: true,
      timeSlotsByVariant: this.normalizeVariantTimeSlots(input),
    };
  }

  private buildVersionsFromExisting(existing: ExistingConnectionLike): NormalizedConnectionVersion[] {
    if (existing.versions.length > 0) {
      return existing.versions
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((version) => ({
          name: version.name,
          averageDistanceKm: version.averageDistanceKm,
          averageTravelHours: version.averageTravelHours,
          movementIntensity: calculateMovementIntensity(version.averageTravelHours),
          isLongDistance: version.isLongDistance,
          isDefault: version.isDefault,
          timeSlotsByVariant: this.mapTimeBlocksToVariantTimeSlots(version.scheduleTimeBlocks),
        }));
    }

    return [
      this.buildLegacyDirectVersionFromInput({
        averageDistanceKm: existing.averageDistanceKm,
        averageTravelHours: existing.averageTravelHours,
        isLongDistance: existing.isLongDistance,
        timeSlots: this.mapScheduleTimeBlocksToTimeSlots(existing.scheduleTimeBlocks, 'basic'),
        earlyTimeSlots: this.mapScheduleTimeBlocksToTimeSlots(existing.scheduleTimeBlocks, 'early'),
        extendTimeSlots: this.mapScheduleTimeBlocksToTimeSlots(existing.scheduleTimeBlocks, 'extend'),
        earlyExtendTimeSlots: this.mapScheduleTimeBlocksToTimeSlots(existing.scheduleTimeBlocks, 'earlyExtend'),
      }),
    ];
  }

  private normalizeVersionsFromInput(inputVersions: MultiDayBlockConnectionVersionInput[]): NormalizedConnectionVersion[] {
    return inputVersions.map((version) => ({
      name: version.name.trim(),
      averageDistanceKm: version.averageDistanceKm,
      averageTravelHours: version.averageTravelHours,
      movementIntensity: calculateMovementIntensity(version.averageTravelHours),
      isLongDistance: version.isLongDistance,
      isDefault: version.isDefault !== false,
      timeSlotsByVariant: this.normalizeVariantTimeSlots(version),
    }));
  }

  private hasLegacyDirectUpdates(input: MultiDayBlockConnectionUpdateDto): boolean {
    return (
      input.averageDistanceKm !== undefined ||
      input.averageTravelHours !== undefined ||
      input.isLongDistance !== undefined ||
      input.timeSlots !== undefined ||
      input.earlyTimeSlots !== undefined ||
      input.extendTimeSlots !== undefined ||
      input.earlyExtendTimeSlots !== undefined
    );
  }

  private getDefaultVersion(versions: NormalizedConnectionVersion[]): NormalizedConnectionVersion {
    const defaultVersion = versions.find((version) => version.isDefault);
    if (!defaultVersion) {
      throw new DomainError('VALIDATION_FAILED', 'Default version is required');
    }
    return defaultVersion;
  }

  private getRequiredVariants(toLocation: ConnectionTargetLocation): SegmentScheduleVariant[] {
    const variants: SegmentScheduleVariant[] = ['basic'];
    if (toLocation.isLastDayEligible) {
      variants.push('extend');
    }
    return variants;
  }

  private async validateEndpoints(
    fromMultiDayBlockId: string,
    toLocationId: string,
  ): Promise<{ fromBlockRegionId: string; toLocation: ConnectionTargetLocation }> {
    const overnightStay = await this.prisma.overnightStay.findUnique({
      where: { id: fromMultiDayBlockId },
      select: {
        id: true,
        regionId: true,
        days: {
          orderBy: { dayOrder: 'desc' },
          take: 1,
          select: {
            displayLocation: {
              select: { regionId: true },
            },
          },
        },
      },
    });
    if (!overnightStay) {
      throw new DomainError('VALIDATION_FAILED', 'Multi-day block not found for connection');
    }

    const toLocation = await this.prisma.location.findUnique({
      where: { id: toLocationId },
      select: { id: true, regionId: true, isLastDayEligible: true },
    });
    if (!toLocation) {
      throw new DomainError('VALIDATION_FAILED', 'Connection destination location not found');
    }

    return {
      fromBlockRegionId: overnightStay.days[0]?.displayLocation.regionId ?? overnightStay.regionId,
      toLocation,
    };
  }

  private async resolveOwningConnectionRegion(fromBlockRegionId: string): Promise<{ id: string; name: string }> {
    const region = await this.prisma.region.findUnique({
      where: { id: fromBlockRegionId },
      select: { id: true, name: true },
    });
    if (!region) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for multi-day block connection');
    }

    return region;
  }

  private assertRequiredVariantSchedules(
    version: NormalizedConnectionVersion,
    requiredVariants: SegmentScheduleVariant[],
  ): void {
    const versionLabel = version.name || 'Default';

    requiredVariants.forEach((variant) => {
      const timeSlots = version.timeSlotsByVariant[variant];
      if (!timeSlots || timeSlots.length === 0) {
        throw new DomainError('VALIDATION_FAILED', `Multi-day block connection version "${versionLabel}" requires ${variant} schedules`);
      }
    });
  }

  private async validateVersions(
    toLocation: ConnectionTargetLocation,
    versions: NormalizedConnectionVersion[],
  ): Promise<void> {
    const defaultVersions = versions.filter((version) => version.isDefault);
    if (defaultVersions.length !== 1) {
      throw new DomainError('VALIDATION_FAILED', 'Multi-day block connection must include exactly one default version');
    }

    const requiredVariants = this.getRequiredVariants(toLocation);
    versions.forEach((version) => this.assertRequiredVariantSchedules(version, requiredVariants));
  }

  private async replaceLegacyScheduleTimeBlocks(
    tx: Prisma.TransactionClient,
    overnightStayConnectionId: string,
    timeSlotsByVariant: VariantTimeSlotMap,
  ) {
    await tx.overnightStayConnectionTimeBlock.deleteMany({
      where: { overnightStayConnectionId },
    });

    for (const variant of SEGMENT_SCHEDULE_VARIANTS) {
      const timeSlots = timeSlotsByVariant[variant];
      if (!timeSlots || timeSlots.length === 0) {
        continue;
      }

      const normalizedSlots = this.normalizeTimeSlots(timeSlots);
      for (const [orderIndex, slot] of normalizedSlots.entries()) {
        const createdTimeBlock = await tx.overnightStayConnectionTimeBlock.create({
          data: {
            overnightStayConnectionId,
            variant,
            startTime: slot.startTime,
            label: slot.label,
            orderIndex,
          },
        });

        if (slot.activities.length > 0) {
          await tx.overnightStayConnectionActivity.createMany({
            data: slot.activities.map((description, activityIndex) => ({
              overnightStayConnectionTimeBlockId: createdTimeBlock.id,
              description,
              orderIndex: activityIndex,
              isOptional: false,
              conditionNote: null,
            })),
          });
        }
      }
    }
  }

  private async replaceVersionTimeBlocks(
    tx: Prisma.TransactionClient,
    overnightStayConnectionVersionId: string,
    timeSlotsByVariant: VariantTimeSlotMap,
  ) {
    await tx.overnightStayConnectionVersionTimeBlock.deleteMany({
      where: { overnightStayConnectionVersionId },
    });

    for (const variant of SEGMENT_SCHEDULE_VARIANTS) {
      const timeSlots = timeSlotsByVariant[variant];
      if (!timeSlots || timeSlots.length === 0) {
        continue;
      }

      const normalizedSlots = this.normalizeTimeSlots(timeSlots);
      for (const [orderIndex, slot] of normalizedSlots.entries()) {
        const createdTimeBlock = await tx.overnightStayConnectionVersionTimeBlock.create({
          data: {
            overnightStayConnectionVersionId,
            variant,
            startTime: slot.startTime,
            label: slot.label,
            orderIndex,
          },
        });

        if (slot.activities.length > 0) {
          await tx.overnightStayConnectionVersionActivity.createMany({
            data: slot.activities.map((description, activityIndex) => ({
              overnightStayConnectionVersionTimeBlockId: createdTimeBlock.id,
              description,
              orderIndex: activityIndex,
              isOptional: false,
              conditionNote: null,
            })),
          });
        }
      }
    }
  }

  private async syncDefaultMirror(
    tx: Prisma.TransactionClient,
    overnightStayConnectionId: string,
    defaultVersionId: string,
    defaultVersion: NormalizedConnectionVersion,
  ) {
    await tx.overnightStayConnection.update({
      where: { id: overnightStayConnectionId },
      data: {
        defaultVersionId,
        averageDistanceKm: defaultVersion.averageDistanceKm,
        averageTravelHours: defaultVersion.averageTravelHours,
        movementIntensity: defaultVersion.movementIntensity,
        isLongDistance: defaultVersion.isLongDistance,
      },
    });

    await this.replaceLegacyScheduleTimeBlocks(tx, overnightStayConnectionId, defaultVersion.timeSlotsByVariant);
  }

  private async replaceAllVersions(
    tx: Prisma.TransactionClient,
    overnightStayConnectionId: string,
    versions: NormalizedConnectionVersion[],
  ): Promise<string> {
    await tx.overnightStayConnectionVersion.deleteMany({
      where: { overnightStayConnectionId },
    });

    let defaultVersionId = '';

    for (const [sortOrder, version] of versions.entries()) {
      const createdVersion = await tx.overnightStayConnectionVersion.create({
        data: {
          overnightStayConnectionId,
          name: version.name,
          averageDistanceKm: version.averageDistanceKm,
          averageTravelHours: version.averageTravelHours,
          movementIntensity: version.movementIntensity,
          isLongDistance: version.isLongDistance,
          sortOrder,
          isDefault: version.isDefault,
        },
      });

      await this.replaceVersionTimeBlocks(tx, createdVersion.id, version.timeSlotsByVariant);

      if (version.isDefault) {
        defaultVersionId = createdVersion.id;
      }
    }

    if (!defaultVersionId) {
      throw new DomainError('VALIDATION_FAILED', 'Default version is required');
    }

    return defaultVersionId;
  }

  private async upsertDefaultVersionOnly(
    tx: Prisma.TransactionClient,
    overnightStayConnectionId: string,
    defaultVersion: NormalizedConnectionVersion,
  ): Promise<string> {
    const existingDefaultVersion = await tx.overnightStayConnectionVersion.findFirst({
      where: { overnightStayConnectionId, isDefault: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    });

    if (!existingDefaultVersion) {
      const createdVersion = await tx.overnightStayConnectionVersion.create({
        data: {
          overnightStayConnectionId,
          name: defaultVersion.name || '기본',
          averageDistanceKm: defaultVersion.averageDistanceKm,
          averageTravelHours: defaultVersion.averageTravelHours,
          movementIntensity: defaultVersion.movementIntensity,
          isLongDistance: defaultVersion.isLongDistance,
          sortOrder: 0,
          isDefault: true,
        },
      });

      await this.replaceVersionTimeBlocks(tx, createdVersion.id, defaultVersion.timeSlotsByVariant);
      return createdVersion.id;
    }

    await tx.overnightStayConnectionVersion.update({
      where: { id: existingDefaultVersion.id },
      data: {
        name: existingDefaultVersion.name || defaultVersion.name || '기본',
        averageDistanceKm: defaultVersion.averageDistanceKm,
        averageTravelHours: defaultVersion.averageTravelHours,
        movementIntensity: defaultVersion.movementIntensity,
        isLongDistance: defaultVersion.isLongDistance,
        sortOrder: 0,
        isDefault: true,
      },
    });

    await this.replaceVersionTimeBlocks(tx, existingDefaultVersion.id, defaultVersion.timeSlotsByVariant);
    return existingDefaultVersion.id;
  }

  async create(input: MultiDayBlockConnectionCreateDto) {
    const parsed = multiDayBlockConnectionCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid multi-day block connection input', parsed.error);
    }

    const endpoints = await this.validateEndpoints(parsed.data.fromMultiDayBlockId, parsed.data.toLocationId);
    const owningRegion = await this.resolveOwningConnectionRegion(endpoints.fromBlockRegionId);

    const nextVersions = parsed.data.versions
      ? this.normalizeVersionsFromInput(parsed.data.versions)
      : [this.buildLegacyDirectVersionFromInput(parsed.data)];
    await this.validateVersions(endpoints.toLocation, nextVersions);
    const defaultVersion = this.getDefaultVersion(nextVersions);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.overnightStayConnection.create({
        data: {
          regionId: owningRegion.id,
          regionName: owningRegion.name,
          fromOvernightStayId: parsed.data.fromMultiDayBlockId,
          toLocationId: parsed.data.toLocationId,
          averageDistanceKm: defaultVersion.averageDistanceKm,
          averageTravelHours: defaultVersion.averageTravelHours,
          movementIntensity: defaultVersion.movementIntensity,
          isLongDistance: defaultVersion.isLongDistance,
        },
      });

      const defaultVersionId = await this.replaceAllVersions(tx, created.id, nextVersions);
      await this.syncDefaultMirror(tx, created.id, defaultVersionId, defaultVersion);

      return new MultiDayBlockConnectionRepository(tx).findById(created.id);
    });
  }

  async createBulk(input: MultiDayBlockConnectionBulkCreateDto) {
    const parsed = multiDayBlockConnectionBulkCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid multi-day block connection bulk input', parsed.error);
    }

    const { fromMultiDayBlockIds, toLocationId } = parsed.data;
    const uniqueFromIds = Array.from(new Set(fromMultiDayBlockIds));

    const toLocation = await this.prisma.location.findUnique({
      where: { id: toLocationId },
      select: { id: true, regionId: true, isLastDayEligible: true },
    });
    if (!toLocation) {
      throw new DomainError('VALIDATION_FAILED', 'Connection destination location not found');
    }

    const overnightStays = await this.prisma.overnightStay.findMany({
      where: { id: { in: uniqueFromIds } },
      select: {
        id: true,
        regionId: true,
        days: {
          orderBy: { dayOrder: 'desc' },
          take: 1,
          select: {
            displayLocation: { select: { regionId: true } },
          },
        },
      },
    });
    if (overnightStays.length !== uniqueFromIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more multi-day blocks not found for connection');
    }
    const fromBlockRegionByBlockId = new Map(
      overnightStays.map((stay) => [stay.id, stay.days[0]?.displayLocation.regionId ?? stay.regionId]),
    );

    const fromBlockRegionIds = Array.from(new Set(fromBlockRegionByBlockId.values()));
    const regions = await this.prisma.region.findMany({
      where: { id: { in: fromBlockRegionIds } },
      select: { id: true, name: true },
    });
    if (regions.length !== fromBlockRegionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for one or more multi-day block connections');
    }
    const regionById = new Map(regions.map((region) => [region.id, region]));

    const existingConnections = await this.prisma.overnightStayConnection.findMany({
      where: { toLocationId, fromOvernightStayId: { in: uniqueFromIds } },
      select: { fromOvernightStayId: true },
    });
    if (existingConnections.length > 0) {
      const existingFromIds = existingConnections.map((connection) => connection.fromOvernightStayId);
      throw new DomainError(
        'VALIDATION_FAILED',
        `Multi-day block connections already exist for from-blocks: ${existingFromIds.join(', ')}`,
      );
    }

    const nextVersions = parsed.data.versions
      ? this.normalizeVersionsFromInput(parsed.data.versions)
      : [
          this.buildLegacyDirectVersionFromInput({
            averageDistanceKm: parsed.data.averageDistanceKm,
            averageTravelHours: parsed.data.averageTravelHours,
            isLongDistance: parsed.data.isLongDistance,
            timeSlots: parsed.data.timeSlots,
            earlyTimeSlots: parsed.data.earlyTimeSlots,
            extendTimeSlots: parsed.data.extendTimeSlots,
            earlyExtendTimeSlots: parsed.data.earlyExtendTimeSlots,
          }),
        ];
    await this.validateVersions(toLocation, nextVersions);
    const defaultVersion = this.getDefaultVersion(nextVersions);

    return this.prisma.$transaction(async (tx) => {
      const repository = new MultiDayBlockConnectionRepository(tx);
      const created: NonNullable<Awaited<ReturnType<MultiDayBlockConnectionRepository['findById']>>>[] = [];

      for (const fromMultiDayBlockId of uniqueFromIds) {
        const fromBlockRegionId = fromBlockRegionByBlockId.get(fromMultiDayBlockId)!;
        const owningRegion = regionById.get(fromBlockRegionId)!;

        const newConnection = await tx.overnightStayConnection.create({
          data: {
            regionId: owningRegion.id,
            regionName: owningRegion.name,
            fromOvernightStayId: fromMultiDayBlockId,
            toLocationId,
            averageDistanceKm: defaultVersion.averageDistanceKm,
            averageTravelHours: defaultVersion.averageTravelHours,
            movementIntensity: defaultVersion.movementIntensity,
            isLongDistance: defaultVersion.isLongDistance,
          },
        });

        const defaultVersionId = await this.replaceAllVersions(tx, newConnection.id, nextVersions);
        await this.syncDefaultMirror(tx, newConnection.id, defaultVersionId, defaultVersion);

        const reloaded = await repository.findById(newConnection.id);
        if (!reloaded) {
          throw new DomainError('INTERNAL', 'Failed to load created multi-day block connection');
        }
        created.push(reloaded);
      }

      return created;
    });
  }

  private async prepareMdbConnectionUpdate(
    _id: string,
    data: MultiDayBlockConnectionUpdateInput,
    existing: NonNullable<Awaited<ReturnType<MultiDayBlockConnectionRepository['findById']>>>,
  ): Promise<PreparedMdbConnectionUpdate> {
    const nextFromMultiDayBlockId = data.fromMultiDayBlockId ?? existing.fromOvernightStayId;
    const nextToLocationId = data.toLocationId ?? existing.toLocationId;

    const endpoints = await this.validateEndpoints(nextFromMultiDayBlockId, nextToLocationId);
    const owningRegion = await this.resolveOwningConnectionRegion(endpoints.fromBlockRegionId);

    const existingVersions = this.buildVersionsFromExisting(existing as ExistingConnectionLike);
    const hasLegacyDirectUpdates = this.hasLegacyDirectUpdates(data);

    let nextVersions = data.versions ? this.normalizeVersionsFromInput(data.versions) : existingVersions;

    if (!data.versions && hasLegacyDirectUpdates) {
      nextVersions = existingVersions.map((version) =>
        version.isDefault
          ? {
              ...version,
              averageDistanceKm: data.averageDistanceKm ?? version.averageDistanceKm,
              averageTravelHours: data.averageTravelHours ?? version.averageTravelHours,
              movementIntensity: calculateMovementIntensity(data.averageTravelHours ?? version.averageTravelHours),
              isLongDistance: data.isLongDistance ?? version.isLongDistance,
              timeSlotsByVariant: {
                basic: data.timeSlots ?? version.timeSlotsByVariant.basic,
                early: data.earlyTimeSlots ?? version.timeSlotsByVariant.early,
                extend: data.extendTimeSlots ?? version.timeSlotsByVariant.extend,
                earlyExtend: data.earlyExtendTimeSlots ?? version.timeSlotsByVariant.earlyExtend,
              },
            }
          : version,
      );
    }

    await this.validateVersions(endpoints.toLocation, nextVersions);
    const defaultVersion = this.getDefaultVersion(nextVersions);
    const shouldSyncOwningRegion = data.fromMultiDayBlockId !== undefined || existing.regionId !== owningRegion.id;

    return {
      nextFromMultiDayBlockId,
      nextToLocationId,
      endpoints,
      owningRegion,
      nextVersions,
      defaultVersion,
      hasLegacyDirectUpdates,
      shouldSyncOwningRegion,
      data,
    };
  }

  private async applyMdbConnectionUpdateInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    existing: NonNullable<Awaited<ReturnType<MultiDayBlockConnectionRepository['findById']>>>,
    state: PreparedMdbConnectionUpdate,
  ) {
    const { data, nextVersions, defaultVersion, hasLegacyDirectUpdates, shouldSyncOwningRegion, owningRegion } = state;

    await tx.overnightStayConnection.update({
      where: { id },
      data: {
        ...(shouldSyncOwningRegion ? { regionId: owningRegion.id, regionName: owningRegion.name } : {}),
        ...(data.fromMultiDayBlockId !== undefined ? { fromOvernightStayId: data.fromMultiDayBlockId } : {}),
        ...(data.toLocationId !== undefined ? { toLocationId: data.toLocationId } : {}),
      },
    });

    let defaultVersionId = existing.defaultVersionId ?? '';
    if (data.versions) {
      defaultVersionId = await this.replaceAllVersions(tx, id, nextVersions);
      await this.syncDefaultMirror(tx, id, defaultVersionId, defaultVersion);
    } else if (hasLegacyDirectUpdates || existing.versions.length === 0) {
      defaultVersionId = await this.upsertDefaultVersionOnly(tx, id, defaultVersion);
      await this.syncDefaultMirror(tx, id, defaultVersionId, defaultVersion);
    } else if (data.fromMultiDayBlockId !== undefined || data.toLocationId !== undefined) {
      await tx.overnightStayConnection.update({
        where: { id },
        data: {
          defaultVersionId: existing.defaultVersionId,
        },
      });
    }

    return new MultiDayBlockConnectionRepository(tx).findById(id);
  }

  private async createMdbConnectionInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      fromMultiDayBlockId: string;
      toLocation: ConnectionTargetLocation;
      owningRegion: { id: string; name: string };
      nextVersions: NormalizedConnectionVersion[];
    },
  ) {
    const { toLocation, owningRegion, nextVersions, fromMultiDayBlockId } = params;
    const defaultVersion = this.getDefaultVersion(nextVersions);

    const newConnection = await tx.overnightStayConnection.create({
      data: {
        regionId: owningRegion.id,
        regionName: owningRegion.name,
        fromOvernightStayId: fromMultiDayBlockId,
        toLocationId: toLocation.id,
        averageDistanceKm: defaultVersion.averageDistanceKm,
        averageTravelHours: defaultVersion.averageTravelHours,
        movementIntensity: defaultVersion.movementIntensity,
        isLongDistance: defaultVersion.isLongDistance,
      },
    });

    const defaultVersionId = await this.replaceAllVersions(tx, newConnection.id, nextVersions);
    await this.syncDefaultMirror(tx, newConnection.id, defaultVersionId, defaultVersion);

    const reloaded = await new MultiDayBlockConnectionRepository(tx).findById(newConnection.id);
    if (!reloaded) {
      throw new DomainError('INTERNAL', 'Failed to load created multi-day block connection');
    }
    return reloaded;
  }

  async updateWithAdditionalFroms(connectionId: string, input: MultiDayBlockConnectionUpdateWithAdditionalFromsDto) {
    const parsed = multiDayBlockConnectionUpdateWithAdditionalFromsSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid multi-day block connection update with additional from-blocks', parsed.error);
    }

    const updateParsed = multiDayBlockConnectionUpdateSchema.safeParse(parsed.data.update);
    if (!updateParsed.success) {
      throw createValidationError('Invalid multi-day block connection update input', updateParsed.error);
    }

    const existing = await this.repository.findById(connectionId);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Multi-day block connection not found');
    }

    const state = await this.prepareMdbConnectionUpdate(connectionId, updateParsed.data, existing);
    const toLocation = state.endpoints.toLocation;

    const uniqueAdditional = Array.from(new Set(parsed.data.additionalFromMultiDayBlockIds)).filter(
      (fromId) => fromId !== state.nextFromMultiDayBlockId && fromId !== toLocation.id,
    );

    if (uniqueAdditional.length === 0) {
      return this.prisma.$transaction((tx) =>
        this.applyMdbConnectionUpdateInTransaction(tx, connectionId, existing, state),
      ).then((primary) => (primary ? [primary] : []));
    }

    const overnightStays = await this.prisma.overnightStay.findMany({
      where: { id: { in: uniqueAdditional } },
      select: {
        id: true,
        regionId: true,
        days: {
          orderBy: { dayOrder: 'desc' },
          take: 1,
          select: {
            displayLocation: { select: { regionId: true } },
          },
        },
      },
    });
    if (overnightStays.length !== uniqueAdditional.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more additional multi-day blocks not found for connection');
    }
    const fromBlockRegionByBlockId = new Map(
      overnightStays.map((stay) => [stay.id, stay.days[0]?.displayLocation.regionId ?? stay.regionId]),
    );

    const existingConnections = await this.prisma.overnightStayConnection.findMany({
      where: { toLocationId: toLocation.id, fromOvernightStayId: { in: uniqueAdditional } },
      select: { fromOvernightStayId: true },
    });
    if (existingConnections.length > 0) {
      const fromIds = existingConnections.map((c) => c.fromOvernightStayId);
      throw new DomainError('VALIDATION_FAILED', `Multi-day block connections already exist for from-blocks: ${fromIds.join(', ')}`);
    }

    await this.validateVersions(toLocation, state.nextVersions);

    const fromBlockRegionIds = Array.from(new Set(fromBlockRegionByBlockId.values()));
    const regions = await this.prisma.region.findMany({
      where: { id: { in: fromBlockRegionIds } },
      select: { id: true, name: true },
    });
    if (regions.length !== fromBlockRegionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for one or more additional from-blocks');
    }
    const regionById = new Map(regions.map((r) => [r.id, r]));

    return this.prisma.$transaction(async (tx) => {
      const primary = await this.applyMdbConnectionUpdateInTransaction(tx, connectionId, existing, state);
      if (!primary) {
        throw new DomainError('INTERNAL', 'Failed to load updated multi-day block connection');
      }

      const created: NonNullable<Awaited<ReturnType<MultiDayBlockConnectionRepository['findById']>>>[] = [];
      for (const fromMultiDayBlockId of uniqueAdditional) {
        const fromBlockRegionId = fromBlockRegionByBlockId.get(fromMultiDayBlockId)!;
        const owningRegion = regionById.get(fromBlockRegionId)!;
        const row = await this.createMdbConnectionInTransaction(tx, {
          fromMultiDayBlockId,
          toLocation,
          owningRegion,
          nextVersions: state.nextVersions,
        });
        created.push(row);
      }
      return [primary, ...created];
    });
  }

  async update(id: string, input: MultiDayBlockConnectionUpdateDto) {
    const parsed = multiDayBlockConnectionUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid multi-day block connection update input', parsed.error);
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Multi-day block connection not found');
    }

    const state = await this.prepareMdbConnectionUpdate(id, parsed.data, existing);

    return this.prisma.$transaction(async (tx) => this.applyMdbConnectionUpdateInTransaction(tx, id, existing, state));
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
