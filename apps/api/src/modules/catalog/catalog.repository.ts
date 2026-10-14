import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CatalogBlockCreateInput,
  CatalogBlockPlacementInput,
  CatalogBlockUpdateInput,
  CatalogElementCreateInput,
  CatalogElementSetItemInput,
  CatalogElementUpdateInput,
  CatalogJourneyCreateInput,
  CatalogJourneyPlacementInput,
  CatalogJourneyUpdateInput,
  CatalogPlaceBatchUpdateInput,
  CatalogPlaceCreateInput,
  CatalogPlaceUpdateInput,
  CatalogRegionCreateInput,
  CatalogRegionUpdateInput,
  CatalogRouteCreateInput,
  CatalogRouteUpdateInput,
} from '@tour/validation';

type PrismaLike = PrismaClient;
type CatalogUsageStatus = 'ACTIVE' | 'INACTIVE';
type CatalogPlaceType = 'LODGING' | 'RESTAURANT' | 'EXPERIENCE' | 'MEETING' | 'GATE' | 'AREA';
type CatalogVisitLinkStatus = 'AUTO' | 'REVIEW' | 'UNLINKED' | 'MANUAL';
type CatalogVisitLinkReviewReason = 'OVERLAP' | 'NONE';

export interface CatalogVisitLinkCandidateRecord {
  placeId: string;
  name: string;
  code: string;
  distanceM: number;
}

export interface CatalogVisitLinkWriteData {
  visitId: string;
  projectId: string;
  latitude: number;
  longitude: number;
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
  description: string | null;
  visitRegion: string | null;
  placeId: string | null;
  status: CatalogVisitLinkStatus;
  distanceM: number | null;
  reviewReason: CatalogVisitLinkReviewReason | null;
  candidates: CatalogVisitLinkCandidateRecord[];
  analyzedAt: Date;
}

function canLinkAccommodation(placeType: CatalogPlaceType): boolean {
  return placeType === 'LODGING' || placeType === 'RESTAURANT';
}

function nextCode(prefix: string, count: number): string {
  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
}

const placeInclude = {
  region: true,
  parentPlace: true,
  accommodation: { select: { id: true, name: true, region: true, destination: true } },
} as const;

const visitLinkInclude = {
  place: { include: placeInclude },
} as const;

const elementInclude = {
  defaultPlace: true,
  setItems: {
    include: { memberElement: true },
    orderBy: { orderIndex: 'asc' as const },
  },
};

const blockInclude = {
  setItems: {
    include: { memberBlock: true },
    orderBy: { orderIndex: 'asc' as const },
  },
  placements: {
    include: { element: true },
    orderBy: [{ dayIndex: 'asc' as const }, { orderIndex: 'asc' as const }],
  },
};

