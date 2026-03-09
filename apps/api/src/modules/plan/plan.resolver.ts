import type { AppContext } from '../../context';
import { PlanService } from './plan.service';
import type {
  DealPipelineReorderDto,
  PlanCreateDto,
  PlanPricingPreviewDto,
  PlanUpdateDto,
  PlanVersionCreateDto,
  UserCreateDto,
  UserDealTodoStatusUpdateDto,
  UserDealTodosQueryDto,
  UserNoteCreateDto,
  UserUpdateDto,
} from './plan.types';

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

interface UserNotesArgs {
  userId: string;
}

interface UserDealTodosArgs extends UserDealTodosQueryDto {}

interface DealPipelineReorderArgs {
  input: DealPipelineReorderDto;
}

interface UserNoteCreateArgs {
  input: UserNoteCreateDto;
}

interface UpdateUserDealTodoStatusArgs {
  id: string;
  status: UserDealTodoStatusUpdateDto['status'];
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

interface PlanPricingPreviewArgs {
  input: PlanPricingPreviewDto;
}

interface SetCurrentPlanVersionArgs {
  planId: string;
  versionId: string;
}

export const planResolver = {
  Query: {
    users: (_parent: unknown, _args: unknown, ctx: AppContext) => new PlanService(ctx.prisma).listUsers(),
    user: (_parent: unknown, args: IdArgs, ctx: AppContext) => new PlanService(ctx.prisma).getUser(args.id),
    userNotes: (_parent: unknown, args: UserNotesArgs, ctx: AppContext) => new PlanService(ctx.prisma).listUserNotes(args.userId),
    userDealTodos: (_parent: unknown, args: UserDealTodosArgs, ctx: AppContext) =>
      new PlanService(ctx.prisma).listUserDealTodos(args),
    plans: (_parent: unknown, args: PlansArgs, ctx: AppContext) => new PlanService(ctx.prisma).list(args.userId),
    plan: (_parent: unknown, args: IdArgs, ctx: AppContext) => new PlanService(ctx.prisma).get(args.id),
    planVersions: (_parent: unknown, args: PlanVersionsArgs, ctx: AppContext) =>
      new PlanService(ctx.prisma).listVersions(args.planId),
    planVersion: (_parent: unknown, args: IdArgs, ctx: AppContext) => new PlanService(ctx.prisma).getVersion(args.id),
    planPricingPreview: (_parent: unknown, args: PlanPricingPreviewArgs, ctx: AppContext) =>
      new PlanService(ctx.prisma).previewPricing(args.input),
  },
  Mutation: {
    createUser: (_parent: unknown, args: UserCreateArgs, ctx: AppContext) => new PlanService(ctx.prisma).createUser(args.input),
    updateUser: (_parent: unknown, args: UserUpdateArgs, ctx: AppContext) =>
      new PlanService(ctx.prisma).updateUser(args.id, args.input),
    reorderDealPipeline: (_parent: unknown, args: DealPipelineReorderArgs, ctx: AppContext) =>
      new PlanService(ctx.prisma).reorderDealPipeline(args.input),
    createUserNote: (_parent: unknown, args: UserNoteCreateArgs, ctx: AppContext) =>
      new PlanService(ctx.prisma).createUserNote(args.input),
    updateUserDealTodoStatus: (_parent: unknown, args: UpdateUserDealTodoStatusArgs, ctx: AppContext) =>
      new PlanService(ctx.prisma).updateUserDealTodoStatus({ id: args.id, status: args.status }),
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
  User: {
    userDealTodos: (parent: { dealTodos?: unknown[] }) => (Array.isArray(parent.dealTodos) ? parent.dealTodos : []),
    ownerEmployee: (parent: { ownerEmployee?: unknown }) => parent.ownerEmployee ?? null,
  },
  PlanVersionMeta: {
    extraLodgings: (parent: { extraLodgings?: unknown }) =>
      Array.isArray(parent.extraLodgings) ? parent.extraLodgings : [],
    events: async (parent: { planVersionId: string }, _args: unknown, ctx: AppContext) => {
      const rows = await ctx.prisma.planVersionEvent.findMany({
        where: { planVersionId: parent.planVersionId },
        include: { event: true },
        orderBy: [{ event: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
      });
      return rows.map((row) => row.event);
    },
  },
  PlanVersionPricing: {
    longDistanceSegmentCount: (parent: { inputSnapshot?: unknown }) => {
      if (!parent.inputSnapshot || typeof parent.inputSnapshot !== 'object') {
        return 0;
      }
      const value = (parent.inputSnapshot as Record<string, unknown>).longDistanceSegmentCount;
      return typeof value === 'number' ? value : 0;
    },
    extraLodgingCount: (parent: { inputSnapshot?: unknown }) => {
      if (!parent.inputSnapshot || typeof parent.inputSnapshot !== 'object') {
        return 0;
      }
      const value = (parent.inputSnapshot as Record<string, unknown>).extraLodgingCount;
      return typeof value === 'number' ? value : 0;
    },
  },
};
