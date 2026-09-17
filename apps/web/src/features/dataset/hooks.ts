import { gql, useMutation, useQuery } from '@apollo/client';
import type {
  CatalogBlockShape,
  CatalogElementComposition,
  CatalogElementKind,
  CatalogPlaceType,
  CatalogUsageStatus,
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
  status: CatalogUsageStatus;
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
  usageCount: number;
  status: CatalogUsageStatus;
  setItems: Array<{ id: string; orderIndex: number; memberElement: { id: string; name: string; code: string } }>;
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
    memberBlock: Omit<CatalogBlockRow, 'setItems'>;
  }>;
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

const CREATE_ELEMENT = gql`
  mutation CreateCatalogElement($input: CatalogElementCreateInput!) {
    createCatalogElement(input: $input) {
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

export function useCreateCatalogPlace() {
  return useMutation(CREATE_PLACE, { refetchQueries: [{ query: PLACES_QUERY }] });
}

export function useCreateCatalogElement() {
  return useMutation(CREATE_ELEMENT, { refetchQueries: [{ query: ELEMENTS_QUERY }] });
}

export function useCreateCatalogBlock() {
  return useMutation(CREATE_BLOCK, { refetchQueries: [{ query: BLOCKS_QUERY }] });
}
