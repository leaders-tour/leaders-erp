import type { Prisma, PrismaClient } from '@prisma/client';
import { planTemplateCreateSchema, planTemplateUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
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
      overnightStayId?: string;
      overnightStayDayOrder?: number;
      overnightStayConnectionId?: string;
      overnightStayConnectionVersionId?: string;
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
    const overnightStayIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.overnightStayId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const overnightStayConnectionIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.overnightStayConnectionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const overnightStayConnectionVersionIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.overnightStayConnectionVersionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    if (
      segmentIds.length === 0 &&
      segmentVersionIds.length === 0 &&
      overnightStayIds.length === 0 &&
      overnightStayConnectionIds.length === 0 &&
      overnightStayConnectionVersionIds.length === 0
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
      overnightStayIds.length > 0
        ? await this.prisma.overnightStay.findMany({
            where: { id: { in: overnightStayIds } },
            select: { id: true, locationId: true },
          })
        : [];
    if (overnightStays.length !== overnightStayIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayId values are invalid');
    }
    const overnightStayById = new Map(overnightStays.map((overnightStay) => [overnightStay.id, overnightStay]));
    const overnightStayConnections =
      overnightStayConnectionIds.length > 0
        ? await this.prisma.overnightStayConnection.findMany({
            where: { id: { in: overnightStayConnectionIds } },
            select: { id: true, fromOvernightStayId: true, toLocationId: true },
          })
        : [];
    if (overnightStayConnections.length !== overnightStayConnectionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayConnectionId values are invalid');
    }
    const overnightStayConnectionById = new Map(
      overnightStayConnections.map((overnightStayConnection) => [overnightStayConnection.id, overnightStayConnection]),
    );
    const overnightStayConnectionVersions =
      overnightStayConnectionVersionIds.length > 0
        ? await this.prisma.overnightStayConnectionVersion.findMany({
            where: { id: { in: overnightStayConnectionVersionIds } },
            select: { id: true, overnightStayConnectionId: true },
          })
        : [];
    if (overnightStayConnectionVersions.length !== overnightStayConnectionVersionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayConnectionVersionId values are invalid');
    }
    const overnightStayConnectionVersionById = new Map(
      overnightStayConnectionVersions.map((version) => [version.id, version]),
    );
    const orderedStops = normalizedStops.slice().sort((a, b) => a.dayIndex - b.dayIndex);
    orderedStops.forEach((planStop, index) => {
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
      if (planStop.overnightStayConnectionVersionId) {
        if (!planStop.overnightStayConnectionId) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayConnectionVersionId requires overnightStayConnectionId');
        }
        const overnightStayConnectionVersion = overnightStayConnectionVersionById.get(planStop.overnightStayConnectionVersionId);
        if (!overnightStayConnectionVersion) {
          throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayConnectionVersionId values are invalid');
        }
        if (overnightStayConnectionVersion.overnightStayConnectionId !== planStop.overnightStayConnectionId) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayConnectionVersionId must belong to overnightStayConnectionId');
        }
      }
      if (planStop.overnightStayDayOrder !== undefined && !planStop.overnightStayId) {
        throw new DomainError('VALIDATION_FAILED', 'overnightStayDayOrder requires overnightStayId');
      }
      if (planStop.overnightStayId) {
        const overnightStay = overnightStayById.get(planStop.overnightStayId);
        if (!overnightStay) {
          throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayId values are invalid');
        }
        if (!planStop.locationId || overnightStay.locationId !== planStop.locationId) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayId must match locationId');
        }
        if (planStop.overnightStayDayOrder !== 1 && planStop.overnightStayDayOrder !== 2) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayDayOrder must be 1 or 2');
        }
        if (
          planStop.segmentId ||
          planStop.segmentVersionId ||
          planStop.overnightStayConnectionId ||
          planStop.overnightStayConnectionVersionId
        ) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'overnightStay stops cannot include segment or overnightStayConnection references',
          );
        }
        if (index === 0) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStay is not allowed on the first stop');
        }
        if (planStop.overnightStayDayOrder === 1) {
          const nextStop = orderedStops[index + 1];
          if (
            !nextStop ||
            nextStop.overnightStayId !== planStop.overnightStayId ||
            nextStop.overnightStayDayOrder !== 2
          ) {
            throw new DomainError('VALIDATION_FAILED', 'overnightStay day 1 must be followed by matching day 2');
          }
        }
        if (planStop.overnightStayDayOrder === 2) {
          const previousStop = orderedStops[index - 1];
          if (
            !previousStop ||
            previousStop.overnightStayId !== planStop.overnightStayId ||
            previousStop.overnightStayDayOrder !== 1
          ) {
            throw new DomainError('VALIDATION_FAILED', 'overnightStay day 2 must follow matching day 1');
          }
        }
        return;
      }
      if (index === 0) {
        if (planStop.segmentId || planStop.segmentVersionId) {
          throw new DomainError('VALIDATION_FAILED', 'segmentId is not allowed on the first stop');
        }
        if (planStop.overnightStayConnectionId || planStop.overnightStayConnectionVersionId) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayConnectionId is not allowed on the first stop');
        }
        return;
      }

      const previousStop = orderedStops[index - 1];
      const previousIsOvernightStayDay2 =
        previousStop?.overnightStayId !== undefined && previousStop?.overnightStayDayOrder === 2;
      const currentLocationId = planStop.locationId;
      const previousLocationId = previousStop?.locationId;
      if (planStop.overnightStayConnectionId) {
        if (!previousIsOvernightStayDay2) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayConnectionId requires the previous stop to be overnightStay day 2');
        }
        if (planStop.segmentId || planStop.segmentVersionId) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayConnectionId cannot be combined with segmentId');
        }
        const overnightStayConnection = overnightStayConnectionById.get(planStop.overnightStayConnectionId);
        if (!overnightStayConnection) {
          throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayConnectionId values are invalid');
        }
        if (!currentLocationId) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayConnectionId requires locationId');
        }
        if (
          overnightStayConnection.fromOvernightStayId !== previousStop?.overnightStayId ||
          overnightStayConnection.toLocationId !== currentLocationId
        ) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'overnightStayConnectionId must match the previous overnight stay and current stop location',
          );
        }
        return;
      }
      if (planStop.overnightStayConnectionVersionId) {
        throw new DomainError('VALIDATION_FAILED', 'overnightStayConnectionVersionId requires overnightStayConnectionId');
      }
      if (previousIsOvernightStayDay2) {
        throw new DomainError('VALIDATION_FAILED', 'the stop after overnightStay day 2 requires overnightStayConnectionId');
      }
      if (!planStop.segmentId) {
        return;
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
    });

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
      throw new DomainError('VALIDATION_FAILED', 'Invalid plan template input');
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
      throw new DomainError('VALIDATION_FAILED', 'Invalid plan template update input');
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