const journeyInclude = {
  placements: {
    include: { block: true },
    orderBy: { orderIndex: 'asc' as const },
  },
};

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
      include: placeInclude,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listRoutes(status?: CatalogUsageStatus) {
    return this.prisma.catalogRoute.findMany({
      where: status ? { status } : undefined,
      include: { region: true, fromPlace: true, toPlace: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listElements(status?: CatalogUsageStatus) {
    return this.prisma.catalogElement.findMany({
      where: status ? { status } : undefined,
      include: elementInclude,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listBlocks(status?: CatalogUsageStatus) {
    return this.prisma.catalogBlock.findMany({
      where: status ? { status } : undefined,
      include: blockInclude,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listJourneys(status?: CatalogUsageStatus) {
    return this.prisma.catalogJourney.findMany({
      where: status ? { status } : undefined,
      include: journeyInclude,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listChangeLogs(targetType?: string, targetId?: string) {
    return this.prisma.catalogChangeLog.findMany({
      where: {
        ...(targetType ? { targetType } : {}),
        ...(targetId ? { targetId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
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

  updateRegion(id: string, data: CatalogRegionUpdateInput) {
    return this.prisma.catalogRegion.update({
      where: { id },
      data: {
        ...(data.name != null ? { name: data.name } : {}),
        ...(data.country != null ? { country: data.country } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.status != null ? { status: data.status } : {}),
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
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        displayName: data.displayName ?? null,
        internalNote: data.internalNote ?? null,
        accommodationId: canLinkAccommodation(data.placeType) ? (data.accommodationId ?? null) : null,
        visitJudgmentType: data.visitJudgmentType ?? null,
        visitRadiusM: data.visitRadiusM ?? null,
        visitMinStayMinutes: data.visitJudgmentType === 'PASS' ? null : (data.visitMinStayMinutes ?? null),
        status: data.status ?? 'ACTIVE',
        sortOrder: count + 100,
      },
      include: placeInclude,
    });
  }

  updatePlace(id: string, data: CatalogPlaceUpdateInput) {
    return this.prisma.catalogPlace.update({
      where: { id },
      data: {
        ...(data.name != null ? { name: data.name } : {}),
        ...(data.placeType != null ? { placeType: data.placeType } : {}),
        ...(data.country != null ? { country: data.country } : {}),
        ...(data.regionId !== undefined ? { regionId: data.regionId } : {}),
        ...(data.parentPlaceId !== undefined ? { parentPlaceId: data.parentPlaceId } : {}),
        ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
        ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
        ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
        ...(data.internalNote !== undefined ? { internalNote: data.internalNote } : {}),
        ...(data.placeType != null && !canLinkAccommodation(data.placeType)
          ? { accommodationId: null }
          : data.accommodationId !== undefined
            ? { accommodationId: data.accommodationId }
            : {}),
        ...(data.visitJudgmentType !== undefined ? { visitJudgmentType: data.visitJudgmentType } : {}),
        ...(data.visitRadiusM !== undefined ? { visitRadiusM: data.visitRadiusM } : {}),
        ...(data.visitJudgmentType === 'PASS'
          ? { visitMinStayMinutes: null }
          : data.visitMinStayMinutes !== undefined
            ? { visitMinStayMinutes: data.visitMinStayMinutes }
            : {}),
        ...(data.status != null ? { status: data.status } : {}),
      },
      include: placeInclude,
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
      include: { region: true, fromPlace: true, toPlace: true },
    });
  }

  updateRoute(id: string, data: CatalogRouteUpdateInput) {
    return this.prisma.catalogRoute.update({
      where: { id },
      data: {
        ...(data.name != null ? { name: data.name } : {}),
        ...(data.fromPlaceId != null ? { fromPlaceId: data.fromPlaceId } : {}),
        ...(data.toPlaceId != null ? { toPlaceId: data.toPlaceId } : {}),
        ...(data.regionId !== undefined ? { regionId: data.regionId } : {}),
        ...(data.averageDistanceKm !== undefined ? { averageDistanceKm: data.averageDistanceKm } : {}),
        ...(data.averageTravelHours !== undefined ? { averageTravelHours: data.averageTravelHours } : {}),
        ...(data.status != null ? { status: data.status } : {}),
      },
      include: { region: true, fromPlace: true, toPlace: true },
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
        durationText: data.durationText ?? null,
        costRuleText: data.costRuleText ?? null,
        defaultPlaceId: data.defaultPlaceId ?? null,
        lifecycleStatus: data.lifecycleStatus ?? 'ACTIVE',
        status: data.status ?? 'ACTIVE',
        valueStatusText: '설정 중',
        sortOrder: count + 100,
      },
      include: elementInclude,
    });
  }

  getElement(id: string) {
    return this.prisma.catalogElement.findUnique({ where: { id }, include: elementInclude });
  }

  listElementSetItems() {
    return this.prisma.catalogElementItem.findMany({
      select: { setElementId: true, memberElementId: true },
    });
  }

  updateElement(id: string, data: CatalogElementUpdateInput) {
    return this.prisma.catalogElement.update({
      where: { id },
      data: {
        ...(data.name != null ? { name: data.name } : {}),
        ...(data.kind != null ? { kind: data.kind } : {}),
        ...(data.composition != null ? { composition: data.composition } : {}),
        ...(data.customerText !== undefined ? { customerText: data.customerText } : {}),
        ...(data.durationText !== undefined ? { durationText: data.durationText } : {}),
        ...(data.costRuleText !== undefined ? { costRuleText: data.costRuleText } : {}),
        ...(data.defaultPlaceId !== undefined ? { defaultPlaceId: data.defaultPlaceId } : {}),
        ...(data.lifecycleStatus != null ? { lifecycleStatus: data.lifecycleStatus } : {}),
        ...(data.status != null ? { status: data.status } : {}),
        version: { increment: 1 },
      },
      include: elementInclude,
    });
  }

  async addElementSetItem(data: CatalogElementSetItemInput) {
    const last = await this.prisma.catalogElementItem.findFirst({
      where: { setElementId: data.setElementId },
      orderBy: { orderIndex: 'desc' },
    });
    await this.prisma.catalogElement.update({
      where: { id: data.setElementId },
      data: { composition: 'SET', version: { increment: 1 } },
    });
    await this.prisma.catalogElementItem.create({
      data: {
        setElementId: data.setElementId,
        memberElementId: data.memberElementId,
        orderIndex: (last?.orderIndex ?? -1) + 1,
      },
    });
    return this.getElement(data.setElementId);
  }

  async removeElementSetItem(id: string) {
    const item = await this.prisma.catalogElementItem.findUnique({ where: { id } });
    if (!item) return null;
    await this.prisma.catalogElementItem.delete({ where: { id } });
    await this.prisma.catalogElement.update({
      where: { id: item.setElementId },
      data: { version: { increment: 1 } },
    });
    return this.getElement(item.setElementId);
  }

  async createBlock(data: CatalogBlockCreateInput) {
    const count = await this.prisma.catalogBlock.count();
    const dayCount = data.dayCount ?? 1;
    return this.prisma.catalogBlock.create({
      data: {
        code: nextCode('BL', count),
        name: data.name,
        shape: 'DAY',
        dayCount,
        fromLabel: data.fromLabel ?? null,
        toLabel: data.toLabel ?? null,
        status: data.status ?? 'ACTIVE',
        calcStatusText: '계산 대기',
        sortOrder: count + 100,
      },
      include: blockInclude,
    });
  }

  getBlock(id: string) {
    return this.prisma.catalogBlock.findUnique({ where: { id }, include: blockInclude });
  }

  updateBlock(id: string, data: CatalogBlockUpdateInput) {
    return this.prisma.catalogBlock.update({
      where: { id },
      data: {
        ...(data.name != null ? { name: data.name } : {}),
        ...(data.dayCount != null ? { dayCount: data.dayCount } : {}),
        ...(data.fromLabel !== undefined ? { fromLabel: data.fromLabel } : {}),
        ...(data.toLabel !== undefined ? { toLabel: data.toLabel } : {}),
        ...(data.status != null ? { status: data.status } : {}),
        version: { increment: 1 },
      },
      include: blockInclude,
    });
  }

  async addBlockDay(id: string) {
    const block = await this.prisma.catalogBlock.findUnique({ where: { id } });
    if (!block) return null;
    return this.prisma.catalogBlock.update({
      where: { id },
      data: { dayCount: block.dayCount + 1, version: { increment: 1 } },
      include: blockInclude,
    });
  }

  async addBlockPlacement(data: CatalogBlockPlacementInput) {
    const dayIndex = data.dayIndex ?? 1;
    const last = await this.prisma.catalogBlockPlacement.findFirst({
      where: { blockId: data.blockId, dayIndex },
      orderBy: { orderIndex: 'desc' },
    });
    await this.prisma.catalogBlockPlacement.create({
      data: {
        blockId: data.blockId,
        elementId: data.elementId,
        dayIndex,
        orderIndex: (last?.orderIndex ?? -1) + 1,
        startLabel: data.startLabel ?? null,
      },
    });
    await this.prisma.catalogBlock.update({
      where: { id: data.blockId },
      data: { version: { increment: 1 } },
    });
    return this.getBlock(data.blockId);
  }

  async removeBlockPlacement(id: string) {
    const row = await this.prisma.catalogBlockPlacement.findUnique({ where: { id } });
    if (!row) return null;
    await this.prisma.catalogBlockPlacement.delete({ where: { id } });
    await this.prisma.catalogBlock.update({
      where: { id: row.blockId },
      data: { version: { increment: 1 } },
    });
    return this.getBlock(row.blockId);
  }

  async createJourney(data: CatalogJourneyCreateInput) {
    const count = await this.prisma.catalogJourney.count();
    return this.prisma.catalogJourney.create({
      data: {
        code: nextCode('JT', count),
        name: data.name,
        nightCount: data.nightCount ?? 0,
        dayCount: data.dayCount ?? 1,
        status: data.status ?? 'ACTIVE',
        calcStatusText: '미정',
        sortOrder: count + 100,
      },
      include: journeyInclude,
    });
  }

  getJourney(id: string) {
    return this.prisma.catalogJourney.findUnique({ where: { id }, include: journeyInclude });
  }

  updateJourney(id: string, data: CatalogJourneyUpdateInput) {
    return this.prisma.catalogJourney.update({
      where: { id },
      data: {
        ...(data.name != null ? { name: data.name } : {}),
        ...(data.nightCount != null ? { nightCount: data.nightCount } : {}),
        ...(data.dayCount != null ? { dayCount: data.dayCount } : {}),
        ...(data.status != null ? { status: data.status } : {}),
        version: { increment: 1 },
      },
      include: journeyInclude,
    });
  }

  async addJourneyPlacement(data: CatalogJourneyPlacementInput) {
    const last = await this.prisma.catalogJourneyPlacement.findFirst({
      where: { journeyId: data.journeyId },
      orderBy: { orderIndex: 'desc' },
    });
    await this.prisma.catalogJourneyPlacement.create({
      data: {
        journeyId: data.journeyId,
        blockId: data.blockId,
        orderIndex: (last?.orderIndex ?? -1) + 1,
        dayOffset: data.dayOffset ?? 0,
      },
    });
    await this.prisma.catalogJourney.update({
      where: { id: data.journeyId },
      data: { version: { increment: 1 } },
    });
    return this.getJourney(data.journeyId);
  }

  async removeJourneyPlacement(id: string) {
    const row = await this.prisma.catalogJourneyPlacement.findUnique({ where: { id } });
    if (!row) return null;
    await this.prisma.catalogJourneyPlacement.delete({ where: { id } });
    await this.prisma.catalogJourney.update({
      where: { id: row.journeyId },
      data: { version: { increment: 1 } },
    });
    return this.getJourney(row.journeyId);
  }

  async elementUsages(elementId: string) {
    const setParents = await this.prisma.catalogElementItem.findMany({
      where: { memberElementId: elementId },
      include: { setElement: true },
    });
    const blockParents = await this.prisma.catalogBlockPlacement.findMany({
      where: { elementId },
      include: { block: true },
    });
    return [
      ...setParents.map((row) => ({
        id: row.setElement.id,
        kind: 'ELEMENT_SET',
        name: row.setElement.name,
        code: row.setElement.code,
      })),
      ...blockParents.map((row) => ({
        id: row.block.id,
        kind: 'BLOCK',
        name: row.block.name,
        code: row.block.code,
      })),
    ];
  }

  async batchUpdatePlaces(input: CatalogPlaceBatchUpdateInput) {
    const results: Array<{ id: string | null; ok: boolean; message: string }> = [];
    for (const id of input.ids) {
      try {
        await this.prisma.catalogPlace.update({
          where: { id },
          data: {
            ...(input.status != null ? { status: input.status } : {}),
            ...(input.regionId !== undefined ? { regionId: input.regionId } : {}),
          },
        });
        results.push({ id, ok: true, message: '성공' });
      } catch (error) {
        results.push({ id, ok: false, message: error instanceof Error ? error.message : '실패' });
      }
    }
    return results;
  }

  async deletePlaces(ids: string[]) {
    const results: Array<{ id: string | null; ok: boolean; message: string }> = [];
    const uniqueIds = [...new Set(ids)];
    const rows = await this.prisma.catalogPlace.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true, parentPlaceId: true },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const selected = new Set(uniqueIds);
    const ordered = [...uniqueIds].sort((left, right) => {
      const leftIsParent = rows.some((row) => row.parentPlaceId === left && selected.has(row.id));
      const rightIsParent = rows.some((row) => row.parentPlaceId === right && selected.has(row.id));
      if (leftIsParent === rightIsParent) return 0;
      return leftIsParent ? 1 : -1;
    });
    for (const id of ordered) {
      const existing = byId.get(id);
      if (!existing) {
        results.push({ id, ok: false, message: '장소를 찾을 수 없습니다.' });
        continue;
      }
      try {
        await this.prisma.catalogPlace.delete({ where: { id } });
        results.push({ id, ok: true, message: existing.name });
      } catch (error) {
        results.push({ id, ok: false, message: error instanceof Error ? error.message : '실패' });
      }
    }
    return results;
  }

  writeLog(entry: { targetType: string; targetId: string; action: string; summary: string }) {
    return this.prisma.catalogChangeLog.create({
      data: { actorLabel: 'staff', ...entry },
    });
  }

  listVisitLinks(filter: {
    statuses?: CatalogVisitLinkStatus[];
    regionId?: string | null;
    projectId?: string | null;
    visitRegion?: string | null;
  }) {
    const statusFilter = filter.statuses && filter.statuses.length > 0 ? { status: { in: filter.statuses } } : {};
    const regionFilter =
      filter.regionId || filter.visitRegion
        ? {
            OR: [
              ...(filter.visitRegion ? [{ visitRegion: filter.visitRegion }] : []),
              ...(filter.regionId ? [{ place: { regionId: filter.regionId } }] : []),
            ],
          }
        : {};
    return this.prisma.catalogVisitLink.findMany({
      where: {
        ...statusFilter,
        ...regionFilter,
        ...(filter.projectId ? { projectId: filter.projectId } : {}),
      },
      include: visitLinkInclude,
      orderBy: [{ startedAt: 'asc' }],
    });
  }

  getVisitLink(id: string) {
    return this.prisma.catalogVisitLink.findUnique({
      where: { id },
      include: visitLinkInclude,
    });
  }

  async listVisitLinksByVisitIds(visitIds: string[]) {
    if (visitIds.length === 0) return [];
    const rows: Array<{ visitId: string; status: CatalogVisitLinkStatus }> = [];
    for (let index = 0; index < visitIds.length; index += 500) {
      const chunk = visitIds.slice(index, index + 500);
      const found = await this.prisma.catalogVisitLink.findMany({
        where: { visitId: { in: chunk } },
        select: { visitId: true, status: true },
      });
      rows.push(...found);
    }
    return rows;
  }

  upsertVisitLink(data: CatalogVisitLinkWriteData) {
    const payload = {
      projectId: data.projectId,
      latitude: data.latitude,
      longitude: data.longitude,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      durationMs: data.durationMs,
      description: data.description,
      visitRegion: data.visitRegion,
      placeId: data.placeId,
      status: data.status,
      distanceM: data.distanceM,
      reviewReason: data.reviewReason,
      candidates: data.candidates as unknown as Prisma.InputJsonValue,
      analyzedAt: data.analyzedAt,
    };
    return this.prisma.catalogVisitLink.upsert({
      where: { visitId: data.visitId },
      create: { visitId: data.visitId, ...payload },
      update: payload,
      include: visitLinkInclude,
    });
  }

  updateVisitLink(
    id: string,
    data: {
      placeId: string | null;
      status: CatalogVisitLinkStatus;
      distanceM: number | null;
      reviewReason: CatalogVisitLinkReviewReason | null;
    },
  ) {
    return this.prisma.catalogVisitLink.update({
      where: { id },
      data,
      include: visitLinkInclude,
    });
  }
}
