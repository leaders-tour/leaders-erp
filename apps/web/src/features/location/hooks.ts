import { gql, useMutation, useQuery } from '@apollo/client';
import type { MealOption } from '../../generated/graphql';

const LIST = gql`
  query Locations {
    locations {
      id
      regionId
      regionName
      name
      timeBlocks {
        id
        startTime
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

const CREATE_PROFILE = gql`
  mutation CreateLocationProfile($input: LocationProfileCreateInput!) {
    createLocationProfile(input: $input) {
      id
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
      internalMovementDistance
      createdAt
      updatedAt
      timeBlocks {
        id
        startTime
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
  name: string;
  internalMovementDistance: number | null;
  timeSlots: LocationProfileTimeSlotFormInput[];
  lodging: {
    isUnspecified: boolean;
    name: string;
    hasElectricity: boolean;
    hasShower: boolean;
    hasInternet: boolean;
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
  name: string;
  timeBlocks: Array<{
    id: string;
    startTime: string;
    activities: Array<{
      id: string;
      description: string;
      orderIndex: number;
    }>;
  }>;
  lodgings: Array<{
    id: string;
    name: string;
    hasElectricity: boolean;
    hasShower: boolean;
    hasInternet: boolean;
  }>;
  mealSets: Array<{
    id: string;
    breakfast: MealOption | null;
    lunch: MealOption | null;
    dinner: MealOption | null;
  }>;
}

export interface LocationDetailItem extends LocationListRow {
  internalMovementDistance: number | null;
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
    fromLocation: { id: string; name: string };
    toLocation: { id: string; name: string };
  }>;
}

function toProfileVariables(input: LocationProfileFormInput) {
  return {
    ...input,
    name: input.name.trim(),
    internalMovementDistance:
      typeof input.internalMovementDistance === 'number' && Number.isFinite(input.internalMovementDistance)
        ? input.internalMovementDistance
        : null,
    lodging: {
      ...input.lodging,
      name: input.lodging.name.trim(),
    },
    timeSlots: input.timeSlots.map((slot) => ({
      startTime: slot.startTime.trim(),
      activities: slot.activities
        .map((activity) => activity.trim())
        .filter((activity) => activity.length > 0),
    })),
  };
}

export function useLocationCrud() {
  const { data, loading, refetch } = useQuery<Record<string, LocationListRow[]>>(LIST);
  const [createProfileMutation] = useMutation(CREATE_PROFILE);
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
