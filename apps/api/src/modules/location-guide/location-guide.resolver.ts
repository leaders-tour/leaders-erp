import type { AppContext } from '../../context';
import type { UploadFile } from '../../lib/file-storage/client';
import { LocationGuideService } from './location-guide.service';
import type { LocationGuideBulkApplyAnchorInput } from '@tour/validation';
import type { LocationGuideCreateDto, LocationGuideUpdateDto } from './location-guide.types';

interface BulkApplyAnchorGuideArgs {
  input: {
    anchorToken: string;
    locationIds: string[];
    image: UploadFile | Promise<UploadFile>;
    createGuideIfMissing: boolean;
    titleForNewGuide?: string | null;
    descriptionForNewGuide?: string | null;
  };
}

interface GuideArgs {
  id: string;
}

interface GuideCreateArgs {
  input: LocationGuideCreateDto;
}

interface GuideUpdateArgs {
  id: string;
  input: LocationGuideUpdateDto;
}

interface ConnectGuideArgs {
  locationId: string;
  guideId: string;
}

interface DisconnectGuideArgs {
  locationId: string;
}

export const locationGuideResolver = {
  Query: {
    locationGuides: (_parent: unknown, _args: unknown, ctx: AppContext) => new LocationGuideService(ctx.prisma).list(),
    locationGuide: (_parent: unknown, args: GuideArgs, ctx: AppContext) => new LocationGuideService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createLocationGuide: (_parent: unknown, args: GuideCreateArgs, ctx: AppContext) =>
      new LocationGuideService(ctx.prisma).create(args.input),
    updateLocationGuide: (_parent: unknown, args: GuideUpdateArgs, ctx: AppContext) =>
      new LocationGuideService(ctx.prisma).update(args.id, args.input),
    deleteLocationGuide: (_parent: unknown, args: GuideArgs, ctx: AppContext) =>
      new LocationGuideService(ctx.prisma).delete(args.id),
    connectLocationGuide: (_parent: unknown, args: ConnectGuideArgs, ctx: AppContext) =>
      new LocationGuideService(ctx.prisma).connect(args.locationId, args.guideId),
    disconnectLocationGuide: (_parent: unknown, args: DisconnectGuideArgs, ctx: AppContext) =>
      new LocationGuideService(ctx.prisma).disconnect(args.locationId),
    bulkApplyLocationGuideImageByAnchor: async (_parent: unknown, args: BulkApplyAnchorGuideArgs, ctx: AppContext) => {
      const { image, ...rest } = args.input;
      const payload = await new LocationGuideService(ctx.prisma).bulkApplyLocationGuideImageByAnchor(
        {
          anchorToken: rest.anchorToken,
          locationIds: rest.locationIds,
          createGuideIfMissing: rest.createGuideIfMissing,
          titleForNewGuide: rest.titleForNewGuide ?? null,
          descriptionForNewGuide: rest.descriptionForNewGuide ?? null,
        } satisfies LocationGuideBulkApplyAnchorInput,
        await Promise.resolve(image),
      );
      return payload;
    },
  },
};
