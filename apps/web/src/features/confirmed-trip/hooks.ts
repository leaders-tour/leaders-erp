import { gql, useMutation, useQuery } from '@apollo/client';

// ── CalendarNote ──────────────────────────────────────────────────────────────

export type CalendarNoteKind = 'GUEST_HOUSE' | 'PICKUP' | 'DROP' | 'CAMEL_DOLL' | 'CUSTOM';

export interface CalendarNoteRow {
  id: string;
  occursOn: string;
  kind: CalendarNoteKind;
  customText: string | null;
  confirmedTripId: string | null;
  memo: string | null;
  confirmedTrip: {
    id: string;
    planVersion: {
      meta: { leaderName: string } | null;
    } | null;
    user: { name: string };
  } | null;
}

const CALENDAR_NOTE_FRAGMENT = gql`
  fragment CalendarNoteFields on CalendarNote {
    id
    occursOn
    kind
    customText
    confirmedTripId
    memo
    confirmedTrip {
      id
      planVersion {
        meta {
          leaderName
        }
      }
      user {
        name
      }
    }
  }
`;

const CALENDAR_NOTES_QUERY = gql`
  ${CALENDAR_NOTE_FRAGMENT}
  query CalendarNotes($year: Int!, $month: Int!) {
    calendarNotes(year: $year, month: $month) {
      ...CalendarNoteFields
    }
  }
`;

const CREATE_CALENDAR_NOTE_MUTATION = gql`
  ${CALENDAR_NOTE_FRAGMENT}
  mutation CreateCalendarNote($input: CalendarNoteCreateInput!) {
    createCalendarNote(input: $input) {
      ...CalendarNoteFields
    }
  }
`;

const UPDATE_CALENDAR_NOTE_MUTATION = gql`
  ${CALENDAR_NOTE_FRAGMENT}
  mutation UpdateCalendarNote($id: ID!, $input: CalendarNoteUpdateInput!) {
    updateCalendarNote(id: $id, input: $input) {
      ...CalendarNoteFields
    }
  }
`;

const DELETE_CALENDAR_NOTE_MUTATION = gql`
  mutation DeleteCalendarNote($id: ID!) {
    deleteCalendarNote(id: $id)
  }
`;

export function useCalendarNotes(year: number, month: number) {
  const { data, loading, refetch } = useQuery<{ calendarNotes: CalendarNoteRow[] }>(
    CALENDAR_NOTES_QUERY,
    { variables: { year, month }, fetchPolicy: 'cache-and-network' },
  );
  return { notes: data?.calendarNotes ?? [], loading, refetch };
}

export function useCreateCalendarNote() {
  const [mutate, { loading }] = useMutation<{ createCalendarNote: CalendarNoteRow }>(
    CREATE_CALENDAR_NOTE_MUTATION,
  );
  return {
    loading,
    createCalendarNote: async (input: {
      occursOn: string;
      kind: CalendarNoteKind;
      customText?: string | null;
      confirmedTripId?: string | null;
      memo?: string | null;
    }): Promise<CalendarNoteRow> => {
      const result = await mutate({ variables: { input } });
      if (!result.data?.createCalendarNote) throw new Error('Failed to create calendar note');
      return result.data.createCalendarNote;
    },
  };
}

export function useUpdateCalendarNote() {
  const [mutate, { loading }] = useMutation<{ updateCalendarNote: CalendarNoteRow }>(
    UPDATE_CALENDAR_NOTE_MUTATION,
  );
  return {
    loading,
    updateCalendarNote: async (
      id: string,
      input: Partial<{
        occursOn: string;
        kind: CalendarNoteKind;
        customText: string | null;
        confirmedTripId: string | null;
        memo: string | null;
      }>,
    ): Promise<CalendarNoteRow> => {
      const result = await mutate({ variables: { id, input } });
      if (!result.data?.updateCalendarNote) throw new Error('Failed to update calendar note');
      return result.data.updateCalendarNote;
    },
  };
}

