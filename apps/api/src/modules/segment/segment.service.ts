import type {
  FacilityAvailability,
  MealOption,
  MovementIntensity,
  Prisma,
  PrismaClient,
  SegmentFlightOutTimeBand,
  SegmentVersionKind,
} from '@prisma/client';
import {
  segmentBulkCreateSchema,
  segmentCreateSchema,
  segmentUpdateSchema,
  type LocationProfileLodgingInput,
  type LocationProfileMealsInput,
  type SegmentTimeSlotInput,
  type SegmentVersionInput,
} from '@tour/validation';
import { createValidationError, DomainError } from '../../lib/errors';
import { calculateMovementIntensity } from '../../lib/movement-intensity';
import { SegmentRepository } from './segment.repository';
import type { SegmentBulkCreateDto, SegmentCreateDto, SegmentUpdateDto } from './segment.types';

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
  id?: string;
  name: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  movementIntensity: MovementIntensity;
  isLongDistance: boolean;
  kind: SegmentVersionKind;
  startDate: Date | null;
  endDate: Date | null;
  flightOutTimeBand: SegmentFlightOutTimeBand | null;
  lodgingOverride: NormalizedLodgingOverride | null;
  mealsOverride: NormalizedMealsOverride | null;
  isDefault: boolean;
  timeSlotsByVariant: VariantTimeSlotMap;
  earlyExtendProvided?: boolean;
}

interface NormalizedLodgingOverride {
  isUnspecified: boolean;
  name: string;
  hasElectricity: FacilityAvailability;
  hasShower: FacilityAvailability;
  hasInternet: FacilityAvailability;
}

interface NormalizedMealsOverride {
  breakfast: MealOption | null;
  lunch: MealOption | null;
  dinner: MealOption | null;
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
    kind?: SegmentVersionKind | null;
    startDate: Date | null;
    endDate: Date | null;
    flightOutTimeBand?: SegmentFlightOutTimeBand | null;
    overrideLodgingIsUnspecified?: boolean | null;
    overrideLodgingName?: string | null;
    overrideHasElectricity?: FacilityAvailability | null;
    overrideHasShower?: FacilityAvailability | null;
    overrideHasInternet?: FacilityAvailability | null;
    overrideBreakfast?: MealOption | null;
    overrideLunch?: MealOption | null;
    overrideDinner?: MealOption | null;
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

  private inferVersionKind(input: {
    isDefault: boolean;
    kind?: SegmentVersionKind | null;
    startDate?: Date | null;
    endDate?: Date | null;
    flightOutTimeBand?: SegmentFlightOutTimeBand | null;
  }): SegmentVersionKind {
    if (input.kind) {
      return input.kind;
    }
    if (input.isDefault) {
      return 'DEFAULT';
    }
    if (input.startDate && input.endDate) {
      return 'SEASON';
    }
    if (input.flightOutTimeBand) {
      return 'FLIGHT';
    }
    return 'DEFAULT';
  }

  private normalizeLodgingOverride(lodgingOverride: LocationProfileLodgingInput | undefined): NormalizedLodgingOverride | null {
    if (!lodgingOverride) {
      return null;
    }

    const isUnspecified = lodgingOverride.isUnspecified ?? false;
    const name = isUnspecified ? '숙소 미지정' : lodgingOverride.name?.trim() ? lodgingOverride.name.trim() : '여행자 캠프';

    return {
      isUnspecified,
      name,
      hasElectricity: isUnspecified ? 'NO' : ((lodgingOverride.hasElectricity ?? 'NO') as FacilityAvailability),
      hasShower: isUnspecified ? 'NO' : ((lodgingOverride.hasShower ?? 'NO') as FacilityAvailability),
      hasInternet: isUnspecified ? 'NO' : ((lodgingOverride.hasInternet ?? 'NO') as FacilityAvailability),
    };
  }

  private normalizeMealsOverride(mealsOverride: LocationProfileMealsInput | undefined): NormalizedMealsOverride | null {
    if (!mealsOverride) {
      return null;
    }

    return {
      breakfast: mealsOverride.breakfast ?? null,
      lunch: mealsOverride.lunch ?? null,
      dinner: mealsOverride.dinner ?? null,
    };
  }

