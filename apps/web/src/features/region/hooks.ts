import { ApolloError, gql } from '@apollo/client';
import type { Region } from '../../generated/graphql';
import { useCrudResource } from '../../lib/crud';

export function toRegionMutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApolloError) {
    const graphQlMessage = error.graphQLErrors[0]?.message?.trim();
    if (graphQlMessage) {
      return graphQlMessage;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export interface RegionCreateFormInput {
  name: string;
  description: string;
  alwaysIncludeFirstDayStart: boolean;
}

export type RegionUpdateFormInput = Partial<Pick<RegionCreateFormInput, 'name' | 'description' | 'alwaysIncludeFirstDayStart'>>;

function toCreateMutationInput(input: RegionCreateFormInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim() ? input.description.trim() : null,
    alwaysIncludeFirstDayStart: input.alwaysIncludeFirstDayStart,
  };
}

function toUpdateMutationInput(input: RegionUpdateFormInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    patch.name = input.name.trim();
  }
  if (input.description !== undefined) {
    patch.description = input.description.trim() ? input.description.trim() : null;
  }
  if (input.alwaysIncludeFirstDayStart !== undefined) {
    patch.alwaysIncludeFirstDayStart = input.alwaysIncludeFirstDayStart;
  }
  return patch;
}

const LIST = gql`
  query Regions {
    regions {
      id
      name
      description
      alwaysIncludeFirstDayStart
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

export function useRegionCrud() {
  return useCrudResource<Region, RegionCreateFormInput, RegionUpdateFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: { listKey: 'regions', createKey: 'createRegion', updateKey: 'updateRegion', removeKey: 'deleteRegion' },
    toCreateVariables: (input) => ({ input: toCreateMutationInput(input) }),
    toUpdateVariables: (id, input) => ({ input: toUpdateMutationInput(input), id }),
  });
}
