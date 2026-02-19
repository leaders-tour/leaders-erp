import type { PrismaClient } from '@prisma/client';
import { regionCreateSchema, regionUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
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
      throw new DomainError('VALIDATION_FAILED', 'Invalid region input');
    }

    return this.repository.create(parsed.data);
  }

  async update(id: string, input: RegionUpdateDto) {
    const parsed = regionUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid region update input');
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

  delete(id: string) {
    return this.repository.delete(id);
  }
}