  private buildLodgingOverrideFromExisting(version: ExistingSegmentLike['versions'][number]): NormalizedLodgingOverride | null {
    if (
      version.overrideLodgingIsUnspecified == null &&
      version.overrideLodgingName == null &&
      version.overrideHasElectricity == null &&
      version.overrideHasShower == null &&
      version.overrideHasInternet == null
    ) {
      return null;
    }

    return {
      isUnspecified: version.overrideLodgingIsUnspecified ?? false,
      name: version.overrideLodgingName?.trim() ? version.overrideLodgingName.trim() : '여행자 캠프',
      hasElectricity: version.overrideHasElectricity ?? 'NO',
      hasShower: version.overrideHasShower ?? 'NO',
      hasInternet: version.overrideHasInternet ?? 'NO',
    };
  }

  private buildMealsOverrideFromExisting(version: ExistingSegmentLike['versions'][number]): NormalizedMealsOverride | null {
    if (version.overrideBreakfast == null && version.overrideLunch == null && version.overrideDinner == null) {
      return null;
    }

    return {
      breakfast: version.overrideBreakfast ?? null,
      lunch: version.overrideLunch ?? null,
      dinner: version.overrideDinner ?? null,
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
      id: undefined,
      name: '기본',
      averageDistanceKm: input.averageDistanceKm,
      averageTravelHours: input.averageTravelHours,
      movementIntensity: calculateMovementIntensity(input.averageTravelHours),
      isLongDistance: input.isLongDistance,
      kind: 'DEFAULT',
      startDate: null,
      endDate: null,
      flightOutTimeBand: null,
      lodgingOverride: null,
      mealsOverride: null,
      isDefault: true,
      timeSlotsByVariant: this.normalizeVariantTimeSlots(input),
      earlyExtendProvided: input.earlyExtendTimeSlots !== undefined,
    };
  }

  private buildVersionsFromExisting(existing: ExistingSegmentLike): NormalizedSegmentVersion[] {
    if (existing.versions.length > 0) {
      return existing.versions
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((version) => ({
          id: version.id,
          name: version.name,
          averageDistanceKm: version.averageDistanceKm,
          averageTravelHours: version.averageTravelHours,
          movementIntensity: calculateMovementIntensity(version.averageTravelHours),
          isLongDistance: version.isLongDistance,
          kind: this.inferVersionKind({
            isDefault: version.isDefault,
            kind: version.kind ?? null,
            startDate: version.startDate,
            endDate: version.endDate,
            flightOutTimeBand: version.flightOutTimeBand ?? null,
          }),
          startDate: version.startDate,
          endDate: version.endDate,
          flightOutTimeBand: version.flightOutTimeBand ?? null,
          lodgingOverride: this.buildLodgingOverrideFromExisting(version),
          mealsOverride: this.buildMealsOverrideFromExisting(version),
          isDefault: version.isDefault,
          timeSlotsByVariant: this.mapTimeBlocksToVariantTimeSlots(version.scheduleTimeBlocks),
          earlyExtendProvided: true,
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
      id: version.id?.trim() || undefined,
      name: version.name.trim(),
      averageDistanceKm: version.averageDistanceKm,
      averageTravelHours: version.averageTravelHours,
      movementIntensity: calculateMovementIntensity(version.averageTravelHours),
      isLongDistance: version.isLongDistance,
      kind: version.kind,
      startDate: this.parseDateOnly(version.startDate),
      endDate: this.parseDateOnly(version.endDate),
      flightOutTimeBand: version.flightOutTimeBand ?? null,
      lodgingOverride: this.normalizeLodgingOverride(version.lodgingOverride),
      mealsOverride: this.normalizeMealsOverride(version.mealsOverride),
      isDefault: version.isDefault !== false,
      timeSlotsByVariant: this.normalizeVariantTimeSlots(version),
      earlyExtendProvided: Object.prototype.hasOwnProperty.call(version, 'earlyExtendTimeSlots'),
    }));
  }

  private preserveMissingEarlyExtendSchedules(
    versions: NormalizedSegmentVersion[],
    existingVersions: NormalizedSegmentVersion[],
  ): NormalizedSegmentVersion[] {
    const existingVersionById = new Map(
      existingVersions
        .filter((version): version is NormalizedSegmentVersion & { id: string } => Boolean(version.id))
        .map((version) => [version.id, version]),
    );

    return versions.map((version) => {
      if (version.earlyExtendProvided || !version.id) {
        return version;
      }

      const existingVersion = existingVersionById.get(version.id);
      if (!existingVersion?.timeSlotsByVariant.earlyExtend) {
        return version;
      }

      return {
        ...version,
        timeSlotsByVariant: {
          ...version.timeSlotsByVariant,
          earlyExtend: existingVersion.timeSlotsByVariant.earlyExtend,
        },
      };
    });
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
    return variants;
  }

  private async validateLocations(
    fromLocationId: string,
    toLocationId: string,
  ): Promise<{ fromLocation: SegmentEndpointLocation; toLocation: SegmentEndpointLocation }> {
    if (fromLocationId === toLocationId) {
      throw new DomainError('VALIDATION_FAILED', 'fromLocationId and toLocationId must be different');
    }

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

    return { fromLocation, toLocation };
  }

  private async resolveOwningRegion(
    inputRegionId: string | undefined,
    fromLocation: SegmentEndpointLocation,
  ): Promise<{ id: string; name: string }> {
    if (inputRegionId && inputRegionId !== fromLocation.regionId) {
      throw new DomainError('VALIDATION_FAILED', 'Segment regionId must match the departure location region');
    }

    const region = await this.prisma.region.findUnique({
      where: { id: fromLocation.regionId },
      select: { id: true, name: true },
    });
    if (!region) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for segment');
    }

    return region;
  }

