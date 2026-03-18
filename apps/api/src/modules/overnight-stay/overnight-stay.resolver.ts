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

export const overnightStayResolver = {
  Query: {
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
  OvernightStay: {
    title: (parent: any) => {
      const rawName = parent.location?.name;
      if (Array.isArray(rawName)) {
        return `${rawName.join(' ')} 연박`;
      }
      return `${String(rawName ?? parent.locationId ?? '').trim()} 연박`.trim();
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
