import type { PrismaClient } from '@prisma/client';
import {
  catalogBlockCreateSchema,
  catalogBlockPlacementSchema,
  catalogBlockUpdateSchema,
  catalogElementCreateSchema,
  catalogElementSetItemSchema,
  catalogElementUpdateSchema,
  catalogJourneyCreateSchema,
  catalogJourneyPlacementSchema,
  catalogJourneyUpdateSchema,
  catalogPlaceBatchUpdateSchema,
  catalogPlaceCreateSchema,
  catalogPlaceUpdateSchema,
  catalogRegionCreateSchema,
  catalogRegionUpdateSchema,
  catalogRouteCreateSchema,
  catalogRouteUpdateSchema,
  type CatalogBlockCreateInput,
  type CatalogBlockPlacementInput,
  type CatalogBlockUpdateInput,
  type CatalogElementCreateInput,
  type CatalogElementSetItemInput,
  type CatalogElementUpdateInput,
  type CatalogJourneyCreateInput,
  type CatalogJourneyPlacementInput,
  type CatalogJourneyUpdateInput,
  type CatalogPlaceBatchUpdateInput,
  type CatalogPlaceCreateInput,
  type CatalogPlaceUpdateInput,
  type CatalogRegionCreateInput,
  type CatalogRegionUpdateInput,
  type CatalogRouteCreateInput,
  type CatalogRouteUpdateInput,
} from '@tour/validation';
import type { ZodType } from 'zod';
import { createValidationError } from '../../lib/errors';
import { CatalogRepository } from './catalog.repository';

type CatalogUsageStatus = 'ACTIVE' | 'INACTIVE';
type CatalogPlaceType = 'LODGING' | 'EXPERIENCE' | 'MEETING' | 'GATE' | 'AREA';

function parseOrThrow<T>(schema: ZodType<T>, input: unknown, label: string): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw createValidationError(`Invalid ${label}`, parsed.error);
  }
  return parsed.data;
}

function wouldCycle(
  edges: Array<{ setElementId: string; memberElementId: string }>,
  setElementId: string,
  memberElementId: string,
): boolean {
  if (setElementId === memberElementId) return true;
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    const list = children.get(edge.setElementId) ?? [];
    list.push(edge.memberElementId);
    children.set(edge.setElementId, list);
  }
  const stack = [memberElementId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === setElementId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of children.get(current) ?? []) stack.push(next);
  }
  return false;
}

