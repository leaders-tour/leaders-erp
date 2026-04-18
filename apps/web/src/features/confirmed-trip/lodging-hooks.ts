import { gql, useMutation, useQuery, useApolloClient } from '@apollo/client';

export type LodgingAssignmentType =
  | 'ACCOMMODATION'
  | 'LV1'
  | 'LV2'
  | 'LV3'
  | 'LV4'
  | 'NIGHT_TRAIN'
  | 'CUSTOM_TEXT';

export type LodgingBookingStatus = 'PENDING' | 'REQUESTED' | 'CONFIRMED' | 'CANCELLED';

export interface LodgingConflictWarning {
  conflictingTripId: string;
  conflictingTripLeaderName: string;
  overlapStartDate: string;
  overlapEndDate: string;
}

export interface ConfirmedTripLodgingRow {
  id: string;
  confirmedTripId: string;
  dayIndex: number;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  type: LodgingAssignmentType;
  accommodationId: string | null;
  accommodationOptionId: string | null;
  accommodation: {
    id: string;
    name: string;
    destination: string;
    region: string;
    options: Array<{
      id: string;
      roomType: string;
      level: string;
      imageUrls: string[];
    }>;
  } | null;
  lodgingNameSnapshot: string;
  roomCount: number;
  bookingStatus: LodgingBookingStatus;
  bookingMemo: string | null;
  bookingReference: string | null;
  conflictWarnings: LodgingConflictWarning[];
  createdAt: string;
  updatedAt: string;
}

const LODGING_FRAGMENT = gql`
  fragment LodgingFields on ConfirmedTripLodging {
    id
    confirmedTripId
    dayIndex
    checkInDate
    checkOutDate
    nights
    type
    accommodationId
    accommodationOptionId
    accommodation {
      id
      name
      destination
      region
      options {
        id
        roomType
        level
        imageUrls
      }
    }
    lodgingNameSnapshot
    roomCount
    bookingStatus
    bookingMemo
    bookingReference
    conflictWarnings {
      conflictingTripId
      conflictingTripLeaderName
      overlapStartDate
      overlapEndDate
    }
    createdAt
    updatedAt
  }
`;

const LODGINGS_QUERY = gql`
  ${LODGING_FRAGMENT}
  query ConfirmedTripLodgings($confirmedTripId: ID!) {
    confirmedTrip(id: $confirmedTripId) {
      id
      lodgings {
        ...LodgingFields
      }
    }
  }
`;

const UPSERT_LODGING_MUTATION = gql`
  ${LODGING_FRAGMENT}
  mutation UpsertConfirmedTripLodging($input: ConfirmedTripLodgingUpsertInput!) {
    upsertConfirmedTripLodging(input: $input) {
      ...LodgingFields
    }
  }
`;

const DELETE_LODGING_MUTATION = gql`
  mutation DeleteConfirmedTripLodging($id: ID!) {
    deleteConfirmedTripLodging(id: $id)
  }
`;

const SEED_LODGINGS_MUTATION = gql`
  ${LODGING_FRAGMENT}
  mutation SeedConfirmedTripLodgingsFromPlan($confirmedTripId: ID!) {
    seedConfirmedTripLodgingsFromPlan(confirmedTripId: $confirmedTripId) {
      ...LodgingFields
    }
  }
`;

export function useConfirmedTripLodgings(confirmedTripId: string | undefined) {
  const { data, loading, refetch } = useQuery<{
    confirmedTrip: { id: string; lodgings: ConfirmedTripLodgingRow[] };
  }>(LODGINGS_QUERY, {
    variables: { confirmedTripId },
    skip: !confirmedTripId,
    fetchPolicy: 'cache-and-network',
  });
  return {
    lodgings: data?.confirmedTrip.lodgings ?? [],
    loading,
    refetch,
  };
}

