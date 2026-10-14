import type { PrismaClient } from '@prisma/client';
import {
  classifyVisitRegion,
  haversineMeters,
  matchVisitToPlaces,
  shouldPreserveManualVisitLink,
  visitRegionFromCatalogName,
  VISIT_REGION_BOUNDS,
  type VisitMatchPlace,
  type VisitRegion,
} from '@tour/domain';
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
  catalogVisitLinkAnalyzeSchema,
  catalogVisitLinkConfirmSchema,
  catalogVisitLinkListSchema,
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
  type CatalogVisitLinkAnalyzeInput,
  type CatalogVisitLinkConfirmInput,
  type CatalogVisitLinkListInput,
} from '@tour/validation';
import type { ZodType } from 'zod';
import { DomainError, createValidationError } from '../../lib/errors';
import { getSupabaseAdminClient } from '../../lib/supabase';
import { CatalogRepository } from './catalog.repository';

type CatalogUsageStatus = 'ACTIVE' | 'INACTIVE';
type CatalogPlaceType = 'LODGING' | 'RESTAURANT' | 'EXPERIENCE' | 'MEETING' | 'GATE' | 'AREA';

const PLACE_VISITS_PAGE_SIZE = 1000;
const PLACE_VISIT_PROJECT_CHUNK = 50;

