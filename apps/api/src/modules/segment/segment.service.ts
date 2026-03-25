import type { MovementIntensity, Prisma, PrismaClient } from '@prisma/client';
import {
  segmentCreateSchema,
  segmentUpdateSchema,
  type SegmentTimeSlotInput,
  type SegmentVersionInput,
} from '@tour/validation';
import { createValidationError, DomainError } from '../../lib/errors';
import { calculateMovementIntensity } from '../../lib/movement-intensity';
import { SegmentRepository } from './segment.repository';
import type { SegmentCreateDto, SegmentUpdateDto } from './segment.types';

type SegmentScheduleVariant = 'basic' | 'early' | 'extend' | 'earlyExtend';

interface NormalizedTimeSlot {
  startTime: string;
  label: string;
  activities: string[];
}

interface VariantTimeSlotMap {
  basic: SegmentTimeSlotInput[];
  early?: SegmentTimeSlotInput[];
  extend?: SegmentTimeSlotInput[];
  earlyExtend?: SegmentTimeSlotInput[];
}

interface NormalizedSegmentVersion {
  name: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  movementIntensity: MovementIntensity;
  isLongDistance: boolean;
  startDate: Date | null;
  endDate: Date | null;
  isDefault: boolean;
  timeSlotsByVariant: VariantTimeSlotMap;
}

interface ExistingSegmentLike {
  defaultVersionId: string | null;
  regionId: string;
  fromLocationId: string;
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
    startDate: Date | null;
    endDate: Date | null;
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

interface SegmentEndpointLocation {
  id: string;
  regionId: string;
  isFirstDayEligible: boolean;
  isLastDayEligible: boolean;
}

const SEGMENT_SCHEDULE_VARIANTS: SegmentScheduleVariant[] = ['basic', 'early', 'extend', 'earlyExtend'];

export class SegmentService {
  private readonly repository: SegmentRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new SegmentRepository(prisma);
  }

  list(filter?: { regionIds?: string[] }) {
    return this.repository.findMany(filter);
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  private normalizeTimeSlots(timeSlots: SegmentTimeSlotInput[]): NormalizedTimeSlot[] {
    return timeSlots.map((slot) => ({
      startTime: slot.startTime,
      label: slot.startTime,
      activities: slot.activities.map((activity) => activity.trim()).filter((activity) => activity.length > 0),
    }));
  }

  private parseDateOnly(value: string | undefined): Date | null {
    if (!value) {
      return null;
    }

    const [yearText, monthText, dayText] = value.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      throw new DomainError('VALIDATION_FAILED', `Invalid date: ${value}`);
    }

    return new Date(Date.UTC(year, month - 1, day));
  }

  private cloneTimeSlots(timeSlots: SegmentTimeSlotInput[] | undefined): SegmentTimeSlotInput[] | undefined {
    if (!timeSlots) {
      return undefined;
    }

    return timeSlots.map((slot) => ({
      startTime: slot.startTime,
      activities: [...slot.activities],
    }));
  }

  private normalizeVariantTimeSlots(input: {
    timeSlots: SegmentTimeSlotInput[];
    earlyTimeSlots?: SegmentTimeSlotInput[];
    extendTimeSlots?: SegmentTimeSlotInput[];
    earlyExtendTimeSlots?: SegmentTimeSlotInput[];
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
      | ExistingSegmentLike['scheduleTimeBlocks']
      | ExistingSegmentLike['versions'][number]['scheduleTimeBlocks'],
    variant: SegmentScheduleVariant,
  ): SegmentTimeSlotInput[] {
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
      | ExistingSegmentLike['scheduleTimeBlocks']
      | ExistingSegmentLike['versions'][number]['scheduleTimeBlocks'],
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
    timeSlots: SegmentTimeSlotInput[];
    earlyTimeSlots?: SegmentTimeSlotInput[];
    extendTimeSlots?: SegmentTimeSlotInput[];
    earlyExtendTimeSlots?: SegmentTimeSlotInput[];
  }): NormalizedSegmentVersion {
    return {
      name: '기본',
      averageDistanceKm: input.averageDistanceKm,
      averageTravelHours: input.averageTravelHours,
      movementIntensity: calculateMovementIntensity(input.averageTravelHours),
      isLongDistance: input.isLongDistance,
      startDate: null,
      endDate: null,
      isDefault: true,
      timeSlotsByVariant: this.normalizeVariantTimeSlots(input),
    };
  }