export function useUpsertConfirmedTripLodging(confirmedTripId: string) {
  const client = useApolloClient();
  const [mutate, { loading }] = useMutation<{
    upsertConfirmedTripLodging: ConfirmedTripLodgingRow;
  }>(UPSERT_LODGING_MUTATION);

  return {
    loading,
    upsertLodging: async (input: {
      id?: string;
      confirmedTripId: string;
      dayIndex: number;
      checkInDate: string;
      checkOutDate: string;
      type: LodgingAssignmentType;
      accommodationId?: string | null;
      accommodationOptionId?: string | null;
      lodgingNameSnapshot: string;
      pricePerNightKrw?: number | null;
      roomCount: number;
      bookingStatus?: LodgingBookingStatus;
      bookingMemo?: string | null;
      bookingReference?: string | null;
    }): Promise<ConfirmedTripLodgingRow> => {
      const result = await mutate({ variables: { input } });
      if (!result.data?.upsertConfirmedTripLodging) throw new Error('Upsert failed');
      const saved = result.data.upsertConfirmedTripLodging;

      // 캐시 직접 업데이트 — 저장 즉시 UI 반영
      const cached = client.readQuery<{
        confirmedTrip: { id: string; lodgings: ConfirmedTripLodgingRow[] };
      }>({ query: LODGINGS_QUERY, variables: { confirmedTripId } });

      if (cached) {
        const prev = cached.confirmedTrip.lodgings;
        const exists = prev.some((l) => l.id === saved.id);
        const next = exists
          ? prev.map((l) => (l.id === saved.id ? saved : l))
          : [...prev, saved];
        client.writeQuery({
          query: LODGINGS_QUERY,
          variables: { confirmedTripId },
          data: {
            confirmedTrip: { ...cached.confirmedTrip, lodgings: next },
          },
        });
      } else {
        // 캐시 없으면 refetch
        await client.query({
          query: LODGINGS_QUERY,
          variables: { confirmedTripId },
          fetchPolicy: 'network-only',
        });
      }

      return saved;
    },
  };
}

export function useDeleteConfirmedTripLodging(confirmedTripId: string) {
  const [mutate, { loading }] = useMutation<{ deleteConfirmedTripLodging: boolean }>(
    DELETE_LODGING_MUTATION,
  );

  return {
    loading,
    deleteLodging: async (id: string) => {
      await mutate({
        variables: { id },
        refetchQueries: [{ query: LODGINGS_QUERY, variables: { confirmedTripId } }],
        awaitRefetchQueries: true,
      });
    },
  };
}

export function useSeedConfirmedTripLodgings(confirmedTripId: string) {
  const [mutate, { loading }] = useMutation<{
    seedConfirmedTripLodgingsFromPlan: ConfirmedTripLodgingRow[];
  }>(SEED_LODGINGS_MUTATION);

  return {
    loading,
    seedLodgings: async (): Promise<ConfirmedTripLodgingRow[]> => {
      const result = await mutate({
        variables: { confirmedTripId },
        refetchQueries: [{ query: LODGINGS_QUERY, variables: { confirmedTripId } }],
      });
      return result.data?.seedConfirmedTripLodgingsFromPlan ?? [];
    },
  };
}

export const LODGING_TYPE_LABELS: Record<LodgingAssignmentType, string> = {
  ACCOMMODATION: '기본',
  LV1: 'LV1',
  LV2: 'LV2',
  LV3: 'LV3',
  LV4: 'LV4',
  NIGHT_TRAIN: '야간열차',
  CUSTOM_TEXT: '직접입력',
};

export const LODGING_TYPE_CHIP_STYLES: Record<LodgingAssignmentType, string> = {
  ACCOMMODATION: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  LV1: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  LV2: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  LV3: 'bg-slate-50 text-slate-600 ring-slate-500/20',
  LV4: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  NIGHT_TRAIN: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  CUSTOM_TEXT: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

export const BOOKING_STATUS_LABELS: Record<LodgingBookingStatus, string> = {
  PENDING: '미예약',
  REQUESTED: '예약요청',
  CONFIRMED: '예약확정',
  CANCELLED: '취소',
};

export const BOOKING_STATUS_STYLES: Record<LodgingBookingStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  REQUESTED: 'bg-yellow-50 text-yellow-700',
  CONFIRMED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
};
