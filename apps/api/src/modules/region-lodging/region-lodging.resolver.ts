import type { AppContext } from '../../context';
import { RegionLodgingService } from './region-lodging.service';
import type { RegionLodgingCreateDto, RegionLodgingUpdateDto } from './region-lodging.types';

interface IdArgs {
  id: string;
}

interface RegionLodgingsArgs {
  regionId?: string;
  activeOnly?: boolean;
}

interface RegionLodgingCreateArgs {
  input: RegionLodgingCreateDto;
}

interface RegionLodgingUpdateArgs {
  id: string;
  input: RegionLodgingUpdateDto;
}

export const regionLodgingResolver = {
  Query: {
    regionLodgings: (_parent: unknown, args: RegionLodgingsArgs, ctx: AppContext) =>
      new RegionLodgingService(ctx.prisma).list(args),
    regionLodging: (_parent: unknown, args: IdArgs, ctx: AppContext) => new RegionLodgingService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createRegionLodging: (_parent: unknown, args: RegionLodgingCreateArgs, ctx: AppContext) =>
      new RegionLodgingService(ctx.prisma).create(args.input),
    updateRegionLodging: (_parent: unknown, args: RegionLodgingUpdateArgs, ctx: AppContext) =>
      new RegionLodgingService(ctx.prisma).update(args.id, args.input),
    deleteRegionLodging: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new RegionLodgingService(ctx.prisma).delete(args.id),
  },
};
