import { gql } from '@apollo/client';
import { useCrudResource } from '../../lib/crud';

export interface EventRow {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  securityDepositKrw: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const LIST = gql`
  query EventsForCrud {
    events {
      id
      code
      name
      isActive
      securityDepositKrw
      sortOrder
      createdAt
      updatedAt
    }
  }
`;

const CREATE = gql`
  mutation CreateEvent($input: EventCreateInput!) {
    createEvent(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateEvent($id: ID!, $input: EventUpdateInput!) {
    updateEvent(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id)
  }
`;

export interface EventFormInput {
  code: string;
  name: string;
  isActive: boolean;
  securityDepositKrw: number;
  sortOrder: number;
}

export function useEventCrud() {
  return useCrudResource<EventRow, EventFormInput, EventFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: { listKey: 'events', createKey: 'createEvent', updateKey: 'updateEvent', removeKey: 'deleteEvent' },
    toCreateVariables: (input) => ({
      input: {
        code: input.code.trim(),
        name: input.name.trim(),
        isActive: input.isActive,
        securityDepositKrw: input.securityDepositKrw,
        sortOrder: input.sortOrder,
      },
    }),
    toUpdateVariables: (id, input) => ({
      id,
      input: {
        code: input.code.trim(),
        name: input.name.trim(),
        isActive: input.isActive,
        securityDepositKrw: input.securityDepositKrw,
        sortOrder: input.sortOrder,
      },
    }),
  });
}