export function useDeleteCalendarNote() {
  const [mutate, { loading }] = useMutation<{ deleteCalendarNote: boolean }>(
    DELETE_CALENDAR_NOTE_MUTATION,
  );
  return {
    loading,
    deleteCalendarNote: async (id: string): Promise<boolean> => {
      const result = await mutate({ variables: { id } });
      return result.data?.deleteCalendarNote ?? false;
    },
  };
}

// ── ConfirmedTrip ─────────────────────────────────────────────────────────────

export interface ConfirmedTripRow {
  id: string;
  userId: string;
  planId: string | null;
  planVersionId: string | null;
  status: 'ACTIVE' | 'CANCELLED';
  confirmedAt: string;
  confirmedByEmployeeId: string | null;
  guideName: string | null;
  driverName: string | null;
  assignedVehicle: string | null;
  accommodationNote: string | null;
  operationNote: string | null;
  /** 노션 마이그레이션 데이터용 직접 필드 (planVersion 없을 때 fallback) */
  travelStart: string | null;
  travelEnd: string | null;
  pickupDate: string | null;
  dropDate: string | null;
  destination: string | null;
  paxCount: number | null;
  rentalGear: boolean;
  rentalDrone: boolean;
  rentalStarlink: boolean;
  rentalPowerbank: boolean;
  camelDollPurchased: boolean;
  isRecruitingOpen: boolean;
  depositAmountKrw: number | null;
  balanceAmountKrw: number | null;
  totalAmountKrw: number | null;
  securityDepositAmountKrw: number | null;
  groupTotalAmountKrw: number | null;
  user: {
    id: string;
    name: string;
    email: string | null;
    ownerEmployeeId: string | null;
    ownerEmployee: { id: string; name: string; email: string } | null;
    attachments: { filename: string; url: string; type: string }[];
  };
  plan: {
    id: string;
    title: string;
    regionSet: { id: string; name: string };
  } | null;
  planVersion: {
    id: string;
    versionNumber: number;
    totalDays: number;
    variantType: string;
    meta: {
      leaderName: string;
      documentNumber: string;
      travelStartDate: string;
      travelEndDate: string;
      headcountTotal: number;
      headcountMale: number;
      headcountFemale: number;
      vehicleType: string;
      specialNote: string | null;
      includeRentalItems: boolean;
      rentalItemsText: string;
      remark: string | null;
      pickupDate: string | null;
      dropDate: string | null;
      lodgingSelections: Array<{
        dayIndex: number;
        level: string;
        customLodgingNameSnapshot: string | null;
      }>;
    } | null;
    pricing: {
      totalAmountKrw: number;
      depositAmountKrw: number;
      balanceAmountKrw: number;
      securityDepositAmountKrw: number;
    } | null;
  } | null;
  confirmedByEmployee: { id: string; name: string } | null;
  guide: { id: string; nameKo: string; nameMn: string | null; level: string; profileImageUrl: string | null } | null;
  driver: { id: string; nameMn: string; vehicleType: string; level: string; profileImageUrl: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

const CONFIRMED_TRIP_FRAGMENT = gql`
  fragment ConfirmedTripFields on ConfirmedTrip {
    id
    userId
    planId
    planVersionId
    status
    confirmedAt
    confirmedByEmployeeId
    guideName
    driverName
    assignedVehicle
    accommodationNote
    operationNote
    travelStart
    travelEnd
    pickupDate
    dropDate
    destination
    paxCount
    rentalGear
    rentalDrone
    rentalStarlink
    rentalPowerbank
    camelDollPurchased
    isRecruitingOpen
    depositAmountKrw
    balanceAmountKrw
    totalAmountKrw
    securityDepositAmountKrw
    groupTotalAmountKrw
    user {
      id
      name
      email
      ownerEmployeeId
      ownerEmployee {
        id
        name
        email
      }
      attachments {
        filename
        url
        type
      }
    }
    plan {
      id
      title
      regionSet {
        id
        name
      }
    }
    planVersion {
      id
      versionNumber
      totalDays
      variantType
      meta {
        leaderName
        documentNumber
        travelStartDate
        travelEndDate
        headcountTotal
        headcountMale
        headcountFemale
        vehicleType
        specialNote
        includeRentalItems
        rentalItemsText
        remark
        pickupDate
        dropDate
        lodgingSelections {
          dayIndex
          level
          customLodgingNameSnapshot
        }
      }
      pricing {
        totalAmountKrw
        depositAmountKrw
        balanceAmountKrw
        securityDepositAmountKrw
      }
    }
    confirmedByEmployee {
      id
      name
    }
    guide {
      id
      nameKo
      nameMn
      level
      profileImageUrl
    }
    driver {
      id
      nameMn
      vehicleType
      level
      profileImageUrl
    }
    createdAt
    updatedAt
  }
`;

const CONFIRMED_TRIPS_QUERY = gql`
  ${CONFIRMED_TRIP_FRAGMENT}
  query ConfirmedTrips($status: ConfirmedTripStatus) {
    confirmedTrips(status: $status) {
      ...ConfirmedTripFields
    }
  }
`;

const CONFIRMED_TRIP_QUERY = gql`
  ${CONFIRMED_TRIP_FRAGMENT}
  query ConfirmedTrip($id: ID!) {
    confirmedTrip(id: $id) {
      ...ConfirmedTripFields
    }
  }
`;

const CONFIRM_TRIP_MUTATION = gql`
  ${CONFIRMED_TRIP_FRAGMENT}
  mutation ConfirmTrip($input: ConfirmTripInput!) {
    confirmTrip(input: $input) {
      ...ConfirmedTripFields
    }
  }
`;

const UPDATE_CONFIRMED_TRIP_MUTATION = gql`
  ${CONFIRMED_TRIP_FRAGMENT}
  mutation UpdateConfirmedTrip($id: ID!, $input: ConfirmedTripUpdateInput!) {
    updateConfirmedTrip(id: $id, input: $input) {
      ...ConfirmedTripFields
    }
  }
`;

const CANCEL_CONFIRMED_TRIP_MUTATION = gql`
  ${CONFIRMED_TRIP_FRAGMENT}
  mutation CancelConfirmedTrip($id: ID!) {
    cancelConfirmedTrip(id: $id) {
      ...ConfirmedTripFields
    }
  }
`;

const CREATE_CONFIRMED_TRIP_DIRECT_MUTATION = gql`
  ${CONFIRMED_TRIP_FRAGMENT}
  mutation CreateConfirmedTripDirect($input: CreateConfirmedTripDirectInput!) {
    createConfirmedTrip(input: $input) {
      ...ConfirmedTripFields
    }
  }
`;

export function useConfirmedTrips(status?: 'ACTIVE' | 'CANCELLED') {
  const { data, loading, refetch } = useQuery<{ confirmedTrips: ConfirmedTripRow[] }>(
    CONFIRMED_TRIPS_QUERY,
    { variables: { status }, fetchPolicy: 'cache-and-network' },
  );
  return { trips: data?.confirmedTrips ?? [], loading, refetch };
}

export function useConfirmedTrip(id: string | undefined) {
  const { data, loading, refetch } = useQuery<{ confirmedTrip: ConfirmedTripRow }>(
    CONFIRMED_TRIP_QUERY,
    { variables: { id }, skip: !id },
  );
  return { trip: data?.confirmedTrip ?? null, loading, refetch };
}

export function useConfirmTrip() {
  const [mutate, { loading }] = useMutation<{ confirmTrip: ConfirmedTripRow }>(CONFIRM_TRIP_MUTATION);

  return {
    loading,
    confirmTrip: async (input: {
      planId: string;
      planVersionId: string;
      confirmedByEmployeeId?: string;
    }): Promise<ConfirmedTripRow> => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: CONFIRMED_TRIPS_QUERY }],
      });
      if (!result.data?.confirmTrip) {
        throw new Error('Failed to confirm trip');
      }
      return result.data.confirmTrip;
    },
  };
}

