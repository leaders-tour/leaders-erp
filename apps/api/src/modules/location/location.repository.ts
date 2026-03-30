import type { PrismaClient } from '@prisma/client';
import { locationInclude, locationVersionInclude } from './location.mapper';
import type { LocationCreateDto, LocationUpdateDto } from './location.types';

export interface LocationDeleteDependencySummary {
  fromSegments: number;
  toSegments: number;
  overnightStays: number;
  overnightStaysAsStart: number;
  overnightStaysAsEnd: number;
  overnightStayDaysAsDisplay: number;
  toOvernightStayConnections: number;
}

export class LocationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany(filter?: { regionIds?: string[] }) {
    return this.prisma.location.findMany({
      where: filter?.regionIds?.length ? { regionId: { in: filter.regionIds } } : undefined,
      include: locationInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.location.findUnique({ where: { id }, include: locationInclude });
  }

  async findDeleteDependencySummary(id: string): Promise<LocationDeleteDependencySummary | null> {
    const row = await this.prisma.location.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            fromSegments: true,
            toSegments: true,
            overnightStays: true,
            overnightStaysAsStart: true,
            overnightStaysAsEnd: true,
            overnightStayDaysAsDisplay: true,
            toOvernightStayConnections: true,
          },
        },
      },
    });

    if (!row) {
      return null;
    }

    return row._count;
  }

  findVersionsByLocation(locationId: string) {
    return this.prisma.locationVersion.findMany({
      where: { locationId },
      include: locationVersionInclude,
      orderBy: { versionNumber: 'desc' },
    });
  }

  findVersionById(id: string) {
    return this.prisma.locationVersion.findUnique({ where: { id }, include: locationVersionInclude });
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
