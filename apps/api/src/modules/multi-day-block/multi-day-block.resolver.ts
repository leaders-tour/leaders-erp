import type { AppContext } from '../../context';
import { resolveRegionSetRegionIds } from '../../lib/resolve-region-set';
import { MultiDayBlockConnectionService, MultiDayBlockService } from './multi-day-block.service';
import type {
  MultiDayBlockConnectionBulkCreateDto,
  MultiDayBlockConnectionCreateDto,
  MultiDayBlockConnectionUpdateDto,
  MultiDayBlockConnectionUpdateWithAdditionalFromsDto,
  MultiDayBlockCreateDto,
  MultiDayBlockUpdateDto,
} from './multi-day-block.types';

interface EntityArgs {
  id: string;
}

interface MultiDayBlockListArgs {
  regionSetId?: string | null;
  activeOnly?: boolean;
}

interface MultiDayBlockCreateArgs {
  input: MultiDayBlockCreateDto;
}

interface MultiDayBlockUpdateArgs {
  id: string;
  input: MultiDayBlockUpdateDto;
}

interface MultiDayBlockConnectionCreateArgs {
  input: MultiDayBlockConnectionCreateDto;
}

interface MultiDayBlockConnectionBulkCreateArgs {
  input: MultiDayBlockConnectionBulkCreateDto;
}

interface MultiDayBlockConnectionUpdateArgs {
  id: string;
  input: MultiDayBlockConnectionUpdateDto;
}

interface MultiDayBlockConnectionUpdateWithAdditionalFromsArgs {
  id: string;
  input: MultiDayBlockConnectionUpdateWithAdditionalFromsDto;
}

interface MultiDayBlockConnectionListArgs {
  regionSetId?: string | null;
  fromMultiDayBlockId?: string;
}

