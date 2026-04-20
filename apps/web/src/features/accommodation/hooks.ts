import { gql, useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { useAuth } from '../auth/context';
import { runUploadMutation } from '../../lib/upload-mutation';

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
  bookingPriority: string | null;
  googleMapsUrl: string | null;
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
  phone: string | null;
  facilities: string | null;
  bookingMethod: string | null;
  openingDate: string | null;
  closingDate: string | null;
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
    bookingPriority
    googleMapsUrl
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
    phone
    facilities
    bookingMethod
    openingDate
    closingDate
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

const CREATE_ACCOMMODATION_MUTATION = gql`
  ${ACCOMMODATION_FRAGMENT}
  mutation CreateAccommodation($input: AccommodationCreateInput!) {
    createAccommodation(input: $input) {
      ...AccommodationFields
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

const CREATE_ACCOMMODATION_OPTION_MUTATION = gql`
  ${OPTION_FRAGMENT}
  mutation CreateAccommodationOption($input: AccommodationOptionCreateInput!) {
    createAccommodationOption(input: $input) {
      ...OptionFields
    }
  }
`;

const DELETE_ACCOMMODATION_MUTATION = gql`
  mutation DeleteAccommodation($id: ID!) {
    deleteAccommodation(id: $id)
  }
`;

const DELETE_ACCOMMODATION_OPTION_MUTATION = gql`
  mutation DeleteAccommodationOption($id: ID!) {
    deleteAccommodationOption(id: $id)
  }
`;

const OPTION_FIELDS = `
  id accommodationId roomType level priceOffSeason pricePeakSeason paymentMethod
  mealCostPerServing capacity mealIncluded bookingPriority
  googleMapsUrl imageUrls note createdAt updatedAt
`;

const UPLOAD_OPTION_IMAGES_MUTATION_STR = `
  mutation UploadAccommodationOptionImages($id: ID!, $images: [Upload!]!) {
    uploadAccommodationOptionImages(id: $id, images: $images) {
      ${OPTION_FIELDS}
    }
  }
`;

const REMOVE_OPTION_IMAGE_MUTATION = gql`
  ${OPTION_FRAGMENT}
  mutation RemoveAccommodationOptionImage($id: ID!, $imageUrl: String!) {
    removeAccommodationOptionImage(id: $id, imageUrl: $imageUrl) {
      ...OptionFields
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

export function useCreateAccommodation() {
  const [mutate, { loading }] = useMutation<{ createAccommodation: AccommodationRow }>(
    CREATE_ACCOMMODATION_MUTATION,
  );
  return {
    loading,
    createAccommodation: async (input: {
      name: string;
      destination: string;
      region: string;
      phone?: string | null;
      facilities?: string | null;
      bookingMethod?: string | null;
      openingDate?: string | null;
      closingDate?: string | null;
    }) => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: ACCOMMODATIONS_QUERY }],
      });
      if (!result.data?.createAccommodation) throw new Error('Create failed');
      return result.data.createAccommodation;
    },
  };
}

export function useUpdateAccommodation() {
  const [mutate, { loading }] = useMutation<{ updateAccommodation: AccommodationRow }>(
    UPDATE_ACCOMMODATION_MUTATION,
  );
  return {
    loading,
    updateAccommodation: async (
      id: string,
      input: Partial<Pick<AccommodationRow, 'name' | 'destination' | 'region' | 'phone' | 'facilities' | 'bookingMethod' | 'openingDate' | 'closingDate'>>,
    ) => {
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

export function useCreateAccommodationOption() {
  const [mutate, { loading }] = useMutation<{ createAccommodationOption: AccommodationOption }>(
    CREATE_ACCOMMODATION_OPTION_MUTATION,
  );
  return {
    loading,
    createOption: async (input: {
      accommodationId: string;
      roomType: string;
      level?: AccommodationLevel;
      priceOffSeason?: number | null;
      pricePeakSeason?: number | null;
      paymentMethod?: PaymentMethod | null;
      mealCostPerServing?: number | null;
      capacity?: string | null;
      mealIncluded?: boolean;
      bookingPriority?: string | null;
      googleMapsUrl?: string | null;
      note?: string | null;
    }) => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: ACCOMMODATION_QUERY, variables: { id: input.accommodationId } }],
      });
      if (!result.data?.createAccommodationOption) throw new Error('Create failed');
      return result.data.createAccommodationOption;
    },
  };
}

export function useDeleteAccommodation() {
  const [mutate, { loading }] = useMutation<{ deleteAccommodation: boolean }>(
    DELETE_ACCOMMODATION_MUTATION,
  );
  return {
    loading,
    deleteAccommodation: async (id: string) => {
      await mutate({
        variables: { id },
        refetchQueries: [{ query: ACCOMMODATIONS_QUERY }],
      });
    },
  };
}

export function useDeleteAccommodationOption() {
  const [mutate, { loading }] = useMutation<{ deleteAccommodationOption: boolean }>(
    DELETE_ACCOMMODATION_OPTION_MUTATION,
  );
  return {
    loading,
    deleteOption: async (id: string, accommodationId: string) => {
      await mutate({
        variables: { id },
        refetchQueries: [{ query: ACCOMMODATION_QUERY, variables: { id: accommodationId } }],
      });
    },
  };
}

export function useUploadAccommodationOptionImages() {
  const { ensureAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  return {
    loading,
    uploadImages: async (id: string, _accommodationId: string, images: File[]) => {
      setLoading(true);
      try {
        const accessToken = await ensureAccessToken();
        const data = await runUploadMutation<{ uploadAccommodationOptionImages: AccommodationOption }>(
          UPLOAD_OPTION_IMAGES_MUTATION_STR,
          { id, images: images.map(() => null) },
          images,
          images.map((_, i) => `variables.images.${i}`),
          accessToken,
        );
        return data.uploadAccommodationOptionImages;
      } finally {
        setLoading(false);
      }
    },
  };
}

export function useRemoveAccommodationOptionImage() {
  const [mutate, { loading }] = useMutation<{ removeAccommodationOptionImage: AccommodationOption }>(
    REMOVE_OPTION_IMAGE_MUTATION,
  );
  return {
    loading,
    removeImage: async (id: string, accommodationId: string, imageUrl: string) => {
      const result = await mutate({
        variables: { id, imageUrl },
        refetchQueries: [{ query: ACCOMMODATION_QUERY, variables: { id: accommodationId } }],
      });
      if (!result.data?.removeAccommodationOptionImage) throw new Error('Remove failed');
      return result.data.removeAccommodationOptionImage;
    },
  };
}
