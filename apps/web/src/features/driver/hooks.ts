import { gql, useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { useAuth } from '../auth/context';
import { runUploadMutation } from '../../lib/upload-mutation';

export interface DriverRow {
  id: string;
  nameMn: string;
  vehicleType: 'STAREX' | 'HIACE_SHORT' | 'HIACE_LONG' | 'PURGON' | 'LAND_CRUISER' | 'ALPHARD' | 'OTHER';
  vehicleNumber: string | null;
  vehicleOptions: string | null;
  vehicleYear: number | null;
  maxPassengers: number | null;
  level: 'MAIN' | 'JUNIOR' | 'ROOKIE' | 'OTHER';
  status: 'ACTIVE_SEASON' | 'INTERVIEW_DONE' | 'BLACKLISTED' | 'OTHER';
  gender: 'MALE' | 'FEMALE' | null;
  birthYear: number | null;
  isSmoker: boolean;
  hasTouristLicense: boolean;
  joinYear: number | null;
  phone: string | null;
  profileImageUrl: string | null;
  vehicleImageUrls: string[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const DRIVER_FRAGMENT = gql`
  fragment DriverFields on Driver {
    id
    nameMn
    vehicleType
    vehicleNumber
    vehicleOptions
    vehicleYear
    maxPassengers
    level
    status
    gender
    birthYear
    isSmoker
    hasTouristLicense
    joinYear
    phone
    profileImageUrl
    vehicleImageUrls
    note
    createdAt
    updatedAt
  }
`;

const DRIVERS_QUERY = gql`
  ${DRIVER_FRAGMENT}
  query Drivers($status: DriverStatus, $level: DriverLevel, $vehicleType: VehicleType) {
    drivers(status: $status, level: $level, vehicleType: $vehicleType) {
      ...DriverFields
    }
  }
`;

const DRIVER_QUERY = gql`
  ${DRIVER_FRAGMENT}
  query Driver($id: ID!) {
    driver(id: $id) {
      ...DriverFields
    }
  }
`;

const UPDATE_DRIVER_MUTATION = gql`
  ${DRIVER_FRAGMENT}
  mutation UpdateDriver($id: ID!, $input: DriverUpdateInput!) {
    updateDriver(id: $id, input: $input) {
      ...DriverFields
    }
  }
`;

const CREATE_DRIVER_MUTATION = gql`
  ${DRIVER_FRAGMENT}
  mutation CreateDriver($input: DriverCreateInput!) {
    createDriver(input: $input) {
      ...DriverFields
    }
  }
`;

const DRIVER_FIELDS = `
  id nameMn vehicleType vehicleNumber vehicleOptions vehicleYear maxPassengers
  level status gender birthYear isSmoker hasTouristLicense joinYear phone
  profileImageUrl vehicleImageUrls note createdAt updatedAt
`;

const UPLOAD_DRIVER_PROFILE_IMAGE_MUTATION_STR = `
  mutation UploadDriverProfileImage($id: ID!, $image: Upload!) {
    uploadDriverProfileImage(id: $id, image: $image) {
      ${DRIVER_FIELDS}
    }
  }
`;

const UPLOAD_DRIVER_VEHICLE_IMAGES_MUTATION_STR = `
  mutation UploadDriverVehicleImages($id: ID!, $images: [Upload!]!) {
    uploadDriverVehicleImages(id: $id, images: $images) {
      ${DRIVER_FIELDS}
    }
  }
`;

const REMOVE_DRIVER_VEHICLE_IMAGE_MUTATION = gql`
  ${DRIVER_FRAGMENT}
  mutation RemoveDriverVehicleImage($id: ID!, $imageUrl: String!) {
    removeDriverVehicleImage(id: $id, imageUrl: $imageUrl) {
      ...DriverFields
    }
  }
`;

export function useDrivers(filters?: { status?: string; level?: string; vehicleType?: string }) {
  const { data, loading, refetch } = useQuery<{ drivers: DriverRow[] }>(DRIVERS_QUERY, {
    variables: {
      status: filters?.status,
      level: filters?.level,
      vehicleType: filters?.vehicleType,
    },
    fetchPolicy: 'cache-and-network',
  });
  return { drivers: data?.drivers ?? [], loading, refetch };
}

export function useDriver(id: string | undefined) {
  const { data, loading, refetch } = useQuery<{ driver: DriverRow }>(DRIVER_QUERY, {
    variables: { id },
    skip: !id,
  });
  return { driver: data?.driver ?? null, loading, refetch };
}

export function useCreateDriver() {
  const [mutate, { loading }] = useMutation<{ createDriver: DriverRow }>(CREATE_DRIVER_MUTATION);
  return {
    loading,
    createDriver: async (input: { nameMn: string; vehicleType?: string; level?: string; status?: string }) => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: DRIVERS_QUERY }],
      });
      if (!result.data?.createDriver) throw new Error('Create failed');
      return result.data.createDriver;
    },
  };
}

