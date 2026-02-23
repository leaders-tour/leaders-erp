import { gql } from '@apollo/client';
import type { TimeBlock } from '../../generated/graphql';
import { useCrudResource } from '../../lib/crud';

const LIST = gql`
  query TimeBlocks {
    timeBlocks {
      id
      locationId
      locationVersionId
      startTime
      label
      orderIndex
    }
  }
`;

const CREATE = gql`
  mutation CreateTimeBlock($input: TimeBlockCreateInput!) {
    createTimeBlock(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateTimeBlock($id: ID!, $input: TimeBlockUpdateInput!) {
    updateTimeBlock(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeleteTimeBlock($id: ID!) {
    deleteTimeBlock(id: $id)
  }
`;

export interface TimeBlockFormInput {
  locationId?: string;
  locationVersionId: string;
  startTime: string;
  label: string;
  orderIndex: number;
}

export function useTimeBlockCrud() {
  return useCrudResource<TimeBlock, TimeBlockFormInput, TimeBlockFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: { listKey: 'timeBlocks', createKey: 'createTimeBlock', updateKey: 'updateTimeBlock', removeKey: 'deleteTimeBlock' },
    toCreateVariables: (input) => ({
      input: {
        ...input,
        locationId: input.locationId?.trim() || undefined,
        locationVersionId: input.locationVersionId.trim(),
      },
    }),
    toUpdateVariables: (id, input) => ({
      id,
      input: {
        ...input,
        locationId: input.locationId?.trim() || undefined,
        locationVersionId: input.locationVersionId.trim(),
      },
    }),
  });
}
