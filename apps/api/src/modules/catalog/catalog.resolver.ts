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
};
