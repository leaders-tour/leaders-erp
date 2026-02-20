import type { AppContext } from '../../context';
import { LocationService } from './location.service';
import type { LocationCreateDto, LocationProfileCreateDto, LocationProfileUpdateDto, LocationUpdateDto } from './location.types';

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

interface LocationProfileCreateArgs {
  input: LocationProfileCreateDto;
}

interface LocationProfileUpdateArgs {
  id: string;
  input: LocationProfileUpdateDto;
}

export const locationResolver = {
  Query: {
    locations: (_parent: unknown, _args: unknown, ctx: AppContext) => new LocationService(ctx.prisma).list(),
    location: (_parent: unknown, args: LocationArgs, ctx: AppContext) => new LocationService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createLocation: (_parent: unknown, args: LocationCreateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).create(args.input),
    createLocationProfile: (_parent: unknown, args: LocationProfileCreateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).createProfile(args.input),
    updateLocationProfile: (_parent: unknown, args: LocationProfileUpdateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).updateProfile(args.id, args.input),
    updateLocation: (_parent: unknown, args: LocationUpdateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).update(args.id, args.input),
    deleteLocation: (_parent: unknown, args: LocationArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).delete(args.id),
  },
};