export function useUpdateConfirmedTrip() {
  const [mutate, { loading }] = useMutation<{ updateConfirmedTrip: ConfirmedTripRow }>(
    UPDATE_CONFIRMED_TRIP_MUTATION,
  );

  return {
    loading,
    updateConfirmedTrip: async (
      id: string,
      input: {
        guideName?: string | null;
        driverName?: string | null;
        guideId?: string | null;
        driverId?: string | null;
        assignedVehicle?: string | null;
        accommodationNote?: string | null;
        operationNote?: string | null;
        status?: 'ACTIVE' | 'CANCELLED';
        camelDollPurchased?: boolean;
        pickupDate?: string | null;
        dropDate?: string | null;
      },
    ): Promise<ConfirmedTripRow> => {
      const result = await mutate({
        variables: { id, input },
        refetchQueries: [
          { query: CONFIRMED_TRIPS_QUERY },
          { query: CONFIRMED_TRIP_QUERY, variables: { id } },
        ],
      });
      if (!result.data?.updateConfirmedTrip) {
        throw new Error('Failed to update confirmed trip');
      }
      return result.data.updateConfirmedTrip;
    },
  };
}

export function useCancelConfirmedTrip() {
  const [mutate, { loading }] = useMutation<{ cancelConfirmedTrip: ConfirmedTripRow }>(
    CANCEL_CONFIRMED_TRIP_MUTATION,
  );

  return {
    loading,
    cancelConfirmedTrip: async (id: string): Promise<ConfirmedTripRow> => {
      const result = await mutate({
        variables: { id },
        refetchQueries: [
          { query: CONFIRMED_TRIPS_QUERY },
          { query: CONFIRMED_TRIP_QUERY, variables: { id } },
        ],
      });
      if (!result.data?.cancelConfirmedTrip) {
        throw new Error('Failed to cancel confirmed trip');
      }
      return result.data.cancelConfirmedTrip;
    },
  };
}

