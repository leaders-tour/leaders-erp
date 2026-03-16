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
    T extends { dayIndex: number; segmentId?: string; locationId?: string; locationVersionId?: string },
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
    if (segmentIds.length === 0) {
      return normalizedStops;
    }

    const segments = await this.prisma.segment.findMany({
      where: { id: { in: segmentIds } },
      select: { id: true, fromLocationId: true, toLocationId: true },
    });
    if (segments.length !== segmentIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more segmentId values are invalid');
    }

    const segmentById = new Map(segments.map((segment) => [segment.id, segment]));
    const orderedStops = normalizedStops.slice().sort((a, b) => a.dayIndex - b.dayIndex);
    orderedStops.forEach((planStop, index) => {
      if (!planStop.segmentId) {
        return;
      }
      if (index === 0) {
        throw new DomainError('VALIDATION_FAILED', 'segmentId is not allowed on the first stop');
      }

      const previousStop = orderedStops[index - 1];
      const currentLocationId = planStop.locationId;
      const previousLocationId = previousStop?.locationId;
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
