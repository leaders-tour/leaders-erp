import type { AppContext } from '../../context';
import { LocationService } from './location.service';
import type {
  LocationCreateDto,
  LocationProfileCreateDto,
  LocationProfileUpdateDto,
  LocationUpdateDto,
  LocationVersionCreateDto,
} from './location.types';

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

interface LocationVersionsArgs {
  locationId: string;
}

interface LocationVersionCreateArgs {
  input: LocationVersionCreateDto;
}

interface SetCurrentLocationVersionArgs {
  locationId: string;
  versionId: string;
}

export const locationResolver = {
  Query: {
    locations: (_parent: unknown, _args: unknown, ctx: AppContext) => new LocationService(ctx.prisma).list(),
    location: (_parent: unknown, args: LocationArgs, ctx: AppContext) => new LocationService(ctx.prisma).get(args.id),
    locationVersions: (_parent: unknown, args: LocationVersionsArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).listVersions(args.locationId),
    locationVersion: (_parent: unknown, args: LocationArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).getVersion(args.id),
  },
  Mutation: {
    createLocation: (_parent: unknown, args: LocationCreateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).create(args.input),
    createLocationProfile: (_parent: unknown, args: LocationProfileCreateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).createProfile(args.input),
    createLocationVersion: (_parent: unknown, args: LocationVersionCreateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).createVersion(args.input),
    setCurrentLocationVersion: (_parent: unknown, args: SetCurrentLocationVersionArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).setCurrentVersion(args.locationId, args.versionId),
    updateLocationProfile: (_parent: unknown, args: LocationProfileUpdateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).updateProfile(args.id, args.input),
    updateLocation: (_parent: unknown, args: LocationUpdateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).update(args.id, args.input),
    deleteLocation: (_parent: unknown, args: LocationArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).delete(args.id),
  },
  Location: {
    defaultLodgingType: (parent: any) =>
      parent.currentVersion?.defaultLodgingType ?? parent.defaultLodgingType,
    internalMovementDistance: (parent: any) =>
      parent.currentVersion?.internalMovementDistance ?? parent.internalMovementDistance,
    timeBlocks: (parent: any) => parent.currentVersion?.timeBlocks ?? parent.timeBlocks ?? [],
    lodgings: (parent: any) => parent.currentVersion?.lodgings ?? parent.lodgings ?? [],
    mealSets: (parent: any) => parent.currentVersion?.mealSets ?? parent.mealSets ?? [],
  },
};
