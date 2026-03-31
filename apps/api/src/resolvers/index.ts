import { GraphQLScalarType, Kind } from 'graphql';
import { activityResolver } from '../modules/activity/activity.resolver';
import { authResolver } from '../modules/auth/auth.resolver';
import { eventResolver } from '../modules/event/event.resolver';
import { lodgingResolver } from '../modules/lodging/lodging.resolver';
import { locationGuideResolver } from '../modules/location-guide/location-guide.resolver';
import { locationResolver } from '../modules/location/location.resolver';
import { mealSetResolver } from '../modules/meal-set/meal-set.resolver';
import { multiDayBlockResolver } from '../modules/multi-day-block/multi-day-block.resolver';
import { overrideResolver } from '../modules/override/override.resolver';
import { planResolver } from '../modules/plan/plan.resolver';
import { planTemplateResolver } from '../modules/plan-template/plan-template.resolver';
import { outreachResolver } from '../modules/outreach/outreach.resolver';
import { consultationResolver } from '../modules/consultation/consultation.resolver';
import { regionResolver } from '../modules/region/region.resolver';
import { regionSetResolver } from '../modules/region-set/region-set.resolver';
import { regionLodgingResolver } from '../modules/region-lodging/region-lodging.resolver';
import { segmentResolver } from '../modules/segment/segment.resolver';
import { specialMealDestinationRulesResolver } from '../modules/special-meal-destination-rules/special-meal-destination-rules.resolver';
import { timeBlockResolver } from '../modules/time-block/time-block.resolver';
import { requireEmployee } from '../lib/auth-guards';

function mergeSection(...items: Array<Record<string, unknown>>): Record<string, unknown> {
  return items.reduce<Record<string, unknown>>((acc, current) => ({ ...acc, ...current }), {});
}

function protectSection(
  entries: Record<string, unknown>,
  publicFields: string[] = [],
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(entries).map(([fieldName, resolver]) => {
      if (publicFields.includes(fieldName) || typeof resolver !== 'function') {
        return [fieldName, resolver];
      }

      return [
        fieldName,
        (parent: unknown, args: unknown, ctx: Parameters<typeof requireEmployee>[0], info: unknown) => {
          requireEmployee(ctx);
          return (resolver as (parent: unknown, args: unknown, ctx: unknown, info: unknown) => unknown)(parent, args, ctx, info);
        },
      ];
    }),
  );
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
  Query: protectSection(
    mergeSection(
      authResolver.Query,
      regionResolver.Query,
      regionSetResolver.Query,
      locationResolver.Query,
      locationGuideResolver.Query,
      lodgingResolver.Query,
      regionLodgingResolver.Query,
      mealSetResolver.Query,
      segmentResolver.Query,
      multiDayBlockResolver.Query,
      planResolver.Query,
      planTemplateResolver.Query,
      timeBlockResolver.Query,
      activityResolver.Query,
      eventResolver.Query,
      overrideResolver.Query,
      outreachResolver.Query,
      specialMealDestinationRulesResolver.Query,
      {
        health: () => 'ok',
      },
    ),
    ['health'],
  ),
  Mutation: protectSection(
    mergeSection(
      authResolver.Mutation,
      consultationResolver.Mutation,
      regionResolver.Mutation,
      regionSetResolver.Mutation,
      locationResolver.Mutation,
      locationGuideResolver.Mutation,
      lodgingResolver.Mutation,
      regionLodgingResolver.Mutation,
      mealSetResolver.Mutation,
      segmentResolver.Mutation,
      multiDayBlockResolver.Mutation,
      planResolver.Mutation,
      planTemplateResolver.Mutation,
      timeBlockResolver.Mutation,
      activityResolver.Mutation,
      eventResolver.Mutation,
      overrideResolver.Mutation,
      outreachResolver.Mutation,
      specialMealDestinationRulesResolver.Mutation,
    ),
    ['login', 'registerEmployee', 'refreshAccessToken', 'logout'],
  ),
  User: mergeSection(planResolver.User ?? {}),
  Region: mergeSection(regionResolver.Region ?? {}),
  CafeLead: outreachResolver.CafeLead,
  OutreachDraft: outreachResolver.OutreachDraft,
  CafeLeadNeeds: outreachResolver.CafeLeadNeeds,
  PlanVersionMeta: planResolver.PlanVersionMeta,
  PlanVersionPricing: planResolver.PlanVersionPricing,
  Location: locationResolver.Location,
  LocationVersion: locationResolver.LocationVersion,
  Segment: segmentResolver.Segment,
  SegmentVersion: segmentResolver.SegmentVersion,
  MultiDayBlock: multiDayBlockResolver.MultiDayBlock,
  MultiDayBlockDay: multiDayBlockResolver.MultiDayBlockDay,
  MultiDayBlockConnection: multiDayBlockResolver.MultiDayBlockConnection,
  MultiDayBlockConnectionVersion: multiDayBlockResolver.MultiDayBlockConnectionVersion,
  MultiDayBlockConnectionVersionTimeBlock: multiDayBlockResolver.MultiDayBlockConnectionVersionTimeBlock,
  MultiDayBlockConnectionVersionActivity: multiDayBlockResolver.MultiDayBlockConnectionVersionActivity,
  MultiDayBlockConnectionTimeBlock: multiDayBlockResolver.MultiDayBlockConnectionTimeBlock,
  MultiDayBlockConnectionActivity: multiDayBlockResolver.MultiDayBlockConnectionActivity,
  SpecialMealDestinationRules: specialMealDestinationRulesResolver.SpecialMealDestinationRules,
};
