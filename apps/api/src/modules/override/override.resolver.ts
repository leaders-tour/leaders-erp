import type { AppContext } from '../../context';
import { OverrideService } from './override.service';
import type { OverrideCreateDto, OverrideUpdateDto } from './override.types';

interface OverrideArgs {
  id: string;
}

interface OverrideCreateArgs {
  input: OverrideCreateDto;
}

interface OverrideUpdateArgs {
  id: string;
  input: OverrideUpdateDto;
}

export const overrideResolver = {
  Query: {
    overrides: (_parent: unknown, _args: unknown, ctx: AppContext) => new OverrideService(ctx.prisma).list(),
    override: (_parent: unknown, args: OverrideArgs, ctx: AppContext) => new OverrideService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createOverride: (_parent: unknown, args: OverrideCreateArgs, ctx: AppContext) =>
      new OverrideService(ctx.prisma).create(args.input),
    updateOverride: (_parent: unknown, args: OverrideUpdateArgs, ctx: AppContext) =>
      new OverrideService(ctx.prisma).update(args.id, args.input),
    deleteOverride: (_parent: unknown, args: OverrideArgs, ctx: AppContext) => new OverrideService(ctx.prisma).delete(args.id),
  },
};
