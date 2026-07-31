import type { GuideLevel, GuideStatus } from '@prisma/client';
import type { AppContext } from '../../context';
import type { UploadFile } from '../../lib/file-storage/client';
import { requireAdmin } from '../../lib/auth-guards';
import { ConfirmedTripRepository } from '../confirmed-trip/confirmed-trip.repository';
import { GuideService } from './guide.service';
import type { GuideCreateDto, GuidesFilterDto, GuideUpdateDto } from './guide.types';

interface GuidesArgs {
  status?: GuideStatus;
  level?: GuideLevel;
}

interface GuideIdArgs {
  id: string;
}

interface GuideCreateArgs {
  input: GuideCreateDto;
}

interface GuideUpdateArgs {
  id: string;
  input: GuideUpdateDto;
}

interface GuideLeaderstepsAuthLinkArgs {
  guideId: string;
  authUserId: string;
}

export const guideResolver = {
  Query: {
    guides: (_parent: unknown, args: GuidesArgs, ctx: AppContext) => {
      const filters: GuidesFilterDto = {};
      if (args.status) filters.status = args.status;
      if (args.level) filters.level = args.level;
      return new GuideService(ctx.prisma).list(filters);
    },
    guide: (_parent: unknown, args: GuideIdArgs, ctx: AppContext) =>
      new GuideService(ctx.prisma).get(args.id),
    leaderstepsAuthUsers: (_parent: unknown, _args: unknown, ctx: AppContext) => {
      requireAdmin(ctx);
      return new GuideService(ctx.prisma).listLeaderstepsAuthUsers();
    },
    leaderstepsActiveProjects: (
      _parent: unknown,
      args: { date?: string | null },
      ctx: AppContext,
    ) => new GuideService(ctx.prisma).listLeaderstepsActiveProjects(args.date),
    guideLiveLocations: (
      _parent: unknown,
      args: { projectId?: string | null; date?: string | null },
      ctx: AppContext,
    ) => new GuideService(ctx.prisma).listGuideLiveLocations(args.projectId, args.date),
    guidePlaceVisits: (
      _parent: unknown,
      args: { guideId: string; projectId?: string | null; date?: string | null },
      ctx: AppContext,
    ) => new GuideService(ctx.prisma).listGuidePlaceVisits(args.guideId, args.projectId, args.date),
  },
  Mutation: {
    createGuide: (_parent: unknown, args: GuideCreateArgs, ctx: AppContext) =>
      new GuideService(ctx.prisma).create(args.input),
    updateGuide: (_parent: unknown, args: GuideUpdateArgs, ctx: AppContext) =>
      new GuideService(ctx.prisma).update(args.id, args.input),
    deleteGuide: (_parent: unknown, args: GuideIdArgs, ctx: AppContext) =>
      new GuideService(ctx.prisma).delete(args.id),
    uploadGuideProfileImage: (_parent: unknown, args: { id: string; image: UploadFile | Promise<UploadFile> }, ctx: AppContext) =>
      new GuideService(ctx.prisma).uploadProfileImage(args.id, args.image),
    uploadGuideCertImages: (_parent: unknown, args: { id: string; images: (UploadFile | Promise<UploadFile>)[] }, ctx: AppContext) =>
      new GuideService(ctx.prisma).uploadCertImages(args.id, args.images),
    removeGuideCertImage: (_parent: unknown, args: { id: string; imageUrl: string }, ctx: AppContext) =>
      new GuideService(ctx.prisma).removeCertImage(args.id, args.imageUrl),
    linkGuideLeaderstepsAuth: (
      _parent: unknown,
      args: GuideLeaderstepsAuthLinkArgs,
      ctx: AppContext,
    ) => {
      requireAdmin(ctx);
      return new GuideService(ctx.prisma).linkLeaderstepsAuth(args.guideId, args.authUserId);
    },
    unlinkGuideLeaderstepsAuth: (
      _parent: unknown,
      args: { guideId: string },
      ctx: AppContext,
    ) => {
      requireAdmin(ctx);
      return new GuideService(ctx.prisma).unlinkLeaderstepsAuth(args.guideId);
    },
  },

  Guide: {
    certImageUrls: (parent: { certImageUrls: unknown }) => {
      if (Array.isArray(parent.certImageUrls)) return parent.certImageUrls;
      if (typeof parent.certImageUrls === 'string') {
        try { return JSON.parse(parent.certImageUrls); } catch { return []; }
      }
      return [];
    },
    confirmedTrips: (
      parent: { id: string },
      args: { includeCancelled?: boolean | null },
      ctx: AppContext,
    ) =>
      new ConfirmedTripRepository(ctx.prisma).findByGuideId(
        parent.id,
        args.includeCancelled ?? false,
      ),
  },
};
