import type { PrismaClient } from '@prisma/client';
import { locationInclude } from './location.mapper';
import type { LocationCreateDto, LocationUpdateDto } from './location.types';

export class LocationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany() {
    return this.prisma.location.findMany({ include: locationInclude, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return this.prisma.location.findUnique({ where: { id }, include: locationInclude });
  }

  create(data: LocationCreateDto & { regionName: string }) {
    return this.prisma.location.create({ data, include: locationInclude });
  }

  update(id: string, data: LocationUpdateDto & { regionName?: string }) {
    return this.prisma.location.update({ where: { id }, data, include: locationInclude });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.location.delete({ where: { id } });
    return true;
  }
}
