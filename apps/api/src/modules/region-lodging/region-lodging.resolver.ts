import type { AppContext } from '../../context';
import { resolveRegionSetRegionIds } from '../../lib/resolve-region-set';
import { RegionLodgingService } from './region-lodging.service';
import type { RegionLodgingCreateDto, RegionLodgingUpdateDto } from './region-lodging.types';

interface IdArgs {
  id: string;
}

interface RegionLodgingsArgs {
  regionSetId?: string | null;
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
    regionLodgings: async (_parent: unknown, args: RegionLodgingsArgs, ctx: AppContext) => {
      if (!args.regionSetId) {
        return new RegionLodgingService(ctx.prisma).list({ activeOnly: args.activeOnly });
      }
      const regionIds = await resolveRegionSetRegionIds(ctx.prisma, args.regionSetId);
      return new RegionLodgingService(ctx.prisma).list({ regionIds, activeOnly: args.activeOnly });
    },
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