export class CatalogService {
  private readonly repository: CatalogRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new CatalogRepository(prisma);
  }

  listRegions(status?: CatalogUsageStatus) {
    return this.repository.listRegions(status);
  }

  listPlaces(status?: CatalogUsageStatus, placeType?: CatalogPlaceType) {
    return this.repository.listPlaces(status, placeType);
  }

  listRoutes(status?: CatalogUsageStatus) {
    return this.repository.listRoutes(status);
  }

  listElements(status?: CatalogUsageStatus) {
    return this.repository.listElements(status);
  }

  listBlocks(status?: CatalogUsageStatus) {
    return this.repository.listBlocks(status);
  }

  listJourneys(status?: CatalogUsageStatus) {
    return this.repository.listJourneys(status);
  }

  listChangeLogs(targetType?: string, targetId?: string) {
    return this.repository.listChangeLogs(targetType, targetId);
  }

  elementUsages(elementId: string) {
    return this.repository.elementUsages(elementId);
  }

  async createRegion(input: CatalogRegionCreateInput) {
    const data = parseOrThrow(catalogRegionCreateSchema, input, 'catalog region input');
    const created = await this.repository.createRegion(data);
    await this.repository.writeLog({ targetType: 'REGION', targetId: created.id, action: 'CREATE', summary: created.name });
    return created;
  }

  async updateRegion(id: string, input: CatalogRegionUpdateInput) {
    const data = parseOrThrow(catalogRegionUpdateSchema, input, 'catalog region update');
    const updated = await this.repository.updateRegion(id, data);
    await this.repository.writeLog({ targetType: 'REGION', targetId: id, action: 'UPDATE', summary: updated.name });
    return updated;
  }

  async createPlace(input: CatalogPlaceCreateInput) {
    const data = parseOrThrow(catalogPlaceCreateSchema, input, 'catalog place input');
    const created = await this.repository.createPlace(data);
    await this.repository.writeLog({ targetType: 'PLACE', targetId: created.id, action: 'CREATE', summary: created.name });
    return created;
  }

  async updatePlace(id: string, input: CatalogPlaceUpdateInput) {
    const data = parseOrThrow(catalogPlaceUpdateSchema, input, 'catalog place update');
    const updated = await this.repository.updatePlace(id, data);
    await this.repository.writeLog({ targetType: 'PLACE', targetId: id, action: 'UPDATE', summary: updated.name });
    return updated;
  }

  async createRoute(input: CatalogRouteCreateInput) {
    const data = parseOrThrow(catalogRouteCreateSchema, input, 'catalog route input');
    const created = await this.repository.createRoute(data);
    await this.repository.writeLog({ targetType: 'ROUTE', targetId: created.id, action: 'CREATE', summary: created.name });
    return created;
  }

  async updateRoute(id: string, input: CatalogRouteUpdateInput) {
    const data = parseOrThrow(catalogRouteUpdateSchema, input, 'catalog route update');
    const updated = await this.repository.updateRoute(id, data);
    await this.repository.writeLog({ targetType: 'ROUTE', targetId: id, action: 'UPDATE', summary: updated.name });
    return updated;
  }

  async createElement(input: CatalogElementCreateInput) {
    const data = parseOrThrow(catalogElementCreateSchema, input, 'catalog element input');
    const created = await this.repository.createElement(data);
    await this.repository.writeLog({ targetType: 'ELEMENT', targetId: created.id, action: 'CREATE', summary: created.name });
    return created;
  }

  async updateElement(id: string, input: CatalogElementUpdateInput) {
    const data = parseOrThrow(catalogElementUpdateSchema, input, 'catalog element update');
    const updated = await this.repository.updateElement(id, data);
    await this.repository.writeLog({ targetType: 'ELEMENT', targetId: id, action: 'UPDATE', summary: updated.name });
    return updated;
  }

  async addElementSetItem(input: CatalogElementSetItemInput) {
    const data = parseOrThrow(catalogElementSetItemSchema, input, 'catalog element set item');
    const edges = await this.repository.listElementSetItems();
    if (wouldCycle(edges, data.setElementId, data.memberElementId)) {
      throw createValidationError('순환 참조는 허용되지 않습니다', {
        issues: [{ path: ['memberElementId'], message: '자기 자신이나 하위 세트를 다시 넣을 수 없습니다' }],
      });
    }
    const updated = await this.repository.addElementSetItem(data);
    if (updated) {
      await this.repository.writeLog({ targetType: 'ELEMENT', targetId: data.setElementId, action: 'ADD_SET_ITEM', summary: data.memberElementId });
    }
    return updated;
  }

  async removeElementSetItem(id: string) {
    const updated = await this.repository.removeElementSetItem(id);
    if (updated) {
      await this.repository.writeLog({ targetType: 'ELEMENT', targetId: updated.id, action: 'REMOVE_SET_ITEM', summary: id });
    }
    return updated;
  }

  async createBlock(input: CatalogBlockCreateInput) {
    const data = parseOrThrow(catalogBlockCreateSchema, input, 'catalog block input');
    const created = await this.repository.createBlock({ ...data, shape: 'DAY' });
    await this.repository.writeLog({ targetType: 'BLOCK', targetId: created.id, action: 'CREATE', summary: created.name });
    return created;
  }

  async updateBlock(id: string, input: CatalogBlockUpdateInput) {
    const data = parseOrThrow(catalogBlockUpdateSchema, input, 'catalog block update');
    const updated = await this.repository.updateBlock(id, data);
    await this.repository.writeLog({ targetType: 'BLOCK', targetId: id, action: 'UPDATE', summary: updated.name });
    return updated;
  }

  async addBlockDay(id: string) {
    const updated = await this.repository.addBlockDay(id);
    if (updated) {
      await this.repository.writeLog({ targetType: 'BLOCK', targetId: id, action: 'ADD_DAY', summary: String(updated.dayCount) });
    }
    return updated;
  }

  async addBlockPlacement(input: CatalogBlockPlacementInput) {
    const data = parseOrThrow(catalogBlockPlacementSchema, input, 'catalog block placement');
    const updated = await this.repository.addBlockPlacement(data);
    if (updated) {
      await this.repository.writeLog({ targetType: 'BLOCK', targetId: data.blockId, action: 'ADD_PLACEMENT', summary: data.elementId });
    }
    return updated;
  }

  async removeBlockPlacement(id: string) {
    const updated = await this.repository.removeBlockPlacement(id);
    if (updated) {
      await this.repository.writeLog({ targetType: 'BLOCK', targetId: updated.id, action: 'REMOVE_PLACEMENT', summary: id });
    }
    return updated;
  }

  async createJourney(input: CatalogJourneyCreateInput) {
    const data = parseOrThrow(catalogJourneyCreateSchema, input, 'catalog journey input');
    const created = await this.repository.createJourney(data);
    await this.repository.writeLog({ targetType: 'JOURNEY', targetId: created.id, action: 'CREATE', summary: created.name });
    return created;
  }

  async updateJourney(id: string, input: CatalogJourneyUpdateInput) {
    const data = parseOrThrow(catalogJourneyUpdateSchema, input, 'catalog journey update');
    const updated = await this.repository.updateJourney(id, data);
    await this.repository.writeLog({ targetType: 'JOURNEY', targetId: id, action: 'UPDATE', summary: updated.name });
    return updated;
  }

  async addJourneyPlacement(input: CatalogJourneyPlacementInput) {
    const data = parseOrThrow(catalogJourneyPlacementSchema, input, 'catalog journey placement');
    const updated = await this.repository.addJourneyPlacement(data);
    if (updated) {
      await this.repository.writeLog({ targetType: 'JOURNEY', targetId: data.journeyId, action: 'ADD_PLACEMENT', summary: data.blockId });
    }
    return updated;
  }

  async removeJourneyPlacement(id: string) {
    const updated = await this.repository.removeJourneyPlacement(id);
    if (updated) {
      await this.repository.writeLog({ targetType: 'JOURNEY', targetId: updated.id, action: 'REMOVE_PLACEMENT', summary: id });
    }
    return updated;
  }

  async batchUpdatePlaces(input: CatalogPlaceBatchUpdateInput) {
    const data = parseOrThrow(catalogPlaceBatchUpdateSchema, input, 'catalog place batch');
    const results = await this.repository.batchUpdatePlaces(data);
    await this.repository.writeLog({
      targetType: 'PLACE',
      targetId: data.ids[0] ?? 'batch',
      action: 'BATCH_UPDATE',
      summary: `${data.ids.length}건`,
    });
    return results;
  }
}
