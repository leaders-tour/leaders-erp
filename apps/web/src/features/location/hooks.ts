import { gql, useMutation, useQuery } from '@apollo/client';
import type { MealOption } from '../../generated/graphql';
import { normalizeLocationNameLines } from './display';

export type FacilityAvailability = 'YES' | 'LIMITED' | 'NO';

const LIST = gql`
  query Locations {
    locations {
      id
      regionId
      regionName
      name
      isFirstDayEligible
      isLastDayEligible
      defaultVersionId
      defaultVersion {
        id
        versionNumber
        label
        firstDayTimeBlocks {
          id
          profile
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        firstDayEarlyTimeBlocks {
          id
          profile
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
      }
      lodgings {
        id
        name
        hasElectricity
        hasShower
        hasInternet
      }
      mealSets {
        id
        breakfast
        lunch
        dinner
      }
      guide {
        id
        title
        description
        imageUrls
        locationId
        updatedAt
      }
    }
  }
`;

const CREATE_PROFILE = gql`
  mutation CreateLocationProfile($input: LocationProfileCreateInput!) {
    createLocationProfile(input: $input) {
      id
    }
  }
`;

const CREATE_VERSION = gql`
  mutation CreateLocationVariation($input: LocationVersionCreateInput!) {
    createLocationVariation(input: $input) {
      id
      locationId
      versionNumber
      label
      changeNote
    }
  }
`;

const SET_DEFAULT_VERSION = gql`
  mutation SetDefaultLocationVersion($locationId: ID!, $versionId: ID!) {
    setDefaultLocationVersion(locationId: $locationId, versionId: $versionId) {
      id
      defaultVersionId
    }
  }
`;

const UPDATE_PROFILE = gql`
  mutation UpdateLocationProfile($id: ID!, $input: LocationProfileUpdateInput!) {
    updateLocationProfile(id: $id, input: $input) {
      id
    }
  }
`;

const DETAIL = gql`
  query LocationDetail($id: ID!) {
    location(id: $id) {
      id
      regionId
      regionName
      name
      isFirstDayEligible
      isLastDayEligible
      defaultVersionId
      createdAt
      updatedAt
      defaultVersion {
        id
        versionNumber
        label
        firstDayTimeBlocks {
          id
          profile
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        firstDayEarlyTimeBlocks {
          id
          profile
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
      }
      variations {
        id
        locationId
        versionNumber
        label
        changeNote
        locationNameSnapshot
        regionNameSnapshot
        defaultLodgingType
        firstDayAverageDistanceKm
        firstDayAverageTravelHours
        firstDayMovementIntensity
        createdAt
        updatedAt
      }
      lodgings {
        id
        name
        hasElectricity
        hasShower
        hasInternet
      }
      mealSets {
        id
        breakfast
        lunch
        dinner
      }
    }
    segments {
      id
      fromLocationId
      toLocationId
      averageDistanceKm
      averageTravelHours
      fromLocation {
        id
        name
      }
      toLocation {
        id
        name
      }
    }
  }
`;

const VERSION_DETAIL = gql`
  query LocationVariationDetail($id: ID!) {
    locationVariation(id: $id) {
      id
      locationId
      versionNumber
      label
      changeNote
      locationNameSnapshot
      regionNameSnapshot
      defaultLodgingType
      firstDayAverageDistanceKm
      firstDayAverageTravelHours
      firstDayMovementIntensity
      createdAt
      updatedAt
      location {
        id
        name
        regionId
        regionName
        isFirstDayEligible
        isLastDayEligible
        defaultVersionId
      }
      firstDayTimeBlocks {
        id
        profile
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      firstDayEarlyTimeBlocks {
        id
        profile
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      lodgings {
        id
        name
        hasElectricity
        hasShower
        hasInternet
      }
      mealSets {
        id
        breakfast
        lunch
        dinner
      }
    }
  }
`;

const REMOVE = gql`
  mutation DeleteLocation($id: ID!) {
    deleteLocation(id: $id)
  }
`;

export interface LocationProfileTimeSlotFormInput {
  startTime: string;
  activities: string[];
}

export interface LocationProfileFormInput {
  regionId: string;
  name: string[];
  isFirstDayEligible: boolean;
  isLastDayEligible: boolean;
  firstDayTimeSlots: LocationProfileTimeSlotFormInput[];
  firstDayEarlyTimeSlots: LocationProfileTimeSlotFormInput[];
  firstDayAverageDistanceKm: string;
  firstDayAverageTravelHours: string;
  lodging: {
    isUnspecified: boolean;
    name: string;
    hasElectricity: FacilityAvailability;
    hasShower: FacilityAvailability;
    hasInternet: FacilityAvailability;
  };
  meals: {
    breakfast: MealOption | null;
    lunch: MealOption | null;
    dinner: MealOption | null;
  };
}

