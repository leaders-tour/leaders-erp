import type { AppContext } from '../../context';
import { PricingAdminService } from './pricing-admin.service';
import type {
  PricingPolicyCreateDto,
  PricingPolicyDuplicateDto,
  PricingPolicyUpdateDto,
  PricingRuleCreateDto,
  PricingRuleUpdateDto,
} from './pricing-admin.types';

interface IdArgs {
  id: string;
}

interface PricingPolicyCreateArgs {
  input: PricingPolicyCreateDto;
}

interface PricingPolicyUpdateArgs {
  id: string;
  input: PricingPolicyUpdateDto;
}

interface PricingPolicyDuplicateArgs {
  id: string;
  input: PricingPolicyDuplicateDto;
}

interface PricingRuleCreateArgs {
  input: PricingRuleCreateDto;
}

interface PricingRuleUpdateArgs {
  id: string;
  input: PricingRuleUpdateDto;
}

export const pricingResolver = {
  Query: {
    pricingPolicies: (_parent: unknown, _args: unknown, ctx: AppContext) => new PricingAdminService(ctx.prisma).listPolicies(),
    pricingPolicy: (_parent: unknown, args: IdArgs, ctx: AppContext) => new PricingAdminService(ctx.prisma).getPolicy(args.id),
  },
  Mutation: {
    createPricingPolicy: (_parent: unknown, args: PricingPolicyCreateArgs, ctx: AppContext) =>
      new PricingAdminService(ctx.prisma).createPolicy(args.input),
    updatePricingPolicy: (_parent: unknown, args: PricingPolicyUpdateArgs, ctx: AppContext) =>
      new PricingAdminService(ctx.prisma).updatePolicy(args.id, args.input),
    deletePricingPolicy: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new PricingAdminService(ctx.prisma).deletePolicy(args.id),
    duplicatePricingPolicy: (_parent: unknown, args: PricingPolicyDuplicateArgs, ctx: AppContext) =>
      new PricingAdminService(ctx.prisma).duplicatePolicy(args.id, args.input),
    createPricingRule: (_parent: unknown, args: PricingRuleCreateArgs, ctx: AppContext) =>
      new PricingAdminService(ctx.prisma).createRule(args.input),
    updatePricingRule: (_parent: unknown, args: PricingRuleUpdateArgs, ctx: AppContext) =>
      new PricingAdminService(ctx.prisma).updateRule(args.id, args.input),
    deletePricingRule: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new PricingAdminService(ctx.prisma).deleteRule(args.id),
  },
  PricingPolicy: {
    rules: (parent: { rules?: unknown[] }) => (Array.isArray(parent.rules) ? parent.rules : []),
  },
  PricingRule: {
    variantTypes: (parent: { variantTypes?: unknown }) =>
      Array.isArray(parent.variantTypes) ? parent.variantTypes.filter((value): value is string => typeof value === 'string') : [],
    externalTransferPresetCodes: (parent: { externalTransferPresetCodes?: unknown }) =>
      Array.isArray(parent.externalTransferPresetCodes)
        ? parent.externalTransferPresetCodes.filter((value): value is string => typeof value === 'string')
        : [],
  },
};
