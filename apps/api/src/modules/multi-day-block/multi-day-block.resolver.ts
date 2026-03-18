import type { AppContext } from '../../context';
import { MultiDayBlockConnectionService, MultiDayBlockService } from './multi-day-block.service';
import type {
  MultiDayBlockConnectionCreateDto,
  MultiDayBlockConnectionUpdateDto,
  MultiDayBlockCreateDto,
  MultiDayBlockUpdateDto,
} from './multi-day-block.types';

interface EntityArgs {
  id: string;
}

interface MultiDayBlockListArgs {
  regionId?: string;
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

interface MultiDayBlockConnectionUpdateArgs {
  id: string;
  input: MultiDayBlockConnectionUpdateDto;
}

interface MultiDayBlockConnectionListArgs {
  regionId?: string;
  fromMultiDayBlockId?: string;
}

export const multiDayBlockResolver = {
  Query: {
    multiDayBlocks: (_parent: unknown, args: MultiDayBlockListArgs, ctx: AppContext) =>
      new MultiDayBlockService(ctx.prisma).list({ regionId: args.regionId, activeOnly: args.activeOnly }),
    multiDayBlock: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new MultiDayBlockService(ctx.prisma).get(args.id),
    multiDayBlockConnections: (_parent: unknown, args: MultiDayBlockConnectionListArgs, ctx: AppContext) =>
      new MultiDayBlockConnectionService(ctx.prisma).list({
        regionId: args.regionId,
        fromMultiDayBlockId: args.fromMultiDayBlockId,
      }),
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
    createMultiDayBlockConnection: (
      _parent: unknown,
      args: { input: Record<string, unknown> & { fromMultiDayBlockId: string } },
      ctx: AppContext,
    ) => {
      const { fromMultiDayBlockId, ...rest } = args.input;
      return new MultiDayBlockConnectionService(ctx.prisma).create({
        ...rest,
        fromMultiDayBlockId,
      } as MultiDayBlockConnectionCreateDto);
    },
    updateMultiDayBlockConnection: (
      _parent: unknown,
      args: { id: string; input: Record<string, unknown> & { fromMultiDayBlockId?: string } },
      ctx: AppContext,
    ) => {
      const { fromMultiDayBlockId, ...rest } = args.input;
      return new MultiDayBlockConnectionService(ctx.prisma).update(args.id, {
        ...rest,
        ...(fromMultiDayBlockId !== undefined && { fromMultiDayBlockId }),
      } as MultiDayBlockConnectionUpdateDto);
    },
    deleteMultiDayBlockConnection: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new MultiDayBlockConnectionService(ctx.prisma).delete(args.id),
  },
  MultiDayBlock: {
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
    scheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((tb: any) => tb.variant === 'basic'),
    earlyScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((tb: any) => tb.variant === 'early'),
    extendScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((tb: any) => tb.variant === 'extend'),
    earlyExtendScheduleTimeBlocks: (parent: any) =>
      (parent.scheduleTimeBlocks ?? []).filter((tb: any) => tb.variant === 'earlyExtend'),
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