export interface LocationVersionProfileFormInput {
  firstDayTimeSlots: LocationProfileTimeSlotFormInput[];
  firstDayEarlyTimeSlots: LocationProfileTimeSlotFormInput[];
  firstDayAverageDistanceKm: string;
  firstDayAverageTravelHours: string;
  lodging: {
    isUnspecified: boolean;
    name: string;
    hasElectricity: FacilityAvailability;
    hasShower: FacilityAvailability;
    hasInternet: FacilityAvailability;
  };
  meals: {
    breakfast: MealOption | null;
    lunch: MealOption | null;
    dinner: MealOption | null;
  };
}

export interface LocationListRow {
  id: string;
  regionId: string;
  regionName: string;
  name: string[];
  isFirstDayEligible: boolean;
  isLastDayEligible: boolean;
  defaultVersionId: string | null;
  defaultVersion: {
    id: string;
    versionNumber: number;
    label: string;
    firstDayTimeBlocks: Array<{
      id: string;
      profile: 'DEFAULT' | 'FIRST_DAY' | 'FIRST_DAY_EARLY';
      startTime: string;
      orderIndex: number;
      activities: Array<{
        id: string;
        description: string;
        orderIndex: number;
      }>;
    }>;
    firstDayEarlyTimeBlocks: Array<{
      id: string;
      profile: 'DEFAULT' | 'FIRST_DAY' | 'FIRST_DAY_EARLY';
      startTime: string;
      orderIndex: number;
      activities: Array<{
        id: string;
        description: string;
        orderIndex: number;
      }>;
    }>;
  } | null;
  lodgings: Array<{
    id: string;
    name: string;
    hasElectricity: FacilityAvailability;
    hasShower: FacilityAvailability;
    hasInternet: FacilityAvailability;
  }>;
  mealSets: Array<{
    id: string;
    breakfast: MealOption | null;
    lunch: MealOption | null;
    dinner: MealOption | null;
  }>;
}

export interface LocationVersionRow {
  id: string;
  locationId: string;
  versionNumber: number;
  label: string;
  changeNote: string | null;
  locationNameSnapshot: string[];
  regionNameSnapshot: string;
  defaultLodgingType: string;
  firstDayAverageDistanceKm: number | null;
  firstDayAverageTravelHours: number | null;
  firstDayMovementIntensity: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5' | null;
  createdAt: string;
  updatedAt: string;
  firstDayTimeBlocks: Array<{
    id: string;
    profile: 'DEFAULT' | 'FIRST_DAY' | 'FIRST_DAY_EARLY';
    startTime: string;
    orderIndex: number;
    activities: Array<{
      id: string;
      description: string;
      orderIndex: number;
    }>;
  }>;
  firstDayEarlyTimeBlocks: Array<{
    id: string;
    profile: 'DEFAULT' | 'FIRST_DAY' | 'FIRST_DAY_EARLY';
    startTime: string;
    orderIndex: number;
    activities: Array<{
      id: string;
      description: string;
      orderIndex: number;
    }>;
  }>;
  lodgings: Array<{
    id: string;
    name: string;
    hasElectricity: FacilityAvailability;
    hasShower: FacilityAvailability;
    hasInternet: FacilityAvailability;
  }>;
  mealSets: Array<{
    id: string;
    breakfast: MealOption | null;
    lunch: MealOption | null;
    dinner: MealOption | null;
  }>;
}

export interface LocationVersionDetailRow extends LocationVersionRow {
  location: {
    id: string;
    name: string[];
    regionId: string;
    regionName: string;
    isFirstDayEligible: boolean;
    isLastDayEligible: boolean;
    defaultVersionId: string | null;
  };
}

