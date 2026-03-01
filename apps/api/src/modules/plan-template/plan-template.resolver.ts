import type { AppContext } from '../../context';
import { PlanTemplateService } from './plan-template.service';
import type { PlanTemplateCreateDto, PlanTemplateUpdateDto } from './plan-template.types';

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
};
