import { GraphQLScalarType, Kind } from 'graphql';
import { activityResolver } from '../modules/activity/activity.resolver';
import { lodgingResolver } from '../modules/lodging/lodging.resolver';
import { locationGuideResolver } from '../modules/location-guide/location-guide.resolver';
import { locationResolver } from '../modules/location/location.resolver';
import { mealSetResolver } from '../modules/meal-set/meal-set.resolver';
import { overrideResolver } from '../modules/override/override.resolver';
import { planResolver } from '../modules/plan/plan.resolver';
import { regionResolver } from '../modules/region/region.resolver';
import { safetyNoticeResolver } from '../modules/safety-notice/safety-notice.resolver';
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

const uploadScalar = new GraphQLScalarType({
  name: 'Upload',
  parseValue(value: unknown) {
    return value;
  },
  serialize() {
    return null;
  },
  parseLiteral(_ast) {
    return null;
  },
});

export const resolvers = {
  DateTime: dateTimeScalar,
  Upload: uploadScalar,
  Query: mergeSection(
    regionResolver.Query,
    locationResolver.Query,
    safetyNoticeResolver.Query,
    locationGuideResolver.Query,
    lodgingResolver.Query,
    mealSetResolver.Query,
    segmentResolver.Query,
    planResolver.Query,
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
    safetyNoticeResolver.Mutation,
    locationGuideResolver.Mutation,
    lodgingResolver.Mutation,
    mealSetResolver.Mutation,
    segmentResolver.Mutation,
    planResolver.Mutation,
    timeBlockResolver.Mutation,
    activityResolver.Mutation,
    overrideResolver.Mutation,
  ),
  SafetyNotice: {
    imageUrls: (parent: { imageUrls?: string[] | null }) => parent.imageUrls ?? [],
  },
  Location: locationResolver.Location,
  LocationVersion: locationResolver.LocationVersion,
};
