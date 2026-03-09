import { gql, useMutation, useQuery } from '@apollo/client';

export type DealStageValue =
  | 'CONSULTING'
  | 'CONTRACTING'
  | 'CONTRACT_CONFIRMED'
  | 'MONGOL_ASSIGNING'
  | 'MONGOL_ASSIGNED'
  | 'ON_HOLD'
  | 'BEFORE_DEPARTURE_10D'
  | 'BEFORE_DEPARTURE_3D'
  | 'TRIP_COMPLETED';

export type DealTodoStatusValue = 'TODO' | 'DOING' | 'DONE';

export interface EmployeeOwnerRow {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  isActive: boolean;
}

export interface UserDealTodoPreviewRow {
  id: string;
  stage: DealStageValue;
  title: string;
  status: DealTodoStatusValue;
  createdAt: string;
}

export interface UserRow {
  id: string;
  name: string;
  email: string | null;
  ownerEmployeeId: string | null;
  ownerEmployee: EmployeeOwnerRow | null;
  dealStage: DealStageValue;
  dealStageOrder: number;
  userDealTodos?: UserDealTodoPreviewRow[];
  createdAt: string;
  updatedAt: string;
}

export interface DealPipelineCardUpdateInput {
  userId: string;
  dealStage: DealStageValue;
  dealStageOrder: number;
}

