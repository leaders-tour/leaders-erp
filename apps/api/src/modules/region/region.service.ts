import type { PrismaClient } from '@prisma/client';
import { regionCreateSchema, regionUpdateSchema } from '@tour/validation';
import { createValidationError, DomainError } from '../../lib/errors';
import { RegionSetService } from '../region-set/region-set.service';
import { regionInclude } from './region.mapper';
import { RegionRepository } from './region.repository';
import type { RegionCreateDto, RegionUpdateDto } from './region.types';

export class RegionService {
  private readonly repository: RegionRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new RegionRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  create(input: RegionCreateDto) {
    const parsed = regionCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid region input', parsed.error);
    }

    return this.prisma.$transaction(async (tx) => {
      const region = await tx.region.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description ?? null,
        },
      });
      await RegionSetService.createSingletonForRegion(tx, region.id, region.name);
      return tx.region.findUniqueOrThrow({
        where: { id: region.id },
        include: regionInclude,
      });
    });
  }

  async update(id: string, input: RegionUpdateDto) {
    const parsed = regionUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid region update input', parsed.error);
    }

    if (!parsed.data.name) {
      return this.repository.update(id, parsed.data);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.region.update({
        where: { id },
        data: parsed.data,
        include: regionInclude,
      });

      await tx.location.updateMany({
        where: { regionId: id },
        data: { regionName: updated.name },
      });
      await tx.segment.updateMany({
        where: { regionId: id },
        data: { regionName: updated.name },
      });

      return updated;
    });
  }

  async delete(id: string): Promise<boolean> {
    const inComposite = await this.prisma.regionSetItem.findFirst({
      where: { regionId: id, regionSetId: { not: id } },
      select: { id: true },
    });
    if (inComposite) {
      throw new DomainError(
        'VALIDATION_FAILED',
        'Region is part of a composite region set and cannot be deleted',
      );
    }

    const [planCount, templateCount] = await Promise.all([
      this.prisma.plan.count({ where: { regionSetId: id } }),
      this.prisma.planTemplate.count({ where: { regionSetId: id } }),
    ]);
    if (planCount > 0 || templateCount > 0) {
      throw new DomainError(
        'VALIDATION_FAILED',
        'Cannot delete region while plans or templates reference its default region set',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const locations = await tx.location.findMany({
        where: { regionId: id },
        select: { id: true },
      });
      const locationIds = locations.map((location) => location.id);

      await tx.segment.deleteMany({
        where: {
          OR: [
            { regionId: id },
            ...(locationIds.length > 0
              ? [{ fromLocationId: { in: locationIds } }, { toLocationId: { in: locationIds } }]
              : []),
          ],
        },
      });

      await tx.location.deleteMany({ where: { regionId: id } });

      await tx.region.update({
        where: { id },
        data: { defaultRegionSetId: null },
      });

      await tx.regionSet.delete({ where: { id } });
      await tx.region.delete({ where: { id } });
    });

    return true;
  }
}
