import type { AppContext } from '../../context';
import { LodgingService } from './lodging.service';
import type { LodgingCreateDto, LodgingUpdateDto } from './lodging.types';

interface LodgingArgs {
  id: string;
}

interface LodgingCreateArgs {
  input: LodgingCreateDto;
}

interface LodgingUpdateArgs {
  id: string;
  input: LodgingUpdateDto;
}

export const lodgingResolver = {
  Query: {
    lodgings: (_parent: unknown, _args: unknown, ctx: AppContext) => new LodgingService(ctx.prisma).list(),
    lodging: (_parent: unknown, args: LodgingArgs, ctx: AppContext) => new LodgingService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createLodging: (_parent: unknown, args: LodgingCreateArgs, ctx: AppContext) =>
      new LodgingService(ctx.prisma).create(args.input),
    updateLodging: (_parent: unknown, args: LodgingUpdateArgs, ctx: AppContext) =>
      new LodgingService(ctx.prisma).update(args.id, args.input),
    deleteLodging: (_parent: unknown, args: LodgingArgs, ctx: AppContext) =>
      new LodgingService(ctx.prisma).delete(args.id),
  },
};
