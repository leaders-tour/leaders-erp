import type { AppContext } from '../../context';
import { DayPlanService } from './day-plan.service';
import type { DayPlanCreateDto, DayPlanUpdateDto } from './day-plan.types';

interface DayPlanArgs {
  id: string;
}

interface DayPlanCreateArgs {
  input: DayPlanCreateDto;
}

interface DayPlanUpdateArgs {
  id: string;
  input: DayPlanUpdateDto;
}

export const dayPlanResolver = {
  Query: {
    dayPlans: (_parent: unknown, _args: unknown, ctx: AppContext) => new DayPlanService(ctx.prisma).list(),
    dayPlan: (_parent: unknown, args: DayPlanArgs, ctx: AppContext) => new DayPlanService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createDayPlan: (_parent: unknown, args: DayPlanCreateArgs, ctx: AppContext) =>
      new DayPlanService(ctx.prisma).create(args.input),
    updateDayPlan: (_parent: unknown, args: DayPlanUpdateArgs, ctx: AppContext) =>
      new DayPlanService(ctx.prisma).update(args.id, args.input),
    deleteDayPlan: (_parent: unknown, args: DayPlanArgs, ctx: AppContext) => new DayPlanService(ctx.prisma).delete(args.id),
  },
};