interface LeaderstepsPlaceVisitRow {
  id: string;
  project_id: string;
  center_lat: number | string;
  center_lng: number | string;
  started_at: string;
  ended_at: string;
  duration_ms: number | string;
  description: string | null;
}

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

  async listVisitLinks(input: CatalogVisitLinkListInput = {}) {
    const data = parseOrThrow(catalogVisitLinkListSchema, input, 'catalog visit link list');
    let visitRegion: string | null = null;
    if (data.regionId) {
      const regions = await this.repository.listRegions();
      const region = regions.find((row) => row.id === data.regionId);
      visitRegion = region ? visitRegionFromCatalogName(region.name) : null;
    }
    return this.repository.listVisitLinks({
      statuses: data.statuses,
      regionId: data.regionId ?? null,
      projectId: data.projectId ?? null,
      visitRegion,
    });
  }

  async analyzeVisitLinks(input: CatalogVisitLinkAnalyzeInput = {}) {
    const data = parseOrThrow(catalogVisitLinkAnalyzeSchema, input, 'catalog visit link analyze');
    const visitRegion = data.visitRegion ?? (data.projectIds && data.projectIds.length > 0 ? undefined : 'CENTRAL');
    const visits = await this.fetchLeaderstepsPlaceVisits(data.projectIds ?? [], visitRegion);
    const filtered = visits.filter((visit) => {
      if (!visitRegion) return true;
      const region = classifyVisitRegion(visit.latitude, visit.longitude) ?? 'OTHER';
      return region === visitRegion;
    });

    const places = (await this.repository.listPlaces('ACTIVE')).map(
      (place): VisitMatchPlace => ({
        id: place.id,
        name: place.name,
        code: place.code,
        placeType: place.placeType,
        latitude: place.latitude,
        longitude: place.longitude,
        visitRadiusM: place.visitRadiusM,
      }),
    );

    const existing = await this.repository.listVisitLinksByVisitIds(filtered.map((visit) => visit.id));
    const existingByVisitId = new Map(existing.map((row) => [row.visitId, row.status]));
    const analyzedAt = new Date();
    let upserted = 0;
    let auto = 0;
    let review = 0;
    let unlinked = 0;
    let protectedManual = 0;

    for (const visit of filtered) {
      if (shouldPreserveManualVisitLink(existingByVisitId.get(visit.id) ?? null)) {
        protectedManual += 1;
        continue;
      }
      const match = matchVisitToPlaces({ latitude: visit.latitude, longitude: visit.longitude }, places);
      await this.repository.upsertVisitLink({
        visitId: visit.id,
        projectId: visit.projectId,
        latitude: visit.latitude,
        longitude: visit.longitude,
        startedAt: visit.startedAt,
        endedAt: visit.endedAt,
        durationMs: visit.durationMs,
        description: visit.description?.slice(0, 191) ?? null,
        visitRegion: classifyVisitRegion(visit.latitude, visit.longitude) ?? 'OTHER',
        placeId: match.placeId,
        status: match.status,
        distanceM: match.distanceM,
        reviewReason: match.reviewReason,
        candidates: match.candidates.map((candidate) => ({
          placeId: candidate.id,
          name: candidate.name,
          code: candidate.code,
          distanceM: candidate.distanceM,
        })),
        analyzedAt,
      });
      upserted += 1;
      if (match.status === 'AUTO') auto += 1;
      else if (match.status === 'REVIEW') review += 1;
      else unlinked += 1;
    }

    await this.repository.writeLog({
      targetType: 'VISIT_LINK',
      targetId: 'analyze',
      action: 'ANALYZE',
      summary: `스캔 ${filtered.length} · 저장 ${upserted} · 수동보호 ${protectedManual}`,
    });

    return {
      scanned: filtered.length,
      upserted,
      auto,
      review,
      unlinked,
      protectedManual,
    };
  }

  async confirmVisitLink(input: CatalogVisitLinkConfirmInput) {
    const data = parseOrThrow(catalogVisitLinkConfirmSchema, input, 'catalog visit link confirm');
    const existing = await this.repository.getVisitLink(data.id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', '방문 연결을 찾을 수 없습니다.');
    }
    const places = await this.repository.listPlaces('ACTIVE');
    const place = places.find((row) => row.id === data.placeId);
    if (!place || place.placeType === 'AREA' || place.latitude == null || place.longitude == null) {
      throw new DomainError('VALIDATION_FAILED', '연결할 장소를 찾을 수 없습니다.');
    }
    const distanceM = Math.round(
      haversineMeters(
        { latitude: existing.latitude, longitude: existing.longitude },
        { latitude: place.latitude, longitude: place.longitude },
      ),
    );
    const updated = await this.repository.updateVisitLink(data.id, {
      placeId: place.id,
      status: 'MANUAL',
      distanceM,
      reviewReason: null,
    });
    await this.repository.writeLog({
      targetType: 'VISIT_LINK',
      targetId: data.id,
      action: 'CONFIRM',
      summary: place.name,
    });
    return updated;
  }

  async clearVisitLink(id: string) {
    const existing = await this.repository.getVisitLink(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', '방문 연결을 찾을 수 없습니다.');
    }
    const candidateCount = Array.isArray(existing.candidates) ? existing.candidates.length : 0;
    const hasOverlap = candidateCount >= 2;
    const updated = await this.repository.updateVisitLink(id, {
      placeId: null,
      status: hasOverlap ? 'REVIEW' : 'UNLINKED',
      distanceM: null,
      reviewReason: hasOverlap ? 'OVERLAP' : 'NONE',
    });
    await this.repository.writeLog({
      targetType: 'VISIT_LINK',
      targetId: id,
      action: 'CLEAR',
      summary: existing.visitId,
    });
    return updated;
  }

  private async fetchLeaderstepsPlaceVisits(projectIds: string[], visitRegion?: string) {
    const supabase = getSupabaseAdminClient();
    const allVisits: Array<{
      id: string;
      projectId: string;
      latitude: number;
      longitude: number;
      startedAt: Date;
      endedAt: Date;
      durationMs: number;
      description: string | null;
    }> = [];
    const chunks: string[][] = [];
    if (projectIds.length > 0) {
      const unique = [...new Set(projectIds)];
      for (let index = 0; index < unique.length; index += PLACE_VISIT_PROJECT_CHUNK) {
        chunks.push(unique.slice(index, index + PLACE_VISIT_PROJECT_CHUNK));
      }
    } else {
      chunks.push([]);
    }
    const bounds = visitRegion && visitRegion in VISIT_REGION_BOUNDS
      ? VISIT_REGION_BOUNDS[visitRegion as VisitRegion]
      : null;

    for (const chunk of chunks) {
      let offset = 0;
      while (true) {
        let query = supabase
          .from('place_visits')
          .select('id,project_id,center_lat,center_lng,started_at,ended_at,duration_ms,description')
          .order('started_at', { ascending: true })
          .range(offset, offset + PLACE_VISITS_PAGE_SIZE - 1);
        if (chunk.length > 0) {
          query = query.in('project_id', chunk);
        }
        if (bounds) {
          query = bounds.latMaxExclusive
            ? query.gte('center_lat', bounds.minLat).lt('center_lat', bounds.maxLat)
            : query.gte('center_lat', bounds.minLat).lte('center_lat', bounds.maxLat);
          query = bounds.lngMaxExclusive
            ? query.gte('center_lng', bounds.minLng).lt('center_lng', bounds.maxLng)
            : query.gte('center_lng', bounds.minLng).lte('center_lng', bounds.maxLng);
        }
        const { data, error } = await query;
        if (error) {
          throw new DomainError('EXTERNAL_SERVICE_ERROR', '장소 방문 기록을 불러오지 못했습니다.');
        }
        const page = (data ?? []) as LeaderstepsPlaceVisitRow[];
        for (const row of page) {
          const latitude = Number(row.center_lat);
          const longitude = Number(row.center_lng);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
          allVisits.push({
            id: row.id,
            projectId: row.project_id,
            latitude,
            longitude,
            startedAt: new Date(row.started_at),
            endedAt: new Date(row.ended_at),
            durationMs: Math.round(Number(row.duration_ms) || 0),
            description: row.description,
          });
        }
        if (page.length < PLACE_VISITS_PAGE_SIZE) break;
        offset += PLACE_VISITS_PAGE_SIZE;
      }
    }

    return allVisits;
  }
}
