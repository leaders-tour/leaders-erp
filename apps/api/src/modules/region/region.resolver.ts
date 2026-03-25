import type { AppContext } from '../../context';
import { planInclude } from '../plan/plan.mapper';
import { RegionService } from './region.service';
import type { RegionCreateDto, RegionUpdateDto } from './region.types';

interface RegionArgs {
  id: string;
}

interface RegionCreateArgs {
  input: RegionCreateDto;
}

interface RegionUpdateArgs {
  id: string;
  input: RegionUpdateDto;
}

export const regionResolver = {
  Region: {
    plans: async (parent: { id: string }, _args: unknown, ctx: AppContext) =>
      ctx.prisma.plan.findMany({
        where: { regionSet: { items: { some: { regionId: parent.id } } } },
        include: planInclude,
        orderBy: { createdAt: 'desc' },
      }),
  },
  Query: {
    regions: (_parent: unknown, _args: unknown, ctx: AppContext) => new RegionService(ctx.prisma).list(),
    region: (_parent: unknown, args: RegionArgs, ctx: AppContext) => new RegionService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createRegion: (_parent: unknown, args: RegionCreateArgs, ctx: AppContext) =>
      new RegionService(ctx.prisma).create(args.input),
    updateRegion: (_parent: unknown, args: RegionUpdateArgs, ctx: AppContext) =>
      new RegionService(ctx.prisma).update(args.id, args.input),
    deleteRegion: (_parent: unknown, args: RegionArgs, ctx: AppContext) => new RegionService(ctx.prisma).delete(args.id),
  },
};
