import type { Prisma, PrismaClient } from '@prisma/client';
import { planTemplateCreateSchema, planTemplateUpdateSchema } from '@tour/validation';
import { createValidationError, DomainError } from '../../lib/errors';
import { resolveRegionSetRegionIds } from '../../lib/resolve-region-set';
import { PlanTemplateRepository } from './plan-template.repository';
import type { PlanTemplateCreateDto, PlanTemplateUpdateDto } from './plan-template.types';

interface PlanTemplateListFilter {
  regionSetId?: string;
  totalDays?: number;
  activeOnly?: boolean;
}

export class PlanTemplateService {
  constructor(private readonly prisma: PrismaClient) {}

  private async ensureRegionSetExists(regionSetId: string): Promise<void> {
    const set = await this.prisma.regionSet.findUnique({ where: { id: regionSetId }, select: { id: true } });
    if (!set) {
      throw new DomainError('NOT_FOUND', 'Region set not found');
    }
  }

  private async normalizePlanStopsWithLocationReferences<
    T extends {
      dayIndex: number;
      segmentId?: string;
      segmentVersionId?: string;
      multiDayBlockId?: string;
      multiDayBlockDayOrder?: number;
      multiDayBlockConnectionId?: string;
      multiDayBlockConnectionVersionId?: string;
      locationId?: string;
      locationVersionId?: string;
    },
  >(
    planStops: T[],
  ): Promise<T[]> {
    const locationVersionIds = Array.from(
      new Set(
        planStops
          .map((planStop) => planStop.locationVersionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );

    let normalizedStops = planStops;
    if (locationVersionIds.length > 0) {
      const versions = await this.prisma.locationVersion.findMany({
        where: { id: { in: locationVersionIds } },
        select: { id: true, locationId: true },
      });

      if (versions.length !== locationVersionIds.length) {
        throw new DomainError('VALIDATION_FAILED', 'One or more locationVersionId values are invalid');
      }

      const locationIdByVersionId = new Map(versions.map((version) => [version.id, version.locationId]));

      normalizedStops = planStops.map((planStop) => {
        if (!planStop.locationVersionId) {
          return planStop;
        }

        const expectedLocationId = locationIdByVersionId.get(planStop.locationVersionId);
        if (!expectedLocationId) {
          throw new DomainError('VALIDATION_FAILED', 'One or more locationVersionId values are invalid');
        }

        if (planStop.locationId && planStop.locationId !== expectedLocationId) {
          throw new DomainError('VALIDATION_FAILED', 'locationId and locationVersionId must belong to the same location');
        }

        return {
          ...planStop,
          locationId: expectedLocationId,
        };
      });
    }

    const segmentIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.segmentId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const segmentVersionIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.segmentVersionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const blockIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.multiDayBlockId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const blockConnectionIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.multiDayBlockConnectionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const blockConnectionVersionIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.multiDayBlockConnectionVersionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    if (
      segmentIds.length === 0 &&
      segmentVersionIds.length === 0 &&
      blockIds.length === 0 &&
      blockConnectionIds.length === 0 &&
      blockConnectionVersionIds.length === 0
    ) {
      return normalizedStops;
    }

    const segments =
      segmentIds.length > 0
        ? await this.prisma.segment.findMany({
            where: { id: { in: segmentIds } },
            select: { id: true, fromLocationId: true, toLocationId: true },
          })
        : [];
    if (segments.length !== segmentIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more segmentId values are invalid');
    }

    const segmentById = new Map(segments.map((segment) => [segment.id, segment]));
    const segmentVersions =
      segmentVersionIds.length > 0
        ? await this.prisma.segmentVersion.findMany({
            where: { id: { in: segmentVersionIds } },
            select: { id: true, segmentId: true },
          })
        : [];
    if (segmentVersions.length !== segmentVersionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more segmentVersionId values are invalid');
    }
    const segmentVersionById = new Map(segmentVersions.map((segmentVersion) => [segmentVersion.id, segmentVersion]));
    const overnightStays =
      blockIds.length > 0
        ? await this.prisma.overnightStay.findMany({
            where: { id: { in: blockIds } },
            select: {
              id: true,
              locationId: true,
              startLocationId: true,
              endLocationId: true,
              days: { select: { dayOrder: true, displayLocationId: true } },
            },
          })
        : [];
    if (overnightStays.length !== blockIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more multiDayBlockId values are invalid');
    }
    const blockConnections =
      blockConnectionIds.length > 0
        ? await this.prisma.overnightStayConnection.findMany({
            where: { id: { in: blockConnectionIds } },
            select: { id: true, fromOvernightStayId: true, toLocationId: true },
          })
        : [];
    if (blockConnections.length !== blockConnectionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more multiDayBlockConnectionId values are invalid');
    }
    const blockConnectionById = new Map(blockConnections.map((connection) => [connection.id, connection]));
    const blockConnectionVersions =
      blockConnectionVersionIds.length > 0
        ? await this.prisma.overnightStayConnectionVersion.findMany({
            where: { id: { in: blockConnectionVersionIds } },
            select: { id: true, overnightStayConnectionId: true },
          })
        : [];
    if (blockConnectionVersions.length !== blockConnectionVersionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more multiDayBlockConnectionVersionId values are invalid');
    }
    const blockConnectionVersionById = new Map(
      blockConnectionVersions.map((version) => [version.id, version]),
    );
    const blockById = new Map(overnightStays.map((b) => [b.id, b]));
    const blockDayOrdersById = new Map(
      overnightStays.map((b) => [
        b.id,
        b.days.map((d) => d.dayOrder).slice().sort((a, b) => a - b),
      ]),
    );
    const blockDayDisplayLocationByIdAndOrder = new Map(
      overnightStays.flatMap((b) => b.days.map((d) => [`${b.id}:${d.dayOrder}`, d.displayLocationId])),
    );
    const orderedStops = normalizedStops.slice().sort((a, b) => a.dayIndex - b.dayIndex);
    for (const [index, planStop] of orderedStops.entries()) {
      if (planStop.segmentVersionId) {
        if (!planStop.segmentId) {
          throw new DomainError('VALIDATION_FAILED', 'segmentVersionId requires segmentId');
        }
        const segmentVersion = segmentVersionById.get(planStop.segmentVersionId);
        if (!segmentVersion) {
          throw new DomainError('VALIDATION_FAILED', 'One or more segmentVersionId values are invalid');
        }
        if (segmentVersion.segmentId !== planStop.segmentId) {
          throw new DomainError('VALIDATION_FAILED', 'segmentVersionId must belong to segmentId');
        }
      }
      if (planStop.multiDayBlockConnectionVersionId) {
        if (!planStop.multiDayBlockConnectionId) {
          throw new DomainError('VALIDATION_FAILED', 'multiDayBlockConnectionVersionId requires multiDayBlockConnectionId');
        }
        const connectionVersion = blockConnectionVersionById.get(planStop.multiDayBlockConnectionVersionId);
        if (!connectionVersion) {
          throw new DomainError('VALIDATION_FAILED', 'One or more multiDayBlockConnectionVersionId values are invalid');
        }
        if (connectionVersion.overnightStayConnectionId !== planStop.multiDayBlockConnectionId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'multiDayBlockConnectionVersionId must belong to multiDayBlockConnectionId',
          );
        }
      }
      const blockId = planStop.multiDayBlockId;
      const dayOrder = planStop.multiDayBlockDayOrder;
      if (dayOrder !== undefined && !blockId) {
        throw new DomainError('VALIDATION_FAILED', 'multiDayBlockDayOrder requires multiDayBlockId');
      }
      if (blockId) {
        const block = blockById.get(blockId);
        const blockDayOrders = blockDayOrdersById.get(blockId) ?? [];
        if (!block) {
          throw new DomainError('VALIDATION_FAILED', 'One or more multiDayBlockId values are invalid');
        }
        const expectedDisplayLocationId = blockDayDisplayLocationByIdAndOrder.get(`${blockId}:${dayOrder}`);
        if (
          planStop.locationId == null ||
          expectedDisplayLocationId == null ||
          expectedDisplayLocationId !== planStop.locationId
        ) {
          throw new DomainError('VALIDATION_FAILED', 'Block day row locationId must match the day displayLocationId');
        }
        if (dayOrder === undefined || !blockDayOrders.includes(dayOrder)) {
          throw new DomainError('VALIDATION_FAILED', 'multiDayBlockDayOrder must match the block days');
        }
        if (planStop.segmentId || planStop.segmentVersionId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'Block day stops cannot include segment references',
          );
        }
        if (planStop.multiDayBlockConnectionId || planStop.multiDayBlockConnectionVersionId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'Block day stops cannot include block connection references',
          );
        }
        if (index === 0) {
          throw new DomainError('VALIDATION_FAILED', 'Block is not allowed on the first stop');
        }
        const currentDayOrder = dayOrder;
        const firstDayOrder = blockDayOrders[0];
        const lastDayOrder = blockDayOrders[blockDayOrders.length - 1];
        const previousStop = orderedStops[index - 1];
        const nextStop = orderedStops[index + 1];
        const prevBlockId = previousStop?.multiDayBlockId;
        const nextBlockId = nextStop?.multiDayBlockId;
        const nextDayOrder = nextStop?.multiDayBlockDayOrder;

        if (currentDayOrder === firstDayOrder) {
          if (!nextStop || nextBlockId !== blockId || nextDayOrder !== currentDayOrder + 1) {
            throw new DomainError(
              'VALIDATION_FAILED',
              `Block day ${currentDayOrder} must be followed by matching day ${currentDayOrder + 1}`,
            );
          }
        } else if (
          !previousStop ||
          prevBlockId !== blockId ||
          previousStop.multiDayBlockDayOrder !== currentDayOrder - 1
        ) {
          throw new DomainError(
            'VALIDATION_FAILED',
            `Block day ${currentDayOrder} must follow matching day ${currentDayOrder - 1}`,
          );
        }
        if (currentDayOrder !== lastDayOrder) {
          if (!nextStop || nextBlockId !== blockId || nextDayOrder !== currentDayOrder + 1) {
            throw new DomainError(
              'VALIDATION_FAILED',
              `Block day ${currentDayOrder} must be followed by matching day ${currentDayOrder + 1}`,
            );
          }
        }
        continue;
      }
      if (index === 0) {
        if (
          planStop.segmentId ||
          planStop.segmentVersionId ||
          planStop.multiDayBlockConnectionId ||
          planStop.multiDayBlockConnectionVersionId
        ) {
          throw new DomainError('VALIDATION_FAILED', 'movement references are not allowed on the first stop');
        }
        continue;
      }

      const previousStop = orderedStops[index - 1];
      const prevBlockId = previousStop?.multiDayBlockId;
      const prevBlockDayOrders = prevBlockId ? blockDayOrdersById.get(prevBlockId) ?? [] : [];
      const previousIsLastBlockDay =
        prevBlockId != null &&
        previousStop?.multiDayBlockDayOrder ===
          prevBlockDayOrders[prevBlockDayOrders.length - 1];
      const currentLocationId = planStop.locationId;
      const previousLocationId = previousStop?.locationId;
      if (previousIsLastBlockDay) {
        if (!planStop.multiDayBlockConnectionId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'The stop after the last block day requires multiDayBlockConnectionId',
          );
        }
        if (planStop.segmentId || planStop.segmentVersionId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'The stop after the last block day must not include segment references',
          );
        }
        if (!currentLocationId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'The stop after the last block day requires a destination locationId',
          );
        }
        const blockConnection = blockConnectionById.get(planStop.multiDayBlockConnectionId);
        if (!blockConnection) {
          throw new DomainError('VALIDATION_FAILED', 'One or more multiDayBlockConnectionId values are invalid');
        }
        if (blockConnection.fromOvernightStayId !== prevBlockId || blockConnection.toLocationId !== currentLocationId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'multiDayBlockConnectionId must match the previous block and current stop location',
          );
        }
        continue;
      }
      if (planStop.multiDayBlockConnectionId || planStop.multiDayBlockConnectionVersionId) {
        throw new DomainError(
          'VALIDATION_FAILED',
          'multiDayBlockConnectionId is only allowed on the stop immediately after the last block day',
        );
      }
      if (!planStop.segmentId) {
        continue;
      }
      const segment = segmentById.get(planStop.segmentId);
      if (!segment) {
        throw new DomainError('VALIDATION_FAILED', 'One or more segmentId values are invalid');
      }
      if (!previousLocationId || !currentLocationId) {
        throw new DomainError('VALIDATION_FAILED', 'segmentId requires consecutive stops with location references');
      }
      if (segment.fromLocationId !== previousLocationId || segment.toLocationId !== currentLocationId) {
        throw new DomainError('VALIDATION_FAILED', 'segmentId must match the previous and current stop locations');
      }
    }

    return normalizedStops;
  }

  private validatePlanStopsAgainstTotalDays(planStops: Array<{ dayIndex: number }>, totalDays: number): void {
    if (planStops.length !== totalDays) {
      throw new DomainError('VALIDATION_FAILED', 'totalDays must match planStops length');
    }

    const seen = new Set<number>();
    for (const stop of planStops) {
      if (stop.dayIndex < 1 || stop.dayIndex > totalDays) {
        throw new DomainError('VALIDATION_FAILED', 'dayIndex must be within totalDays');
      }
      if (seen.has(stop.dayIndex)) {
        throw new DomainError('VALIDATION_FAILED', 'planStops must have unique dayIndex values');
      }
      seen.add(stop.dayIndex);
    }
  }

  list(filter: PlanTemplateListFilter) {
    return new PlanTemplateRepository(this.prisma).findMany(filter);
  }

  get(id: string) {
    return new PlanTemplateRepository(this.prisma).findById(id);
  }

  async create(input: PlanTemplateCreateDto) {
    const parsed = planTemplateCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid plan template input', parsed.error);
    }

    await this.ensureRegionSetExists(parsed.data.regionSetId);
    await resolveRegionSetRegionIds(this.prisma, parsed.data.regionSetId);

    const normalizedPlanStops = await this.normalizePlanStopsWithLocationReferences(parsed.data.planStops);
    this.validatePlanStopsAgainstTotalDays(normalizedPlanStops, parsed.data.totalDays);
    const { planStops: _planStops, ...templateData } = parsed.data;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const repository = new PlanTemplateRepository(tx);
      const created = await repository.create({
        ...templateData,
        name: templateData.name.trim(),
        description: templateData.description?.trim(),
      });

      await repository.replaceStops(created.id, normalizedPlanStops);
      const result = await repository.findById(created.id);
      if (!result) {
        throw new DomainError('INTERNAL', 'Failed to load created plan template');
      }
      return result;
    });
  }

  async update(id: string, input: PlanTemplateUpdateDto) {
    const parsed = planTemplateUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid plan template update input', parsed.error);
    }

    const repository = new PlanTemplateRepository(this.prisma);
    const existing = await repository.findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Plan template not found');
    }

    if (parsed.data.regionSetId) {
      await this.ensureRegionSetExists(parsed.data.regionSetId);
      await resolveRegionSetRegionIds(this.prisma, parsed.data.regionSetId);
    }

    const nextTotalDays = parsed.data.totalDays ?? existing.totalDays;

    let normalizedPlanStops = parsed.data.planStops;
    if (parsed.data.planStops) {
      normalizedPlanStops = await this.normalizePlanStopsWithLocationReferences(parsed.data.planStops);
      this.validatePlanStopsAgainstTotalDays(normalizedPlanStops, nextTotalDays);
    } else if (parsed.data.totalDays !== undefined && existing.planStops.length !== nextTotalDays) {
      throw new DomainError('VALIDATION_FAILED', 'totalDays must match existing planStops length');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const txRepository = new PlanTemplateRepository(tx);
      await txRepository.update(id, {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description.trim() } : {}),
        ...(parsed.data.regionSetId !== undefined ? { regionSetId: parsed.data.regionSetId } : {}),
        ...(parsed.data.totalDays !== undefined ? { totalDays: parsed.data.totalDays } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      });

      if (normalizedPlanStops) {
        await txRepository.replaceStops(id, normalizedPlanStops);
      }

      const result = await txRepository.findById(id);
      if (!result) {
        throw new DomainError('INTERNAL', 'Failed to load updated plan template');
      }
      return result;
    });
  }

  delete(id: string) {
    return new PlanTemplateRepository(this.prisma).delete(id);
  }
}
