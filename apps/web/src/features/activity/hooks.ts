import { gql } from '@apollo/client';
import type { Activity } from '../../generated/graphql';
import { useCrudResource } from '../../lib/crud';

const LIST = gql`
  query Activities {
    activities {
      id
      timeBlockId
      description
      orderIndex
      isOptional
      conditionNote
    }
  }
`;

const CREATE = gql`
  mutation CreateActivity($input: ActivityCreateInput!) {
    createActivity(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateActivity($id: ID!, $input: ActivityUpdateInput!) {
    updateActivity(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeleteActivity($id: ID!) {
    deleteActivity(id: $id)
  }
`;

export interface ActivityFormInput {
  timeBlockId: string;
  description: string;
  orderIndex: number;
  isOptional: string;
  conditionNote: string;
}

export function useActivityCrud() {
  return useCrudResource<Activity, ActivityFormInput, ActivityFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: { listKey: 'activities', createKey: 'createActivity', updateKey: 'updateActivity', removeKey: 'deleteActivity' },
    toCreateVariables: (input) => ({
      input: {
        ...input,
        isOptional: input.isOptional === 'true',
        conditionNote: input.conditionNote || null,
      },
    }),
    toUpdateVariables: (id, input) => ({
      id,
      input: {
        ...input,
        isOptional: input.isOptional === 'true',
        conditionNote: input.conditionNote || null,
      },
    }),
  });
}
