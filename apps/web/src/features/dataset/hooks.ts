import { gql, useMutation, useQuery } from '@apollo/client';
import type {
  CatalogBlockShape,
  CatalogElementComposition,
  CatalogElementKind,
  CatalogPlaceType,
  CatalogUsageStatus,
  CatalogVisitJudgmentType,
  CatalogVisitLinkReviewReason,
  CatalogVisitLinkStatus,
  CatalogVisitRegion,
  CatalogRouteObservationHoldReason,
  CatalogRouteObservationStatus,
} from './labels';

export interface CatalogRegionRow {
  id: string;
  code: string;
  name: string;
  country: string;
  description: string | null;
  status: CatalogUsageStatus;
  sortOrder: number;
}

export interface CatalogPlaceRow {
  id: string;
  code: string;
  name: string;
  placeType: CatalogPlaceType;
  country: string;
  regionId: string | null;
  region: { id: string; name: string } | null;
  parentPlaceId: string | null;
  parentPlace: { id: string; name: string } | null;
  latitude: number | null;
  longitude: number | null;
  lodgingLevel: string | null;
  rateSummary: string | null;
  linkLabel: string | null;
  displayName: string | null;
  internalNote: string | null;
  accommodationId: string | null;
  accommodation: {
    id: string;
    name: string;
    region: string | null;
    destination: string | null;
  } | null;
  visitJudgmentType: CatalogVisitJudgmentType | null;
  visitRadiusM: number | null;
  visitMinStayMinutes: number | null;
  status: CatalogUsageStatus;
  sortOrder: number;
}

export interface CatalogRouteRow {
  id: string;
  code: string;
  name: string;
  region: { id: string; name: string } | null;
  fromPlace: { id: string; name: string };
  toPlace: { id: string; name: string };
  averageDistanceKm: number | null;
  averageTravelHours: number | null;
  observationCount: number;
  usableCount: number;
  medianElapsedMinutes: number | null;
  minElapsedMinutes: number | null;
  maxElapsedMinutes: number | null;
  medianDistanceKm: number | null;
  status: CatalogUsageStatus;
}

export interface CatalogRouteObservationPathPoint {
  lat: number;
  lng: number;
  at: string;
}

export interface CatalogRouteObservationRow {
  id: string;
  fromVisitLinkId: string;
  toVisitLinkId: string;
  projectId: string;
  fromPlaceId: string;
  fromPlace: { id: string; name: string; code: string };
  toPlaceId: string;
  toPlace: { id: string; name: string; code: string };
  routeId: string | null;
  route: { id: string; code: string; name: string } | null;
  departedAt: string;
  arrivedAt: string;
  elapsedMs: number;
  distanceKm: number | null;
  maxGapMinutes: number;
  includeDistance: boolean;
  includeElapsed: boolean;
  status: CatalogRouteObservationStatus;
  holdReason: CatalogRouteObservationHoldReason | null;
  path: CatalogRouteObservationPathPoint[];
  analyzedAt: string;
}

export interface CatalogRouteObservationAnalyzeResult {
  scanned: number;
  upserted: number;
  routeCreated: number;
  held: number;
  protectedHold: number;
}

export interface CatalogElementRow {
  id: string;
  code: string;
  name: string;
  version: number;
  composition: CatalogElementComposition;
  kind: CatalogElementKind;
  defaultPlace: { id: string; name: string } | null;
  defaultPlaceMode: string | null;
  durationText: string | null;
  costRuleText: string | null;
  customerText: string | null;
  valueStatusText: string;
  lifecycleStatus: string;
  usageCount: number;
  status: CatalogUsageStatus;
  setItems: Array<{
    id: string;
    orderIndex: number;
    memberElement: { id: string; name: string; code: string };
  }>;
}

export interface CatalogBlockPlacementRow {
  id: string;
  elementId: string;
  element: { id: string; name: string; code: string };
  dayIndex: number;
  orderIndex: number;
  startLabel: string | null;
}

export interface CatalogBlockRow {
  id: string;
  code: string;
  name: string;
  version: number;
  shape: CatalogBlockShape;
  dayCount: number;
  fromLabel: string | null;
  toLabel: string | null;
  compositionText: string | null;
  distanceKm: number | null;
  travelHours: number | null;
  timeSaturationPct: number | null;
  timeSaturationText: string | null;
  fatigueScore: number | null;
  estimatedCostText: string | null;
  calcStatusText: string;
  usageCount: number;
  status: CatalogUsageStatus;
  setItems: Array<{
    id: string;
    orderIndex: number;
    memberBlock: Omit<CatalogBlockRow, 'setItems' | 'placements'>;
  }>;
  placements: CatalogBlockPlacementRow[];
}

