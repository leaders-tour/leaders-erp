import type { AppContext } from '../../context';
import { RegionSetService } from './region-set.service';

interface RegionSetArgs {
  id: string;
}

interface RegionSetsArgs {
  includeInactive?: boolean | null;
}

interface CreateRegionSetArgs {
  input: { regionIds: string[] };
}

export const regionSetResolver = {
  Query: {
    regionSets: (_parent: unknown, args: RegionSetsArgs, ctx: AppContext) =>
      new RegionSetService(ctx.prisma).list(Boolean(args.includeInactive)),
    regionSet: (_parent: unknown, args: RegionSetArgs, ctx: AppContext) => new RegionSetService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createRegionSet: (_parent: unknown, args: CreateRegionSetArgs, ctx: AppContext) =>
      new RegionSetService(ctx.prisma).createFromRegionIds(args.input),
    softDeleteRegionSet: (_parent: unknown, args: RegionSetArgs, ctx: AppContext) =>
      new RegionSetService(ctx.prisma).softDelete(args.id),
  },
};
