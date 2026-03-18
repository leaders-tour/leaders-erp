import type { MovementIntensity, Prisma, PrismaClient } from '@prisma/client';
import {
  multiDayBlockConnectionCreateSchema,
  multiDayBlockConnectionUpdateSchema,
  multiDayBlockCreateSchema,
  multiDayBlockUpdateSchema,
  type MultiDayBlockConnectionTimeSlotInput,
  type MultiDayBlockConnectionVersionInput,
} from '@tour/validation';
import { createValidationError, DomainError } from '../../lib/errors';
import { calculateMovementIntensity } from '../../lib/movement-intensity';
import { MultiDayBlockConnectionRepository, MultiDayBlockRepository } from './multi-day-block.repository';
import type {
  MultiDayBlockConnectionCreateDto,
  MultiDayBlockConnectionUpdateDto,
  MultiDayBlockCreateDto,
  MultiDayBlockUpdateDto,
} from './multi-day-block.types';

type SegmentScheduleVariant = 'basic' | 'early' | 'extend' | 'earlyExtend';

interface OvernightStayListFilter {
  regionId?: string;
  activeOnly?: boolean;
}

interface MultiDayBlockConnectionListFilter {
  regionId?: string;
  fromMultiDayBlockId?: string;
}

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

  private async validateRegionAndLocation(regionId: string, locationId: string): Promise<void> {
    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
      select: { id: true },
    });
    if (!region) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for overnight stay');
    }

    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, regionId: true },
    });
    if (!location) {
      throw new DomainError('VALIDATION_FAILED', 'Location not found for overnight stay');
    }
    if (location.regionId !== regionId) {
      throw new DomainError('VALIDATION_FAILED', 'Overnight stay location must belong to the selected region');
    }

  }

  async create(input: MultiDayBlockCreateDto) {
    const parsed = multiDayBlockCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid overnight stay input', parsed.error);
    }

    await this.validateRegionAndLocation(parsed.data.regionId, parsed.data.locationId);

    const blockType = parsed.data.blockType ?? 'STAY';
    const startLocationId = parsed.data.startLocationId ?? parsed.data.locationId;
    const endLocationId = parsed.data.endLocationId ?? parsed.data.locationId;
    if (blockType === 'STAY' && startLocationId !== endLocationId) {
      throw new DomainError('VALIDATION_FAILED', 'STAY block must have startLocationId equal to endLocationId');
    }
    if (blockType === 'TRANSFER' && startLocationId === endLocationId) {
      throw new DomainError('VALIDATION_FAILED', 'TRANSFER block must have startLocationId different from endLocationId');
    }

    const normalizedDays = parsed.data.days.map((day) => ({
      ...day,
      displayLocationId: day.displayLocationId ?? (blockType === 'STAY' ? parsed.data.locationId : startLocationId),
      movementIntensity: calculateMovementIntensity(day.averageTravelHours),
    }));

    return this.prisma.$transaction(async (tx) => {
      const repository = new MultiDayBlockRepository(tx);
      const created = await tx.overnightStay.create({
        data: {
          regionId: parsed.data.regionId,
          locationId: parsed.data.locationId,
          blockType,
          startLocationId,
          endLocationId,
          name: parsed.data.name.trim(),
          sortOrder: parsed.data.sortOrder,
          isActive: parsed.data.isActive,
        },
      });

      await repository.replaceDays(created.id, normalizedDays);
      const result = await repository.findById(created.id);
      if (!result) {
        throw new DomainError('INTERNAL', 'Failed to load created overnight stay');
      }
      return result;
    });
  }

  async update(id: string, input: MultiDayBlockUpdateDto) {
    const parsed = multiDayBlockUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid overnight stay update input', parsed.error);
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Overnight stay not found');
    }

    const nextRegionId = parsed.data.regionId ?? existing.regionId;
    const nextLocationId = parsed.data.locationId ?? existing.locationId;
    await this.validateRegionAndLocation(nextRegionId, nextLocationId);

    const blockType = parsed.data.blockType ?? existing.blockType ?? 'STAY';
    const startLocationId = parsed.data.startLocationId ?? existing.startLocationId ?? nextLocationId;
    const endLocationId = parsed.data.endLocationId ?? existing.endLocationId ?? nextLocationId;
    if (blockType === 'STAY' && startLocationId !== endLocationId) {
      throw new DomainError('VALIDATION_FAILED', 'STAY block must have startLocationId equal to endLocationId');
    }
    if (blockType === 'TRANSFER' && startLocationId === endLocationId) {
      throw new DomainError('VALIDATION_FAILED', 'TRANSFER block must have startLocationId different from endLocationId');
    }

    return this.prisma.$transaction(async (tx) => {
      const repository = new MultiDayBlockRepository(tx);
      await tx.overnightStay.update({
        where: { id },
        data: {
          ...(parsed.data.regionId !== undefined ? { regionId: nextRegionId } : {}),
          ...(parsed.data.locationId !== undefined ? { locationId: nextLocationId } : {}),
          ...(parsed.data.blockType !== undefined ? { blockType } : {}),
          ...(parsed.data.startLocationId !== undefined ? { startLocationId } : {}),
          ...(parsed.data.endLocationId !== undefined ? { endLocationId } : {}),
          ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
          ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        },
      });

      if (parsed.data.days) {
        await repository.replaceDays(
          id,
          parsed.data.days.map((day) => ({
            ...day,
            displayLocationId:
              day.displayLocationId ?? (blockType === 'STAY' ? nextLocationId : existing.startLocationId ?? nextLocationId),
            movementIntensity: calculateMovementIntensity(day.averageTravelHours),
          })),
        );
      }

      const result = await repository.findById(id);
      if (!result) {
        throw new DomainError('INTERNAL', 'Failed to load updated overnight stay');
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
      name: 'Direct',
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
    regionId: string,
    fromMultiDayBlockId: string,
    toLocationId: string,
  ): Promise<{ toLocation: ConnectionTargetLocation }> {
    const overnightStay = await this.prisma.overnightStay.findUnique({
      where: { id: fromMultiDayBlockId },
      select: { id: true, regionId: true },
    });
    if (!overnightStay) {
      throw new DomainError('VALIDATION_FAILED', 'Overnight stay not found for connection');
    }
    if (overnightStay.regionId !== regionId) {
      throw new DomainError('VALIDATION_FAILED', 'Overnight stay must belong to the selected region');
    }

    const toLocation = await this.prisma.location.findUnique({
      where: { id: toLocationId },
      select: { id: true, regionId: true, isLastDayEligible: true },
    });
    if (!toLocation) {
      throw new DomainError('VALIDATION_FAILED', 'Connection destination location not found');
    }
    if (toLocation.regionId !== regionId) {
      throw new DomainError('VALIDATION_FAILED', 'Connection destination must belong to the selected region');
    }

    return { toLocation };
  }

  private assertRequiredVariantSchedules(
    version: NormalizedConnectionVersion,
    requiredVariants: SegmentScheduleVariant[],
  ): void {
    const versionLabel = version.name || 'Default';

    requiredVariants.forEach((variant) => {
      const timeSlots = version.timeSlotsByVariant[variant];
      if (!timeSlots || timeSlots.length === 0) {
        throw new DomainError('VALIDATION_FAILED', `Overnight stay connection version "${versionLabel}" requires ${variant} schedules`);
      }
    });
  }

  private async validateVersions(
    toLocation: ConnectionTargetLocation,
    versions: NormalizedConnectionVersion[],
  ): Promise<void> {
    const defaultVersions = versions.filter((version) => version.isDefault);
    if (defaultVersions.length !== 1) {
      throw new DomainError('VALIDATION_FAILED', 'Overnight stay connection must include exactly one default version');
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
          name: defaultVersion.name || 'Direct',
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
        name: existingDefaultVersion.name || defaultVersion.name || 'Direct',
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
      throw createValidationError('Invalid overnight stay connection input', parsed.error);
    }

    const region = await this.prisma.region.findUnique({
      where: { id: parsed.data.regionId },
      select: { name: true },
    });
    if (!region) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for overnight stay connection');
    }

    const endpoints = await this.validateEndpoints(parsed.data.regionId, parsed.data.fromMultiDayBlockId, parsed.data.toLocationId);

    const nextVersions = parsed.data.versions
      ? this.normalizeVersionsFromInput(parsed.data.versions)
      : [this.buildLegacyDirectVersionFromInput(parsed.data)];
    await this.validateVersions(endpoints.toLocation, nextVersions);
    const defaultVersion = this.getDefaultVersion(nextVersions);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.overnightStayConnection.create({
        data: {
          regionId: parsed.data.regionId,
          regionName: region.name,
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

  async update(id: string, input: MultiDayBlockConnectionUpdateDto) {
    const parsed = multiDayBlockConnectionUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid overnight stay connection update input', parsed.error);
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Overnight stay connection not found');
    }

    const nextRegionId = parsed.data.regionId ?? existing.regionId;
    const nextFromMultiDayBlockId = parsed.data.fromMultiDayBlockId ?? existing.fromOvernightStayId;
    const nextToLocationId = parsed.data.toLocationId ?? existing.toLocationId;

    const region = await this.prisma.region.findUnique({
      where: { id: nextRegionId },
      select: { name: true },
    });
    if (!region) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for overnight stay connection update');
    }

    const endpoints = await this.validateEndpoints(nextRegionId, nextFromMultiDayBlockId, nextToLocationId);

    const existingVersions = this.buildVersionsFromExisting(existing as ExistingConnectionLike);
    const hasLegacyDirectUpdates = this.hasLegacyDirectUpdates(parsed.data);

    let nextVersions = parsed.data.versions ? this.normalizeVersionsFromInput(parsed.data.versions) : existingVersions;

    if (!parsed.data.versions && hasLegacyDirectUpdates) {
      nextVersions = existingVersions.map((version) =>
        version.isDefault
          ? {
              ...version,
              averageDistanceKm: parsed.data.averageDistanceKm ?? version.averageDistanceKm,
              averageTravelHours: parsed.data.averageTravelHours ?? version.averageTravelHours,
              movementIntensity: calculateMovementIntensity(parsed.data.averageTravelHours ?? version.averageTravelHours),
              isLongDistance: parsed.data.isLongDistance ?? version.isLongDistance,
              timeSlotsByVariant: {
                basic: parsed.data.timeSlots ?? version.timeSlotsByVariant.basic,
                early: parsed.data.earlyTimeSlots ?? version.timeSlotsByVariant.early,
                extend: parsed.data.extendTimeSlots ?? version.timeSlotsByVariant.extend,
                earlyExtend: parsed.data.earlyExtendTimeSlots ?? version.timeSlotsByVariant.earlyExtend,
              },
            }
          : version,
      );
    }

    await this.validateVersions(endpoints.toLocation, nextVersions);
    const defaultVersion = this.getDefaultVersion(nextVersions);

    return this.prisma.$transaction(async (tx) => {
      await tx.overnightStayConnection.update({
        where: { id },
        data: {
          ...(parsed.data.regionId !== undefined ? { regionId: nextRegionId, regionName: region.name } : {}),
          ...(parsed.data.fromMultiDayBlockId !== undefined ? { fromOvernightStayId: parsed.data.fromMultiDayBlockId } : {}),
          ...(parsed.data.toLocationId !== undefined ? { toLocationId: parsed.data.toLocationId } : {}),
        },
      });

      let defaultVersionId = existing.defaultVersionId ?? '';
      if (parsed.data.versions) {
        defaultVersionId = await this.replaceAllVersions(tx, id, nextVersions);
        await this.syncDefaultMirror(tx, id, defaultVersionId, defaultVersion);
      } else if (hasLegacyDirectUpdates || existing.versions.length === 0) {
        defaultVersionId = await this.upsertDefaultVersionOnly(tx, id, defaultVersion);
        await this.syncDefaultMirror(tx, id, defaultVersionId, defaultVersion);
      } else if (
        parsed.data.regionId !== undefined ||
        parsed.data.fromMultiDayBlockId !== undefined ||
        parsed.data.toLocationId !== undefined
      ) {
        await tx.overnightStayConnection.update({
          where: { id },
          data: {
            defaultVersionId: existing.defaultVersionId,
          },
        });
      }

      return new MultiDayBlockConnectionRepository(tx).findById(id);
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
