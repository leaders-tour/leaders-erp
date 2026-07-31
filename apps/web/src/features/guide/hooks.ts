import { gql, useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { useAuth } from '../auth/context';
import { runUploadMutation } from '../../lib/upload-mutation';
import { CONFIRMED_TRIP_FRAGMENT, type ConfirmedTripRow } from '../confirmed-trip/hooks';

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
  leaderstepsAuthUserId: string | null;
  leaderstepsAuthLinkedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderstepsAuthUserRow {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  linkedGuideId: string | null;
  linkedGuideNameKo: string | null;
  linkedGuideNameMn: string | null;
}

export interface GuideLocationPointRow {
  latitude: number;
  longitude: number;
  accuracy: number;
  recordedAt: string;
  projectId: string;
}

export interface GuideLiveLocationRow {
  guideId: string;
  guideNameKo: string;
  guideNameMn: string | null;
  profileImageUrl: string | null;
  latestLatitude: number;
  latestLongitude: number;
  latestAccuracy: number;
  latestRecordedAt: string;
  path: GuideLocationPointRow[];
  projectIds: string[];
}

export interface LeaderstepsActiveProjectRow {
  id: string;
  name: string;
  startedAt: string;
  scheduledEndedAt: string;
  endedAt: string | null;
  isActive: boolean;
}

export interface GuidePlaceVisitRow {
  id: string;
  projectId: string;
  centerLatitude: number;
  centerLongitude: number;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  radiusMeters: number;
  pointCount: number;
  pinType: string | null;
  description: string | null;
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
    leaderstepsAuthUserId
    leaderstepsAuthLinkedAt
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

const LEADERSTEPS_AUTH_USERS_QUERY = gql`
  query LeaderstepsAuthUsers {
    leaderstepsAuthUsers {
      id
      email
      phone
      displayName
      createdAt
      lastSignInAt
      linkedGuideId
      linkedGuideNameKo
      linkedGuideNameMn
    }
  }
`;

const LEADERSTEPS_ACTIVE_PROJECTS_QUERY = gql`
  query LeaderstepsActiveProjects($date: String) {
    leaderstepsActiveProjects(date: $date) {
      id
      name
      startedAt
      scheduledEndedAt
      endedAt
      isActive
    }
  }
`;

const GUIDE_LIVE_LOCATIONS_QUERY = gql`
  query GuideLiveLocations($projectId: ID, $date: String) {
    guideLiveLocations(projectId: $projectId, date: $date) {
      guideId
      guideNameKo
      guideNameMn
      profileImageUrl
      latestLatitude
      latestLongitude
      latestAccuracy
      latestRecordedAt
      projectIds
      path {
        latitude
        longitude
        accuracy
        recordedAt
        projectId
      }
    }
  }
`;

const GUIDE_PLACE_VISITS_QUERY = gql`
  query GuidePlaceVisits($guideId: ID!, $projectId: ID, $date: String) {
    guidePlaceVisits(guideId: $guideId, projectId: $projectId, date: $date) {
      id
      projectId
      centerLatitude
      centerLongitude
      startedAt
      endedAt
      durationMs
      radiusMeters
      pointCount
      pinType
      description
    }
  }
`;

const LINK_GUIDE_LEADERSTEPS_AUTH_MUTATION = gql`
  ${GUIDE_FRAGMENT}
  mutation LinkGuideLeaderstepsAuth($guideId: ID!, $authUserId: ID!) {
    linkGuideLeaderstepsAuth(guideId: $guideId, authUserId: $authUserId) {
      ...GuideFields
    }
  }
`;

const UNLINK_GUIDE_LEADERSTEPS_AUTH_MUTATION = gql`
  ${GUIDE_FRAGMENT}
  mutation UnlinkGuideLeaderstepsAuth($guideId: ID!) {
    unlinkGuideLeaderstepsAuth(guideId: $guideId) {
      ...GuideFields
    }
  }
`;

const GUIDE_FIELDS = `
  id nameKo nameMn level status gender birthYear isSmoker
  experienceYears joinYear phone profileImageUrl certImageUrls note
  leaderstepsAuthUserId leaderstepsAuthLinkedAt createdAt updatedAt
`;

const UPLOAD_GUIDE_PROFILE_IMAGE_MUTATION_STR = `
  mutation UploadGuideProfileImage($id: ID!, $image: Upload!) {
    uploadGuideProfileImage(id: $id, image: $image) {
      ${GUIDE_FIELDS}
    }
  }
`;

const UPLOAD_GUIDE_CERT_IMAGES_MUTATION_STR = `
  mutation UploadGuideCertImages($id: ID!, $images: [Upload!]!) {
    uploadGuideCertImages(id: $id, images: $images) {
      ${GUIDE_FIELDS}
    }
  }
`;

const REMOVE_GUIDE_CERT_IMAGE_MUTATION = gql`
  ${GUIDE_FRAGMENT}
  mutation RemoveGuideCertImage($id: ID!, $imageUrl: String!) {
    removeGuideCertImage(id: $id, imageUrl: $imageUrl) {
      ...GuideFields
    }
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

export function useLeaderstepsAuthUsers() {
  const { data, loading, error, refetch } = useQuery<{
    leaderstepsAuthUsers: LeaderstepsAuthUserRow[];
  }>(LEADERSTEPS_AUTH_USERS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });
  return {
    authUsers: data?.leaderstepsAuthUsers ?? [],
    loading,
    errorMessage: error?.message ?? null,
    refetch,
  };
}

export function useLeaderstepsActiveProjects(date?: string) {
  const { data, loading, error, refetch } = useQuery<{
    leaderstepsActiveProjects: LeaderstepsActiveProjectRow[];
  }>(LEADERSTEPS_ACTIVE_PROJECTS_QUERY, {
    variables: { date: date || null },
    fetchPolicy: 'cache-and-network',
  });

  return {
    projects: data?.leaderstepsActiveProjects ?? [],
    loading,
    errorMessage: error?.message ?? null,
    refetch,
  };
}

export function useGuideLiveLocations(options?: { projectId?: string; date?: string }) {
  const { data, loading, error, refetch, networkStatus } = useQuery<{
    guideLiveLocations: GuideLiveLocationRow[];
  }>(GUIDE_LIVE_LOCATIONS_QUERY, {
    variables: {
      projectId: options?.projectId || null,
      date: options?.date || null,
    },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    pollInterval: 60_000,
  });

  return {
    locations: data?.guideLiveLocations ?? [],
    loading: loading && !data,
    refreshing: networkStatus === 4,
    errorMessage: error?.message ?? null,
    refetch,
  };
}

export function useGuidePlaceVisits(options?: {
  guideId?: string;
  projectId?: string;
  date?: string;
}) {
  const { data, loading, error } = useQuery<{ guidePlaceVisits: GuidePlaceVisitRow[] }>(
    GUIDE_PLACE_VISITS_QUERY,
    {
      variables: {
        guideId: options?.guideId ?? '',
        projectId: options?.projectId || null,
        date: options?.date || null,
      },
      skip: !options?.guideId,
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    placeVisits: data?.guidePlaceVisits ?? [],
    loading,
    errorMessage: error?.message ?? null,
  };
}

export function useGuideLeaderstepsAuthLink() {
  const [linkMutation, { loading: linking }] = useMutation<{
    linkGuideLeaderstepsAuth: GuideRow;
  }>(LINK_GUIDE_LEADERSTEPS_AUTH_MUTATION);
  const [unlinkMutation, { loading: unlinking }] = useMutation<{
    unlinkGuideLeaderstepsAuth: GuideRow;
  }>(UNLINK_GUIDE_LEADERSTEPS_AUTH_MUTATION);

  return {
    loading: linking || unlinking,
    link: async (guideId: string, authUserId: string) => {
      const result = await linkMutation({
        variables: { guideId, authUserId },
        refetchQueries: [{ query: GUIDES_QUERY }, { query: LEADERSTEPS_AUTH_USERS_QUERY }],
        awaitRefetchQueries: true,
      });
      if (!result.data?.linkGuideLeaderstepsAuth) {
        throw new Error('Leadersteps 계정 연결에 실패했습니다.');
      }
      return result.data.linkGuideLeaderstepsAuth;
    },
    unlink: async (guideId: string) => {
      const result = await unlinkMutation({
        variables: { guideId },
        refetchQueries: [{ query: GUIDES_QUERY }, { query: LEADERSTEPS_AUTH_USERS_QUERY }],
        awaitRefetchQueries: true,
      });
      if (!result.data?.unlinkGuideLeaderstepsAuth) {
        throw new Error('Leadersteps 계정 연결 해제에 실패했습니다.');
      }
      return result.data.unlinkGuideLeaderstepsAuth;
    },
  };
}

export function useUploadGuideProfileImage() {
  const { ensureAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  return {
    loading,
    uploadProfileImage: async (id: string, image: File) => {
      setLoading(true);
      try {
        const accessToken = await ensureAccessToken();
        const data = await runUploadMutation<{ uploadGuideProfileImage: GuideRow }>(
          UPLOAD_GUIDE_PROFILE_IMAGE_MUTATION_STR,
          { id, image: null },
          [image],
          ['variables.image'],
          accessToken,
        );
        return data.uploadGuideProfileImage;
      } finally {
        setLoading(false);
      }
    },
  };
}

export function useUploadGuideCertImages() {
  const { ensureAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  return {
    loading,
    uploadCertImages: async (id: string, images: File[]) => {
      setLoading(true);
      try {
        const accessToken = await ensureAccessToken();
        const data = await runUploadMutation<{ uploadGuideCertImages: GuideRow }>(
          UPLOAD_GUIDE_CERT_IMAGES_MUTATION_STR,
          { id, images: images.map(() => null) },
          images,
          images.map((_, i) => `variables.images.${i}`),
          accessToken,
        );
        return data.uploadGuideCertImages;
      } finally {
        setLoading(false);
      }
    },
  };
}

export function useRemoveGuideCertImage() {
  const [mutate, { loading }] = useMutation<{ removeGuideCertImage: GuideRow }>(
    REMOVE_GUIDE_CERT_IMAGE_MUTATION,
  );
  return {
    loading,
    removeCertImage: async (id: string, imageUrl: string) => {
      const result = await mutate({ variables: { id, imageUrl } });
      if (!result.data?.removeGuideCertImage) throw new Error('Remove failed');
      return result.data.removeGuideCertImage;
    },
  };
}

// ── Guide Trips (배정 이력 + 예정 여행) ───────────────────────────────────────

const GUIDE_TRIPS_QUERY = gql`
  ${CONFIRMED_TRIP_FRAGMENT}
  query GuideTrips($id: ID!, $includeCancelled: Boolean) {
    guide(id: $id) {
      id
      confirmedTrips(includeCancelled: $includeCancelled) {
        ...ConfirmedTripFields
      }
    }
  }
`;

export function useGuideTrips(id: string | undefined, includeCancelled = false) {
  const { data, loading, refetch } = useQuery<{
    guide: { id: string; confirmedTrips: ConfirmedTripRow[] };
  }>(GUIDE_TRIPS_QUERY, {
    variables: { id, includeCancelled },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  return {
    trips: data?.guide?.confirmedTrips ?? [],
    loading,
    refetch,
  };
}

// ── Guides + 배정 여행 (캘린더 조망용) ─────────────────────────────────────

export interface TripSlim {
  id: string;
  status: 'ACTIVE' | 'CANCELLED';
  travelStart: string | null;
  travelEnd: string | null;
  destination: string | null;
  user: { name: string };
  planVersion: {
    meta: {
      travelStartDate: string;
      travelEndDate: string;
    } | null;
  } | null;
}

export interface GuideWithTrips extends GuideRow {
  confirmedTrips: TripSlim[];
}

const GUIDES_WITH_TRIPS_QUERY = gql`
  query GuidesWithTrips($status: GuideStatus, $level: GuideLevel) {
    guides(status: $status, level: $level) {
      id
      nameKo
      nameMn
      level
      status
      profileImageUrl
      confirmedTrips {
        id
        status
        travelStart
        travelEnd
        destination
        user {
          name
        }
        planVersion {
          meta {
            travelStartDate
            travelEndDate
          }
        }
      }
    }
  }
`;

export function useGuidesWithTrips(filters?: { status?: string; level?: string }) {
  const { data, loading, refetch } = useQuery<{ guides: GuideWithTrips[] }>(
    GUIDES_WITH_TRIPS_QUERY,
    {
      variables: { status: filters?.status, level: filters?.level },
      fetchPolicy: 'cache-and-network',
    },
  );
  return { guides: data?.guides ?? [], loading, refetch };
}
