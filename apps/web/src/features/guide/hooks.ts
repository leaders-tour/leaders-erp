import { gql, useMutation, useQuery } from '@apollo/client';

export interface GuideRow {
  id: string;
  nameKo: string;
  nameMn: string | null;
  level: 'MAIN' | 'JUNIOR' | 'ROOKIE' | 'OTHER';
  status: 'ACTIVE_SEASON' | 'INTERVIEW_DONE' | 'INACTIVE' | 'OTHER';
  gender: 'MALE' | 'FEMALE' | null;
  birthYear: number | null;
  isSmoker: boolean;
  experienceYears: number | null;
  joinYear: number | null;
  phone: string | null;
  profileImageUrl: string | null;
  certImageUrls: string[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const GUIDE_FRAGMENT = gql`
  fragment GuideFields on Guide {
    id
    nameKo
    nameMn
    level
    status
    gender
    birthYear
    isSmoker
    experienceYears
    joinYear
    phone
    profileImageUrl
    certImageUrls
    note
    createdAt
    updatedAt
  }
`;

const GUIDES_QUERY = gql`
  ${GUIDE_FRAGMENT}
  query Guides($status: GuideStatus, $level: GuideLevel) {
    guides(status: $status, level: $level) {
      ...GuideFields
    }
  }
`;

const GUIDE_QUERY = gql`
  ${GUIDE_FRAGMENT}
  query Guide($id: ID!) {
    guide(id: $id) {
      ...GuideFields
    }
  }
`;

const UPDATE_GUIDE_MUTATION = gql`
  ${GUIDE_FRAGMENT}
  mutation UpdateGuide($id: ID!, $input: GuideUpdateInput!) {
    updateGuide(id: $id, input: $input) {
      ...GuideFields
    }
  }
`;

const CREATE_GUIDE_MUTATION = gql`
  ${GUIDE_FRAGMENT}
  mutation CreateGuide($input: GuideCreateInput!) {
    createGuide(input: $input) {
      ...GuideFields
    }
  }
`;

const DELETE_GUIDE_MUTATION = gql`
  mutation DeleteGuide($id: ID!) {
    deleteGuide(id: $id)
  }
`;

export function useGuides(filters?: { status?: string; level?: string }) {
  const { data, loading, refetch } = useQuery<{ guides: GuideRow[] }>(GUIDES_QUERY, {
    variables: { status: filters?.status, level: filters?.level },
    fetchPolicy: 'cache-and-network',
  });
  return { guides: data?.guides ?? [], loading, refetch };
}

export function useGuide(id: string | undefined) {
  const { data, loading, refetch } = useQuery<{ guide: GuideRow }>(GUIDE_QUERY, {
    variables: { id },
    skip: !id,
  });
  return { guide: data?.guide ?? null, loading, refetch };
}

export function useCreateGuide() {
  const [mutate, { loading }] = useMutation<{ createGuide: GuideRow }>(CREATE_GUIDE_MUTATION);
  return {
    loading,
    createGuide: async (input: { nameKo: string; nameMn?: string; level?: string; status?: string; gender?: string }) => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: GUIDES_QUERY }],
      });
      if (!result.data?.createGuide) throw new Error('Create failed');
      return result.data.createGuide;
    },
  };
}

export function useUpdateGuide() {
  const [mutate, { loading }] = useMutation<{ updateGuide: GuideRow }>(UPDATE_GUIDE_MUTATION);
  return {
    loading,
    updateGuide: async (id: string, input: Partial<Omit<GuideRow, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const result = await mutate({
        variables: { id, input },
        refetchQueries: [{ query: GUIDES_QUERY }, { query: GUIDE_QUERY, variables: { id } }],
      });
      if (!result.data?.updateGuide) throw new Error('Update failed');
      return result.data.updateGuide;
    },
  };
}

export function useDeleteGuide() {
  const [mutate, { loading }] = useMutation<{ deleteGuide: boolean }>(DELETE_GUIDE_MUTATION);
  return {
    loading,
    deleteGuide: async (id: string) => {
      await mutate({
        variables: { id },
        refetchQueries: [{ query: GUIDES_QUERY }],
      });
    },
  };
}
