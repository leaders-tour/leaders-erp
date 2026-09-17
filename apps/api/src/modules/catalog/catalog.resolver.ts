import type { AppContext } from '../../context';
import { CatalogService } from './catalog.service';

type CatalogUsageStatus = 'ACTIVE' | 'INACTIVE';
type CatalogPlaceType = 'LODGING' | 'EXPERIENCE' | 'MEETING' | 'GATE' | 'AREA';
type CatalogElementComposition = 'SINGLE' | 'SET';
type CatalogElementKind = 'MEETING' | 'TRANSFER' | 'MEAL' | 'EXPERIENCE' | 'MIXED';
type CatalogBlockShape = 'DAY' | 'SET';

interface StatusArgs {
  status?: CatalogUsageStatus;
}

interface PlacesArgs extends StatusArgs {
  placeType?: CatalogPlaceType;
}

interface CreateRegionArgs {
  input: {
    name: string;
    country?: string;
    description?: string | null;
    status?: CatalogUsageStatus;
  };
}

interface CreatePlaceArgs {
  input: {
    name: string;
    placeType: CatalogPlaceType;
    country?: string;
    regionId?: string | null;
    parentPlaceId?: string | null;
    status?: CatalogUsageStatus;
  };
}

interface CreateRouteArgs {
  input: {
    name: string;
    fromPlaceId: string;
    toPlaceId: string;
    regionId?: string | null;
    averageDistanceKm?: number | null;
    averageTravelHours?: number | null;
    status?: CatalogUsageStatus;
  };
}

interface CreateElementArgs {
  input: {
    name: string;
    kind: CatalogElementKind;
    composition?: CatalogElementComposition;
    customerText?: string | null;
    status?: CatalogUsageStatus;
  };
}

interface CreateBlockArgs {
  input: {
    name: string;
    shape?: CatalogBlockShape;
    fromLabel?: string | null;
    toLabel?: string | null;
    status?: CatalogUsageStatus;
  };
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
  },
  Mutation: {
    createCatalogRegion: (_parent: unknown, args: CreateRegionArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).createRegion(args.input),
    createCatalogPlace: (_parent: unknown, args: CreatePlaceArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).createPlace(args.input),
    createCatalogRoute: (_parent: unknown, args: CreateRouteArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).createRoute(args.input),
    createCatalogElement: (_parent: unknown, args: CreateElementArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).createElement(args.input),
    createCatalogBlock: (_parent: unknown, args: CreateBlockArgs, ctx: AppContext) =>
      new CatalogService(ctx.prisma).createBlock(args.input),
  },
  CatalogElement: {
    setItems: (parent: { setItems?: unknown[] }) => parent.setItems ?? [],
  },
  CatalogBlock: {
    setItems: (parent: { setItems?: unknown[] }) => parent.setItems ?? [],
  },
};
