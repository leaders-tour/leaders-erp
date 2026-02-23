import { gql, useMutation, useQuery } from '@apollo/client';
import type { MealOption } from '../../generated/graphql';

export type FacilityAvailability = 'YES' | 'LIMITED' | 'NO';

const LIST = gql`
  query Locations {
    locations {
      id
      regionId
      regionName
      name
      currentVersionId
      currentVersion {
        id
        versionNumber
        label
      }
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

const CREATE_VERSION = gql`
  mutation CreateLocationVersion($input: LocationVersionCreateInput!) {
    createLocationVersion(input: $input) {
      id
      locationId
      versionNumber
      label
      changeNote
    }
  }
`;

const SET_CURRENT_VERSION = gql`
  mutation SetCurrentLocationVersion($locationId: ID!, $versionId: ID!) {
    setCurrentLocationVersion(locationId: $locationId, versionId: $versionId) {
      id
      currentVersionId
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
      currentVersionId
      internalMovementDistance
      createdAt
      updatedAt
      currentVersion {
        id
        versionNumber
        label
      }
      versions {
        id
        locationId
        parentVersionId
        versionNumber
        label
        changeNote
        locationNameSnapshot
        regionNameSnapshot
        internalMovementDistance
        defaultLodgingType
        createdAt
        updatedAt
      }
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

const VERSION_DETAIL = gql`
  query LocationVersionDetail($id: ID!) {
    locationVersion(id: $id) {
      id
      locationId
      parentVersionId
      versionNumber
      label
      changeNote
      locationNameSnapshot
      regionNameSnapshot
      internalMovementDistance
      defaultLodgingType
      createdAt
      updatedAt
      location {
        id
        name
        regionId
        regionName
        currentVersionId
      }
      parentVersion {
        id
        versionNumber
        label
      }
      timeBlocks {
        id
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
  name: string;
  internalMovementDistance: number | null;
  timeSlots: LocationProfileTimeSlotFormInput[];
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
  internalMovementDistance: number | null;
  timeSlots: LocationProfileTimeSlotFormInput[];
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
  name: string;
  currentVersionId: string | null;
  currentVersion: {
    id: string;
    versionNumber: number;
    label: string;
  } | null;
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
  parentVersionId: string | null;
  versionNumber: number;
  label: string;
  changeNote: string | null;
  locationNameSnapshot: string;
  regionNameSnapshot: string;
  internalMovementDistance: number | null;
  defaultLodgingType: string;
  createdAt: string;
  updatedAt: string;
  timeBlocks: Array<{
    id: string;
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
    name: string;
    regionId: string;
    regionName: string;
    currentVersionId: string | null;
  };
  parentVersion: {
    id: string;
    versionNumber: number;
    label: string;
  } | null;
}

export interface LocationDetailItem extends LocationListRow {
  versions: Array<{
    id: string;
    locationId: string;
    parentVersionId: string | null;
    versionNumber: number;
    label: string;
    changeNote: string | null;
    locationNameSnapshot: string;
    regionNameSnapshot: string;
    internalMovementDistance: number | null;
    defaultLodgingType: string;
    createdAt: string;
    updatedAt: string;
  }>;
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

function toProfileBody(input: LocationVersionProfileFormInput) {
  return {
    internalMovementDistance:
      typeof input.internalMovementDistance === 'number' && Number.isFinite(input.internalMovementDistance)
        ? input.internalMovementDistance
        : null,
    lodging: {
      ...input.lodging,
      name: input.lodging.name.trim(),
    },
    meals: {
      breakfast: input.meals.breakfast ?? null,
      lunch: input.meals.lunch ?? null,
      dinner: input.meals.dinner ?? null,
    },
    timeSlots: input.timeSlots.map((slot) => ({
      startTime: slot.startTime.trim(),
      activities: slot.activities
        .map((activity) => activity.trim())
        .filter((activity) => activity.length > 0),
    })),
  };
}

function toProfileVariables(input: LocationProfileFormInput) {
  return {
    regionId: input.regionId,
    name: input.name.trim(),
    ...toProfileBody(input),
  };
}

export function useLocationCrud() {
  const { data, loading, refetch } = useQuery<Record<string, LocationListRow[]>>(LIST);
  const [createProfileMutation] = useMutation(CREATE_PROFILE);
  const [createVersionMutation] = useMutation(CREATE_VERSION);
  const [setCurrentVersionMutation] = useMutation(SET_CURRENT_VERSION);
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
      parentVersionId?: string;
      label: string;
      changeNote?: string;
      profile: LocationVersionProfileFormInput;
    }) => {
      const result = await createVersionMutation({
        variables: {
          input: {
            locationId: input.locationId,
            parentVersionId: input.parentVersionId,
            label: input.label,
            changeNote: input.changeNote,
            profile: toProfileBody(input.profile),
          },
        },
      });
      await refetch();
      return result.data?.createLocationVersion as { id: string; locationId: string; versionNumber: number; label: string } | undefined;
    },
    setCurrentVersion: async (locationId: string, versionId: string) => {
      await setCurrentVersionMutation({
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
  const { data, loading, refetch } = useQuery<{ locationVersion: LocationVersionDetailRow | null }>(VERSION_DETAIL, {
    variables: { id },
    skip: !id,
  });

  return {
    version: data?.locationVersion ?? null,
    loading,
    refetch,
  };
}
