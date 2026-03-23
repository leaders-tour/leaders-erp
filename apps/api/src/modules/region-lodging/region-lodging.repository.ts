import type { Prisma, PrismaClient } from '@prisma/client';
import { regionLodgingInclude } from './region-lodging.mapper';
import type { RegionLodgingCreateDto, RegionLodgingUpdateDto } from './region-lodging.types';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export class RegionLodgingRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findMany(filter: { regionId?: string; activeOnly?: boolean } = {}) {
    return this.prisma.regionLodging.findMany({
      where: {
        ...(filter.regionId ? { regionId: filter.regionId } : {}),
        ...(filter.activeOnly ? { isActive: true } : {}),
      },
      include: regionLodgingInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.regionLodging.findUnique({
      where: { id },
      include: regionLodgingInclude,
    });
  }

  create(data: RegionLodgingCreateDto & { isActive: boolean }) {
    return this.prisma.regionLodging.create({
      data,
      include: regionLodgingInclude,
    });
  }

  update(id: string, data: RegionLodgingUpdateDto & { isActive?: boolean }) {
    return this.prisma.regionLodging.update({
      where: { id },
      data,
      include: regionLodgingInclude,
    });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.regionLodging.delete({ where: { id } });
    return true;
  }
}
