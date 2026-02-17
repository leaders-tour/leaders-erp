import { gql } from '@apollo/client';
import { VariantType, type Plan } from '../../generated/graphql';
import { useCrudResource } from '../../lib/crud';

const LIST = gql`
  query Plans {
    plans {
      id
      regionId
      variantType
      totalDays
    }
  }
`;

const CREATE = gql`
  mutation CreatePlan($input: PlanCreateInput!) {
    createPlan(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdatePlan($id: ID!, $input: PlanUpdateInput!) {
    updatePlan(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeletePlan($id: ID!) {
    deletePlan(id: $id)
  }
`;

export interface PlanFormInput {
  regionId: string;
  variantType: VariantType;
  totalDays: number;
  fromLocationId: string;
  toLocationId: string;
}

function buildDayPlans(totalDays: number, fromLocationId: string, toLocationId: string) {
  return Array.from({ length: totalDays }).map((_, index) => ({
    dayIndex: index + 1,
    fromLocationId,
    toLocationId,
    distanceText: 'auto',
    lodgingText: 'auto',
    mealsText: 'auto',
    timeBlocks: [
      {
        startTime: '08:00',
        label: '출발',
        orderIndex: 0,
        activities: [
          {
            description: '자동 생성 기본 활동',
            orderIndex: 0,
            isOptional: false,
            conditionNote: null,
          },
        ],
      },
    ],
  }));
}

export function usePlanCrud() {
  return useCrudResource<Plan, PlanFormInput, PlanFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: { listKey: 'plans', createKey: 'createPlan', updateKey: 'updatePlan', removeKey: 'deletePlan' },
    toCreateVariables: (input) => ({
      input: {
        regionId: input.regionId,
        variantType: input.variantType,
        totalDays: input.totalDays,
        dayPlans: buildDayPlans(input.totalDays, input.fromLocationId, input.toLocationId),
      },
    }),
    toUpdateVariables: (id, input) => ({
      id,
      input: {
        variantType: input.variantType,
        totalDays: input.totalDays,
        dayPlans: buildDayPlans(input.totalDays, input.fromLocationId, input.toLocationId),
      },
    }),
  });
}
