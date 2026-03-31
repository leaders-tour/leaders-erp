import type { AppContext } from '../../context';
import { locationInclude } from '../location/location.mapper';
import { SpecialMealDestinationRulesService } from './special-meal-destination-rules.service';

interface UpdateSpecialMealDestinationRulesArgs {
  input: {
    shabushabuLocationIds: string[];
    samgyeopsalRegionKeywordMap: { keyword: string; regionLabel: string }[];
    samgyeopsalPriorityByRegion: { regionLabel: string; orderedLocationKeywords: string[] }[];
    shashlikRegionKeywordMap: { keyword: string; regionLabel: string }[];
    shashlikPriorityByRegion: { regionLabel: string; orderedLocationKeywords: string[] }[];
  };
}

export const specialMealDestinationRulesResolver = {
  Query: {
    specialMealDestinationRules: (_parent: unknown, _args: unknown, ctx: AppContext) =>
      new SpecialMealDestinationRulesService(ctx.prisma).get(),
  },
  Mutation: {
    updateSpecialMealDestinationRules: (_parent: unknown, args: UpdateSpecialMealDestinationRulesArgs, ctx: AppContext) =>
      new SpecialMealDestinationRulesService(ctx.prisma).update(args.input),
  },
  SpecialMealDestinationRules: {
    shabushabuLocations: async (parent: { shabushabuLocationIds?: string[] }, _args: unknown, ctx: AppContext) => {
      const ids = parent.shabushabuLocationIds ?? [];
      if (ids.length === 0) {
        return [];
      }
      const rows = await ctx.prisma.location.findMany({
        where: { id: { in: ids } },
        include: locationInclude,
      });
      const byId = new Map(rows.map((r) => [r.id, r]));
      return ids.map((id) => byId.get(id)).filter((r) => r != null);
    },
  },
};
