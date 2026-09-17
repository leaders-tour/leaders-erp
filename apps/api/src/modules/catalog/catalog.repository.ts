import type { PrismaClient } from '@prisma/client';
import type {
  CatalogBlockCreateInput,
  CatalogElementCreateInput,
  CatalogPlaceCreateInput,
  CatalogRegionCreateInput,
  CatalogRouteCreateInput,
} from '@tour/validation';

type PrismaLike = PrismaClient;

type CatalogUsageStatus = 'ACTIVE' | 'INACTIVE';
type CatalogPlaceType = 'LODGING' | 'EXPERIENCE' | 'MEETING' | 'GATE' | 'AREA';

function nextCode(prefix: string, count: number): string {
  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
}

export class CatalogRepository {
  constructor(private readonly prisma: PrismaLike) {}

  listRegions(status?: CatalogUsageStatus) {
    return this.prisma.catalogRegion.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listPlaces(status?: CatalogUsageStatus, placeType?: CatalogPlaceType) {
    return this.prisma.catalogPlace.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(placeType ? { placeType } : {}),
      },
      include: {
        region: true,
        parentPlace: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listRoutes(status?: CatalogUsageStatus) {
    return this.prisma.catalogRoute.findMany({
      where: status ? { status } : undefined,
      include: {
        region: true,
        fromPlace: true,
        toPlace: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listElements(status?: CatalogUsageStatus) {
    return this.prisma.catalogElement.findMany({
      where: status ? { status } : undefined,
      include: {
        defaultPlace: true,
        setItems: {
          include: { memberElement: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listBlocks(status?: CatalogUsageStatus) {
    return this.prisma.catalogBlock.findMany({
      where: status ? { status } : undefined,
      include: {
        setItems: {
          include: { memberBlock: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createRegion(data: CatalogRegionCreateInput) {
    const count = await this.prisma.catalogRegion.count();
    return this.prisma.catalogRegion.create({
      data: {
        code: nextCode('RG', count),
        name: data.name,
        country: data.country ?? '몽골',
        description: data.description ?? null,
        status: data.status ?? 'ACTIVE',
        sortOrder: count + 100,
      },
    });
  }

  async createPlace(data: CatalogPlaceCreateInput) {
    const count = await this.prisma.catalogPlace.count();
    return this.prisma.catalogPlace.create({
      data: {
        code: nextCode('PL', count),
        name: data.name,
        placeType: data.placeType,
        country: data.country ?? '몽골',
        regionId: data.regionId ?? null,
        parentPlaceId: data.parentPlaceId ?? null,
        status: data.status ?? 'ACTIVE',
        sortOrder: count + 100,
      },
      include: {
        region: true,
        parentPlace: true,
      },
    });
  }

  async createRoute(data: CatalogRouteCreateInput) {
    const count = await this.prisma.catalogRoute.count();
    return this.prisma.catalogRoute.create({
      data: {
        code: nextCode('RT', count),
        name: data.name,
        fromPlaceId: data.fromPlaceId,
        toPlaceId: data.toPlaceId,
        regionId: data.regionId ?? null,
        averageDistanceKm: data.averageDistanceKm ?? null,
        averageTravelHours: data.averageTravelHours ?? null,
        status: data.status ?? 'ACTIVE',
        sortOrder: count + 100,
      },
      include: {
        region: true,
        fromPlace: true,
        toPlace: true,
      },
    });
  }

  async createElement(data: CatalogElementCreateInput) {
    const count = await this.prisma.catalogElement.count();
    const composition = data.composition ?? 'SINGLE';
    return this.prisma.catalogElement.create({
      data: {
        code: nextCode(composition === 'SET' ? 'ES' : 'EL', count),
        name: data.name,
        kind: data.kind,
        composition,
        customerText: data.customerText ?? null,
        status: data.status ?? 'ACTIVE',
        valueStatusText: '설정 중',
        sortOrder: count + 100,
      },
      include: {
        defaultPlace: true,
        setItems: {
          include: { memberElement: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  async createBlock(data: CatalogBlockCreateInput) {
    const count = await this.prisma.catalogBlock.count();
    const shape = data.shape ?? 'DAY';
    return this.prisma.catalogBlock.create({
      data: {
        code: nextCode(shape === 'SET' ? 'BS' : 'BL', count),
        name: data.name,
        shape,
        dayCount: shape === 'SET' ? 2 : 1,
        fromLabel: data.fromLabel ?? null,
        toLabel: data.toLabel ?? null,
        status: data.status ?? 'ACTIVE',
        calcStatusText: '계산됨',
        sortOrder: count + 100,
      },
      include: {
        setItems: {
          include: { memberBlock: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }
}
