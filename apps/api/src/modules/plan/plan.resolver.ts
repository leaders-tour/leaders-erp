import type { AppContext } from '../../context';
import { PlanService } from './plan.service';
import type { PlanCreateDto, PlanUpdateDto } from './plan.types';

interface PlanArgs {
  id: string;
}

interface PlanCreateArgs {
  input: PlanCreateDto;
}

interface PlanUpdateArgs {
  id: string;
  input: PlanUpdateDto;
}

export const planResolver = {
  Query: {
    plans: (_parent: unknown, _args: unknown, ctx: AppContext) => new PlanService(ctx.prisma).list(),
    plan: (_parent: unknown, args: PlanArgs, ctx: AppContext) => new PlanService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createPlan: (_parent: unknown, args: PlanCreateArgs, ctx: AppContext) => new PlanService(ctx.prisma).create(args.input),
    updatePlan: (_parent: unknown, args: PlanUpdateArgs, ctx: AppContext) =>
      new PlanService(ctx.prisma).update(args.id, args.input),
    deletePlan: (_parent: unknown, args: PlanArgs, ctx: AppContext) => new PlanService(ctx.prisma).delete(args.id),
  },
};
