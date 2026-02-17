import { gql } from '@apollo/client';
import type { Region } from '../../generated/graphql';
import { useCrudResource } from '../../lib/crud';

export const regionCreateSchema = {
  parse: (input: { name: string; description: string }) => ({
    name: input.name,
    description: input.description || null,
  }),
};

const LIST = gql`
  query Regions {
    regions {
      id
      name
      description
    }
  }
`;

const CREATE = gql`
  mutation CreateRegion($input: RegionCreateInput!) {
    createRegion(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateRegion($id: ID!, $input: RegionUpdateInput!) {
    updateRegion(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeleteRegion($id: ID!) {
    deleteRegion(id: $id)
  }
`;

export interface RegionFormInput {
  name: string;
  description: string;
}

export function useRegionCrud() {
  return useCrudResource<Region, RegionFormInput, RegionFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: { listKey: 'regions', createKey: 'createRegion', updateKey: 'updateRegion', removeKey: 'deleteRegion' },
    toCreateVariables: (input) => ({ input: regionCreateSchema.parse(input) }),
    toUpdateVariables: (_id, input) => ({ input: regionCreateSchema.parse(input), id: _id }),
  });
}
