import type { AppContext } from '../../context';
import { OvernightStayConnectionService, OvernightStayService } from './overnight-stay.service';
import type {
  OvernightStayConnectionCreateDto,
  OvernightStayConnectionUpdateDto,
  OvernightStayCreateDto,
  OvernightStayUpdateDto,
} from './overnight-stay.types';

interface EntityArgs {
  id: string;
}

interface OvernightStayListArgs {
  regionId?: string;
  activeOnly?: boolean;
}

interface OvernightStayConnectionListArgs {
  regionId?: string;
  fromOvernightStayId?: string;
}

interface OvernightStayCreateArgs {
  input: OvernightStayCreateDto;
}

interface OvernightStayUpdateArgs {
  id: string;
  input: OvernightStayUpdateDto;
}

interface OvernightStayConnectionCreateArgs {
  input: OvernightStayConnectionCreateDto;
}

interface OvernightStayConnectionUpdateArgs {
  id: string;
  input: OvernightStayConnectionUpdateDto;
}

interface MultiDayBlockConnectionListArgs {
  regionId?: string;
  fromMultiDayBlockId?: string;
}

export const overnightStayResolver = {
  Query: {
    multiDayBlocks: (_parent: unknown, args: OvernightStayListArgs, ctx: AppContext) =>
      new OvernightStayService(ctx.prisma).list({ regionId: args.regionId, activeOnly: args.activeOnly }),
    multiDayBlock: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new OvernightStayService(ctx.prisma).get(args.id),
    multiDayBlockConnections: (_parent: unknown, args: MultiDayBlockConnectionListArgs, ctx: AppContext) =>
      new OvernightStayConnectionService(ctx.prisma).list({
        regionId: args.regionId,
        fromOvernightStayId: args.fromMultiDayBlockId,
      }),
    multiDayBlockConnection: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new OvernightStayConnectionService(ctx.prisma).get(args.id),
    overnightStays: (_parent: unknown, args: OvernightStayListArgs, ctx: AppContext) =>
      new OvernightStayService(ctx.prisma).list({ regionId: args.regionId, activeOnly: args.activeOnly }),
    overnightStay: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new OvernightStayService(ctx.prisma).get(args.id),
    overnightStayConnections: (_parent: unknown, args: OvernightStayConnectionListArgs, ctx: AppContext) =>
      new OvernightStayConnectionService(ctx.prisma).list({
        regionId: args.regionId,
        fromOvernightStayId: args.fromOvernightStayId,
      }),
    overnightStayConnection: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new OvernightStayConnectionService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createMultiDayBlock: (_parent: unknown, args: OvernightStayCreateArgs, ctx: AppContext) =>
      new OvernightStayService(ctx.prisma).create(args.input),
    updateMultiDayBlock: (_parent: unknown, args: OvernightStayUpdateArgs, ctx: AppContext) =>
      new OvernightStayService(ctx.prisma).update(args.id, args.input),
    deleteMultiDayBlock: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new OvernightStayService(ctx.prisma).delete(args.id),
    createMultiDayBlockConnection: (
      _parent: unknown,
      args: { input: Record<string, unknown> & { fromMultiDayBlockId: string } },
      ctx: AppContext,
    ) => {
      const { fromMultiDayBlockId, ...rest } = args.input;
      return new OvernightStayConnectionService(ctx.prisma).create({
        ...rest,
        fromOvernightStayId: fromMultiDayBlockId,
      } as OvernightStayConnectionCreateDto);
    },
    updateMultiDayBlockConnection: (
      _parent: unknown,
      args: { id: string; input: Record<string, unknown> & { fromMultiDayBlockId?: string } },
      ctx: AppContext,
    ) => {
      const { fromMultiDayBlockId, ...rest } = args.input;
      return new OvernightStayConnectionService(ctx.prisma).update(args.id, {
        ...rest,
        ...(fromMultiDayBlockId !== undefined && { fromOvernightStayId: fromMultiDayBlockId }),
      } as OvernightStayConnectionUpdateDto);
    },
    deleteMultiDayBlockConnection: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new OvernightStayConnectionService(ctx.prisma).delete(args.id),
    createOvernightStay: (_parent: unknown, args: OvernightStayCreateArgs, ctx: AppContext) =>
      new OvernightStayService(ctx.prisma).create(args.input),
    updateOvernightStay: (_parent: unknown, args: OvernightStayUpdateArgs, ctx: AppContext) =>
      new OvernightStayService(ctx.prisma).update(args.id, args.input),
    deleteOvernightStay: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new OvernightStayService(ctx.prisma).delete(args.id),
    createOvernightStayConnection: (_parent: unknown, args: OvernightStayConnectionCreateArgs, ctx: AppContext) =>
      new OvernightStayConnectionService(ctx.prisma).create(args.input),
    updateOvernightStayConnection: (_parent: unknown, args: OvernightStayConnectionUpdateArgs, ctx: AppContext) =>
      new OvernightStayConnectionService(ctx.prisma).update(args.id, args.input),
    deleteOvernightStayConnection: (_parent: unknown, args: EntityArgs, ctx: AppContext) =>
      new OvernightStayConnectionService(ctx.prisma).delete(args.id),
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
      new OvernightStayConnectionService(ctx.prisma).list({ fromOvernightStayId: parent.id }),
  },
  MultiDayBlockDay: {
    multiDayBlockId: (parent: { overnightStayId: string }) => parent.overnightStayId,
  },
  MultiDayBlockConnection: {
    fromMultiDayBlockId: (parent: { fromOvernightStayId: string }) => parent.fromOvernightStayId,
    fromMultiDayBlock: (parent: any, _args: unknown, ctx: AppContext) =>
      new OvernightStayService(ctx.prisma).get(parent.fromOvernightStayId),
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
  OvernightStay: {
    title: (parent: any) => {
      if (typeof parent.name === 'string' && parent.name.trim().length > 0) {
        return parent.name.trim();
      }
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
      new OvernightStayConnectionService(ctx.prisma).list({ fromOvernightStayId: parent.id }),
  },
  OvernightStayConnection: {
    scheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'basic'),
    earlyScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'early'),
    extendScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'extend'),
    earlyExtendScheduleTimeBlocks: (parent: any) =>
      (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'earlyExtend'),
  },
  OvernightStayConnectionVersion: {
    scheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'basic'),
    earlyScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'early'),
    extendScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'extend'),
    earlyExtendScheduleTimeBlocks: (parent: any) =>
      (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'earlyExtend'),
  },
};
