import type { AppContext } from '../../context';
import { EventService } from './event.service';
import type { EventCreateDto, EventUpdateDto } from './event.types';

interface EventArgs {
  id: string;
}

interface EventsArgs {
  activeOnly?: boolean;
}

interface EventCreateArgs {
  input: EventCreateDto;
}

interface EventUpdateArgs {
  id: string;
  input: EventUpdateDto;
}

export const eventResolver = {
  Query: {
    events: (_parent: unknown, args: EventsArgs, ctx: AppContext) => new EventService(ctx.prisma).list(args.activeOnly),
    event: (_parent: unknown, args: EventArgs, ctx: AppContext) => new EventService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createEvent: (_parent: unknown, args: EventCreateArgs, ctx: AppContext) =>
      new EventService(ctx.prisma).create(args.input),
    updateEvent: (_parent: unknown, args: EventUpdateArgs, ctx: AppContext) =>
      new EventService(ctx.prisma).update(args.id, args.input),
    deleteEvent: (_parent: unknown, args: EventArgs, ctx: AppContext) => new EventService(ctx.prisma).delete(args.id),
  },
};