export const multiDayBlockResolver = {
  Query: {
    multiDayBlocks: async (_parent: unknown, args: MultiDayBlockListArgs, ctx: AppContext) => {
      if (!args.regionSetId) {
        return new MultiDayBlockService(ctx.prisma).list({ activeOnly: args.activeOnly });
      }
      const regionIds = await resolveRegionSetRegionIds(ctx.prisma, args.regionSetId);
      return new MultiDayBlockService(ctx.prisma).list({ regionIds, activeOnly: args.activeOnly });
    },
    multiDayBlock: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new MultiDayBlockService(ctx.prisma).get(args.id),
    multiDayBlockConnections: async (_parent: unknown, args: MultiDayBlockConnectionListArgs, ctx: AppContext) => {
      if (!args.regionSetId) {
        return new MultiDayBlockConnectionService(ctx.prisma).list({
          fromMultiDayBlockId: args.fromMultiDayBlockId,
        });
      }
      const regionIds = await resolveRegionSetRegionIds(ctx.prisma, args.regionSetId);
      return new MultiDayBlockConnectionService(ctx.prisma).list({
        regionIds,
        fromMultiDayBlockId: args.fromMultiDayBlockId,
      });
    },
    multiDayBlockConnection: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new MultiDayBlockConnectionService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createMultiDayBlock: (_parent: unknown, args: MultiDayBlockCreateArgs, ctx: AppContext) =>
      new MultiDayBlockService(ctx.prisma).create(args.input),
    updateMultiDayBlock: (_parent: unknown, args: MultiDayBlockUpdateArgs, ctx: AppContext) =>
      new MultiDayBlockService(ctx.prisma).update(args.id, args.input),
    deleteMultiDayBlock: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new MultiDayBlockService(ctx.prisma).delete(args.id),
    createMultiDayBlockConnection: (_parent: unknown, args: MultiDayBlockConnectionCreateArgs, ctx: AppContext) =>
      new MultiDayBlockConnectionService(ctx.prisma).create(args.input),
    createMultiDayBlockConnectionsBulk: (
      _parent: unknown,
      args: MultiDayBlockConnectionBulkCreateArgs,
      ctx: AppContext,
    ) => new MultiDayBlockConnectionService(ctx.prisma).createBulk(args.input),
    updateMultiDayBlockConnection: (_parent: unknown, args: MultiDayBlockConnectionUpdateArgs, ctx: AppContext) =>
      new MultiDayBlockConnectionService(ctx.prisma).update(args.id, args.input),
    updateMultiDayBlockConnectionWithAdditionalFroms: (
      _parent: unknown,
      args: MultiDayBlockConnectionUpdateWithAdditionalFromsArgs,
      ctx: AppContext,
    ) => new MultiDayBlockConnectionService(ctx.prisma).updateWithAdditionalFroms(args.id, args.input),
    deleteMultiDayBlockConnection: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new MultiDayBlockConnectionService(ctx.prisma).delete(args.id),
  },
  MultiDayBlock: {
    regionIds: (parent: any) => {
      const dayRegionIds = Array.isArray(parent.days)
        ? parent.days
            .map((day: any) => day.displayLocation?.regionId)
            .filter((value: string | undefined | null): value is string => Boolean(value))
        : [];

      if (dayRegionIds.length === 0) {
        return parent.regionId ? [parent.regionId] : [];
      }

      return Array.from(new Set(dayRegionIds));
    },
    title: (parent: any) => {
      if (typeof parent.name === 'string' && parent.name.trim().length > 0) return parent.name.trim();
      const rawName = parent.location?.name;
      const stayLength = Array.isArray(parent.days) ? parent.days.length : null;
      if (Array.isArray(rawName)) {
        const suffix = typeof stayLength === 'number' && stayLength > 0 ? ` ${stayLength}일 블록` : ' 블록';
        return `${rawName.join(' ')}${suffix}`;
      }
      const suffix = typeof stayLength === 'number' && stayLength > 0 ? ` ${stayLength}일 블록` : ' 블록';
      return `${String(rawName ?? parent.locationId ?? '').trim()}${suffix}`.trim();
    },
    outgoingConnections: (parent: any, _args: unknown, ctx: AppContext) =>
      new MultiDayBlockConnectionService(ctx.prisma).list({ fromMultiDayBlockId: parent.id }),
  },
  MultiDayBlockDay: {
    multiDayBlockId: (parent: { overnightStayId: string }) => parent.overnightStayId,
  },
  MultiDayBlockConnection: {
    fromMultiDayBlockId: (parent: { fromOvernightStayId: string }) => parent.fromOvernightStayId,
    fromMultiDayBlock: (parent: any, _args: unknown, ctx: AppContext) =>
      new MultiDayBlockService(ctx.prisma).get(parent.fromOvernightStayId),
    scheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'basic'),
    earlyScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'early'),
    extendScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'extend'),
    earlyExtendScheduleTimeBlocks: (parent: any) =>
      (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'earlyExtend'),
  },
  MultiDayBlockConnectionVersion: {
    multiDayBlockConnectionId: (parent: { overnightStayConnectionId: string }) => parent.overnightStayConnectionId,
    scheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'basic'),
    earlyScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'early'),
    extendScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'extend'),
    earlyExtendScheduleTimeBlocks: (parent: any) =>
      (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'earlyExtend'),
  },
  MultiDayBlockConnectionVersionTimeBlock: {
    multiDayBlockConnectionVersionId: (parent: { overnightStayConnectionVersionId: string }) =>
      parent.overnightStayConnectionVersionId,
  },
  MultiDayBlockConnectionVersionActivity: {
    multiDayBlockConnectionVersionTimeBlockId: (parent: { overnightStayConnectionVersionTimeBlockId: string }) =>
      parent.overnightStayConnectionVersionTimeBlockId,
  },
  MultiDayBlockConnectionTimeBlock: {
    multiDayBlockConnectionId: (parent: { overnightStayConnectionId: string }) => parent.overnightStayConnectionId,
  },
  MultiDayBlockConnectionActivity: {
    multiDayBlockConnectionTimeBlockId: (parent: { overnightStayConnectionTimeBlockId: string }) =>
      parent.overnightStayConnectionTimeBlockId,
  },
};