export function useCreateConfirmedTripDirect() {
  const [mutate, { loading }] = useMutation<{ createConfirmedTrip: ConfirmedTripRow }>(
    CREATE_CONFIRMED_TRIP_DIRECT_MUTATION,
  );

  return {
    loading,
    createConfirmedTripDirect: async (input: {
      userId: string;
      travelStart?: string | null;
      travelEnd?: string | null;
      destination?: string | null;
      paxCount?: number | null;
      totalAmountKrw?: number | null;
      depositAmountKrw?: number | null;
      balanceAmountKrw?: number | null;
      securityDepositAmountKrw?: number | null;
      confirmedByEmployeeId?: string | null;
    }): Promise<ConfirmedTripRow> => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: CONFIRMED_TRIPS_QUERY }],
      });
      if (!result.data?.createConfirmedTrip) {
        throw new Error('Failed to create confirmed trip');
      }
      return result.data.createConfirmedTrip;
    },
  };
}

// ── 헬퍼: trip에서 여행 시작/종료 날짜를 가져옵니다 (planVersion.meta 또는 직접 필드) ──

export function getTripStartDate(trip: ConfirmedTripRow): string | null {
  return trip.planVersion?.meta?.travelStartDate ?? trip.travelStart ?? null;
}

export function getTripEndDate(trip: ConfirmedTripRow): string | null {
  return trip.planVersion?.meta?.travelEndDate ?? trip.travelEnd ?? null;
}

export function getTripLeaderName(trip: ConfirmedTripRow): string {
  return trip.planVersion?.meta?.leaderName ?? trip.user.name;
}

export function getTripHeadcount(trip: ConfirmedTripRow): number | null {
  return trip.planVersion?.meta?.headcountTotal ?? trip.paxCount ?? null;
}

export function getTripDestination(trip: ConfirmedTripRow): string {
  return trip.plan?.regionSet.name ?? trip.destination ?? '-';
}

export function getTripPickupDate(trip: ConfirmedTripRow): string | null {
  return trip.planVersion?.meta?.pickupDate ?? trip.pickupDate ?? null;
}

export function getTripDropDate(trip: ConfirmedTripRow): string | null {
  return trip.planVersion?.meta?.dropDate ?? trip.dropDate ?? null;
}
