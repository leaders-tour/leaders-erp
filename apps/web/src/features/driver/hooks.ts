import { gql, useMutation, useQuery } from '@apollo/client';

export interface DriverRow {
  id: string;
  nameMn: string;
  vehicleType: 'STAREX' | 'HIACE' | 'PURGON' | 'LAND_CRUISER' | 'ALPHARD' | 'OTHER';
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
