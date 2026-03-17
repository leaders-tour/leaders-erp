import type { AppContext } from '../../context';
import { SegmentService } from './segment.service';
import type { SegmentCreateDto, SegmentUpdateDto } from './segment.types';

interface SegmentArgs {
  id: string;
}

interface SegmentCreateArgs {
  input: SegmentCreateDto;
}

interface SegmentUpdateArgs {
  id: string;
  input: SegmentUpdateDto;
}

export const segmentResolver = {
  Query: {
    segments: (_parent: unknown, _args: unknown, ctx: AppContext) => new SegmentService(ctx.prisma).list(),
    segment: (_parent: unknown, args: SegmentArgs, ctx: AppContext) => new SegmentService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createSegment: (_parent: unknown, args: SegmentCreateArgs, ctx: AppContext) =>
      new SegmentService(ctx.prisma).create(args.input),
    updateSegment: (_parent: unknown, args: SegmentUpdateArgs, ctx: AppContext) =>
      new SegmentService(ctx.prisma).update(args.id, args.input),
    deleteSegment: (_parent: unknown, args: SegmentArgs, ctx: AppContext) => new SegmentService(ctx.prisma).delete(args.id),
  },
  Segment: {
    scheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'basic'),
    earlyScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'early'),
    extendScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'extend'),
    earlyExtendScheduleTimeBlocks: (parent: any) =>
      (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'earlyExtend'),
  },
  SegmentVersion: {
    scheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'basic'),
    earlyScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'early'),
    extendScheduleTimeBlocks: (parent: any) => (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'extend'),
    earlyExtendScheduleTimeBlocks: (parent: any) =>
      (parent.scheduleTimeBlocks ?? []).filter((timeBlock: any) => timeBlock.variant === 'earlyExtend'),
  },
};
