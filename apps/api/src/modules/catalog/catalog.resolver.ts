import type { AppContext } from '../../context';
import { CatalogService } from './catalog.service';

type CatalogUsageStatus = 'ACTIVE' | 'INACTIVE';
type CatalogPlaceType = 'LODGING' | 'RESTAURANT' | 'EXPERIENCE' | 'MEETING' | 'GATE' | 'AREA';

interface StatusArgs {
  status?: CatalogUsageStatus;
}

interface PlacesArgs extends StatusArgs {
  placeType?: CatalogPlaceType;
}

interface IdArgs {
  id: string;
}

interface ElementUsageArgs {
  elementId: string;
}

interface ChangeLogArgs {
  targetType?: string;
  targetId?: string;
}

type CatalogVisitLinkStatus = 'AUTO' | 'REVIEW' | 'UNLINKED' | 'MANUAL';

interface VisitLinkListArgs {
  statuses?: CatalogVisitLinkStatus[];
  regionId?: string | null;
  projectId?: string | null;
}

export const catalogResolver = {
  Query: {
    catalogRegions: (_parent: unknown, args: StatusArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).listRegions(args.status),
    catalogPlaces: (_parent: unknown, args: PlacesArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).listPlaces(args.status, args.placeType),
    catalogRoutes: (_parent: unknown, args: StatusArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).listRoutes(args.status),
    catalogElements: (_parent: unknown, args: StatusArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).listElements(args.status),
    catalogBlocks: (_parent: unknown, args: StatusArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).listBlocks(args.status),
    catalogJourneys: (_parent: unknown, args: StatusArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).listJourneys(args.status),
    catalogElementUsages: (_parent: unknown, args: ElementUsageArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).elementUsages(args.elementId),
    catalogChangeLogs: (_parent: unknown, args: ChangeLogArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).listChangeLogs(args.targetType, args.targetId),
    catalogVisitLinks: (_parent: unknown, args: VisitLinkListArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).listVisitLinks(args),
    catalogRouteObservations: (
      _parent: unknown,
      args: { regionId?: string | null; projectId?: string | null; routeId?: string | null },
      ctx: AppContext,
    ) => new CatalogService(ctx.prisma).listRouteObservations(args),
  },
  Mutation: {
    createCatalogRegion: (_parent: unknown, args: { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).createRegion(args.input),
    updateCatalogRegion: (_parent: unknown, args: IdArgs & { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).updateRegion(args.id, args.input),
    createCatalogPlace: (_parent: unknown, args: { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).createPlace(args.input),
    updateCatalogPlace: (_parent: unknown, args: IdArgs & { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).updatePlace(args.id, args.input),
    createCatalogRoute: (_parent: unknown, args: { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).createRoute(args.input),
    updateCatalogRoute: (_parent: unknown, args: IdArgs & { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).updateRoute(args.id, args.input),
    createCatalogElement: (_parent: unknown, args: { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).createElement(args.input),
    updateCatalogElement: (_parent: unknown, args: IdArgs & { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).updateElement(args.id, args.input),
    addCatalogElementSetItem: (_parent: unknown, args: { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).addElementSetItem(args.input),
    removeCatalogElementSetItem: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).removeElementSetItem(args.id),
    createCatalogBlock: (_parent: unknown, args: { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).createBlock(args.input),
    updateCatalogBlock: (_parent: unknown, args: IdArgs & { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).updateBlock(args.id, args.input),
    addCatalogBlockDay: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).addBlockDay(args.id),
    addCatalogBlockPlacement: (_parent: unknown, args: { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).addBlockPlacement(args.input),
    removeCatalogBlockPlacement: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).removeBlockPlacement(args.id),
    createCatalogJourney: (_parent: unknown, args: { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).createJourney(args.input),
    updateCatalogJourney: (_parent: unknown, args: IdArgs & { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).updateJourney(args.id, args.input),
    addCatalogJourneyPlacement: (_parent: unknown, args: { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).addJourneyPlacement(args.input),
    removeCatalogJourneyPlacement: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).removeJourneyPlacement(args.id),
    batchUpdateCatalogPlaces: (_parent: unknown, args: { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).batchUpdatePlaces(args.input),
    deleteCatalogPlaces: (_parent: unknown, args: { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).deletePlaces(args.input),
    analyzeCatalogVisitLinks: (_parent: unknown, args: { input?: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).analyzeVisitLinks(args.input ?? {}),
    confirmCatalogVisitLink: (_parent: unknown, args: { input: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).confirmVisitLink(args.input),
    clearCatalogVisitLink: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).clearVisitLink(args.id),
    analyzeCatalogRouteObservations: (_parent: unknown, args: { input?: never }, ctx: AppContext) =>
      new CatalogService(ctx.prisma).analyzeRouteObservations(args.input ?? {}),
  },
  CatalogElement: {
    setItems: (parent: { setItems?: unknown[] }) => parent.setItems ?? [],
    lifecycleStatus: (parent: { lifecycleStatus?: string }) => parent.lifecycleStatus ?? 'ACTIVE',
  },
  CatalogBlock: {
    setItems: (parent: { setItems?: unknown[] }) => parent.setItems ?? [],
    placements: (parent: { placements?: unknown[] }) => parent.placements ?? [],
  },
  CatalogJourney: {
    placements: (parent: { placements?: unknown[] }) => parent.placements ?? [],
  },
  CatalogPlace: {
    accommodation: (parent: { accommodation?: unknown }) => parent.accommodation ?? null,
  },
  CatalogVisitLink: {
    candidates: (parent: { candidates?: unknown }) => parseVisitLinkCandidates(parent.candidates),
  },
  CatalogRoute: {
    observationCount: (parent: { observationCount?: number }) => parent.observationCount ?? 0,
    usableCount: (parent: { usableCount?: number }) => parent.usableCount ?? 0,
  },
  CatalogRouteObservation: {
    path: (parent: { path?: unknown }) => parseObservationPath(parent.path),
  },
};

function parseObservationPath(value: unknown): Array<{ lat: number; lng: number; at: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as { lat?: unknown; lng?: unknown; at?: unknown };
    if (typeof row.lat !== 'number' || typeof row.lng !== 'number') return [];
    return [{ lat: row.lat, lng: row.lng, at: typeof row.at === 'string' ? row.at : new Date().toISOString() }];
  });
}

function parseVisitLinkCandidates(value: unknown): Array<{ placeId: string; name: string; code: string; distanceM: number }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as { placeId?: unknown; name?: unknown; code?: unknown; distanceM?: unknown };
    if (typeof row.placeId !== 'string' || typeof row.name !== 'string') return [];
    return [
      {
        placeId: row.placeId,
        name: row.name,
        code: typeof row.code === 'string' ? row.code : '',
        distanceM: typeof row.distanceM === 'number' ? row.distanceM : 0,
      },
    ];
  });
}
