import { gql, useMutation, useQuery } from '@apollo/client';
import type { Location, MealOption } from '../../generated/graphql';

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

export function useLocationCrud() {
  const { data, loading, refetch } = useQuery<Record<string, Location[]>>(LIST);
  const [createProfileMutation] = useMutation(CREATE_PROFILE);
  const [deleteMutation] = useMutation(REMOVE);

  return {
    rows: data?.locations ?? [],
    loading,
    createProfile: async (input: LocationProfileFormInput) => {
      await createProfileMutation({
        variables: {
          input: {
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
          },
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
