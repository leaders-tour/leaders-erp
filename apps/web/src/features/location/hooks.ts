import { gql } from '@apollo/client';
import type { Location } from '../../generated/graphql';
import { useCrudResource } from '../../lib/crud';

const LIST = gql`
  query Locations {
    locations {
      id
      regionId
      name
      defaultLodgingType
      latitude
      longitude
    }
  }
`;

const CREATE = gql`
  mutation CreateLocation($input: LocationCreateInput!) {
    createLocation(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateLocation($id: ID!, $input: LocationUpdateInput!) {
    updateLocation(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeleteLocation($id: ID!) {
    deleteLocation(id: $id)
  }
`;

export interface LocationFormInput {
  regionId: string;
  name: string;
  defaultLodgingType: string;
  latitude: number;
  longitude: number;
}

export function useLocationCrud() {
  return useCrudResource<Location, LocationFormInput, LocationFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: { listKey: 'locations', createKey: 'createLocation', updateKey: 'updateLocation', removeKey: 'deleteLocation' },
    toCreateVariables: (input) => ({ input }),
    toUpdateVariables: (id, input) => ({ id, input }),
  });
}
