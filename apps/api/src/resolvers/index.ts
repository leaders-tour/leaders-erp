import { GraphQLScalarType, Kind } from 'graphql';
import { activityResolver } from '../modules/activity/activity.resolver';
import { dayPlanResolver } from '../modules/day-plan/day-plan.resolver';
import { lodgingResolver } from '../modules/lodging/lodging.resolver';
import { locationResolver } from '../modules/location/location.resolver';
import { mealSetResolver } from '../modules/meal-set/meal-set.resolver';
import { overrideResolver } from '../modules/override/override.resolver';
import { planResolver } from '../modules/plan/plan.resolver';
import { regionResolver } from '../modules/region/region.resolver';
import { segmentResolver } from '../modules/segment/segment.resolver';
import { timeBlockResolver } from '../modules/time-block/time-block.resolver';

function mergeSection(...items: Array<Record<string, unknown>>): Record<string, unknown> {
  return items.reduce<Record<string, unknown>>((acc, current) => ({ ...acc, ...current }), {});
}

const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return new Date(String(value)).toISOString();
  },
  parseValue(value: unknown): Date {
    return new Date(String(value));
  },
  parseLiteral(ast): Date | null {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

export const resolvers = {
  DateTime: dateTimeScalar,
  Query: mergeSection(
    regionResolver.Query,
    locationResolver.Query,
    lodgingResolver.Query,
    mealSetResolver.Query,
    segmentResolver.Query,
    planResolver.Query,
    dayPlanResolver.Query,
    timeBlockResolver.Query,
    activityResolver.Query,
    overrideResolver.Query,
    {
      health: () => 'ok',
    },
  ),
  Mutation: mergeSection(
    regionResolver.Mutation,
    locationResolver.Mutation,
    lodgingResolver.Mutation,
    mealSetResolver.Mutation,
    segmentResolver.Mutation,
    planResolver.Mutation,
    dayPlanResolver.Mutation,
    timeBlockResolver.Mutation,
    activityResolver.Mutation,
    overrideResolver.Mutation,
  ),
};
