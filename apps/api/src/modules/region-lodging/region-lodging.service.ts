import type { PrismaClient } from '@prisma/client';
import { regionLodgingCreateSchema, regionLodgingUpdateSchema } from '@tour/validation';
import { createValidationError, DomainError } from '../../lib/errors';
import { RegionLodgingRepository } from './region-lodging.repository';
import type { RegionLodgingCreateDto, RegionLodgingUpdateDto } from './region-lodging.types';

export class RegionLodgingService {
  private readonly repository: RegionLodgingRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new RegionLodgingRepository(prisma);
  }

  list(filter: { regionId?: string; activeOnly?: boolean } = {}) {
    return this.repository.findMany(filter);
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  private async ensureRegionExists(regionId: string): Promise<void> {
    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
      select: { id: true },
    });

    if (!region) {
      throw new DomainError('NOT_FOUND', 'Region not found');
    }
  }

  async create(input: RegionLodgingCreateDto) {
    const parsed = regionLodgingCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid region lodging input', parsed.error);
    }

    await this.ensureRegionExists(parsed.data.regionId);
    return this.repository.create({
      ...parsed.data,
      name: parsed.data.name.trim(),
      isActive: true,
      sortOrder: parsed.data.sortOrder ?? 0,
    });
  }

  async update(id: string, input: RegionLodgingUpdateDto) {
    const parsed = regionLodgingUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid region lodging update input', parsed.error);
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Region lodging not found');
    }

    if (parsed.data.regionId) {
      await this.ensureRegionExists(parsed.data.regionId);
    }

    return this.repository.update(id, {
      ...parsed.data,
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      isActive: true,
    });
  }

  async delete(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Region lodging not found');
    }

    return this.repository.delete(id);
  }
}
