import type { Prisma, PrismaClient } from '@prisma/client';
import { planTemplateCreateSchema, planTemplateUpdateSchema } from '@tour/validation';
import { createValidationError, DomainError } from '../../lib/errors';
import { PlanTemplateRepository } from './plan-template.repository';
import type { PlanTemplateCreateDto, PlanTemplateUpdateDto } from './plan-template.types';

interface PlanTemplateListFilter {
  regionId?: string;
  totalDays?: number;
  activeOnly?: boolean;
}

export class PlanTemplateService {
  constructor(private readonly prisma: PrismaClient) {}

  private async ensureRegionExists(regionId: string): Promise<void> {
    const region = await this.prisma.region.findUnique({ where: { id: regionId }, select: { id: true } });
    if (!region) {
      throw new DomainError('NOT_FOUND', 'Region not found');
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
    const connectionIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.multiDayBlockConnectionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const connectionVersionIds = Array.from(
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
      connectionIds.length === 0 &&
      connectionVersionIds.length === 0
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
    const overnightStayConnections =
      connectionIds.length > 0
        ? await this.prisma.overnightStayConnection.findMany({
            where: { id: { in: connectionIds } },
            select: { id: true, fromOvernightStayId: true, toLocationId: true },
          })
        : [];
    if (overnightStayConnections.length !== connectionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more multiDayBlockConnectionId values are invalid');
    }
    const connectionById = new Map(overnightStayConnections.map((c) => [c.id, c]));
    const overnightStayConnectionVersions =
      connectionVersionIds.length > 0
        ? await this.prisma.overnightStayConnectionVersion.findMany({
            where: { id: { in: connectionVersionIds } },
            select: { id: true, overnightStayConnectionId: true },
          })
        : [];
    if (overnightStayConnectionVersions.length !== connectionVersionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayConnectionVersionId values are invalid');
    }
    const overnightStayConnectionVersionById = new Map(
      overnightStayConnectionVersions.map((version) => [version.id, version]),
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
      const connectionVersionId = planStop.multiDayBlockConnectionVersionId;
      const connectionId = planStop.multiDayBlockConnectionId;
      if (connectionVersionId) {
        if (!connectionId) {
          throw new DomainError('VALIDATION_FAILED', 'multiDayBlockConnectionVersionId requires multiDayBlockConnectionId');
        }
        const connVersion = overnightStayConnectionVersionById.get(connectionVersionId);
        if (!connVersion) {
          throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayConnectionVersionId values are invalid');
        }
        if (connVersion.overnightStayConnectionId !== connectionId) {
          throw new DomainError('VALIDATION_FAILED', 'multiDayBlockConnectionVersionId must belong to multiDayBlockConnectionId');
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
        if (planStop.segmentId || planStop.segmentVersionId || connectionId || connectionVersionId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'Block day stops cannot include segment or block connection references',
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
        if (planStop.segmentId || planStop.segmentVersionId) {
          throw new DomainError('VALIDATION_FAILED', 'segmentId is not allowed on the first stop');
        }
        if (connectionId || connectionVersionId) {
          throw new DomainError('VALIDATION_FAILED', 'Block connection is not allowed on the first stop');
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
      const previousBlock = prevBlockId ? blockById.get(prevBlockId) : undefined;
      const previousLocationId = previousIsLastBlockDay && previousBlock
        ? previousBlock.endLocationId
        : previousStop?.locationId;

      if (connectionId) {
        if (!previousIsLastBlockDay) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'Block connection requires the previous stop to be the last block day',
          );
        }
        if (planStop.segmentId || planStop.segmentVersionId) {
          throw new DomainError('VALIDATION_FAILED', 'Block connection cannot be combined with segmentId');
        }
        const conn = connectionById.get(connectionId);
        if (!conn) {
          throw new DomainError('VALIDATION_FAILED', 'One or more block connection values are invalid');
        }
        if (!currentLocationId) {
          throw new DomainError('VALIDATION_FAILED', 'Block connection requires locationId');
        }
        if (conn.fromOvernightStayId !== prevBlockId || conn.toLocationId !== currentLocationId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'Block connection must match the previous block and current stop location',
          );
        }
        continue;
      }
      if (connectionVersionId) {
        throw new DomainError('VALIDATION_FAILED', 'Block connection version requires block connection');
      }
      if (previousIsLastBlockDay) {
        let segmentFromEnd =
          previousBlock && currentLocationId
            ? segments.find(
                (s) => s.fromLocationId === previousBlock.endLocationId && s.toLocationId === currentLocationId,
              )
            : undefined;
        if (!segmentFromEnd && previousBlock && currentLocationId) {
          segmentFromEnd = await this.prisma.segment.findFirst({
            where: {
              fromLocationId: previousBlock.endLocationId,
              toLocationId: currentLocationId,
            },
            select: { id: true, fromLocationId: true, toLocationId: true },
          }) ?? undefined;
        }
        if (!segmentFromEnd) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'The stop after the last block day requires a block connection or a segment from the block end location',
          );
        }
        if (!planStop.segmentId) {
          continue;
        }
        const segment = segmentById.get(planStop.segmentId);
        if (!segment) {
          throw new DomainError('VALIDATION_FAILED', 'One or more segmentId values are invalid');
        }
        if (segment.id !== segmentFromEnd.id) {
          throw new DomainError('VALIDATION_FAILED', 'segmentId must match the segment from block end to current location');
        }
        continue;
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

    await this.ensureRegionExists(parsed.data.regionId);

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

    if (parsed.data.regionId) {
      await this.ensureRegionExists(parsed.data.regionId);
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
        ...(parsed.data.regionId !== undefined ? { regionId: parsed.data.regionId } : {}),
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
