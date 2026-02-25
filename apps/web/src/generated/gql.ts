/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "fragment RegionFields on Region {\n  id\n  name\n  description\n}": typeof types.RegionFieldsFragmentDoc,
    "mutation CreateActivity($input: ActivityCreateInput!) {\n  createActivity(input: $input) {\n    id\n  }\n}\n\nmutation UpdateActivity($id: ID!, $input: ActivityUpdateInput!) {\n  updateActivity(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteActivity($id: ID!) {\n  deleteActivity(id: $id)\n}": typeof types.CreateActivityDocument,
    "mutation CreateLocation($input: LocationCreateInput!) {\n  createLocation(input: $input) {\n    id\n  }\n}\n\nmutation UpdateLocation($id: ID!, $input: LocationUpdateInput!) {\n  updateLocation(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteLocation($id: ID!) {\n  deleteLocation(id: $id)\n}": typeof types.CreateLocationDocument,
    "mutation CreateLodging($input: LodgingCreateInput!) {\n  createLodging(input: $input) {\n    id\n  }\n}\n\nmutation UpdateLodging($id: ID!, $input: LodgingUpdateInput!) {\n  updateLodging(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteLodging($id: ID!) {\n  deleteLodging(id: $id)\n}": typeof types.CreateLodgingDocument,
    "mutation CreateMealSet($input: MealSetCreateInput!) {\n  createMealSet(input: $input) {\n    id\n  }\n}\n\nmutation UpdateMealSet($id: ID!, $input: MealSetUpdateInput!) {\n  updateMealSet(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteMealSet($id: ID!) {\n  deleteMealSet(id: $id)\n}": typeof types.CreateMealSetDocument,
    "mutation CreateOverride($input: OverrideCreateInput!) {\n  createOverride(input: $input) {\n    id\n  }\n}\n\nmutation UpdateOverride($id: ID!, $input: OverrideUpdateInput!) {\n  updateOverride(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteOverride($id: ID!) {\n  deleteOverride(id: $id)\n}": typeof types.CreateOverrideDocument,
    "mutation CreatePlan($input: PlanCreateInput!) {\n  createPlan(input: $input) {\n    id\n  }\n}\n\nmutation UpdatePlan($id: ID!, $input: PlanUpdateInput!) {\n  updatePlan(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation CreatePlanVersion($input: PlanVersionCreateInput!) {\n  createPlanVersion(input: $input) {\n    id\n    versionNumber\n  }\n}\n\nmutation SetCurrentPlanVersion($planId: ID!, $versionId: ID!) {\n  setCurrentPlanVersion(planId: $planId, versionId: $versionId) {\n    id\n    currentVersionId\n  }\n}\n\nmutation DeletePlan($id: ID!) {\n  deletePlan(id: $id)\n}": typeof types.CreatePlanDocument,
    "mutation CreateRegion($input: RegionCreateInput!) {\n  createRegion(input: $input) {\n    id\n  }\n}\n\nmutation UpdateRegion($id: ID!, $input: RegionUpdateInput!) {\n  updateRegion(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteRegion($id: ID!) {\n  deleteRegion(id: $id)\n}": typeof types.CreateRegionDocument,
    "mutation CreateSegment($input: SegmentCreateInput!) {\n  createSegment(input: $input) {\n    id\n  }\n}\n\nmutation UpdateSegment($id: ID!, $input: SegmentUpdateInput!) {\n  updateSegment(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteSegment($id: ID!) {\n  deleteSegment(id: $id)\n}": typeof types.CreateSegmentDocument,
    "mutation CreateTimeBlock($input: TimeBlockCreateInput!) {\n  createTimeBlock(input: $input) {\n    id\n  }\n}\n\nmutation UpdateTimeBlock($id: ID!, $input: TimeBlockUpdateInput!) {\n  updateTimeBlock(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteTimeBlock($id: ID!) {\n  deleteTimeBlock(id: $id)\n}": typeof types.CreateTimeBlockDocument,
    "query Activities {\n  activities {\n    id\n    timeBlockId\n    description\n    orderIndex\n    isOptional\n    conditionNote\n  }\n}": typeof types.ActivitiesDocument,
    "query Locations {\n  locations {\n    id\n    regionId\n    regionName\n    name\n    defaultLodgingType\n    latitude\n    longitude\n  }\n}": typeof types.LocationsDocument,
    "query Lodgings {\n  lodgings {\n    id\n    locationId\n    locationNameSnapshot\n    name\n    specialNotes\n  }\n}": typeof types.LodgingsDocument,
    "query MealSets {\n  mealSets {\n    id\n    locationId\n    locationNameSnapshot\n    setName\n    breakfast\n    lunch\n    dinner\n  }\n}": typeof types.MealSetsDocument,
    "query Overrides {\n  overrides {\n    id\n    planVersionId\n    targetType\n    targetId\n    fieldName\n    value\n  }\n}": typeof types.OverridesDocument,
    "query Plans($userId: ID!) {\n  plans(userId: $userId) {\n    id\n    userId\n    regionId\n    title\n    currentVersionId\n  }\n}\n\nquery PlanVersions($planId: ID!) {\n  planVersions(planId: $planId) {\n    id\n    planId\n    parentVersionId\n    versionNumber\n    variantType\n    totalDays\n  }\n}": typeof types.PlansDocument,
    "query Regions {\n  regions {\n    id\n    name\n    description\n  }\n}": typeof types.RegionsDocument,
    "query Segments {\n  segments {\n    id\n    regionId\n    regionName\n    fromLocationId\n    toLocationId\n    averageDistanceKm\n    averageTravelHours\n    isLongDistance\n  }\n}": typeof types.SegmentsDocument,
    "query TimeBlocks {\n  timeBlocks {\n    id\n    locationId\n    startTime\n    label\n    orderIndex\n  }\n}": typeof types.TimeBlocksDocument,
};
const documents: Documents = {
    "fragment RegionFields on Region {\n  id\n  name\n  description\n}": types.RegionFieldsFragmentDoc,
    "mutation CreateActivity($input: ActivityCreateInput!) {\n  createActivity(input: $input) {\n    id\n  }\n}\n\nmutation UpdateActivity($id: ID!, $input: ActivityUpdateInput!) {\n  updateActivity(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteActivity($id: ID!) {\n  deleteActivity(id: $id)\n}": types.CreateActivityDocument,
    "mutation CreateLocation($input: LocationCreateInput!) {\n  createLocation(input: $input) {\n    id\n  }\n}\n\nmutation UpdateLocation($id: ID!, $input: LocationUpdateInput!) {\n  updateLocation(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteLocation($id: ID!) {\n  deleteLocation(id: $id)\n}": types.CreateLocationDocument,
    "mutation CreateLodging($input: LodgingCreateInput!) {\n  createLodging(input: $input) {\n    id\n  }\n}\n\nmutation UpdateLodging($id: ID!, $input: LodgingUpdateInput!) {\n  updateLodging(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteLodging($id: ID!) {\n  deleteLodging(id: $id)\n}": types.CreateLodgingDocument,
    "mutation CreateMealSet($input: MealSetCreateInput!) {\n  createMealSet(input: $input) {\n    id\n  }\n}\n\nmutation UpdateMealSet($id: ID!, $input: MealSetUpdateInput!) {\n  updateMealSet(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteMealSet($id: ID!) {\n  deleteMealSet(id: $id)\n}": types.CreateMealSetDocument,
    "mutation CreateOverride($input: OverrideCreateInput!) {\n  createOverride(input: $input) {\n    id\n  }\n}\n\nmutation UpdateOverride($id: ID!, $input: OverrideUpdateInput!) {\n  updateOverride(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteOverride($id: ID!) {\n  deleteOverride(id: $id)\n}": types.CreateOverrideDocument,
    "mutation CreatePlan($input: PlanCreateInput!) {\n  createPlan(input: $input) {\n    id\n  }\n}\n\nmutation UpdatePlan($id: ID!, $input: PlanUpdateInput!) {\n  updatePlan(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation CreatePlanVersion($input: PlanVersionCreateInput!) {\n  createPlanVersion(input: $input) {\n    id\n    versionNumber\n  }\n}\n\nmutation SetCurrentPlanVersion($planId: ID!, $versionId: ID!) {\n  setCurrentPlanVersion(planId: $planId, versionId: $versionId) {\n    id\n    currentVersionId\n  }\n}\n\nmutation DeletePlan($id: ID!) {\n  deletePlan(id: $id)\n}": types.CreatePlanDocument,
    "mutation CreateRegion($input: RegionCreateInput!) {\n  createRegion(input: $input) {\n    id\n  }\n}\n\nmutation UpdateRegion($id: ID!, $input: RegionUpdateInput!) {\n  updateRegion(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteRegion($id: ID!) {\n  deleteRegion(id: $id)\n}": types.CreateRegionDocument,
    "mutation CreateSegment($input: SegmentCreateInput!) {\n  createSegment(input: $input) {\n    id\n  }\n}\n\nmutation UpdateSegment($id: ID!, $input: SegmentUpdateInput!) {\n  updateSegment(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteSegment($id: ID!) {\n  deleteSegment(id: $id)\n}": types.CreateSegmentDocument,
    "mutation CreateTimeBlock($input: TimeBlockCreateInput!) {\n  createTimeBlock(input: $input) {\n    id\n  }\n}\n\nmutation UpdateTimeBlock($id: ID!, $input: TimeBlockUpdateInput!) {\n  updateTimeBlock(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteTimeBlock($id: ID!) {\n  deleteTimeBlock(id: $id)\n}": types.CreateTimeBlockDocument,
    "query Activities {\n  activities {\n    id\n    timeBlockId\n    description\n    orderIndex\n    isOptional\n    conditionNote\n  }\n}": types.ActivitiesDocument,
    "query Locations {\n  locations {\n    id\n    regionId\n    regionName\n    name\n    defaultLodgingType\n    latitude\n    longitude\n  }\n}": types.LocationsDocument,
    "query Lodgings {\n  lodgings {\n    id\n    locationId\n    locationNameSnapshot\n    name\n    specialNotes\n  }\n}": types.LodgingsDocument,
    "query MealSets {\n  mealSets {\n    id\n    locationId\n    locationNameSnapshot\n    setName\n    breakfast\n    lunch\n    dinner\n  }\n}": types.MealSetsDocument,
    "query Overrides {\n  overrides {\n    id\n    planVersionId\n    targetType\n    targetId\n    fieldName\n    value\n  }\n}": types.OverridesDocument,
    "query Plans($userId: ID!) {\n  plans(userId: $userId) {\n    id\n    userId\n    regionId\n    title\n    currentVersionId\n  }\n}\n\nquery PlanVersions($planId: ID!) {\n  planVersions(planId: $planId) {\n    id\n    planId\n    parentVersionId\n    versionNumber\n    variantType\n    totalDays\n  }\n}": types.PlansDocument,
    "query Regions {\n  regions {\n    id\n    name\n    description\n  }\n}": types.RegionsDocument,
    "query Segments {\n  segments {\n    id\n    regionId\n    regionName\n    fromLocationId\n    toLocationId\n    averageDistanceKm\n    averageTravelHours\n    isLongDistance\n  }\n}": types.SegmentsDocument,
    "query TimeBlocks {\n  timeBlocks {\n    id\n    locationId\n    startTime\n    label\n    orderIndex\n  }\n}": types.TimeBlocksDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "fragment RegionFields on Region {\n  id\n  name\n  description\n}"): (typeof documents)["fragment RegionFields on Region {\n  id\n  name\n  description\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateActivity($input: ActivityCreateInput!) {\n  createActivity(input: $input) {\n    id\n  }\n}\n\nmutation UpdateActivity($id: ID!, $input: ActivityUpdateInput!) {\n  updateActivity(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteActivity($id: ID!) {\n  deleteActivity(id: $id)\n}"): (typeof documents)["mutation CreateActivity($input: ActivityCreateInput!) {\n  createActivity(input: $input) {\n    id\n  }\n}\n\nmutation UpdateActivity($id: ID!, $input: ActivityUpdateInput!) {\n  updateActivity(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteActivity($id: ID!) {\n  deleteActivity(id: $id)\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateLocation($input: LocationCreateInput!) {\n  createLocation(input: $input) {\n    id\n  }\n}\n\nmutation UpdateLocation($id: ID!, $input: LocationUpdateInput!) {\n  updateLocation(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteLocation($id: ID!) {\n  deleteLocation(id: $id)\n}"): (typeof documents)["mutation CreateLocation($input: LocationCreateInput!) {\n  createLocation(input: $input) {\n    id\n  }\n}\n\nmutation UpdateLocation($id: ID!, $input: LocationUpdateInput!) {\n  updateLocation(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteLocation($id: ID!) {\n  deleteLocation(id: $id)\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateLodging($input: LodgingCreateInput!) {\n  createLodging(input: $input) {\n    id\n  }\n}\n\nmutation UpdateLodging($id: ID!, $input: LodgingUpdateInput!) {\n  updateLodging(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteLodging($id: ID!) {\n  deleteLodging(id: $id)\n}"): (typeof documents)["mutation CreateLodging($input: LodgingCreateInput!) {\n  createLodging(input: $input) {\n    id\n  }\n}\n\nmutation UpdateLodging($id: ID!, $input: LodgingUpdateInput!) {\n  updateLodging(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteLodging($id: ID!) {\n  deleteLodging(id: $id)\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateMealSet($input: MealSetCreateInput!) {\n  createMealSet(input: $input) {\n    id\n  }\n}\n\nmutation UpdateMealSet($id: ID!, $input: MealSetUpdateInput!) {\n  updateMealSet(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteMealSet($id: ID!) {\n  deleteMealSet(id: $id)\n}"): (typeof documents)["mutation CreateMealSet($input: MealSetCreateInput!) {\n  createMealSet(input: $input) {\n    id\n  }\n}\n\nmutation UpdateMealSet($id: ID!, $input: MealSetUpdateInput!) {\n  updateMealSet(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteMealSet($id: ID!) {\n  deleteMealSet(id: $id)\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateOverride($input: OverrideCreateInput!) {\n  createOverride(input: $input) {\n    id\n  }\n}\n\nmutation UpdateOverride($id: ID!, $input: OverrideUpdateInput!) {\n  updateOverride(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteOverride($id: ID!) {\n  deleteOverride(id: $id)\n}"): (typeof documents)["mutation CreateOverride($input: OverrideCreateInput!) {\n  createOverride(input: $input) {\n    id\n  }\n}\n\nmutation UpdateOverride($id: ID!, $input: OverrideUpdateInput!) {\n  updateOverride(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteOverride($id: ID!) {\n  deleteOverride(id: $id)\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreatePlan($input: PlanCreateInput!) {\n  createPlan(input: $input) {\n    id\n  }\n}\n\nmutation UpdatePlan($id: ID!, $input: PlanUpdateInput!) {\n  updatePlan(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation CreatePlanVersion($input: PlanVersionCreateInput!) {\n  createPlanVersion(input: $input) {\n    id\n    versionNumber\n  }\n}\n\nmutation SetCurrentPlanVersion($planId: ID!, $versionId: ID!) {\n  setCurrentPlanVersion(planId: $planId, versionId: $versionId) {\n    id\n    currentVersionId\n  }\n}\n\nmutation DeletePlan($id: ID!) {\n  deletePlan(id: $id)\n}"): (typeof documents)["mutation CreatePlan($input: PlanCreateInput!) {\n  createPlan(input: $input) {\n    id\n  }\n}\n\nmutation UpdatePlan($id: ID!, $input: PlanUpdateInput!) {\n  updatePlan(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation CreatePlanVersion($input: PlanVersionCreateInput!) {\n  createPlanVersion(input: $input) {\n    id\n    versionNumber\n  }\n}\n\nmutation SetCurrentPlanVersion($planId: ID!, $versionId: ID!) {\n  setCurrentPlanVersion(planId: $planId, versionId: $versionId) {\n    id\n    currentVersionId\n  }\n}\n\nmutation DeletePlan($id: ID!) {\n  deletePlan(id: $id)\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateRegion($input: RegionCreateInput!) {\n  createRegion(input: $input) {\n    id\n  }\n}\n\nmutation UpdateRegion($id: ID!, $input: RegionUpdateInput!) {\n  updateRegion(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteRegion($id: ID!) {\n  deleteRegion(id: $id)\n}"): (typeof documents)["mutation CreateRegion($input: RegionCreateInput!) {\n  createRegion(input: $input) {\n    id\n  }\n}\n\nmutation UpdateRegion($id: ID!, $input: RegionUpdateInput!) {\n  updateRegion(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteRegion($id: ID!) {\n  deleteRegion(id: $id)\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateSegment($input: SegmentCreateInput!) {\n  createSegment(input: $input) {\n    id\n  }\n}\n\nmutation UpdateSegment($id: ID!, $input: SegmentUpdateInput!) {\n  updateSegment(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteSegment($id: ID!) {\n  deleteSegment(id: $id)\n}"): (typeof documents)["mutation CreateSegment($input: SegmentCreateInput!) {\n  createSegment(input: $input) {\n    id\n  }\n}\n\nmutation UpdateSegment($id: ID!, $input: SegmentUpdateInput!) {\n  updateSegment(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteSegment($id: ID!) {\n  deleteSegment(id: $id)\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateTimeBlock($input: TimeBlockCreateInput!) {\n  createTimeBlock(input: $input) {\n    id\n  }\n}\n\nmutation UpdateTimeBlock($id: ID!, $input: TimeBlockUpdateInput!) {\n  updateTimeBlock(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteTimeBlock($id: ID!) {\n  deleteTimeBlock(id: $id)\n}"): (typeof documents)["mutation CreateTimeBlock($input: TimeBlockCreateInput!) {\n  createTimeBlock(input: $input) {\n    id\n  }\n}\n\nmutation UpdateTimeBlock($id: ID!, $input: TimeBlockUpdateInput!) {\n  updateTimeBlock(id: $id, input: $input) {\n    id\n  }\n}\n\nmutation DeleteTimeBlock($id: ID!) {\n  deleteTimeBlock(id: $id)\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Activities {\n  activities {\n    id\n    timeBlockId\n    description\n    orderIndex\n    isOptional\n    conditionNote\n  }\n}"): (typeof documents)["query Activities {\n  activities {\n    id\n    timeBlockId\n    description\n    orderIndex\n    isOptional\n    conditionNote\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Locations {\n  locations {\n    id\n    regionId\n    regionName\n    name\n    defaultLodgingType\n    latitude\n    longitude\n  }\n}"): (typeof documents)["query Locations {\n  locations {\n    id\n    regionId\n    regionName\n    name\n    defaultLodgingType\n    latitude\n    longitude\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Lodgings {\n  lodgings {\n    id\n    locationId\n    locationNameSnapshot\n    name\n    specialNotes\n  }\n}"): (typeof documents)["query Lodgings {\n  lodgings {\n    id\n    locationId\n    locationNameSnapshot\n    name\n    specialNotes\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query MealSets {\n  mealSets {\n    id\n    locationId\n    locationNameSnapshot\n    setName\n    breakfast\n    lunch\n    dinner\n  }\n}"): (typeof documents)["query MealSets {\n  mealSets {\n    id\n    locationId\n    locationNameSnapshot\n    setName\n    breakfast\n    lunch\n    dinner\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Overrides {\n  overrides {\n    id\n    planVersionId\n    targetType\n    targetId\n    fieldName\n    value\n  }\n}"): (typeof documents)["query Overrides {\n  overrides {\n    id\n    planVersionId\n    targetType\n    targetId\n    fieldName\n    value\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Plans($userId: ID!) {\n  plans(userId: $userId) {\n    id\n    userId\n    regionId\n    title\n    currentVersionId\n  }\n}\n\nquery PlanVersions($planId: ID!) {\n  planVersions(planId: $planId) {\n    id\n    planId\n    parentVersionId\n    versionNumber\n    variantType\n    totalDays\n  }\n}"): (typeof documents)["query Plans($userId: ID!) {\n  plans(userId: $userId) {\n    id\n    userId\n    regionId\n    title\n    currentVersionId\n  }\n}\n\nquery PlanVersions($planId: ID!) {\n  planVersions(planId: $planId) {\n    id\n    planId\n    parentVersionId\n    versionNumber\n    variantType\n    totalDays\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Regions {\n  regions {\n    id\n    name\n    description\n  }\n}"): (typeof documents)["query Regions {\n  regions {\n    id\n    name\n    description\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Segments {\n  segments {\n    id\n    regionId\n    regionName\n    fromLocationId\n    toLocationId\n    averageDistanceKm\n    averageTravelHours\n    isLongDistance\n  }\n}"): (typeof documents)["query Segments {\n  segments {\n    id\n    regionId\n    regionName\n    fromLocationId\n    toLocationId\n    averageDistanceKm\n    averageTravelHours\n    isLongDistance\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query TimeBlocks {\n  timeBlocks {\n    id\n    locationId\n    startTime\n    label\n    orderIndex\n  }\n}"): (typeof documents)["query TimeBlocks {\n  timeBlocks {\n    id\n    locationId\n    startTime\n    label\n    orderIndex\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;