export interface UserNoteRow {
  id: string;
  userId: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserDealTodoRow {
  id: string;
  userId: string;
  stage: DealStageValue;
  templateId: string | null;
  title: string;
  description: string | null;
  status: DealTodoStatusValue;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanVersionRow {
  id: string;
  planId: string;
  parentVersionId: string | null;
  versionNumber: number;
  variantType: string;
  totalDays: number;
  changeNote: string | null;
  createdAt: string;
  updatedAt: string;
  meta?: PlanVersionMetaRow | null;
}

export interface PlanVersionMetaRow {
  id: string;
  planVersionId: string;
  leaderName: string;
  documentNumber: string;
  travelStartDate: string;
  travelEndDate: string;
  headcountTotal: number;
  headcountMale: number;
  headcountFemale: number;
  vehicleType: string;
  flightInTime: string;
  flightOutTime: string;
  pickupDropNote: string | null;
  externalPickupDropNote: string | null;
  includeRentalItems: boolean;
  rentalItemsText: string;
  events: Array<{
    id: string;
    name: string;
    securityDepositKrw: number;
    isActive: boolean;
  }>;
  extraLodgings: Array<{
    dayIndex: number;
    lodgingCount: number;
  }>;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanPricingLineRow {
  id?: string | null;
  lineCode: string;
  sourceType: string;
  description: string | null;
  ruleId: string | null;
  unitPriceKrw: number | null;
  quantity: number;
  amountKrw: number;
}

export interface PlanVersionPricingRow {
  id: string;
  planVersionId: string;
  policyId: string;
  currencyCode: string;
  baseAmountKrw: number;
  addonAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
  securityDepositQuantity: number;
  securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
  securityDepositEvent: {
    id: string;
    name: string;
  } | null;
  longDistanceSegmentCount: number;
  extraLodgingCount: number;
  lines: PlanPricingLineRow[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanRow {
  id: string;
  userId: string;
  regionId: string;
  title: string;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion: PlanVersionRow | null;
}

export interface PlanDetail extends PlanRow {
  user: UserRow;
  region: {
    id: string;
    name: string;
  };
  versions: PlanVersionRow[];
}

export interface PlanVersionDetail extends PlanVersionRow {
  plan: PlanRow & {
    user: UserRow;
    region: {
      id: string;
      name: string;
    };
  };
  planStops: Array<{
    id: string;
    planVersionId: string;
    locationId?: string | null;
    locationVersionId?: string | null;
    dateCellText: string;
    destinationCellText: string;
    timeCellText: string;
    scheduleCellText: string;
    lodgingCellText: string;
    mealCellText: string;
  }>;
  pricing?: PlanVersionPricingRow | null;
}

const USERS_QUERY = gql`
  query Users {
    users {
      id
      name
      email
      ownerEmployeeId
      ownerEmployee {
        id
        name
        email
        role
        isActive
      }
      dealStage
      dealStageOrder
      userDealTodos {
        id
        stage
        title
        status
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

const USER_QUERY = gql`
  query User($id: ID!) {
    user(id: $id) {
      id
      name
      email
      ownerEmployeeId
      ownerEmployee {
        id
        name
        email
        role
        isActive
      }
      dealStage
      dealStageOrder
      userDealTodos {
        id
        stage
        title
        status
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

const PLANS_BY_USER_QUERY = gql`
  query PlansByUser($userId: ID!) {
    plans(userId: $userId) {
      id
      userId
      regionId
      title
      currentVersionId
      createdAt
      updatedAt
      currentVersion {
        id
        planId
        parentVersionId
        versionNumber
        variantType
        totalDays
        changeNote
        createdAt
        updatedAt
      }
    }
  }
`;

const PLAN_DETAIL_QUERY = gql`
  query PlanDetail($id: ID!) {
    plan(id: $id) {
      id
      userId
      regionId
      title
      currentVersionId
      createdAt
      updatedAt
      user {
        id
        name
        email
        ownerEmployeeId
        ownerEmployee {
          id
          name
          email
          role
          isActive
        }
        dealStage
        dealStageOrder
        createdAt
        updatedAt
      }
      region {
        id
        name
      }
      currentVersion {
        id
        planId
        parentVersionId
        versionNumber
        variantType
        totalDays
        changeNote
        createdAt
        updatedAt
      }
      versions {
        id
        planId
        parentVersionId
        versionNumber
        variantType
        totalDays
        changeNote
        createdAt
        updatedAt
      }
    }
  }
`;

const PLAN_VERSIONS_QUERY = gql`
  query PlanVersions($planId: ID!) {
    planVersions(planId: $planId) {
      id
      planId
      parentVersionId
      versionNumber
      variantType
      totalDays
      changeNote
      createdAt
      updatedAt
    }
  }
`;

const PLAN_VERSION_DETAIL_QUERY = gql`
  query PlanVersionDetail($id: ID!) {
    planVersion(id: $id) {
      id
      planId
      parentVersionId
      versionNumber
      variantType
      totalDays
      changeNote
      createdAt
      updatedAt
      plan {
        id
        userId
        regionId
        title
        currentVersionId
        createdAt
        updatedAt
        user {
          id
          name
          email
          ownerEmployeeId
          ownerEmployee {
            id
            name
            email
            role
            isActive
          }
          dealStage
          dealStageOrder
          createdAt
          updatedAt
        }
        region {
          id
          name
        }
      }
      planStops {
        id
        planVersionId
        locationId
        locationVersionId
        dateCellText
        destinationCellText
        timeCellText
        scheduleCellText
        lodgingCellText
        mealCellText
      }
      meta {
        id
        planVersionId
        leaderName
        documentNumber
        travelStartDate
        travelEndDate
        headcountTotal
        headcountMale
        headcountFemale
        vehicleType
        flightInTime
        flightOutTime
        pickupDropNote
        externalPickupDropNote
        includeRentalItems
        rentalItemsText
        events {
          id
          name
          securityDepositKrw
          isActive
        }
        extraLodgings {
          dayIndex
          lodgingCount
        }
        remark
        createdAt
        updatedAt
      }
      pricing {
        id
        planVersionId
        policyId
        currencyCode
        baseAmountKrw
        addonAmountKrw
        totalAmountKrw
        depositAmountKrw
        balanceAmountKrw
        securityDepositAmountKrw
        securityDepositUnitPriceKrw
        securityDepositQuantity
        securityDepositMode
        securityDepositEvent {
          id
          name
        }
        longDistanceSegmentCount
        extraLodgingCount
        createdAt
        updatedAt
        lines {
          id
          lineCode
          sourceType
          description
          ruleId
          unitPriceKrw
          quantity
          amountKrw
        }
      }
    }
  }
`;

const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: UserCreateInput!) {
    createUser(input: $input) {
      id
      name
      email
      ownerEmployeeId
      ownerEmployee {
        id
        name
        email
        role
        isActive
      }
    }
  }
`;

const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: ID!, $input: UserUpdateInput!) {
    updateUser(id: $id, input: $input) {
      id
      name
      email
      ownerEmployeeId
      ownerEmployee {
        id
        name
        email
        role
        isActive
      }
      dealStage
      dealStageOrder
      createdAt
      updatedAt
    }
  }
`;

const SET_CURRENT_VERSION_MUTATION = gql`
  mutation SetCurrentPlanVersion($planId: ID!, $versionId: ID!) {
    setCurrentPlanVersion(planId: $planId, versionId: $versionId) {
      id
      currentVersionId
    }
  }
`;

const REORDER_DEAL_PIPELINE_MUTATION = gql`
  mutation ReorderDealPipeline($input: DealPipelineReorderInput!) {
    reorderDealPipeline(input: $input)
  }
`;

const USER_NOTES_QUERY = gql`
  query UserNotes($userId: ID!) {
    userNotes(userId: $userId) {
      id
      userId
      content
      createdBy
      createdAt
      updatedAt
    }
  }
`;

const CREATE_USER_NOTE_MUTATION = gql`
  mutation CreateUserNote($input: UserNoteCreateInput!) {
    createUserNote(input: $input) {
      id
      userId
      content
      createdBy
      createdAt
      updatedAt
    }
  }
`;

const USER_DEAL_TODOS_QUERY = gql`
  query UserDealTodos($userId: ID!, $includeDone: Boolean) {
    userDealTodos(userId: $userId, includeDone: $includeDone) {
      id
      userId
      stage
      templateId
      title
      description
      status
      completedAt
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_USER_DEAL_TODO_STATUS_MUTATION = gql`
  mutation UpdateUserDealTodoStatus($id: ID!, $status: DealTodoStatus!) {
    updateUserDealTodoStatus(id: $id, status: $status) {
      id
      userId
      stage
      templateId
      title
      description
      status
      completedAt
      createdAt
      updatedAt
    }
  }
`;

export function useUsers() {
  const { data, loading, refetch } = useQuery<{ users: UserRow[] }>(USERS_QUERY);
  return { users: data?.users ?? [], loading, refetch };
}

export function useUser(id: string | undefined) {
  const { data, loading, refetch } = useQuery<{ user: UserRow | null }>(USER_QUERY, {
    variables: { id },
    skip: !id,
  });

  return { user: data?.user ?? null, loading, refetch };
}

export function usePlansByUser(userId: string | undefined) {
  const { data, loading, refetch } = useQuery<{ plans: PlanRow[] }>(PLANS_BY_USER_QUERY, {
    variables: { userId },
    skip: !userId,
  });

  return { plans: data?.plans ?? [], loading, refetch };
}

export function usePlanDetail(id: string | undefined) {
  const { data, loading, refetch } = useQuery<{ plan: PlanDetail | null }>(PLAN_DETAIL_QUERY, {
    variables: { id },
    skip: !id,
  });

  return { plan: data?.plan ?? null, loading, refetch };
}

export function usePlanVersions(planId: string | undefined) {
  const { data, loading, refetch } = useQuery<{ planVersions: PlanVersionRow[] }>(PLAN_VERSIONS_QUERY, {
    variables: { planId },
    skip: !planId,
  });

  return { versions: data?.planVersions ?? [], loading, refetch };
}

export function usePlanVersionDetail(id: string | undefined) {
  const { data, loading, refetch } = useQuery<{ planVersion: PlanVersionDetail | null }>(PLAN_VERSION_DETAIL_QUERY, {
    variables: { id },
    skip: !id,
  });

  return { version: data?.planVersion ?? null, loading, refetch };
}

export function useCreateUser() {
  const [mutate, { loading }] = useMutation<{ createUser: UserRow }>(CREATE_USER_MUTATION);

  return {
    loading,
    createUser: async (input: { name: string; email?: string | null; ownerEmployeeId?: string | null }): Promise<UserRow> => {
      const result = await mutate({ variables: { input }, refetchQueries: [{ query: USERS_QUERY }] });
      if (!result.data?.createUser) {
        throw new Error('Failed to create user');
      }
      return result.data.createUser;
    },
  };
}

export function useUpdateUser() {
  const [mutate, { loading }] = useMutation<{ updateUser: UserRow }>(UPDATE_USER_MUTATION);

  return {
    loading,
    updateUser: async (
      id: string,
      input: {
        name?: string;
        email?: string | null;
        ownerEmployeeId?: string | null;
        dealStage?: DealStageValue;
        dealStageOrder?: number;
      },
    ): Promise<UserRow> => {
      const result = await mutate({
        variables: { id, input },
        refetchQueries: [
          { query: USERS_QUERY },
          { query: USER_QUERY, variables: { id } },
        ],
      });

      if (!result.data?.updateUser) {
        throw new Error('Failed to update user');
      }

      return result.data.updateUser;
    },
  };
}

export function useSetCurrentPlanVersion() {
  const [mutate, { loading }] = useMutation(SET_CURRENT_VERSION_MUTATION);

  return {
    loading,
    setCurrentPlanVersion: async (planId: string, versionId: string): Promise<void> => {
      await mutate({
        variables: { planId, versionId },
        refetchQueries: [
          { query: PLAN_DETAIL_QUERY, variables: { id: planId } },
          { query: PLAN_VERSIONS_QUERY, variables: { planId } },
          { query: PLAN_VERSION_DETAIL_QUERY, variables: { id: versionId } },
        ],
      });
    },
  };
}

export function useReorderDealPipeline() {
  const [mutate, { loading }] = useMutation<{ reorderDealPipeline: boolean }>(REORDER_DEAL_PIPELINE_MUTATION);

  return {
    loading,
    reorderDealPipeline: async (updates: DealPipelineCardUpdateInput[]): Promise<void> => {
      const result = await mutate({
        variables: { input: { updates } },
      });

      if (!result.data?.reorderDealPipeline) {
        throw new Error('Failed to reorder deal pipeline');
      }
    },
  };
}

export function useUserNotes(userId: string | undefined) {
  const { data, loading, refetch } = useQuery<{ userNotes: UserNoteRow[] }>(USER_NOTES_QUERY, {
    variables: { userId },
    skip: !userId,
  });

  return { notes: data?.userNotes ?? [], loading, refetch };
}

export function useCreateUserNote() {
  const [mutate, { loading }] = useMutation<{ createUserNote: UserNoteRow }>(CREATE_USER_NOTE_MUTATION);

  return {
    loading,
    createUserNote: async (input: { userId: string; content: string; createdBy: string }): Promise<UserNoteRow> => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: USER_NOTES_QUERY, variables: { userId: input.userId } }],
      });

      if (!result.data?.createUserNote) {
        throw new Error('Failed to create user note');
      }

      return result.data.createUserNote;
    },
  };
}

export function useUserDealTodos(userId: string | undefined, includeDone = false) {
  const { data, loading, refetch } = useQuery<{ userDealTodos: UserDealTodoRow[] }>(USER_DEAL_TODOS_QUERY, {
    variables: { userId, includeDone },
    skip: !userId,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });

  return { todos: data?.userDealTodos ?? [], loading, refetch };
}

export function useUpdateUserDealTodoStatus() {
  const [mutate, { loading }] = useMutation<{ updateUserDealTodoStatus: UserDealTodoRow }>(UPDATE_USER_DEAL_TODO_STATUS_MUTATION);

  return {
    loading,
    updateUserDealTodoStatus: async (input: { id: string; status: DealTodoStatusValue }): Promise<UserDealTodoRow> => {
      const result = await mutate({
        variables: input,
      });

      if (!result.data?.updateUserDealTodoStatus) {
        throw new Error('Failed to update user deal todo status');
      }

      return result.data.updateUserDealTodoStatus;
    },
  };
}