export interface CatalogJourneyRow {
  id: string;
  code: string;
  name: string;
  version: number;
  nightCount: number;
  dayCount: number;
  calcStatusText: string;
  status: CatalogUsageStatus;
  placements: Array<{
    id: string;
    blockId: string;
    block: { id: string; name: string; code: string; dayCount: number };
    orderIndex: number;
    dayOffset: number;
  }>;
}

export interface CatalogUsageRef {
  id: string;
  kind: string;
  name: string;
  code: string;
}

export interface CatalogChangeLogRow {
  id: string;
  actorLabel: string;
  targetType: string;
  targetId: string;
  action: string;
  summary: string;
  createdAt: string;
}

const REGIONS_QUERY = gql`
  query CatalogRegions {
    catalogRegions {
      id
      code
      name
      country
      description
      status
      sortOrder
    }
  }
`;

const PLACES_QUERY = gql`
  query CatalogPlaces {
    catalogPlaces {
      id
      code
      name
      placeType
      country
      regionId
      region {
        id
        name
      }
      parentPlaceId
      parentPlace {
        id
        name
      }
      latitude
      longitude
      lodgingLevel
      rateSummary
      linkLabel
      displayName
      internalNote
      accommodationId
      accommodation {
        id
        name
        region
        destination
      }
      visitJudgmentType
      visitRadiusM
      visitMinStayMinutes
      status
      sortOrder
    }
  }
`;

const ROUTES_QUERY = gql`
  query CatalogRoutes {
    catalogRoutes {
      id
      code
      name
      region {
        id
        name
      }
      fromPlace {
        id
        name
      }
      toPlace {
        id
        name
      }
      averageDistanceKm
      averageTravelHours
      observationCount
      usableCount
      medianElapsedMinutes
      minElapsedMinutes
      maxElapsedMinutes
      medianDistanceKm
      status
    }
  }
`;

const ELEMENTS_QUERY = gql`
  query CatalogElements {
    catalogElements {
      id
      code
      name
      version
      composition
      kind
      defaultPlace {
        id
        name
      }
      defaultPlaceMode
      durationText
      costRuleText
      customerText
      valueStatusText
      lifecycleStatus
      usageCount
      status
      setItems {
        id
        orderIndex
        memberElement {
          id
          name
          code
        }
      }
    }
  }
`;

const BLOCKS_QUERY = gql`
  query CatalogBlocks {
    catalogBlocks {
      id
      code
      name
      version
      shape
      dayCount
      fromLabel
      toLabel
      compositionText
      distanceKm
      travelHours
      timeSaturationPct
      timeSaturationText
      fatigueScore
      estimatedCostText
      calcStatusText
      usageCount
      status
      setItems {
        id
        orderIndex
        memberBlock {
          id
          code
          name
          version
          shape
          dayCount
          fromLabel
          toLabel
          compositionText
          distanceKm
          travelHours
          timeSaturationPct
          timeSaturationText
          fatigueScore
          estimatedCostText
          calcStatusText
          usageCount
          status
        }
      }
      placements {
        id
        elementId
        element {
          id
          name
          code
        }
        dayIndex
        orderIndex
        startLabel
      }
    }
  }
`;

const JOURNEYS_QUERY = gql`
  query CatalogJourneys {
    catalogJourneys {
      id
      code
      name
      version
      nightCount
      dayCount
      calcStatusText
      status
      placements {
        id
        blockId
        block {
          id
          name
          code
          dayCount
        }
        orderIndex
        dayOffset
      }
    }
  }
`;

const USAGES_QUERY = gql`
  query CatalogElementUsages($elementId: ID!) {
    catalogElementUsages(elementId: $elementId) {
      id
      kind
      name
      code
    }
  }
`;

const LOGS_QUERY = gql`
  query CatalogChangeLogs($targetType: String, $targetId: ID) {
    catalogChangeLogs(targetType: $targetType, targetId: $targetId) {
      id
      actorLabel
      targetType
      targetId
      action
      summary
      createdAt
    }
  }
`;

const CREATE_REGION = gql`
  mutation CreateCatalogRegion($input: CatalogRegionCreateInput!) {
    createCatalogRegion(input: $input) {
      id
    }
  }
`;

const UPDATE_REGION = gql`
  mutation UpdateCatalogRegion($id: ID!, $input: CatalogRegionUpdateInput!) {
    updateCatalogRegion(id: $id, input: $input) {
      id
    }
  }
`;

