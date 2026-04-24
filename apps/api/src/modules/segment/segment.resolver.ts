import type { AppContext } from '../../context';
import { resolveRegionSetRegionIds } from '../../lib/resolve-region-set';
import { SegmentService } from './segment.service';
import type { SegmentBulkCreateDto, SegmentCreateDto, SegmentUpdateDto, SegmentUpdateWithAdditionalFromsDto } from './segment.types';

interface SegmentArgs {
  id: string;
}

interface SegmentsArgs {
  regionSetId?: string | null;
}

interface SegmentCreateArgs {
  input: SegmentCreateDto;
}

interface SegmentBulkCreateArgs {
  input: SegmentBulkCreateDto;
}

interface SegmentUpdateArgs {
  id: string;
  input: SegmentUpdateDto;
}

interface SegmentUpdateWithAdditionalFromsArgs {
  id: string;
  input: SegmentUpdateWithAdditionalFromsDto;
}

export const segmentResolver = {
  Query: {
    segments: async (_parent: unknown, args: SegmentsArgs, ctx: AppContext) => {
      if (!args.regionSetId) {
        return new SegmentService(ctx.prisma).list();
      }
      const regionIds = await resolveRegionSetRegionIds(ctx.prisma, args.regionSetId);
      return new SegmentService(ctx.prisma).list({ regionIds });
    },
    segment: (_parent: unknown, args: SegmentArgs, ctx: AppContext) => new SegmentService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createSegment: (_parent: unknown, args: SegmentCreateArgs, ctx: AppContext) =>
      new SegmentService(ctx.prisma).create(args.input),
    createSegmentsBulk: (_parent: unknown, args: SegmentBulkCreateArgs, ctx: AppContext) =>
      new SegmentService(ctx.prisma).createBulk(args.input),
    updateSegment: (_parent: unknown, args: SegmentUpdateArgs, ctx: AppContext) =>
      new SegmentService(ctx.prisma).update(args.id, args.input),
    updateSegmentWithAdditionalFroms: (
      _parent: unknown,
      args: SegmentUpdateWithAdditionalFromsArgs,
      ctx: AppContext,
    ) => new SegmentService(ctx.prisma).updateWithAdditionalFroms(args.id, args.input),
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
    lodgingOverride: (parent: any) => {
      if (
        parent.overrideLodgingIsUnspecified == null &&
        parent.overrideLodgingName == null &&
        parent.overrideHasElectricity == null &&
        parent.overrideHasShower == null &&
        parent.overrideHasInternet == null
      ) {
        return null;
      }

      return {
        isUnspecified: parent.overrideLodgingIsUnspecified ?? false,
        name: parent.overrideLodgingName ?? '여행자 캠프',
        hasElectricity: parent.overrideHasElectricity ?? 'NO',
        hasShower: parent.overrideHasShower ?? 'NO',
        hasInternet: parent.overrideHasInternet ?? 'NO',
      };
    },
    mealsOverride: (parent: any) => {
      if (parent.overrideBreakfast == null && parent.overrideLunch == null && parent.overrideDinner == null) {
        return null;
      }

      return {
        breakfast: parent.overrideBreakfast ?? null,
        lunch: parent.overrideLunch ?? null,
        dinner: parent.overrideDinner ?? null,
      };
    },
  },
};
