import { gql } from '@apollo/client';
import { MealOption, type MealSet } from '../../generated/graphql';
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

function normalizeMealOption(value: string | null | undefined): MealOption | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const entries = Object.values(MealOption);
  return entries.includes(trimmed as MealOption) ? (trimmed as MealOption) : null;
}

export function useMealSetCrud() {
  return useCrudResource<MealSet, MealSetFormInput, MealSetFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: { listKey: 'mealSets', createKey: 'createMealSet', updateKey: 'updateMealSet', removeKey: 'deleteMealSet' },
    toCreateVariables: (input) => ({
      input: {
        ...input,
        breakfast: normalizeMealOption(input.breakfast),
        lunch: normalizeMealOption(input.lunch),
        dinner: normalizeMealOption(input.dinner),
      },
    }),
    toUpdateVariables: (id, input) => ({
      id,
      input: {
        ...input,
        breakfast: normalizeMealOption(input.breakfast),
        lunch: normalizeMealOption(input.lunch),
        dinner: normalizeMealOption(input.dinner),
      },
    }),
  });
}
