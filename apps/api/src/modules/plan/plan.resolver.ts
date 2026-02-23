import type { AppContext } from '../../context';
import { PlanService } from './plan.service';
import type { PlanCreateDto, PlanUpdateDto, PlanVersionCreateDto, UserCreateDto, UserUpdateDto } from './plan.types';

interface IdArgs {
  id: string;
}

interface PlansArgs {
  userId: string;
}

interface PlanVersionsArgs {
  planId: string;
}

interface UserCreateArgs {
  input: UserCreateDto;
}

interface UserUpdateArgs {
  id: string;
  input: UserUpdateDto;
}

interface PlanCreateArgs {
  input: PlanCreateDto;
}

interface PlanUpdateArgs {
  id: string;
  input: PlanUpdateDto;
}

interface PlanVersionCreateArgs {
  input: PlanVersionCreateDto;
}

interface SetCurrentPlanVersionArgs {
  planId: string;
  versionId: string;
}

export const planResolver = {
  Query: {
    users: (_parent: unknown, _args: unknown, ctx: AppContext) => new PlanService(ctx.prisma).listUsers(),
    user: (_parent: unknown, args: IdArgs, ctx: AppContext) => new PlanService(ctx.prisma).getUser(args.id),
    plans: (_parent: unknown, args: PlansArgs, ctx: AppContext) => new PlanService(ctx.prisma).list(args.userId),
    plan: (_parent: unknown, args: IdArgs, ctx: AppContext) => new PlanService(ctx.prisma).get(args.id),
    planVersions: (_parent: unknown, args: PlanVersionsArgs, ctx: AppContext) =>
      new PlanService(ctx.prisma).listVersions(args.planId),
    planVersion: (_parent: unknown, args: IdArgs, ctx: AppContext) => new PlanService(ctx.prisma).getVersion(args.id),
  },
  Mutation: {
    createUser: (_parent: unknown, args: UserCreateArgs, ctx: AppContext) => new PlanService(ctx.prisma).createUser(args.input),
    updateUser: (_parent: unknown, args: UserUpdateArgs, ctx: AppContext) =>
      new PlanService(ctx.prisma).updateUser(args.id, args.input),
    deleteUser: (_parent: unknown, args: IdArgs, ctx: AppContext) => new PlanService(ctx.prisma).deleteUser(args.id),
    createPlan: (_parent: unknown, args: PlanCreateArgs, ctx: AppContext) => new PlanService(ctx.prisma).create(args.input),
    updatePlan: (_parent: unknown, args: PlanUpdateArgs, ctx: AppContext) =>
      new PlanService(ctx.prisma).update(args.id, args.input),
    createPlanVersion: (_parent: unknown, args: PlanVersionCreateArgs, ctx: AppContext) =>
      new PlanService(ctx.prisma).createVersion(args.input),
    setCurrentPlanVersion: (_parent: unknown, args: SetCurrentPlanVersionArgs, ctx: AppContext) =>
      new PlanService(ctx.prisma).setCurrentVersion(args.planId, args.versionId),
    deletePlan: (_parent: unknown, args: IdArgs, ctx: AppContext) => new PlanService(ctx.prisma).delete(args.id),
  },
};
