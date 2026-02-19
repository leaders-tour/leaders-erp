import type { AppContext } from '../../context';
import { MealSetService } from './meal-set.service';
import type { MealSetCreateDto, MealSetUpdateDto } from './meal-set.types';

interface MealSetArgs {
  id: string;
}

interface MealSetCreateArgs {
  input: MealSetCreateDto;
}

interface MealSetUpdateArgs {
  id: string;
  input: MealSetUpdateDto;
}

export const mealSetResolver = {
  Query: {
    mealSets: (_parent: unknown, _args: unknown, ctx: AppContext) => new MealSetService(ctx.prisma).list(),
    mealSet: (_parent: unknown, args: MealSetArgs, ctx: AppContext) => new MealSetService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createMealSet: (_parent: unknown, args: MealSetCreateArgs, ctx: AppContext) =>
      new MealSetService(ctx.prisma).create(args.input),
    updateMealSet: (_parent: unknown, args: MealSetUpdateArgs, ctx: AppContext) =>
      new MealSetService(ctx.prisma).update(args.id, args.input),
    deleteMealSet: (_parent: unknown, args: MealSetArgs, ctx: AppContext) =>
      new MealSetService(ctx.prisma).delete(args.id),
  },
};