const CREATE_PLACE = gql`
  mutation CreateCatalogPlace($input: CatalogPlaceCreateInput!) {
    createCatalogPlace(input: $input) {
      id
    }
  }
`;

const UPDATE_PLACE = gql`
  mutation UpdateCatalogPlace($id: ID!, $input: CatalogPlaceUpdateInput!) {
    updateCatalogPlace(id: $id, input: $input) {
      id
    }
  }
`;

const CREATE_ROUTE = gql`
  mutation CreateCatalogRoute($input: CatalogRouteCreateInput!) {
    createCatalogRoute(input: $input) {
      id
    }
  }
`;

const UPDATE_ROUTE = gql`
  mutation UpdateCatalogRoute($id: ID!, $input: CatalogRouteUpdateInput!) {
    updateCatalogRoute(id: $id, input: $input) {
      id
    }
  }
`;

const CREATE_ELEMENT = gql`
  mutation CreateCatalogElement($input: CatalogElementCreateInput!) {
    createCatalogElement(input: $input) {
      id
    }
  }
`;

const UPDATE_ELEMENT = gql`
  mutation UpdateCatalogElement($id: ID!, $input: CatalogElementUpdateInput!) {
    updateCatalogElement(id: $id, input: $input) {
      id
    }
  }
`;

const ADD_SET_ITEM = gql`
  mutation AddCatalogElementSetItem($input: CatalogElementSetItemInput!) {
    addCatalogElementSetItem(input: $input) {
      id
    }
  }
`;

const REMOVE_SET_ITEM = gql`
  mutation RemoveCatalogElementSetItem($id: ID!) {
    removeCatalogElementSetItem(id: $id) {
      id
    }
  }
`;

const CREATE_BLOCK = gql`
  mutation CreateCatalogBlock($input: CatalogBlockCreateInput!) {
    createCatalogBlock(input: $input) {
      id
    }
  }
`;

const UPDATE_BLOCK = gql`
  mutation UpdateCatalogBlock($id: ID!, $input: CatalogBlockUpdateInput!) {
    updateCatalogBlock(id: $id, input: $input) {
      id
    }
  }
`;

const ADD_BLOCK_DAY = gql`
  mutation AddCatalogBlockDay($id: ID!) {
    addCatalogBlockDay(id: $id) {
      id
    }
  }
`;

const ADD_BLOCK_PLACEMENT = gql`
  mutation AddCatalogBlockPlacement($input: CatalogBlockPlacementInput!) {
    addCatalogBlockPlacement(input: $input) {
      id
    }
  }
`;

const REMOVE_BLOCK_PLACEMENT = gql`
  mutation RemoveCatalogBlockPlacement($id: ID!) {
    removeCatalogBlockPlacement(id: $id) {
      id
    }
  }
`;

const CREATE_JOURNEY = gql`
  mutation CreateCatalogJourney($input: CatalogJourneyCreateInput!) {
    createCatalogJourney(input: $input) {
      id
    }
  }
`;

const ADD_JOURNEY_PLACEMENT = gql`
  mutation AddCatalogJourneyPlacement($input: CatalogJourneyPlacementInput!) {
    addCatalogJourneyPlacement(input: $input) {
      id
    }
  }
`;

const REMOVE_JOURNEY_PLACEMENT = gql`
  mutation RemoveCatalogJourneyPlacement($id: ID!) {
    removeCatalogJourneyPlacement(id: $id) {
      id
    }
  }
`;

const BATCH_PLACES = gql`
  mutation BatchUpdateCatalogPlaces($input: CatalogPlaceBatchUpdateInput!) {
    batchUpdateCatalogPlaces(input: $input) {
      id
      ok
      message
    }
  }
`;

const DELETE_PLACES = gql`
  mutation DeleteCatalogPlaces($input: CatalogPlaceDeleteInput!) {
    deleteCatalogPlaces(input: $input) {
      id
      ok
      message
    }
  }
`;

export function useCatalogRegions() {
  return useQuery<{ catalogRegions: CatalogRegionRow[] }>(REGIONS_QUERY);
}

export function useCatalogPlaces() {
  return useQuery<{ catalogPlaces: CatalogPlaceRow[] }>(PLACES_QUERY);
}

export function useCatalogRoutes() {
  return useQuery<{ catalogRoutes: CatalogRouteRow[] }>(ROUTES_QUERY);
}

export function useCatalogElements() {
  return useQuery<{ catalogElements: CatalogElementRow[] }>(ELEMENTS_QUERY);
}

