import { gql, useMutation, useQuery } from '@apollo/client';
import type { Location, MealOption } from '../../generated/graphql';

const LIST = gql`
  query Locations {
    locations {
      id
      regionId
      regionName
      name
      defaultLodgingType
      latitude
      longitude
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

export type FixedSlotTime = '08:00' | '12:00' | '18:00';

export interface LocationProfileTimeSlotFormInput {
  startTime: FixedSlotTime;
  activities: [string, string, string, string];
}

export interface LocationProfileFormInput {
  regionId: string;
  name: string;
  timeSlots: [
    LocationProfileTimeSlotFormInput,
    LocationProfileTimeSlotFormInput,
    LocationProfileTimeSlotFormInput,
  ];
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
            lodging: {
              ...input.lodging,
              name: input.lodging.name.trim(),
            },
            timeSlots: input.timeSlots.map((slot) => ({
              startTime: slot.startTime,
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
