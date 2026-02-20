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
}

function buildPlanStops(totalDays: number) {
  return Array.from({ length: totalDays }).map((_, index) => ({
    dateCellText: `${index + 1}일차`,
    destinationCellText: '',
    timeCellText: '',
    scheduleCellText: '',
    lodgingCellText: '',
    mealCellText: '',
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
        planStops: buildPlanStops(input.totalDays),
      },
    }),
    toUpdateVariables: (id, input) => ({
      id,
      input: {
        variantType: input.variantType,
        totalDays: input.totalDays,
        planStops: buildPlanStops(input.totalDays),
      },
    }),
  });
}
