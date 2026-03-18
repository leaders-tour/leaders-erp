import type { MovementIntensity } from '@prisma/client';
import type { AppContext } from '../../context';
import { calculateAverageMovementIntensity } from '../../lib/movement-intensity';
import { PlanTemplateService } from './plan-template.service';
import type { PlanTemplateCreateDto, PlanTemplateUpdateDto } from './plan-template.types';

function resolveStopMovementIntensity(parent: {
  segment?: { movementIntensity?: unknown } | null;
  segmentVersion?: { movementIntensity?: unknown } | null;
  overnightStay?: { days?: Array<{ dayOrder?: unknown; movementIntensity?: unknown }> } | null;
  overnightStayDayOrder?: unknown;
  overnightStayConnection?: { movementIntensity?: unknown } | null;
  overnightStayConnectionVersion?: { movementIntensity?: unknown } | null;
  locationVersion?: { firstDayMovementIntensity?: unknown } | null;
}) {
  const overnightStayDayOrder =
    typeof parent.overnightStayDayOrder === 'number' ? parent.overnightStayDayOrder : null;

  if (parent.overnightStay?.days && overnightStayDayOrder !== null) {
    const matchingDay = parent.overnightStay.days.find((day) => day.dayOrder === overnightStayDayOrder);
    if (matchingDay?.movementIntensity) {
      return matchingDay.movementIntensity;
    }
  }

  return (
    parent.overnightStayConnectionVersion?.movementIntensity ??
    parent.overnightStayConnection?.movementIntensity ??
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
  regionId?: string;
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
        regionId: args.regionId,
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