export interface LocationDetailItem extends LocationListRow {
  variations: Array<{
    id: string;
    locationId: string;
    versionNumber: number;
    label: string;
    changeNote: string | null;
    locationNameSnapshot: string[];
    regionNameSnapshot: string;
    defaultLodgingType: string;
    firstDayAverageDistanceKm: number | null;
    firstDayAverageTravelHours: number | null;
    firstDayMovementIntensity: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5' | null;
    createdAt: string;
    updatedAt: string;
  }>;
  guide: {
    id: string;
    title: string;
    description: string;
    imageUrls: string[];
    locationId: string | null;
    updatedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocationDetailData {
  location: LocationDetailItem | null;
  segments: Array<{
    id: string;
    fromLocationId: string;
    toLocationId: string;
    averageDistanceKm: number;
    averageTravelHours: number;
    fromLocation: { id: string; name: string[] };
    toLocation: { id: string; name: string[] };
  }>;
}

function toProfileBody(input: LocationVersionProfileFormInput) {
  const firstDayAverageDistanceKm = input.firstDayAverageDistanceKm.trim();
  const firstDayAverageTravelHours = input.firstDayAverageTravelHours.trim();

  return {
    firstDayTimeSlots: input.firstDayTimeSlots.map((slot) => ({
      startTime: slot.startTime.trim(),
      activities: slot.activities
        .map((activity) => activity.trim())
        .filter((activity) => activity.length > 0),
    })),
    firstDayEarlyTimeSlots: input.firstDayEarlyTimeSlots.map((slot) => ({
      startTime: slot.startTime.trim(),
      activities: slot.activities
        .map((activity) => activity.trim())
        .filter((activity) => activity.length > 0),
    })),
    firstDayAverageDistanceKm: firstDayAverageDistanceKm.length > 0 ? Number(firstDayAverageDistanceKm) : undefined,
    firstDayAverageTravelHours: firstDayAverageTravelHours.length > 0 ? Number(firstDayAverageTravelHours) : undefined,
    lodging: {
      ...input.lodging,
      name: input.lodging.name.trim(),
    },
    meals: {
      breakfast: input.meals.breakfast ?? null,
      lunch: input.meals.lunch ?? null,
      dinner: input.meals.dinner ?? null,
    },
  };
}

function toProfileVariables(input: LocationProfileFormInput) {
  return {
    regionId: input.regionId,
    name: normalizeLocationNameLines(input.name),
    isFirstDayEligible: input.isFirstDayEligible,
    isLastDayEligible: input.isLastDayEligible,
    ...toProfileBody(input),
  };
}

export function useLocationCrud() {
  const { data, loading, refetch } = useQuery<Record<string, LocationListRow[]>>(LIST);
  const [createProfileMutation] = useMutation(CREATE_PROFILE);
  const [createVersionMutation] = useMutation(CREATE_VERSION);
  const [setDefaultVersionMutation] = useMutation(SET_DEFAULT_VERSION);
  const [updateProfileMutation] = useMutation(UPDATE_PROFILE);
  const [deleteMutation] = useMutation(REMOVE);

  return {
    rows: data?.locations ?? [],
    loading,
    createProfile: async (input: LocationProfileFormInput) => {
      await createProfileMutation({
        variables: {
          input: toProfileVariables(input),
        },
      });
      await refetch();
    },
    createVersion: async (input: {
      locationId: string;
      sourceVersionId?: string;
      label: string;
      changeNote?: string;
      isFirstDayEligible?: boolean;
      isLastDayEligible?: boolean;
      profile: LocationVersionProfileFormInput;
    }) => {
      const result = await createVersionMutation({
        variables: {
          input: {
            locationId: input.locationId,
            sourceVersionId: input.sourceVersionId,
            label: input.label,
            changeNote: input.changeNote,
            isFirstDayEligible: input.isFirstDayEligible,
            isLastDayEligible: input.isLastDayEligible,
            profile: toProfileBody(input.profile),
          },
        },
      });
      await refetch();
      return result.data?.createLocationVariation as { id: string; locationId: string; versionNumber: number; label: string } | undefined;
    },
    setDefaultVersion: async (locationId: string, versionId: string) => {
      await setDefaultVersionMutation({
        variables: { locationId, versionId },
      });
      await refetch();
    },
    updateProfile: async (id: string, input: LocationProfileFormInput) => {
      await updateProfileMutation({
        variables: {
          id,
          input: toProfileVariables(input),
        },
      });
      await refetch();
    },
    deleteRow: async (id: string) => {
      await deleteMutation({ variables: { id } });
      await refetch();
    },
  };
}

export function useLocationDetail(id: string | undefined) {
  const { data, loading, refetch } = useQuery<LocationDetailData>(DETAIL, {
    variables: { id },
    skip: !id,
  });

  return {
    location: data?.location ?? null,
    segments: data?.segments ?? [],
    loading,
    refetch,
  };
}

export function useLocationVersionDetail(id: string | undefined) {
  const { data, loading, refetch } = useQuery<{ locationVariation: LocationVersionDetailRow | null }>(VERSION_DETAIL, {
    variables: { id },
    skip: !id,
  });

  return {
    version: data?.locationVariation ?? null,
    loading,
    refetch,
  };
}