  private buildVersionsFromExisting(existing: ExistingSegmentLike): NormalizedSegmentVersion[] {
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
          startDate: version.startDate,
          endDate: version.endDate,
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

  private normalizeVersionsFromInput(inputVersions: SegmentVersionInput[]): NormalizedSegmentVersion[] {
    return inputVersions.map((version) => ({
      name: version.name.trim(),
      averageDistanceKm: version.averageDistanceKm,
      averageTravelHours: version.averageTravelHours,
      movementIntensity: calculateMovementIntensity(version.averageTravelHours),
      isLongDistance: version.isLongDistance,
      startDate: this.parseDateOnly(version.startDate),
      endDate: this.parseDateOnly(version.endDate),
      isDefault: version.isDefault !== false,
      timeSlotsByVariant: this.normalizeVariantTimeSlots(version),
    }));
  }

  private hasLegacyDirectUpdates(input: SegmentUpdateDto): boolean {
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

  private getDefaultVersion(versions: NormalizedSegmentVersion[]): NormalizedSegmentVersion {
    const defaultVersion = versions.find((version) => version.isDefault);
    if (!defaultVersion) {
      throw new DomainError('VALIDATION_FAILED', 'Default version is required');
    }
    return defaultVersion;
  }

  private getRequiredVariants(fromLocation: SegmentEndpointLocation, toLocation: SegmentEndpointLocation): SegmentScheduleVariant[] {
    const variants: SegmentScheduleVariant[] = ['basic'];
    if (fromLocation.isFirstDayEligible) {
      variants.push('early');
    }
    if (toLocation.isLastDayEligible) {
      variants.push('extend');
    }
    if (fromLocation.isFirstDayEligible && toLocation.isLastDayEligible) {
      variants.push('earlyExtend');
    }
    return variants;
  }

  private async validateLocations(
    regionId: string,
    fromLocationId: string,
    toLocationId: string,
  ): Promise<{ fromLocation: SegmentEndpointLocation; toLocation: SegmentEndpointLocation }> {
    const locations = await this.prisma.location.findMany({
      where: { id: { in: [fromLocationId, toLocationId] } },
      select: { id: true, regionId: true, isFirstDayEligible: true, isLastDayEligible: true },
    });

    if (locations.length !== 2) {
      throw new DomainError('VALIDATION_FAILED', 'Segment locations not found');
    }

    const locationById = new Map(locations.map((location) => [location.id, location]));
    const fromLocation = locationById.get(fromLocationId);
    const toLocation = locationById.get(toLocationId);
    if (!fromLocation || !toLocation) {
      throw new DomainError('VALIDATION_FAILED', 'Segment locations not found');
    }

    if (fromLocation.regionId !== regionId || toLocation.regionId !== regionId) {
      throw new DomainError('VALIDATION_FAILED', 'Segment locations must belong to the selected region');
    }

    return { fromLocation, toLocation };
  }

  private assertRequiredVariantSchedules(
    version: NormalizedSegmentVersion,
    requiredVariants: SegmentScheduleVariant[],
  ): void {
    const versionLabel = version.name || 'Default';

    requiredVariants.forEach((variant) => {
      const timeSlots = version.timeSlotsByVariant[variant];
      if (!timeSlots || timeSlots.length === 0) {
        throw new DomainError('VALIDATION_FAILED', `Segment version "${versionLabel}" requires ${variant} schedules`);
      }
    });
  }

  private async validateVersions(
    fromLocation: SegmentEndpointLocation,
    toLocation: SegmentEndpointLocation,
    versions: NormalizedSegmentVersion[],
  ) {
    const defaultVersions = versions.filter((version) => version.isDefault);
    if (defaultVersions.length !== 1) {
      throw new DomainError('VALIDATION_FAILED', 'Segment must include exactly one default version');
    }

    versions.forEach((version) => {
      const hasStartDate = Boolean(version.startDate);
      const hasEndDate = Boolean(version.endDate);

      if (hasStartDate !== hasEndDate) {
        throw new DomainError('VALIDATION_FAILED', `Segment version "${version.name}" must include both startDate and endDate`);
      }

      if (version.startDate && version.endDate && version.startDate.getTime() > version.endDate.getTime()) {
        throw new DomainError('VALIDATION_FAILED', `Segment version "${version.name}" has an invalid date range`);
      }

      if (version.isDefault && (version.startDate || version.endDate)) {
        throw new DomainError('VALIDATION_FAILED', 'Default segment version cannot have a date range');
      }
    });

    const datedVersions = versions
      .filter((version) => version.startDate && version.endDate)
      .slice()
      .sort((left, right) => left.startDate!.getTime() - right.startDate!.getTime());

    for (let index = 1; index < datedVersions.length; index += 1) {
      const previousVersion = datedVersions[index - 1]!;
      const currentVersion = datedVersions[index]!;

      if (previousVersion.endDate!.getTime() >= currentVersion.startDate!.getTime()) {
        throw new DomainError(
          'VALIDATION_FAILED',
          `Segment versions "${previousVersion.name}" and "${currentVersion.name}" have overlapping date ranges`,
        );
      }
    }

    const requiredVariants = this.getRequiredVariants(fromLocation, toLocation);
    versions.forEach((version) => this.assertRequiredVariantSchedules(version, requiredVariants));
  }

  private async replaceLegacyScheduleTimeBlocks(
    tx: Prisma.TransactionClient,
    segmentId: string,
    timeSlotsByVariant: VariantTimeSlotMap,
  ) {
    await tx.segmentTimeBlock.deleteMany({
      where: { segmentId },
    });

    for (const variant of SEGMENT_SCHEDULE_VARIANTS) {
      const timeSlots = timeSlotsByVariant[variant];
      if (!timeSlots || timeSlots.length === 0) {
        continue;
      }

      const normalizedSlots = this.normalizeTimeSlots(timeSlots);
      for (const [orderIndex, slot] of normalizedSlots.entries()) {
        const createdTimeBlock = await tx.segmentTimeBlock.create({
          data: {
            segmentId,
            variant,
            startTime: slot.startTime,
            label: slot.label,
            orderIndex,
          },
        });

        if (slot.activities.length > 0) {
          await tx.segmentActivity.createMany({
            data: slot.activities.map((description, activityIndex) => ({
              segmentTimeBlockId: createdTimeBlock.id,
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
    segmentVersionId: string,
    timeSlotsByVariant: VariantTimeSlotMap,
  ) {
    await tx.segmentVersionTimeBlock.deleteMany({
      where: { segmentVersionId },
    });

    for (const variant of SEGMENT_SCHEDULE_VARIANTS) {
      const timeSlots = timeSlotsByVariant[variant];
      if (!timeSlots || timeSlots.length === 0) {
        continue;
      }

      const normalizedSlots = this.normalizeTimeSlots(timeSlots);
      for (const [orderIndex, slot] of normalizedSlots.entries()) {
        const createdTimeBlock = await tx.segmentVersionTimeBlock.create({
          data: {
            segmentVersionId,
            variant,
            startTime: slot.startTime,
            label: slot.label,
            orderIndex,
          },
        });

        if (slot.activities.length > 0) {
          await tx.segmentVersionActivity.createMany({
            data: slot.activities.map((description, activityIndex) => ({
              segmentVersionTimeBlockId: createdTimeBlock.id,
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
    segmentId: string,
    defaultVersionId: string,
    defaultVersion: NormalizedSegmentVersion,
  ) {
    await tx.segment.update({
      where: { id: segmentId },
      data: {
        defaultVersionId,
        averageDistanceKm: defaultVersion.averageDistanceKm,
        averageTravelHours: defaultVersion.averageTravelHours,
        movementIntensity: defaultVersion.movementIntensity,
        isLongDistance: defaultVersion.isLongDistance,
      },
    });

    await this.replaceLegacyScheduleTimeBlocks(tx, segmentId, defaultVersion.timeSlotsByVariant);
  }

  private async replaceAllVersions(
    tx: Prisma.TransactionClient,
    segmentId: string,
    versions: NormalizedSegmentVersion[],
  ): Promise<string> {
    await tx.segmentVersion.deleteMany({
      where: { segmentId },
    });

    let defaultVersionId = '';

    for (const [sortOrder, version] of versions.entries()) {
      const createdVersion = await tx.segmentVersion.create({
        data: {
          segmentId,
          name: version.name,
          averageDistanceKm: version.averageDistanceKm,
          averageTravelHours: version.averageTravelHours,
          movementIntensity: version.movementIntensity,
          isLongDistance: version.isLongDistance,
          startDate: version.startDate,
          endDate: version.endDate,
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
    segmentId: string,
    defaultVersion: NormalizedSegmentVersion,
  ): Promise<string> {
    const existingDefaultVersion = await tx.segmentVersion.findFirst({
      where: { segmentId, isDefault: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    });

    if (!existingDefaultVersion) {
      const createdVersion = await tx.segmentVersion.create({
        data: {
          segmentId,
          name: defaultVersion.name || '기본',
          averageDistanceKm: defaultVersion.averageDistanceKm,
          averageTravelHours: defaultVersion.averageTravelHours,
          movementIntensity: defaultVersion.movementIntensity,
          isLongDistance: defaultVersion.isLongDistance,
          startDate: null,
          endDate: null,
          sortOrder: 0,
          isDefault: true,
        },
      });

      await this.replaceVersionTimeBlocks(tx, createdVersion.id, defaultVersion.timeSlotsByVariant);
      return createdVersion.id;
    }

    await tx.segmentVersion.update({
      where: { id: existingDefaultVersion.id },
      data: {
        name: existingDefaultVersion.name || defaultVersion.name || '기본',
        averageDistanceKm: defaultVersion.averageDistanceKm,
        averageTravelHours: defaultVersion.averageTravelHours,
        movementIntensity: defaultVersion.movementIntensity,
        isLongDistance: defaultVersion.isLongDistance,
        startDate: null,
        endDate: null,
        sortOrder: 0,
        isDefault: true,
      },
    });

    await this.replaceVersionTimeBlocks(tx, existingDefaultVersion.id, defaultVersion.timeSlotsByVariant);
    return existingDefaultVersion.id;
  }

  async create(input: SegmentCreateDto) {
    const parsed = segmentCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid segment input', parsed.error);
    }

    const region = await this.prisma.region.findUnique({
      where: { id: parsed.data.regionId },
      select: { name: true },
    });
    if (!region) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for segment');
    }

    const endpoints = await this.validateLocations(parsed.data.regionId, parsed.data.fromLocationId, parsed.data.toLocationId);

    const nextVersions = parsed.data.versions
      ? this.normalizeVersionsFromInput(parsed.data.versions)
      : [this.buildLegacyDirectVersionFromInput(parsed.data)];
    await this.validateVersions(endpoints.fromLocation, endpoints.toLocation, nextVersions);
    const defaultVersion = this.getDefaultVersion(nextVersions);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.segment.create({
        data: {
          regionId: parsed.data.regionId,
          regionName: region.name,
          fromLocationId: parsed.data.fromLocationId,
          toLocationId: parsed.data.toLocationId,
          averageDistanceKm: defaultVersion.averageDistanceKm,
          averageTravelHours: defaultVersion.averageTravelHours,
          movementIntensity: defaultVersion.movementIntensity,
          isLongDistance: defaultVersion.isLongDistance,
        },
      });

      const defaultVersionId = await this.replaceAllVersions(tx, created.id, nextVersions);
      await this.syncDefaultMirror(tx, created.id, defaultVersionId, defaultVersion);

      return new SegmentRepository(tx).findById(created.id);
    });
  }

  async update(id: string, input: SegmentUpdateDto) {
    const parsed = segmentUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid segment update input', parsed.error);
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Segment not found');
    }

    const nextRegionId = parsed.data.regionId ?? existing.regionId;
    const nextFromLocationId = parsed.data.fromLocationId ?? existing.fromLocationId;
    const nextToLocationId = parsed.data.toLocationId ?? existing.toLocationId;

    const region = await this.prisma.region.findUnique({
      where: { id: nextRegionId },
      select: { name: true },
    });
    if (!region) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for segment update');
    }

    const endpoints = await this.validateLocations(nextRegionId, nextFromLocationId, nextToLocationId);

    const existingVersions = this.buildVersionsFromExisting(existing as ExistingSegmentLike);
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

    await this.validateVersions(endpoints.fromLocation, endpoints.toLocation, nextVersions);
    const defaultVersion = this.getDefaultVersion(nextVersions);

    return this.prisma.$transaction(async (tx) => {
      await tx.segment.update({
        where: { id },
        data: {
          ...(parsed.data.regionId !== undefined ? { regionId: nextRegionId, regionName: region.name } : {}),
          ...(parsed.data.fromLocationId !== undefined ? { fromLocationId: parsed.data.fromLocationId } : {}),
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
      } else if (parsed.data.regionId !== undefined || parsed.data.fromLocationId !== undefined || parsed.data.toLocationId !== undefined) {
        await tx.segment.update({
          where: { id },
          data: {
            defaultVersionId: existing.defaultVersionId,
          },
        });
      }

      return new SegmentRepository(tx).findById(id);
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
