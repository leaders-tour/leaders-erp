import type { AppContext } from '../../context';
import { resolveRegionSetRegionIds } from '../../lib/resolve-region-set';
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

interface LocationsArgs {
  regionSetId?: string | null;
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

interface LocationVariationsArgs {
  locationId: string;
}

interface LocationVersionCreateArgs {
  input: LocationVersionCreateDto;
}

interface SetDefaultLocationVersionArgs {
  locationId: string;
  versionId: string;
}

export const locationResolver = {
  Query: {
    locations: async (_parent: unknown, args: LocationsArgs, ctx: AppContext) => {
      if (!args.regionSetId) {
        return new LocationService(ctx.prisma).list();
      }
      const regionIds = await resolveRegionSetRegionIds(ctx.prisma, args.regionSetId);
      return new LocationService(ctx.prisma).list({ regionIds });
    },
    location: (_parent: unknown, args: LocationArgs, ctx: AppContext) => new LocationService(ctx.prisma).get(args.id),
    locationVariations: (_parent: unknown, args: LocationVariationsArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).listVersions(args.locationId),
    locationVariation: (_parent: unknown, args: LocationArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).getVersion(args.id),
  },
  Mutation: {
    createLocation: (_parent: unknown, args: LocationCreateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).create(args.input),
    createLocationProfile: (_parent: unknown, args: LocationProfileCreateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).createProfile(args.input),
    createLocationVariation: (_parent: unknown, args: LocationVersionCreateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).createVersion(args.input),
    setDefaultLocationVersion: (_parent: unknown, args: SetDefaultLocationVersionArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).setDefaultVersion(args.locationId, args.versionId),
    updateLocationProfile: (_parent: unknown, args: LocationProfileUpdateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).updateProfile(args.id, args.input),
    updateLocation: (_parent: unknown, args: LocationUpdateArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).update(args.id, args.input),
    deleteLocation: (_parent: unknown, args: LocationArgs, ctx: AppContext) =>
      new LocationService(ctx.prisma).delete(args.id),
  },
  Location: {
    defaultVersionId: (parent: any) => parent.currentVersionId ?? null,
    defaultVersion: (parent: any) => parent.currentVersion ?? null,
    variations: (parent: any) => parent.versions ?? [],
    defaultLodgingType: (parent: any) =>
      parent.currentVersion?.defaultLodgingType ?? parent.defaultLodgingType,
    timeBlocks: () => [],
    lodgings: (parent: any) => parent.currentVersion?.lodgings ?? parent.lodgings ?? [],
    mealSets: (parent: any) => parent.currentVersion?.mealSets ?? parent.mealSets ?? [],
  },
  LocationVersion: {
    timeBlocks: () => [],
    firstDayTimeBlocks: (parent: any) => (parent.timeBlocks ?? []).filter((timeBlock: any) => timeBlock.profile === 'FIRST_DAY'),
    firstDayEarlyTimeBlocks: (parent: any) =>
      (parent.timeBlocks ?? []).filter((timeBlock: any) => timeBlock.profile === 'FIRST_DAY_EARLY'),
  },
};
