import type { AppContext } from '../../context';
import { TimeBlockService } from './time-block.service';
import type { TimeBlockCreateDto, TimeBlockUpdateDto } from './time-block.types';

interface TimeBlockArgs {
  id: string;
}

interface TimeBlockCreateArgs {
  input: TimeBlockCreateDto;
}

interface TimeBlockUpdateArgs {
  id: string;
  input: TimeBlockUpdateDto;
}

export const timeBlockResolver = {
  Query: {
    timeBlocks: (_parent: unknown, _args: unknown, ctx: AppContext) => new TimeBlockService(ctx.prisma).list(),
    timeBlock: (_parent: unknown, args: TimeBlockArgs, ctx: AppContext) => new TimeBlockService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createTimeBlock: (_parent: unknown, args: TimeBlockCreateArgs, ctx: AppContext) =>
      new TimeBlockService(ctx.prisma).create(args.input),
    updateTimeBlock: (_parent: unknown, args: TimeBlockUpdateArgs, ctx: AppContext) =>
      new TimeBlockService(ctx.prisma).update(args.id, args.input),
    deleteTimeBlock: (_parent: unknown, args: TimeBlockArgs, ctx: AppContext) =>
      new TimeBlockService(ctx.prisma).delete(args.id),
  },
};
