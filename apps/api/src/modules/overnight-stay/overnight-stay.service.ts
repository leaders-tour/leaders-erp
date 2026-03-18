import type { Prisma, PrismaClient } from '@prisma/client';
import {
  overnightStayConnectionCreateSchema,
  overnightStayConnectionUpdateSchema,
  overnightStayCreateSchema,
  overnightStayUpdateSchema,
  type OvernightStayConnectionTimeSlotInput,
  type OvernightStayConnectionVersionInput,
} from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { OvernightStayConnectionRepository, OvernightStayRepository } from './overnight-stay.repository';
import type {
  OvernightStayConnectionCreateDto,
  OvernightStayConnectionUpdateDto,
  OvernightStayCreateDto,
  OvernightStayUpdateDto,
} from './overnight-stay.types';

type SegmentScheduleVariant = 'basic' | 'early' | 'extend' | 'earlyExtend';

interface OvernightStayListFilter {
  regionId?: string;
  activeOnly?: boolean;
}

interface OvernightStayConnectionListFilter {
  regionId?: string;
  fromOvernightStayId?: string;
}

interface NormalizedTimeSlot {
  startTime: string;
  label: string;
  activities: string[];
}

interface VariantTimeSlotMap {
  basic: OvernightStayConnectionTimeSlotInput[];
  early?: OvernightStayConnectionTimeSlotInput[];
  extend?: OvernightStayConnectionTimeSlotInput[];
  earlyExtend?: OvernightStayConnectionTimeSlotInput[];
}

interface NormalizedConnectionVersion {
  name: string;
  averageDistanceKm: number;
  averageTravelHours: number;
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

export class OvernightStayService {
  private readonly repository: OvernightStayRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new OvernightStayRepository(prisma);
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

  async create(input: OvernightStayCreateDto) {
    const parsed = overnightStayCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid overnight stay input');
    }

    await this.validateRegionAndLocation(parsed.data.regionId, parsed.data.locationId);

    return this.prisma.$transaction(async (tx) => {
      const repository = new OvernightStayRepository(tx);
      const created = await tx.overnightStay.create({
        data: {
          regionId: parsed.data.regionId,
          locationId: parsed.data.locationId,
          name: parsed.data.name.trim(),
          sortOrder: parsed.data.sortOrder,
          isActive: parsed.data.isActive,
        },
      });

      await repository.replaceDays(created.id, parsed.data.days);
      const result = await repository.findById(created.id);
      if (!result) {
        throw new DomainError('INTERNAL', 'Failed to load created overnight stay');
      }
      return result;
    });
  }

  async update(id: string, input: OvernightStayUpdateDto) {
    const parsed = overnightStayUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid overnight stay update input');
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Overnight stay not found');
    }

    const nextRegionId = parsed.data.regionId ?? existing.regionId;
    const nextLocationId = parsed.data.locationId ?? existing.locationId;
    await this.validateRegionAndLocation(nextRegionId, nextLocationId);

