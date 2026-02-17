import type { AppContext } from '../../context';
import { ActivityService } from './activity.service';
import type { ActivityCreateDto, ActivityUpdateDto } from './activity.types';

interface ActivityArgs {
  id: string;
}

interface ActivityCreateArgs {
  input: ActivityCreateDto;
}

interface ActivityUpdateArgs {
  id: string;
  input: ActivityUpdateDto;
}

export const activityResolver = {
  Query: {
    activities: (_parent: unknown, _args: unknown, ctx: AppContext) => new ActivityService(ctx.prisma).list(),
    activity: (_parent: unknown, args: ActivityArgs, ctx: AppContext) => new ActivityService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createActivity: (_parent: unknown, args: ActivityCreateArgs, ctx: AppContext) =>
      new ActivityService(ctx.prisma).create(args.input),
    updateActivity: (_parent: unknown, args: ActivityUpdateArgs, ctx: AppContext) =>
      new ActivityService(ctx.prisma).update(args.id, args.input),
    deleteActivity: (_parent: unknown, args: ActivityArgs, ctx: AppContext) => new ActivityService(ctx.prisma).delete(args.id),
  },
};