export function useCatalogBlocks() {
  return useQuery<{ catalogBlocks: CatalogBlockRow[] }>(BLOCKS_QUERY);
}

export function useCatalogJourneys() {
  return useQuery<{ catalogJourneys: CatalogJourneyRow[] }>(JOURNEYS_QUERY);
}

export function useCatalogElementUsages(elementId: string | null) {
  return useQuery<{ catalogElementUsages: CatalogUsageRef[] }>(USAGES_QUERY, {
    variables: { elementId },
    skip: !elementId,
  });
}

export function useCatalogChangeLogs(targetType?: string, targetId?: string) {
  return useQuery<{ catalogChangeLogs: CatalogChangeLogRow[] }>(LOGS_QUERY, {
    variables: { targetType, targetId },
  });
}

export function useCreateCatalogRegion() {
  return useMutation(CREATE_REGION, { refetchQueries: [{ query: REGIONS_QUERY }] });
}

export function useUpdateCatalogRegion() {
  return useMutation(UPDATE_REGION, { refetchQueries: [{ query: REGIONS_QUERY }] });
}

export function useCreateCatalogPlace() {
  return useMutation(CREATE_PLACE, { refetchQueries: [{ query: PLACES_QUERY }] });
}

export function useUpdateCatalogPlace() {
  return useMutation(UPDATE_PLACE, { refetchQueries: [{ query: PLACES_QUERY }] });
}

export function useCreateCatalogRoute() {
  return useMutation(CREATE_ROUTE, { refetchQueries: [{ query: ROUTES_QUERY }] });
}

export function useUpdateCatalogRoute() {
  return useMutation(UPDATE_ROUTE, { refetchQueries: [{ query: ROUTES_QUERY }] });
}

export function useCreateCatalogElement() {
  return useMutation(CREATE_ELEMENT, { refetchQueries: [{ query: ELEMENTS_QUERY }] });
}

export function useUpdateCatalogElement() {
  return useMutation(UPDATE_ELEMENT, { refetchQueries: [{ query: ELEMENTS_QUERY }] });
}

export function useAddCatalogElementSetItem() {
  return useMutation(ADD_SET_ITEM, { refetchQueries: [{ query: ELEMENTS_QUERY }] });
}

export function useRemoveCatalogElementSetItem() {
  return useMutation(REMOVE_SET_ITEM, { refetchQueries: [{ query: ELEMENTS_QUERY }] });
}

export function useCreateCatalogBlock() {
  return useMutation(CREATE_BLOCK, { refetchQueries: [{ query: BLOCKS_QUERY }] });
}

export function useUpdateCatalogBlock() {
  return useMutation(UPDATE_BLOCK, { refetchQueries: [{ query: BLOCKS_QUERY }] });
}

export function useAddCatalogBlockDay() {
  return useMutation(ADD_BLOCK_DAY, { refetchQueries: [{ query: BLOCKS_QUERY }] });
}

export function useAddCatalogBlockPlacement() {
  return useMutation(ADD_BLOCK_PLACEMENT, { refetchQueries: [{ query: BLOCKS_QUERY }] });
}

export function useRemoveCatalogBlockPlacement() {
  return useMutation(REMOVE_BLOCK_PLACEMENT, { refetchQueries: [{ query: BLOCKS_QUERY }] });
}

export function useCreateCatalogJourney() {
  return useMutation(CREATE_JOURNEY, { refetchQueries: [{ query: JOURNEYS_QUERY }] });
}

export function useAddCatalogJourneyPlacement() {
  return useMutation(ADD_JOURNEY_PLACEMENT, { refetchQueries: [{ query: JOURNEYS_QUERY }] });
}

export function useRemoveCatalogJourneyPlacement() {
  return useMutation(REMOVE_JOURNEY_PLACEMENT, { refetchQueries: [{ query: JOURNEYS_QUERY }] });
}

export function useBatchUpdateCatalogPlaces() {
  return useMutation(BATCH_PLACES, {
    refetchQueries: [{ query: PLACES_QUERY }, { query: LOGS_QUERY }],
  });
}

export function useDeleteCatalogPlaces() {
  return useMutation(DELETE_PLACES, {
    refetchQueries: [{ query: PLACES_QUERY }, { query: ROUTES_QUERY }, { query: LOGS_QUERY }],
  });
}

export interface CatalogVisitLinkCandidateRow {
  placeId: string;
  name: string;
  code: string;
  distanceM: number;
}