    return this.prisma.$transaction(async (tx) => {
      const repository = new OvernightStayRepository(tx);
      await tx.overnightStay.update({
        where: { id },
        data: {
          ...(parsed.data.regionId !== undefined ? { regionId: nextRegionId } : {}),
          ...(parsed.data.locationId !== undefined ? { locationId: nextLocationId } : {}),
          ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
          ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        },
      });

      if (parsed.data.days) {
        await repository.replaceDays(id, parsed.data.days);
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

export class OvernightStayConnectionService {
  private readonly repository: OvernightStayConnectionRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new OvernightStayConnectionRepository(prisma);
  }

  list(filter: OvernightStayConnectionListFilter = {}) {
    return this.repository.findMany(filter);
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  private normalizeTimeSlots(timeSlots: OvernightStayConnectionTimeSlotInput[]): NormalizedTimeSlot[] {
    return timeSlots.map((slot) => ({
      startTime: slot.startTime,
      label: slot.startTime,
      activities: slot.activities.map((activity) => activity.trim()).filter((activity) => activity.length > 0),
    }));
  }

  private cloneTimeSlots(
    timeSlots: OvernightStayConnectionTimeSlotInput[] | undefined,
  ): OvernightStayConnectionTimeSlotInput[] | undefined {
    if (!timeSlots) {
      return undefined;
    }

    return timeSlots.map((slot) => ({
      startTime: slot.startTime,
      activities: [...slot.activities],
    }));
  }

  private normalizeVariantTimeSlots(input: {
    timeSlots: OvernightStayConnectionTimeSlotInput[];
    earlyTimeSlots?: OvernightStayConnectionTimeSlotInput[];
    extendTimeSlots?: OvernightStayConnectionTimeSlotInput[];
    earlyExtendTimeSlots?: OvernightStayConnectionTimeSlotInput[];
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
  ): OvernightStayConnectionTimeSlotInput[] {
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
    timeSlots: OvernightStayConnectionTimeSlotInput[];
    earlyTimeSlots?: OvernightStayConnectionTimeSlotInput[];
    extendTimeSlots?: OvernightStayConnectionTimeSlotInput[];
    earlyExtendTimeSlots?: OvernightStayConnectionTimeSlotInput[];
  }): NormalizedConnectionVersion {
    return {
      name: 'Direct',
      averageDistanceKm: input.averageDistanceKm,
      averageTravelHours: input.averageTravelHours,
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

  private normalizeVersionsFromInput(inputVersions: OvernightStayConnectionVersionInput[]): NormalizedConnectionVersion[] {
    return inputVersions.map((version) => ({
      name: version.name.trim(),
      averageDistanceKm: version.averageDistanceKm,
      averageTravelHours: version.averageTravelHours,
      isLongDistance: version.isLongDistance,
      isDefault: version.isDefault !== false,
      timeSlotsByVariant: this.normalizeVariantTimeSlots(version),
    }));
  }

  private hasLegacyDirectUpdates(input: OvernightStayConnectionUpdateDto): boolean {
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
    fromOvernightStayId: string,
    toLocationId: string,
  ): Promise<{ toLocation: ConnectionTargetLocation }> {
    const overnightStay = await this.prisma.overnightStay.findUnique({
      where: { id: fromOvernightStayId },
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
        isLongDistance: defaultVersion.isLongDistance,
        sortOrder: 0,
        isDefault: true,
      },
    });

    await this.replaceVersionTimeBlocks(tx, existingDefaultVersion.id, defaultVersion.timeSlotsByVariant);
    return existingDefaultVersion.id;
  }

  async create(input: OvernightStayConnectionCreateDto) {
    const parsed = overnightStayConnectionCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid overnight stay connection input');
    }

    const region = await this.prisma.region.findUnique({
      where: { id: parsed.data.regionId },
      select: { name: true },
    });
    if (!region) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for overnight stay connection');
    }

    const endpoints = await this.validateEndpoints(parsed.data.regionId, parsed.data.fromOvernightStayId, parsed.data.toLocationId);

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
          fromOvernightStayId: parsed.data.fromOvernightStayId,
          toLocationId: parsed.data.toLocationId,
          averageDistanceKm: defaultVersion.averageDistanceKm,
          averageTravelHours: defaultVersion.averageTravelHours,
          isLongDistance: defaultVersion.isLongDistance,
        },
      });

      const defaultVersionId = await this.replaceAllVersions(tx, created.id, nextVersions);
      await this.syncDefaultMirror(tx, created.id, defaultVersionId, defaultVersion);

      return new OvernightStayConnectionRepository(tx).findById(created.id);
    });
  }

  async update(id: string, input: OvernightStayConnectionUpdateDto) {
    const parsed = overnightStayConnectionUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid overnight stay connection update input');
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Overnight stay connection not found');
    }

    const nextRegionId = parsed.data.regionId ?? existing.regionId;
    const nextFromOvernightStayId = parsed.data.fromOvernightStayId ?? existing.fromOvernightStayId;
    const nextToLocationId = parsed.data.toLocationId ?? existing.toLocationId;

    const region = await this.prisma.region.findUnique({
      where: { id: nextRegionId },
      select: { name: true },
    });
    if (!region) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for overnight stay connection update');
    }

    const endpoints = await this.validateEndpoints(nextRegionId, nextFromOvernightStayId, nextToLocationId);

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
          ...(parsed.data.fromOvernightStayId !== undefined ? { fromOvernightStayId: parsed.data.fromOvernightStayId } : {}),
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
        parsed.data.fromOvernightStayId !== undefined ||
        parsed.data.toLocationId !== undefined
      ) {
        await tx.overnightStayConnection.update({
          where: { id },
          data: {
            defaultVersionId: existing.defaultVersionId,
          },
        });
      }

      return new OvernightStayConnectionRepository(tx).findById(id);
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
