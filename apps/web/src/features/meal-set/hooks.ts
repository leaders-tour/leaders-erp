import { gql } from '@apollo/client';
import type { MealSet } from '../../generated/graphql';
import { useCrudResource } from '../../lib/crud';

const LIST = gql`
  query MealSets {
    mealSets {
      id
      locationId
      locationNameSnapshot
      setName
      breakfast
      lunch
      dinner
    }
  }
`;

const CREATE = gql`
  mutation CreateMealSet($input: MealSetCreateInput!) {
    createMealSet(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateMealSet($id: ID!, $input: MealSetUpdateInput!) {
    updateMealSet(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeleteMealSet($id: ID!) {
    deleteMealSet(id: $id)
  }
`;

export interface MealSetFormInput {
  locationId: string;
  setName: string;
  breakfast?: string | null;
  lunch?: string | null;
  dinner?: string | null;
}

function normalizeNullableText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function useMealSetCrud() {
  return useCrudResource<MealSet, MealSetFormInput, MealSetFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: { listKey: 'mealSets', createKey: 'createMealSet', updateKey: 'updateMealSet', removeKey: 'deleteMealSet' },
    toCreateVariables: (input) => ({
      input: {
        ...input,
        breakfast: normalizeNullableText(input.breakfast),
        lunch: normalizeNullableText(input.lunch),
        dinner: normalizeNullableText(input.dinner),
      },
    }),
    toUpdateVariables: (id, input) => ({
      id,
      input: {
        ...input,
        breakfast: normalizeNullableText(input.breakfast),
        lunch: normalizeNullableText(input.lunch),
        dinner: normalizeNullableText(input.dinner),
      },
    }),
  });
}
