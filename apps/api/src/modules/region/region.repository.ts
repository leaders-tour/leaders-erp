import type { Prisma, PrismaClient } from '@prisma/client';
import { regionInclude } from './region.mapper';
import type { RegionCreateDto, RegionUpdateDto } from './region.types';

export class RegionRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  findMany() {
    return this.prisma.region.findMany({ include: regionInclude, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return this.prisma.region.findUnique({ where: { id }, include: regionInclude });
  }

  create(data: RegionCreateDto) {
    return this.prisma.region.create({ data, include: regionInclude });
  }

  update(id: string, data: RegionUpdateDto) {
    return this.prisma.region.update({ where: { id }, data, include: regionInclude });
  }

  async delete(id: string): Promise<boolean> {
    if ('$transaction' in this.prisma) {
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
        await tx.region.delete({ where: { id } });
      });
    } else {
      await this.prisma.region.delete({ where: { id } });
    }
    return true;
  }
}
