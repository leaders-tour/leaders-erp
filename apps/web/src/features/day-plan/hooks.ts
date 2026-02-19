import { gql } from '@apollo/client';
import type { DayPlan } from '../../generated/graphql';
import { useCrudResource } from '../../lib/crud';

const LIST = gql`
  query DayPlans {
    dayPlans {
      id
      planId
      dayIndex
      fromLocationId
      toLocationId
      lodgingId
      mealSetId
      distanceText
      lodgingText
      mealsText
    }
  }
`;

const CREATE = gql`
  mutation CreateDayPlan($input: DayPlanCreateInput!) {
    createDayPlan(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateDayPlan($id: ID!, $input: DayPlanUpdateInput!) {
    updateDayPlan(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeleteDayPlan($id: ID!) {
    deleteDayPlan(id: $id)
  }
`;

export interface DayPlanFormInput {
  planId: string;
  dayIndex: number;
  fromLocationId: string;
  toLocationId: string;
  lodgingId?: string | null;
  mealSetId?: string | null;
  distanceText: string;
  lodgingText: string;
  mealsText: string;
}

export function useDayPlanCrud() {
  return useCrudResource<DayPlan, DayPlanFormInput, DayPlanFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: { listKey: 'dayPlans', createKey: 'createDayPlan', updateKey: 'updateDayPlan', removeKey: 'deleteDayPlan' },
    toCreateVariables: (input) => ({
      input: {
        ...input,
        lodgingId: input.lodgingId && input.lodgingId.trim() ? input.lodgingId : null,
        mealSetId: input.mealSetId && input.mealSetId.trim() ? input.mealSetId : null,
      },
    }),
    toUpdateVariables: (id, input) => ({
      id,
      input: {
        ...input,
        lodgingId: input.lodgingId && input.lodgingId.trim() ? input.lodgingId : null,
        mealSetId: input.mealSetId && input.mealSetId.trim() ? input.mealSetId : null,
      },
    }),
  });
}