export function useUpdateDriver() {
  const [mutate, { loading }] = useMutation<{ updateDriver: DriverRow }>(UPDATE_DRIVER_MUTATION);
  return {
    loading,
    updateDriver: async (id: string, input: Partial<Omit<DriverRow, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const result = await mutate({
        variables: { id, input },
        refetchQueries: [{ query: DRIVERS_QUERY }, { query: DRIVER_QUERY, variables: { id } }],
      });
      if (!result.data?.updateDriver) throw new Error('Update failed');
      return result.data.updateDriver;
    },
  };
}

const DELETE_DRIVER_MUTATION = gql`
  mutation DeleteDriver($id: ID!) {
    deleteDriver(id: $id)
  }
`;

export function useDeleteDriver() {
  const [mutate, { loading }] = useMutation<{ deleteDriver: boolean }>(DELETE_DRIVER_MUTATION);
  return {
    loading,
    deleteDriver: async (id: string) => {
      await mutate({
        variables: { id },
        refetchQueries: [{ query: DRIVERS_QUERY }],
      });
    },
  };
}

export function useUploadDriverProfileImage() {
  const { ensureAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  return {
    loading,
    uploadProfileImage: async (id: string, image: File) => {
      setLoading(true);
      try {
        const accessToken = await ensureAccessToken();
        const data = await runUploadMutation<{ uploadDriverProfileImage: DriverRow }>(
          UPLOAD_DRIVER_PROFILE_IMAGE_MUTATION_STR,
          { id, image: null },
          [image],
          ['variables.image'],
          accessToken,
        );
        return data.uploadDriverProfileImage;
      } finally {
        setLoading(false);
      }
    },
  };
}

export function useUploadDriverVehicleImages() {
  const { ensureAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  return {
    loading,
    uploadVehicleImages: async (id: string, images: File[]) => {
      setLoading(true);
      try {
        const accessToken = await ensureAccessToken();
        const data = await runUploadMutation<{ uploadDriverVehicleImages: DriverRow }>(
          UPLOAD_DRIVER_VEHICLE_IMAGES_MUTATION_STR,
          { id, images: images.map(() => null) },
          images,
          images.map((_, i) => `variables.images.${i}`),
          accessToken,
        );
        return data.uploadDriverVehicleImages;
      } finally {
        setLoading(false);
      }
    },
  };
}

export function useRemoveDriverVehicleImage() {
  const [mutate, { loading }] = useMutation<{ removeDriverVehicleImage: DriverRow }>(
    REMOVE_DRIVER_VEHICLE_IMAGE_MUTATION,
  );
  return {
    loading,
    removeVehicleImage: async (id: string, imageUrl: string) => {
      const result = await mutate({ variables: { id, imageUrl } });
      if (!result.data?.removeDriverVehicleImage) throw new Error('Remove failed');
      return result.data.removeDriverVehicleImage;
    },
  };
}
