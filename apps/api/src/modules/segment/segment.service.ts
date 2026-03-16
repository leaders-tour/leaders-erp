import type { Prisma, PrismaClient } from '@prisma/client';
import { segmentCreateSchema, segmentUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { SegmentRepository } from './segment.repository';
import type { SegmentCreateDto, SegmentUpdateDto } from './segment.types';

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

  private normalizeTimeSlots(
    timeSlots: Array<{
      startTime: string;
      activities: string[];
    }>,
  ) {
    return timeSlots.map((slot) => ({
      startTime: slot.startTime,
      label: slot.startTime,
      activities: slot.activities.map((activity) => activity.trim()).filter((activity) => activity.length > 0),
    }));
  }

  private async validateLocations(regionId: string, fromLocationId: string, toLocationId: string) {
    const locations = await this.prisma.location.findMany({
      where: { id: { in: [fromLocationId, toLocationId] } },
      select: { id: true, regionId: true },
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
  }

  private async replaceScheduleTimeBlocks(
    tx: Prisma.TransactionClient,
    segmentId: string,
    timeSlots: Array<{
      startTime: string;
      activities: string[];
    }>,
  ) {
    const normalizedSlots = this.normalizeTimeSlots(timeSlots);

    await tx.segmentTimeBlock.deleteMany({
      where: { segmentId },
    });

    for (const [orderIndex, slot] of normalizedSlots.entries()) {
      const createdTimeBlock = await tx.segmentTimeBlock.create({
        data: {
          segmentId,
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

    await this.validateLocations(parsed.data.regionId, parsed.data.fromLocationId, parsed.data.toLocationId);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.segment.create({
        data: {
          regionId: parsed.data.regionId,
          regionName: region.name,
          fromLocationId: parsed.data.fromLocationId,
          toLocationId: parsed.data.toLocationId,
          averageDistanceKm: parsed.data.averageDistanceKm,
          averageTravelHours: parsed.data.averageTravelHours,
          isLongDistance: parsed.data.isLongDistance,
        },
      });

      await this.replaceScheduleTimeBlocks(tx, created.id, parsed.data.timeSlots);

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

    await this.validateLocations(nextRegionId, nextFromLocationId, nextToLocationId);

    return this.prisma.$transaction(async (tx) => {
      await tx.segment.update({
        where: { id },
        data: {
          ...(parsed.data.regionId !== undefined ? { regionId: nextRegionId, regionName: region.name } : {}),
          ...(parsed.data.fromLocationId !== undefined ? { fromLocationId: parsed.data.fromLocationId } : {}),
          ...(parsed.data.toLocationId !== undefined ? { toLocationId: parsed.data.toLocationId } : {}),
          ...(parsed.data.averageDistanceKm !== undefined ? { averageDistanceKm: parsed.data.averageDistanceKm } : {}),
          ...(parsed.data.averageTravelHours !== undefined ? { averageTravelHours: parsed.data.averageTravelHours } : {}),
          ...(parsed.data.isLongDistance !== undefined ? { isLongDistance: parsed.data.isLongDistance } : {}),
        },
      });

      if (parsed.data.timeSlots) {
        await this.replaceScheduleTimeBlocks(tx, id, parsed.data.timeSlots);
      }

      return new SegmentRepository(tx).findById(id);
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