  private assertRequiredVariantSchedules(
    version: NormalizedSegmentVersion,
    requiredVariants: SegmentScheduleVariant[],
  ): void {
    const versionLabel = version.name || 'Default';
    const variantsToCheck =
      version.kind === 'FLIGHT'
        ? requiredVariants.filter((variant) => variant !== 'early' && variant !== 'extend')
        : requiredVariants;

    variantsToCheck.forEach((variant) => {
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

      if (version.kind === 'DEFAULT') {
        if (!version.isDefault) {
          throw new DomainError('VALIDATION_FAILED', 'Default segment version kind must be marked as default');
        }
        if (version.startDate || version.endDate) {
          throw new DomainError('VALIDATION_FAILED', 'Default segment version cannot have a date range');
        }
        if (version.flightOutTimeBand) {
          throw new DomainError('VALIDATION_FAILED', 'Default segment version cannot have a flightOutTimeBand');
        }
        return;
      }

      if (version.isDefault) {
        throw new DomainError('VALIDATION_FAILED', 'Alternative segment versions cannot be marked as default');
      }

      if (version.kind === 'SEASON') {
        if (hasStartDate !== hasEndDate) {
          throw new DomainError('VALIDATION_FAILED', `Season segment version "${version.name}" must include both startDate and endDate`);
        }
        if (!version.startDate || !version.endDate) {
          throw new DomainError('VALIDATION_FAILED', `Season segment version "${version.name}" requires a date range`);
        }
        if (version.startDate.getTime() > version.endDate.getTime()) {
          throw new DomainError('VALIDATION_FAILED', `Segment version "${version.name}" has an invalid date range`);
        }
        if (version.flightOutTimeBand) {
          throw new DomainError('VALIDATION_FAILED', `Season segment version "${version.name}" cannot have a flightOutTimeBand`);
        }
      }

      if (version.kind === 'FLIGHT') {
        if (version.startDate || version.endDate) {
          throw new DomainError('VALIDATION_FAILED', `Flight segment version "${version.name}" cannot have a date range`);
        }
        if (!version.flightOutTimeBand) {
          throw new DomainError('VALIDATION_FAILED', `Flight segment version "${version.name}" requires flightOutTimeBand`);
        }
      }
    });

    const datedVersions = versions
      .filter((version) => version.kind === 'SEASON' && version.startDate && version.endDate)
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

    const seenFlightOutBands = new Set<SegmentFlightOutTimeBand>();
    versions.forEach((version) => {
      if (version.kind !== 'FLIGHT' || !version.flightOutTimeBand) {
        return;
      }
      if (seenFlightOutBands.has(version.flightOutTimeBand)) {
        throw new DomainError(
          'VALIDATION_FAILED',
          `Segment versions must not contain duplicate flightOutTimeBand values (${version.flightOutTimeBand})`,
        );
      }
      seenFlightOutBands.add(version.flightOutTimeBand);
    });

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
          kind: version.kind,
          startDate: version.startDate,
          endDate: version.endDate,
          flightOutTimeBand: version.flightOutTimeBand,
          overrideLodgingIsUnspecified: version.lodgingOverride?.isUnspecified ?? null,
          overrideLodgingName: version.lodgingOverride?.name ?? null,
          overrideHasElectricity: version.lodgingOverride?.hasElectricity ?? null,
          overrideHasShower: version.lodgingOverride?.hasShower ?? null,
          overrideHasInternet: version.lodgingOverride?.hasInternet ?? null,
          overrideBreakfast: version.mealsOverride?.breakfast ?? null,
          overrideLunch: version.mealsOverride?.lunch ?? null,
          overrideDinner: version.mealsOverride?.dinner ?? null,
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
          kind: 'DEFAULT',
          startDate: null,
          endDate: null,
          flightOutTimeBand: null,
          overrideLodgingIsUnspecified: defaultVersion.lodgingOverride?.isUnspecified ?? null,
          overrideLodgingName: defaultVersion.lodgingOverride?.name ?? null,
          overrideHasElectricity: defaultVersion.lodgingOverride?.hasElectricity ?? null,
          overrideHasShower: defaultVersion.lodgingOverride?.hasShower ?? null,
          overrideHasInternet: defaultVersion.lodgingOverride?.hasInternet ?? null,
          overrideBreakfast: defaultVersion.mealsOverride?.breakfast ?? null,
          overrideLunch: defaultVersion.mealsOverride?.lunch ?? null,
          overrideDinner: defaultVersion.mealsOverride?.dinner ?? null,
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
        kind: 'DEFAULT',
        startDate: null,
        endDate: null,
        flightOutTimeBand: null,
        overrideLodgingIsUnspecified: defaultVersion.lodgingOverride?.isUnspecified ?? null,
        overrideLodgingName: defaultVersion.lodgingOverride?.name ?? null,
        overrideHasElectricity: defaultVersion.lodgingOverride?.hasElectricity ?? null,
        overrideHasShower: defaultVersion.lodgingOverride?.hasShower ?? null,
        overrideHasInternet: defaultVersion.lodgingOverride?.hasInternet ?? null,
        overrideBreakfast: defaultVersion.mealsOverride?.breakfast ?? null,
        overrideLunch: defaultVersion.mealsOverride?.lunch ?? null,
        overrideDinner: defaultVersion.mealsOverride?.dinner ?? null,
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

    const endpoints = await this.validateLocations(parsed.data.fromLocationId, parsed.data.toLocationId);
    const owningRegion = await this.resolveOwningRegion(parsed.data.regionId, endpoints.fromLocation);

    const nextVersions = parsed.data.versions
      ? this.normalizeVersionsFromInput(parsed.data.versions)
      : [this.buildLegacyDirectVersionFromInput(parsed.data)];
    await this.validateVersions(endpoints.fromLocation, endpoints.toLocation, nextVersions);
    const defaultVersion = this.getDefaultVersion(nextVersions);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.segment.create({
        data: {
          regionId: owningRegion.id,
          regionName: owningRegion.name,
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

  async createBulk(input: SegmentBulkCreateDto) {
    const parsed = segmentBulkCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid segment bulk input', parsed.error);
    }

    const { fromLocationIds, toLocationId, regionId } = parsed.data;
    const uniqueFromIds = Array.from(new Set(fromLocationIds));

    const locationIds = Array.from(new Set([...uniqueFromIds, toLocationId]));
    const locations = await this.prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, regionId: true, isFirstDayEligible: true, isLastDayEligible: true },
    });
    if (locations.length !== locationIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more segment locations not found');
    }
    const locationById = new Map(locations.map((location) => [location.id, location]));
    const toLocation = locationById.get(toLocationId);
    if (!toLocation) {
      throw new DomainError('VALIDATION_FAILED', 'Segment destination location not found');
    }

    const fromRegionIds = Array.from(
      new Set(uniqueFromIds.map((id) => locationById.get(id)!.regionId)),
    );
    const regions = await this.prisma.region.findMany({
      where: { id: { in: fromRegionIds } },
      select: { id: true, name: true },
    });
    if (regions.length !== fromRegionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for one or more segments');
    }
    const regionById = new Map(regions.map((region) => [region.id, region]));

    if (regionId) {
      const mismatched = uniqueFromIds.find((id) => locationById.get(id)!.regionId !== regionId);
      if (mismatched) {
        throw new DomainError(
          'VALIDATION_FAILED',
          'Segment regionId must match every departure location region in bulk create',
        );
      }
    }

    const existingSegments = await this.prisma.segment.findMany({
      where: { toLocationId, fromLocationId: { in: uniqueFromIds } },
      select: { fromLocationId: true },
    });
    if (existingSegments.length > 0) {
      const existingFromIds = existingSegments.map((segment) => segment.fromLocationId);
      throw new DomainError(
        'VALIDATION_FAILED',
        `Segments already exist for from-locations: ${existingFromIds.join(', ')}`,
      );
    }

    const fromInputsByFromId = new Map(
      uniqueFromIds.map((fromLocationId) => {
        const fromLocation = locationById.get(fromLocationId)!;
        const owningRegion = regionById.get(fromLocation.regionId)!;
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
        return [
          fromLocationId,
          {
            fromLocation,
            owningRegion,
            nextVersions,
          },
        ] as const;
      }),
    );

    for (const { fromLocation, nextVersions } of fromInputsByFromId.values()) {
      await this.validateVersions(fromLocation, toLocation, nextVersions);
    }

    return this.prisma.$transaction(async (tx) => {
      const repository = new SegmentRepository(tx);
      const created: NonNullable<Awaited<ReturnType<SegmentRepository['findById']>>>[] = [];

      for (const fromLocationId of uniqueFromIds) {
        const { owningRegion, nextVersions } = fromInputsByFromId.get(fromLocationId)!;
        const defaultVersion = this.getDefaultVersion(nextVersions);

        const newSegment = await tx.segment.create({
          data: {
            regionId: owningRegion.id,
            regionName: owningRegion.name,
            fromLocationId,
            toLocationId,
            averageDistanceKm: defaultVersion.averageDistanceKm,
            averageTravelHours: defaultVersion.averageTravelHours,
            movementIntensity: defaultVersion.movementIntensity,
            isLongDistance: defaultVersion.isLongDistance,
          },
        });

        const defaultVersionId = await this.replaceAllVersions(tx, newSegment.id, nextVersions);
        await this.syncDefaultMirror(tx, newSegment.id, defaultVersionId, defaultVersion);

        const reloaded = await repository.findById(newSegment.id);
        if (!reloaded) {
          throw new DomainError('INTERNAL', 'Failed to load created segment');
        }
        created.push(reloaded);
      }

      return created;
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

    const nextFromLocationId = parsed.data.fromLocationId ?? existing.fromLocationId;
    const nextToLocationId = parsed.data.toLocationId ?? existing.toLocationId;
    const endpoints = await this.validateLocations(nextFromLocationId, nextToLocationId);
    const owningRegion = await this.resolveOwningRegion(parsed.data.regionId, endpoints.fromLocation);

    const existingVersions = this.buildVersionsFromExisting(existing as ExistingSegmentLike);
    const hasLegacyDirectUpdates = this.hasLegacyDirectUpdates(parsed.data);

    let nextVersions = parsed.data.versions ? this.normalizeVersionsFromInput(parsed.data.versions) : existingVersions;
    if (parsed.data.versions) {
      nextVersions = this.preserveMissingEarlyExtendSchedules(nextVersions, existingVersions);
    }

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
    const shouldSyncOwningRegion =
      parsed.data.regionId !== undefined ||
      parsed.data.fromLocationId !== undefined ||
      existing.regionId !== owningRegion.id;

    return this.prisma.$transaction(async (tx) => {
      await tx.segment.update({
        where: { id },
        data: {
          ...(shouldSyncOwningRegion ? { regionId: owningRegion.id, regionName: owningRegion.name } : {}),
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
