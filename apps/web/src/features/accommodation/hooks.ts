import { gql, useMutation, useQuery } from '@apollo/client';

export type AccommodationLevel = 'LV2' | 'LV3' | 'LV4' | 'LV5';
export type PaymentMethod = 'PER_PERSON' | 'PER_ROOM';

export interface AccommodationOption {
  id: string;
  accommodationId: string;
  roomType: string;
  level: AccommodationLevel;
  priceOffSeason: number | null;
  pricePeakSeason: number | null;
  paymentMethod: PaymentMethod | null;
  mealCostPerServing: number | null;
  capacity: string | null;
  mealIncluded: boolean;
  facilities: string | null;
  bookingPriority: string | null;
  bookingMethod: string | null;
  phone: string | null;
  googleMapsUrl: string | null;
  openingDate: string | null;
  closingDate: string | null;
  imageUrls: string[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccommodationRow {
  id: string;
  name: string;
  destination: string;
  region: string;
  options: AccommodationOption[];
  createdAt: string;
  updatedAt: string;
}

const OPTION_FRAGMENT = gql`
  fragment OptionFields on AccommodationOption {
    id
    accommodationId
    roomType
    level
    priceOffSeason
    pricePeakSeason
    paymentMethod
    mealCostPerServing
    capacity
    mealIncluded
    facilities
    bookingPriority
    bookingMethod
    phone
    googleMapsUrl
    openingDate
    closingDate
    imageUrls
    note
    createdAt
    updatedAt
  }
`;

const ACCOMMODATION_FRAGMENT = gql`
  ${OPTION_FRAGMENT}
  fragment AccommodationFields on Accommodation {
    id
    name
    destination
    region
    options {
      ...OptionFields
    }
    createdAt
    updatedAt
  }
`;

const ACCOMMODATIONS_QUERY = gql`
  ${ACCOMMODATION_FRAGMENT}
  query Accommodations($region: String, $destination: String, $level: AccommodationLevel) {
    accommodations(region: $region, destination: $destination, level: $level) {
      ...AccommodationFields
    }
  }
`;

const ACCOMMODATION_QUERY = gql`
  ${ACCOMMODATION_FRAGMENT}
  query Accommodation($id: ID!) {
    accommodation(id: $id) {
      ...AccommodationFields
    }
  }
`;

const UPDATE_OPTION_MUTATION = gql`
  ${OPTION_FRAGMENT}
  mutation UpdateAccommodationOption($id: ID!, $input: AccommodationOptionUpdateInput!) {
    updateAccommodationOption(id: $id, input: $input) {
      ...OptionFields
    }
  }
`;

const UPDATE_ACCOMMODATION_MUTATION = gql`
  ${ACCOMMODATION_FRAGMENT}
  mutation UpdateAccommodation($id: ID!, $input: AccommodationUpdateInput!) {
    updateAccommodation(id: $id, input: $input) {
      ...AccommodationFields
    }
  }
`;

export function useAccommodations(filters?: {
  region?: string;
  destination?: string;
  level?: AccommodationLevel;
}) {
  const { data, loading, refetch } = useQuery<{ accommodations: AccommodationRow[] }>(
    ACCOMMODATIONS_QUERY,
    {
      variables: {
        region: filters?.region,
        destination: filters?.destination,
        level: filters?.level,
      },
      fetchPolicy: 'cache-and-network',
    },
  );
  return { accommodations: data?.accommodations ?? [], loading, refetch };
}

export function useAccommodation(id: string | undefined) {
  const { data, loading, refetch } = useQuery<{ accommodation: AccommodationRow }>(
    ACCOMMODATION_QUERY,
    { variables: { id }, skip: !id },
  );
  return { accommodation: data?.accommodation ?? null, loading, refetch };
}

export function useUpdateAccommodation() {
  const [mutate, { loading }] = useMutation<{ updateAccommodation: AccommodationRow }>(
    UPDATE_ACCOMMODATION_MUTATION,
  );
  return {
    loading,
    updateAccommodation: async (id: string, input: Partial<Pick<AccommodationRow, 'name' | 'destination' | 'region'>>) => {
      const result = await mutate({
        variables: { id, input },
        refetchQueries: [{ query: ACCOMMODATION_QUERY, variables: { id } }],
      });
      return result.data?.updateAccommodation;
    },
  };
}

export function useUpdateAccommodationOption() {
  const [mutate, { loading }] = useMutation<{ updateAccommodationOption: AccommodationOption }>(
    UPDATE_OPTION_MUTATION,
  );
  return {
    loading,
    updateOption: async (
      id: string,
      accommodationId: string,
      input: Partial<Omit<AccommodationOption, 'id' | 'accommodationId' | 'createdAt' | 'updatedAt'>>,
    ) => {
      const result = await mutate({
        variables: { id, input },
        refetchQueries: [{ query: ACCOMMODATION_QUERY, variables: { id: accommodationId } }],
      });
      return result.data?.updateAccommodationOption;
    },
  };
}
