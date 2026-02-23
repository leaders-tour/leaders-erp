import { gql, useMutation, useQuery } from '@apollo/client';

export interface UserRow {
  id: string;
  name: string;
  email: string | null;
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
  rentalItemsText: string;
  eventCodes: string[];
  remark: string | null;
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
}

const USERS_QUERY = gql`
  query Users {
    users {
      id
      name
      email
    }
  }
`;

const USER_QUERY = gql`
  query User($id: ID!) {
    user(id: $id) {
      id
      name
      email
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
        rentalItemsText
        eventCodes
        remark
        createdAt
        updatedAt
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
    createUser: async (name: string): Promise<UserRow> => {
      const result = await mutate({ variables: { input: { name } }, refetchQueries: [{ query: USERS_QUERY }] });
      if (!result.data?.createUser) {
        throw new Error('Failed to create user');
      }
      return result.data.createUser;
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
