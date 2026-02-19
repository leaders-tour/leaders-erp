import { gql } from '@apollo/client';
import type { Lodging } from '../../generated/graphql';
import { useCrudResource } from '../../lib/crud';

const LIST = gql`
  query Lodgings {
    lodgings {
      id
      locationId
      locationNameSnapshot
      name
      specialNotes
    }
  }
`;

const CREATE = gql`
  mutation CreateLodging($input: LodgingCreateInput!) {
    createLodging(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateLodging($id: ID!, $input: LodgingUpdateInput!) {
    updateLodging(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeleteLodging($id: ID!) {
    deleteLodging(id: $id)
  }
`;

export interface LodgingFormInput {
  locationId: string;
  name: string;
  specialNotes?: string | null;
}

function normalizeNullableText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function useLodgingCrud() {
  return useCrudResource<Lodging, LodgingFormInput, LodgingFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: { listKey: 'lodgings', createKey: 'createLodging', updateKey: 'updateLodging', removeKey: 'deleteLodging' },
    toCreateVariables: (input) => ({
      input: {
        ...input,
        specialNotes: normalizeNullableText(input.specialNotes),
      },
    }),
    toUpdateVariables: (id, input) => ({
      id,
      input: {
        ...input,
        specialNotes: normalizeNullableText(input.specialNotes),
      },
    }),
  });
}
