import type { MovementIntensity } from '@prisma/client';
import type { AppContext } from '../../context';
import { calculateAverageMovementIntensity } from '../../lib/movement-intensity';
import { PlanTemplateService } from './plan-template.service';
import type { PlanTemplateCreateDto, PlanTemplateUpdateDto } from './plan-template.types';

function resolveStopMovementIntensity(parent: {
  segment?: { movementIntensity?: unknown } | null;
  segmentVersion?: { movementIntensity?: unknown } | null;
  multiDayBlock?: { days?: Array<{ dayOrder?: unknown; movementIntensity?: unknown }> } | null;
  multiDayBlockDayOrder?: unknown;
  locationVersion?: { firstDayMovementIntensity?: unknown } | null;
}) {
  const dayOrder =
    typeof parent.multiDayBlockDayOrder === 'number' ? parent.multiDayBlockDayOrder : null;
  const block = parent.multiDayBlock;

  if (block?.days && dayOrder !== null) {
    const matchingDay = block.days.find((day) => day.dayOrder === dayOrder);
    if (matchingDay?.movementIntensity) {
      return matchingDay.movementIntensity;
    }
  }

  return (
    parent.segmentVersion?.movementIntensity ??
    parent.segment?.movementIntensity ??
    parent.locationVersion?.firstDayMovementIntensity ??
    null
  );
}

function isMovementIntensity(value: unknown): value is MovementIntensity {
  return (
    value === 'LEVEL_1' ||
    value === 'LEVEL_2' ||
    value === 'LEVEL_3' ||
    value === 'LEVEL_4' ||
    value === 'LEVEL_5'
  );
}

interface PlanTemplateArgs {
  id: string;
}

interface PlanTemplatesArgs {
  regionSetId?: string | null;
  totalDays?: number;
  activeOnly?: boolean;
}

interface PlanTemplateCreateArgs {
  input: PlanTemplateCreateDto;
}

interface PlanTemplateUpdateArgs {
  id: string;
  input: PlanTemplateUpdateDto;
}

export const planTemplateResolver = {
  Query: {
    planTemplates: (_parent: unknown, args: PlanTemplatesArgs, ctx: AppContext) =>
      new PlanTemplateService(ctx.prisma).list({
        regionSetId: args.regionSetId ?? undefined,
        totalDays: args.totalDays,
        activeOnly: args.activeOnly,
      }),
    planTemplate: (_parent: unknown, args: PlanTemplateArgs, ctx: AppContext) =>
      new PlanTemplateService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createPlanTemplate: (_parent: unknown, args: PlanTemplateCreateArgs, ctx: AppContext) =>
      new PlanTemplateService(ctx.prisma).create(args.input),
    updatePlanTemplate: (_parent: unknown, args: PlanTemplateUpdateArgs, ctx: AppContext) =>
      new PlanTemplateService(ctx.prisma).update(args.id, args.input),
    deletePlanTemplate: (_parent: unknown, args: PlanTemplateArgs, ctx: AppContext) =>
      new PlanTemplateService(ctx.prisma).delete(args.id),
  },
  PlanTemplate: {
    movementIntensity: (parent: { planStops?: Array<Parameters<typeof resolveStopMovementIntensity>[0]> }) =>
      calculateAverageMovementIntensity(
        (parent.planStops ?? [])
          .map((stop) => resolveStopMovementIntensity(stop))
          .filter((value): value is MovementIntensity | null => value === null || isMovementIntensity(value)),
      ),
  },
  PlanTemplateStop: {
    movementIntensity: resolveStopMovementIntensity,
  },
};