export interface CatalogVisitLinkRow {
  id: string;
  visitId: string;
  projectId: string;
  latitude: number;
  longitude: number;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  description: string | null;
  visitRegion: CatalogVisitRegion | null;
  placeId: string | null;
  place: { id: string; name: string; code: string; regionId: string | null } | null;
  status: CatalogVisitLinkStatus;
  distanceM: number | null;
  reviewReason: CatalogVisitLinkReviewReason | null;
  candidates: CatalogVisitLinkCandidateRow[];
  analyzedAt: string;
}

export interface CatalogVisitLinkAnalyzeResult {
  scanned: number;
  upserted: number;
  auto: number;
  review: number;
  unlinked: number;
  protectedManual: number;
}

const VISIT_LINKS_QUERY = gql`
  query CatalogVisitLinks($statuses: [CatalogVisitLinkStatus!], $regionId: ID, $projectId: ID) {
    catalogVisitLinks(statuses: $statuses, regionId: $regionId, projectId: $projectId) {
      id
      visitId
      projectId
      latitude
      longitude
      startedAt
      endedAt
      durationMs
      description
      visitRegion
      placeId
      place {
        id
        name
        code
        regionId
      }
      status
      distanceM
      reviewReason
      candidates {
        placeId
        name
        code
        distanceM
      }
      analyzedAt
    }
  }
`;

const ANALYZE_VISIT_LINKS = gql`
  mutation AnalyzeCatalogVisitLinks($input: CatalogVisitLinkAnalyzeInput) {
    analyzeCatalogVisitLinks(input: $input) {
      scanned
      upserted
      auto
      review
      unlinked
      protectedManual
    }
  }
`;

const CONFIRM_VISIT_LINK = gql`
  mutation ConfirmCatalogVisitLink($input: CatalogVisitLinkConfirmInput!) {
    confirmCatalogVisitLink(input: $input) {
      id
      status
      placeId
    }
  }
`;

const CLEAR_VISIT_LINK = gql`
  mutation ClearCatalogVisitLink($id: ID!) {
    clearCatalogVisitLink(id: $id) {
      id
      status
      placeId
    }
  }
`;

export function useCatalogVisitLinks(variables: {
  statuses?: CatalogVisitLinkStatus[];
  regionId?: string | null;
  projectId?: string | null;
}) {
  return useQuery<{ catalogVisitLinks: CatalogVisitLinkRow[] }>(VISIT_LINKS_QUERY, {
    variables,
    skip: !variables.regionId && !variables.projectId,
  });
}

export function useAnalyzeCatalogVisitLinks() {
  return useMutation<{ analyzeCatalogVisitLinks: CatalogVisitLinkAnalyzeResult }>(ANALYZE_VISIT_LINKS);
}

export function useConfirmCatalogVisitLink() {
  return useMutation(CONFIRM_VISIT_LINK);
}

export function useClearCatalogVisitLink() {
  return useMutation(CLEAR_VISIT_LINK);
}

const ROUTE_OBSERVATIONS_QUERY = gql`
  query CatalogRouteObservations($regionId: ID, $projectId: ID, $routeId: ID) {
    catalogRouteObservations(regionId: $regionId, projectId: $projectId, routeId: $routeId) {
      id
      fromVisitLinkId
      toVisitLinkId
      projectId
      fromPlaceId
      fromPlace {
        id
        name
        code
      }
      toPlaceId
      toPlace {
        id
        name
        code
      }
      routeId
      route {
        id
        code
        name
      }
      departedAt
      arrivedAt
      elapsedMs
      distanceKm
      maxGapMinutes
      includeDistance
      includeElapsed
      status
      holdReason
      path {
        lat
        lng
        at
      }
      analyzedAt
    }
  }
`;

const ANALYZE_ROUTE_OBSERVATIONS = gql`
  mutation AnalyzeCatalogRouteObservations($input: CatalogRouteObservationAnalyzeInput) {
    analyzeCatalogRouteObservations(input: $input) {
      scanned
      upserted
      routeCreated
      held
      protectedHold
    }
  }
`;

export function useCatalogRouteObservations(variables: {
  regionId?: string | null;
  projectId?: string | null;
  routeId?: string | null;
}) {
  return useQuery<{ catalogRouteObservations: CatalogRouteObservationRow[] }>(ROUTE_OBSERVATIONS_QUERY, {
    variables,
    skip: !variables.regionId && !variables.projectId && !variables.routeId,
  });
}

export function useAnalyzeCatalogRouteObservations() {
  return useMutation<{ analyzeCatalogRouteObservations: CatalogRouteObservationAnalyzeResult }>(
    ANALYZE_ROUTE_OBSERVATIONS,
  );
}
