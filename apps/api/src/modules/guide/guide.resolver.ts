import type { GuideLevel, GuideStatus } from '@prisma/client';
import type { AppContext } from '../../context';
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
  },
  Mutation: {
    createGuide: (_parent: unknown, args: GuideCreateArgs, ctx: AppContext) =>
      new GuideService(ctx.prisma).create(args.input),
    updateGuide: (_parent: unknown, args: GuideUpdateArgs, ctx: AppContext) =>
      new GuideService(ctx.prisma).update(args.id, args.input),
    deleteGuide: (_parent: unknown, args: GuideIdArgs, ctx: AppContext) =>
      new GuideService(ctx.prisma).delete(args.id),
  },

  Guide: {
    certImageUrls: (parent: { certImageUrls: unknown }) => {
      if (Array.isArray(parent.certImageUrls)) return parent.certImageUrls;
      if (typeof parent.certImageUrls === 'string') {
        try { return JSON.parse(parent.certImageUrls); } catch { return []; }
      }
      return [];
    },
  },
};
