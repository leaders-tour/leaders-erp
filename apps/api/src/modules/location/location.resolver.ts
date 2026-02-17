import type { AppContext } from '../../context';
import { LocationService } from './location.service';
import type { LocationCreateDto, LocationUpdateDto } from './location.types';

interface LocationArgs {
  id: string;
}

interface LocationCreateArgs {
  input: LocationCreateDto;
}

interface LocationUpdateArgs {
  id: string;
  input: LocationUpdateDto;
}

export const locationResolver = {
  Query: {
    locations: (_parent: unknown, _args: unknown, ctx: AppContext) => new LocationService(ctx.prisma).list(),
    location: (_parent: unknown, args: LocationArgs, ctx: AppContext) => new LocationService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createLocation: (_parent: unknown, args: LocationCreateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).create(args.input),
    updateLocation: (_parent: unknown, args: LocationUpdateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).update(args.id, args.input),
    deleteLocation: (_parent: unknown, args: LocationArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).delete(args.id),
  },
};
