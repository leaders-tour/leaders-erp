import type { AppContext } from '../../context';
import { SafetyNoticeService } from './safety-notice.service';
import type { SafetyNoticeCreateDto, SafetyNoticeUpdateDto } from './safety-notice.types';

interface SafetyNoticeArgs {
  id: string;
}

interface SafetyNoticeCreateArgs {
  input: SafetyNoticeCreateDto;
}

interface SafetyNoticeUpdateArgs {
  id: string;
  input: SafetyNoticeUpdateDto;
}

export const safetyNoticeResolver = {
  Query: {
    safetyNotices: (_parent: unknown, _args: unknown, ctx: AppContext) => new SafetyNoticeService(ctx.prisma).list(),
    safetyNotice: (_parent: unknown, args: SafetyNoticeArgs, ctx: AppContext) =>
      new SafetyNoticeService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createSafetyNotice: (_parent: unknown, args: SafetyNoticeCreateArgs, ctx: AppContext) =>
      new SafetyNoticeService(ctx.prisma).create(args.input),
    updateSafetyNotice: (_parent: unknown, args: SafetyNoticeUpdateArgs, ctx: AppContext) =>
      new SafetyNoticeService(ctx.prisma).update(args.id, args.input),
    deleteSafetyNotice: (_parent: unknown, args: SafetyNoticeArgs, ctx: AppContext) =>
      new SafetyNoticeService(ctx.prisma).delete(args.id),
  },
};
