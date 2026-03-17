import type { Prisma, PrismaClient } from '@prisma/client';
import {
  segmentCreateSchema,
  segmentUpdateSchema,
  type SegmentTimeSlotInput,
  type SegmentVersionInput,
} from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { SegmentRepository } from './segment.repository';
import type { SegmentCreateDto, SegmentUpdateDto } from './segment.types';

type SegmentVersionKind = 'DIRECT' | 'VIA';
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
  kind: SegmentVersionKind;
  viaLocationIds: string[];
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
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
    kind: SegmentVersionKind;
    averageDistanceKm: number;
    averageTravelHours: number;
    isLongDistance: boolean;
    sortOrder: number;
    viaLocations: Array<{
      locationId: string;
      orderIndex: number;
    }>;
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

  list() {
    return this.repository.findMany();
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
      name: 'Direct',
      kind: 'DIRECT',
      viaLocationIds: [],
      averageDistanceKm: input.averageDistanceKm,
      averageTravelHours: input.averageTravelHours,
      isLongDistance: input.isLongDistance,
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
          kind: version.kind,
          viaLocationIds: version.viaLocations.slice().sort((a, b) => a.orderIndex - b.orderIndex).map((item) => item.locationId),
          averageDistanceKm: version.averageDistanceKm,
          averageTravelHours: version.averageTravelHours,
          isLongDistance: version.isLongDistance,
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
      kind: version.kind,
      viaLocationIds: version.viaLocationIds,
      averageDistanceKm: version.averageDistanceKm,
      averageTravelHours: version.averageTravelHours,
      isLongDistance: version.isLongDistance,
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

  private getDirectVersion(versions: NormalizedSegmentVersion[]): NormalizedSegmentVersion {
    const directVersion = versions.find((version) => version.kind === 'DIRECT');
    if (!directVersion) {
      throw new DomainError('VALIDATION_FAILED', 'DIRECT version is required');
    }
    return directVersion;
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
    const versionLabel = version.name || version.kind;

    requiredVariants.forEach((variant) => {
      const timeSlots = version.timeSlotsByVariant[variant];
      if (!timeSlots || timeSlots.length === 0) {
        throw new DomainError('VALIDATION_FAILED', `Segment version "${versionLabel}" requires ${variant} schedules`);
      }
    });
  }

  private async validateVersions(
    regionId: string,
    fromLocation: SegmentEndpointLocation,
    toLocation: SegmentEndpointLocation,
    versions: NormalizedSegmentVersion[],
  ) {
    const directVersions = versions.filter((version) => version.kind === 'DIRECT');
    if (directVersions.length !== 1) {
      throw new DomainError('VALIDATION_FAILED', 'Segment must include exactly one DIRECT version');
    }

    const requiredVariants = this.getRequiredVariants(fromLocation, toLocation);
    versions.forEach((version) => this.assertRequiredVariantSchedules(version, requiredVariants));

    const viaLocationIds = Array.from(new Set(versions.flatMap((version) => version.viaLocationIds)));
    if (viaLocationIds.length === 0) {
      return;
    }

    const viaLocations = await this.prisma.location.findMany({
      where: { id: { in: viaLocationIds } },
      select: { id: true, regionId: true },
    });

    if (viaLocations.length !== viaLocationIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more via locations are invalid');
    }

    const viaLocationById = new Map(viaLocations.map((location) => [location.id, location]));

    versions.forEach((version) => {
      if (version.kind === 'DIRECT') {
        if (version.viaLocationIds.length > 0) {
          throw new DomainError('VALIDATION_FAILED', 'DIRECT version must not include via locations');
        }
        return;
      }

      if (version.viaLocationIds.length === 0) {
        throw new DomainError('VALIDATION_FAILED', 'VIA version must include at least one via location');
      }

      const seen = new Set<string>();
      version.viaLocationIds.forEach((locationId) => {
        if (locationId === fromLocation.id || locationId === toLocation.id) {
          throw new DomainError('VALIDATION_FAILED', 'Via locations must not match segment endpoints');
        }
        if (seen.has(locationId)) {
          throw new DomainError('VALIDATION_FAILED', 'Via locations must not contain duplicates');
        }
        seen.add(locationId);

        const location = viaLocationById.get(locationId);
        if (!location) {
          throw new DomainError('VALIDATION_FAILED', 'One or more via locations are invalid');
        }
        if (location.regionId !== regionId) {
          throw new DomainError('VALIDATION_FAILED', 'Via locations must belong to the selected region');
        }
      });
    });
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

  private async replaceVersionViaLocations(
    tx: Prisma.TransactionClient,
    segmentVersionId: string,
    viaLocationIds: string[],
  ) {
    await tx.segmentVersionViaLocation.deleteMany({
      where: { segmentVersionId },
    });

    if (viaLocationIds.length === 0) {
      return;
    }

    await tx.segmentVersionViaLocation.createMany({
      data: viaLocationIds.map((locationId, orderIndex) => ({
        segmentVersionId,
        locationId,
        orderIndex,
      })),
    });
  }

  private async syncDirectMirror(
    tx: Prisma.TransactionClient,
    segmentId: string,
    directVersionId: string,
    directVersion: NormalizedSegmentVersion,
  ) {
    await tx.segment.update({
      where: { id: segmentId },
      data: {
        defaultVersionId: directVersionId,
        averageDistanceKm: directVersion.averageDistanceKm,
        averageTravelHours: directVersion.averageTravelHours,
        isLongDistance: directVersion.isLongDistance,
      },
    });

    await this.replaceLegacyScheduleTimeBlocks(tx, segmentId, directVersion.timeSlotsByVariant);
  }

  private async replaceAllVersions(
    tx: Prisma.TransactionClient,
    segmentId: string,
    versions: NormalizedSegmentVersion[],
  ): Promise<string> {
    await tx.segmentVersion.deleteMany({
      where: { segmentId },
    });

    let directVersionId = '';

    for (const [sortOrder, version] of versions.entries()) {
      const createdVersion = await tx.segmentVersion.create({
        data: {
          segmentId,
          name: version.name,
          kind: version.kind,
          averageDistanceKm: version.averageDistanceKm,
          averageTravelHours: version.averageTravelHours,
          isLongDistance: version.isLongDistance,
          sortOrder,
          isDefault: version.kind === 'DIRECT',
        },
      });

      await this.replaceVersionViaLocations(tx, createdVersion.id, version.viaLocationIds);
      await this.replaceVersionTimeBlocks(tx, createdVersion.id, version.timeSlotsByVariant);

      if (version.kind === 'DIRECT') {
        directVersionId = createdVersion.id;
      }
    }

    if (!directVersionId) {
      throw new DomainError('VALIDATION_FAILED', 'DIRECT version is required');
    }

    return directVersionId;
  }

  private async upsertDirectVersionOnly(
    tx: Prisma.TransactionClient,
    segmentId: string,
    directVersion: NormalizedSegmentVersion,
  ): Promise<string> {
    const existingDirectVersion = await tx.segmentVersion.findFirst({
      where: { segmentId, kind: 'DIRECT' },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    });

    if (!existingDirectVersion) {
      const createdVersion = await tx.segmentVersion.create({
        data: {
          segmentId,
          name: directVersion.name || 'Direct',
          kind: 'DIRECT',
          averageDistanceKm: directVersion.averageDistanceKm,
          averageTravelHours: directVersion.averageTravelHours,
          isLongDistance: directVersion.isLongDistance,
          sortOrder: 0,
          isDefault: true,
        },
      });

      await this.replaceVersionTimeBlocks(tx, createdVersion.id, directVersion.timeSlotsByVariant);
      return createdVersion.id;
    }

    await tx.segmentVersion.update({
      where: { id: existingDirectVersion.id },
      data: {
        name: existingDirectVersion.name || directVersion.name || 'Direct',
        averageDistanceKm: directVersion.averageDistanceKm,
        averageTravelHours: directVersion.averageTravelHours,
        isLongDistance: directVersion.isLongDistance,
        sortOrder: 0,
        isDefault: true,
      },
    });

    await this.replaceVersionViaLocations(tx, existingDirectVersion.id, []);
    await this.replaceVersionTimeBlocks(tx, existingDirectVersion.id, directVersion.timeSlotsByVariant);
    return existingDirectVersion.id;
  }

  async create(input: SegmentCreateDto) {
    const parsed = segmentCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid segment input');
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
    await this.validateVersions(parsed.data.regionId, endpoints.fromLocation, endpoints.toLocation, nextVersions);
    const directVersion = this.getDirectVersion(nextVersions);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.segment.create({
        data: {
          regionId: parsed.data.regionId,
          regionName: region.name,
          fromLocationId: parsed.data.fromLocationId,
          toLocationId: parsed.data.toLocationId,
          averageDistanceKm: directVersion.averageDistanceKm,
          averageTravelHours: directVersion.averageTravelHours,
          isLongDistance: directVersion.isLongDistance,
        },
      });

      const directVersionId = await this.replaceAllVersions(tx, created.id, nextVersions);
      await this.syncDirectMirror(tx, created.id, directVersionId, directVersion);

      return new SegmentRepository(tx).findById(created.id);
    });
  }

  async update(id: string, input: SegmentUpdateDto) {
    const parsed = segmentUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid segment update input');
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
        version.kind === 'DIRECT'
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

    await this.validateVersions(nextRegionId, endpoints.fromLocation, endpoints.toLocation, nextVersions);
    const directVersion = this.getDirectVersion(nextVersions);

    return this.prisma.$transaction(async (tx) => {
      await tx.segment.update({
        where: { id },
        data: {
          ...(parsed.data.regionId !== undefined ? { regionId: nextRegionId, regionName: region.name } : {}),
          ...(parsed.data.fromLocationId !== undefined ? { fromLocationId: parsed.data.fromLocationId } : {}),
          ...(parsed.data.toLocationId !== undefined ? { toLocationId: parsed.data.toLocationId } : {}),
        },
      });

      let directVersionId = existing.defaultVersionId ?? '';
      if (parsed.data.versions) {
        directVersionId = await this.replaceAllVersions(tx, id, nextVersions);
        await this.syncDirectMirror(tx, id, directVersionId, directVersion);
      } else if (hasLegacyDirectUpdates || existing.versions.length === 0) {
        directVersionId = await this.upsertDirectVersionOnly(tx, id, directVersion);
        await this.syncDirectMirror(tx, id, directVersionId, directVersion);
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
