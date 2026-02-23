import { gql } from '@apollo/client';
import { useCrudResource } from '../../lib/crud';

const LIST = gql`
  query Overrides {
    overrides {
      id
      planVersionId
      targetType
      targetId
      fieldName
      value
    }
  }
`;

const CREATE = gql`
  mutation CreateOverride($input: OverrideCreateInput!) {
    createOverride(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateOverride($id: ID!, $input: OverrideUpdateInput!) {
    updateOverride(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeleteOverride($id: ID!) {
    deleteOverride(id: $id)
  }
`;

export interface OverrideFormInput {
  planVersionId: string;
  targetType: string;
  targetId: string;
  fieldName: string;
  value: string;
}

export interface OverrideRow {
  id: string;
  planVersionId: string;
  targetType: string;
  targetId: string;
  fieldName: string;
  value: string;
}

export function useOverrideCrud() {
  return useCrudResource<OverrideRow, OverrideFormInput, OverrideFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: { listKey: 'overrides', createKey: 'createOverride', updateKey: 'updateOverride', removeKey: 'deleteOverride' },
    toCreateVariables: (input) => ({ input }),
    toUpdateVariables: (id, input) => ({ id, input }),
  });
}
