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
  coverImageUrl: string | null;
  phone: string | null;
  facilities: string | null;
  bookingMethod: string | null;
  bookingPriority: string | null;
  openingDate: string | null;
  closingDate: string | null;
  options: AccommodationOption[];
  createdAt: string;
  updatedAt: string;
}

/** 목록·카드·상단 커버에 사용할 URL (대표 설정 또는 옵션 첫 이미지) */
export function accommodationDisplayImageUrl(acc: Pick<AccommodationRow, 'coverImageUrl' | 'options'>): string | null {
  const explicit = acc.coverImageUrl?.trim();
  if (explicit) return explicit;
  return acc.options.flatMap((o) => o.imageUrls)[0] ?? null;
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
    coverImageUrl
    phone
    facilities
    bookingMethod
    bookingPriority
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
  query Accommodations(
    $region: String
    $destination: String
    $level: AccommodationLevel
    $bookingPriority: String
    $bookingPriorityUnset: Boolean
  ) {
    accommodations(
      region: $region
      destination: $destination
      level: $level
      bookingPriority: $bookingPriority
      bookingPriorityUnset: $bookingPriorityUnset
    ) {
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
  mealCostPerServing capacity mealIncluded
  googleMapsUrl imageUrls note createdAt updatedAt
`;

const UPLOAD_OPTION_IMAGES_MUTATION_STR = `
  mutation UploadAccommodationOptionImages($id: ID!, $images: [Upload!]!) {
    uploadAccommodationOptionImages(id: $id, images: $images) {
      ${OPTION_FIELDS}
    }
  }
`;

const ACCOMMODATION_FIELDS_FOR_UPLOAD = `
  id name destination region coverImageUrl phone facilities bookingMethod bookingPriority
  openingDate closingDate createdAt updatedAt
  options { ${OPTION_FIELDS} }
`;

const UPLOAD_ACCOMMODATION_IMAGES_MUTATION_STR = `
  mutation UploadAccommodationImages($accommodationId: ID!, $images: [Upload!]!) {
    uploadAccommodationImages(accommodationId: $accommodationId, images: $images) {
      ${ACCOMMODATION_FIELDS_FOR_UPLOAD}
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
  /** Exact label e.g. 1순위. Ignored when bookingPriorityUnset is true. */
  bookingPriority?: string;
  /** Only rows with null bookingPriority */
  bookingPriorityUnset?: boolean;
}) {
  let bookingPriority: string | undefined;
  let bookingPriorityUnset: boolean | undefined;
  if (filters?.bookingPriorityUnset === true) {
    bookingPriorityUnset = true;
  } else if (filters?.bookingPriority != null && filters.bookingPriority !== '') {
    bookingPriority = filters.bookingPriority;
  }

  const { data, loading, refetch } = useQuery<{ accommodations: AccommodationRow[] }>(
    ACCOMMODATIONS_QUERY,
    {
      variables: {
        region: filters?.region,
        destination: filters?.destination,
        level: filters?.level,
        bookingPriority,
        bookingPriorityUnset,
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
      bookingPriority?: string | null;
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
      input: Partial<Pick<AccommodationRow, 'name' | 'destination' | 'region' | 'coverImageUrl' | 'phone' | 'facilities' | 'bookingMethod' | 'bookingPriority' | 'openingDate' | 'closingDate'>>,
    ) => {
      const result = await mutate({
        variables: { id, input },
        refetchQueries: [
          { query: ACCOMMODATION_QUERY, variables: { id } },
          { query: ACCOMMODATIONS_QUERY },
        ],
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

export function useUploadAccommodationImages() {
  const { ensureAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  return {
    loading,
    uploadImages: async (accommodationId: string, images: File[]) => {
      if (images.length === 0) return null;
      if (images.length > 1) {
        throw new Error(
          '대표 사진은 한 장만 선택할 수 있습니다. 객실별 여러 장은 옵션 카드에서 추가해 주세요.',
        );
      }
      setLoading(true);
      try {
        const accessToken = await ensureAccessToken();
        const data = await runUploadMutation<{ uploadAccommodationImages: AccommodationRow }>(
          UPLOAD_ACCOMMODATION_IMAGES_MUTATION_STR,
          { accommodationId, images: images.map(() => null) },
          images,
          images.map((_, i) => `variables.images.${i}`),
          accessToken,
        );
        return data.uploadAccommodationImages;
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
