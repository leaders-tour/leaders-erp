import { gql, useMutation, useQuery } from '@apollo/client';

import type { ExternalTransfer, ExternalTransferTeamLike } from '../plan/external-transfer';
import type { PlanVersionPricingRow } from '../plan/hooks';
import type { ConfirmationDocumentSnapshot } from '../confirmation/model/types';
import { PLAN_VERSION_PRICING_EFFECTIVE_FIELDS_FRAGMENT } from '../plan/plan-version-pricing-fragment';

// ── CalendarNote ──────────────────────────────────────────────────────────────

export type CalendarNoteKind =
  | 'GUEST_HOUSE'
  | 'PICKUP'
  | 'DROP'
  | 'CAMEL_DOLL'
  | 'CUSTOM'
  | 'NOMADIC_SHOW';

export interface CalendarNoteRow {
  id: string;
  occursOn: string;
  kind: CalendarNoteKind;
  customText: string | null;
  timeText: string | null;
  headcount: number | null;
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
    timeText
    headcount
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

export const CONFIRMED_TRIP_CALENDAR_NOTES_QUERY = gql`
  ${CALENDAR_NOTE_FRAGMENT}
  query ConfirmedTripCalendarNotes($confirmedTripId: ID!) {
    confirmedTripCalendarNotes(confirmedTripId: $confirmedTripId) {
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

export function useConfirmedTripCalendarNotes(confirmedTripId: string | undefined) {
  const { data, loading, refetch } = useQuery<{ confirmedTripCalendarNotes: CalendarNoteRow[] }>(
    CONFIRMED_TRIP_CALENDAR_NOTES_QUERY,
    { variables: { confirmedTripId: confirmedTripId ?? '' }, skip: !confirmedTripId, fetchPolicy: 'cache-and-network' },
  );
  return { notes: data?.confirmedTripCalendarNotes ?? [], loading, refetch };
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
      timeText?: string | null;
      headcount?: number | null;
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
        timeText: string | null;
        headcount: number | null;
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

// ── ConfirmedTripNote ────────────────────────────────────────────────────────

export interface ConfirmedTripNoteRow {
  id: string;
  confirmedTripId: string;
  content: string;
  createdByEmployeeId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

const CONFIRMED_TRIP_NOTE_FRAGMENT = gql`
  fragment ConfirmedTripNoteFields on ConfirmedTripNote {
    id
    confirmedTripId
    content
    createdByEmployeeId
    createdByName
    createdAt
    updatedAt
  }
`;

export const CONFIRMED_TRIP_NOTES_QUERY = gql`
  ${CONFIRMED_TRIP_NOTE_FRAGMENT}
  query ConfirmedTripNotes($confirmedTripId: ID!) {
    confirmedTripNotes(confirmedTripId: $confirmedTripId) {
      ...ConfirmedTripNoteFields
    }
  }
`;

const CREATE_CONFIRMED_TRIP_NOTE_MUTATION = gql`
  ${CONFIRMED_TRIP_NOTE_FRAGMENT}
  mutation CreateConfirmedTripNote($input: ConfirmedTripNoteCreateInput!) {
    createConfirmedTripNote(input: $input) {
      ...ConfirmedTripNoteFields
    }
  }
`;

const UPDATE_CONFIRMED_TRIP_NOTE_MUTATION = gql`
  ${CONFIRMED_TRIP_NOTE_FRAGMENT}
  mutation UpdateConfirmedTripNote($id: ID!, $input: ConfirmedTripNoteUpdateInput!) {
    updateConfirmedTripNote(id: $id, input: $input) {
      ...ConfirmedTripNoteFields
    }
  }
`;

const DELETE_CONFIRMED_TRIP_NOTE_MUTATION = gql`
  mutation DeleteConfirmedTripNote($id: ID!) {
    deleteConfirmedTripNote(id: $id)
  }
`;

export function useConfirmedTripNotes(confirmedTripId: string | undefined) {
  const { data, loading, refetch } = useQuery<{ confirmedTripNotes: ConfirmedTripNoteRow[] }>(
    CONFIRMED_TRIP_NOTES_QUERY,
    {
      variables: { confirmedTripId: confirmedTripId ?? '' },
      skip: !confirmedTripId,
      fetchPolicy: 'cache-and-network',
    },
  );
  return { notes: data?.confirmedTripNotes ?? [], loading, refetch };
}

export function useCreateConfirmedTripNote() {
  const [mutate, { loading }] = useMutation<{ createConfirmedTripNote: ConfirmedTripNoteRow }>(
    CREATE_CONFIRMED_TRIP_NOTE_MUTATION,
  );
  return {
    loading,
    createConfirmedTripNote: async (input: { confirmedTripId: string; content: string }): Promise<ConfirmedTripNoteRow> => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: CONFIRMED_TRIP_NOTES_QUERY, variables: { confirmedTripId: input.confirmedTripId } }],
      });
      if (!result.data?.createConfirmedTripNote) throw new Error('Failed to create confirmed trip note');
      return result.data.createConfirmedTripNote;
    },
  };
}

export function useUpdateConfirmedTripNote() {
  const [mutate, { loading }] = useMutation<{ updateConfirmedTripNote: ConfirmedTripNoteRow }>(
    UPDATE_CONFIRMED_TRIP_NOTE_MUTATION,
  );
  return {
    loading,
    updateConfirmedTripNote: async (id: string, content: string): Promise<ConfirmedTripNoteRow> => {
      const result = await mutate({ variables: { id, input: { content } } });
      if (!result.data?.updateConfirmedTripNote) throw new Error('Failed to update confirmed trip note');
      return result.data.updateConfirmedTripNote;
    },
  };
}

export function useDeleteConfirmedTripNote() {
  const [mutate, { loading }] = useMutation<{ deleteConfirmedTripNote: boolean }>(
    DELETE_CONFIRMED_TRIP_NOTE_MUTATION,
  );
  return {
    loading,
    deleteConfirmedTripNote: async (id: string): Promise<boolean> => {
      const result = await mutate({ variables: { id } });
      return result.data?.deleteConfirmedTripNote ?? false;
    },
  };
}

// ── ConfirmedTrip ─────────────────────────────────────────────────────────────

export interface ConfirmedTripGuideAssignmentRow {
  id: string;
  confirmedTripId: string;
  guideId: string;
  sortOrder: number;
  nameSnapshot: string | null;
  guide: {
    id: string;
    nameKo: string;
    nameMn: string | null;
    level: string;
    profileImageUrl: string | null;
  };
}

export interface ConfirmedTripDriverAssignmentRow {
  id: string;
  confirmedTripId: string;
  driverId: string;
  sortOrder: number;
  nameSnapshot: string | null;
  driver: {
    id: string;
    nameMn: string;
    vehicleType: string;
    level: string;
    profileImageUrl: string | null;
  };
}

export interface ConfirmedTripKoreaTeamStageOptionRow {
  id: string;
  label: string;
  colorTone: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConfirmedTripPostTripTaskOptionRow {
  id: string;
  label: string;
  colorTone: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TourListRentalItem = 'DRONE' | 'STARLINK' | 'POWERBANK';

export interface RentalItemAvailabilityRow {
  item: TourListRentalItem;
  label: string;
  total: number;
  used: number;
  available: number;
  conflicts: Array<{
    confirmedTripId: string;
    excluded: boolean;
    leaderName: string;
    travelStartDate: string;
    travelEndDate: string;
  }>;
}

/** `PlanVersionMeta.transportGroups` — 확정 건 상세 픽드랍 표시용 최소 필드 */
export type PlanPickupDropPlaceType = 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';

export interface PlanVersionTransportGroupRow {
  orderIndex: number;
  teamName: string;
  headcount: number;
  flightInDate: string | null;
  flightInTime: string | null;
  flightOutDate: string | null;
  flightOutTime: string | null;
  pickupDate: string | null;
  pickupTime: string | null;
  pickupPlaceType: PlanPickupDropPlaceType | null;
  pickupPlaceCustomText: string | null;
  dropDate: string | null;
  dropTime: string | null;
  dropPlaceType: PlanPickupDropPlaceType | null;
  dropPlaceCustomText: string | null;
}

export interface ConfirmedTripRow {
  id: string;
  userId: string;
  planId: string | null;
  planVersionId: string | null;
  status: 'ACTIVE' | 'CANCELLED';
  confirmedAt: string;
  confirmedByEmployeeId: string | null;
  assignedVehicle: string | null;
  accommodationNote: string | null;
  operationNote: string | null;
  openChatUrl: string | null;
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
    /** 상세·파일 등에서만 조회 (투어 리스트 목록 쿼리에서는 생략 가능) */
    attachments?: { filename: string; url: string; type: string }[];
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
    regionSet: { id: string; name: string };
    meta: {
      leaderName: string;
      documentNumber: string;
      travelStartDate: string;
      travelEndDate: string;
      headcountTotal: number;
      headcountMale: number;
      headcountFemale: number;
      vehicleType: string;
      vehicleAssignments?: Array<{ vehicleType: string; count: number }> | null;
      specialNote: string | null;
      includeRentalItems: boolean;
      rentalItemsText: string;
      events: Array<{
        id: string;
        name: string;
      }>;
      remark: string | null;
      pickupDate: string | null;
      pickupTime: string | null;
      dropDate: string | null;
      dropTime: string | null;
      pickupPlaceType: PlanPickupDropPlaceType | null;
      pickupPlaceCustomText: string | null;
      dropPlaceType: PlanPickupDropPlaceType | null;
      dropPlaceCustomText: string | null;
      /** 목록 쿼리에서 생략될 수 있음 → 캘린더 실외 픽드랍 표시 시 빈 배열로 취급 */
      externalTransfers?: ExternalTransfer[];
      transportGroups?: PlanVersionTransportGroupRow[];
      extraLodgings: Array<{
        dayIndex: number;
        lodgingCount: number;
      }>;
      lodgingSelections: Array<{
        dayIndex: number;
        level: string;
        customLodgingNameSnapshot: string | null;
      }>;
    } | null;
    /** 상세는 `rowType`만, 목록은 진행 목적지 표시용 최소 필드 포함 */
    planStops?: Array<{
      rowType?: 'MAIN' | 'EXTERNAL_TRANSFER' | null;
      dateCellText?: string;
      destinationCellText?: string;
    }>;
    pricing?: PlanVersionPricingRow | null;
  } | null;
  confirmedByEmployee: { id: string; name: string } | null;
  guideAssignments: ConfirmedTripGuideAssignmentRow[];
  driverAssignments: ConfirmedTripDriverAssignmentRow[];
  koreaTeamStages: ConfirmedTripKoreaTeamStageOptionRow[];
  postTripTasks: ConfirmedTripPostTripTaskOptionRow[];
  lodgings: Array<{
    id: string;
    dayIndex: number;
    lodgingNameSnapshot: string;
    roomCount: number;
    accommodation: {
      id: string;
      name: string;
      coverImageUrl: string | null;
      /** 목록에서는 생략하고 `coverImageUrl`만 사용할 수 있음 */
      options?: Array<{
        id: string;
        imageUrls: string[];
      }>;
    } | null;
  }>;
  latestPublishedConfirmationDocument?: {
    id: string;
    versionNumber: number;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    publishedAt: string | null;
    snapshot: ConfirmationDocumentSnapshot;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export const CONFIRMED_TRIP_FRAGMENT = gql`
  ${PLAN_VERSION_PRICING_EFFECTIVE_FIELDS_FRAGMENT}
  fragment ConfirmedTripFields on ConfirmedTrip {
    id
    userId
    planId
    planVersionId
    status
    confirmedAt
    confirmedByEmployeeId
    assignedVehicle
    accommodationNote
    operationNote
    openChatUrl
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
      regionSet {
        id
        name
      }
      meta {
        leaderName
        documentNumber
        travelStartDate
        travelEndDate
        headcountTotal
        headcountMale
        headcountFemale
        vehicleType
        vehicleAssignments {
          vehicleType
          count
        }
        specialNote
        includeRentalItems
        rentalItemsText
        events {
          id
          name
        }
        remark
        pickupDate
        pickupTime
        dropDate
        dropTime
        pickupPlaceType
        pickupPlaceCustomText
        dropPlaceType
        dropPlaceCustomText
        externalTransfers {
          direction
          presetCode
          travelDate
          departureTime
          arrivalTime
          departurePlace
          arrivalPlace
          selectedTeamOrderIndexes
        }
        transportGroups {
          orderIndex
          teamName
          headcount
          flightInDate
          flightInTime
          flightOutDate
          flightOutTime
          pickupDate
          pickupTime
          pickupPlaceType
          pickupPlaceCustomText
          dropDate
          dropTime
          dropPlaceType
          dropPlaceCustomText
        }
        extraLodgings {
          dayIndex
          lodgingCount
        }
        lodgingSelections {
          dayIndex
          level
          customLodgingNameSnapshot
        }
      }
      planStops {
        rowType
        dateCellText
        destinationCellText
      }
      pricing {
        ...PlanVersionPricingEffectiveFields
      }
    }
    confirmedByEmployee {
      id
      name
    }
    guideAssignments {
      id
      confirmedTripId
      guideId
      sortOrder
      nameSnapshot
      guide {
        id
        nameKo
        nameMn
        level
        profileImageUrl
      }
    }
    driverAssignments {
      id
      confirmedTripId
      driverId
      sortOrder
      nameSnapshot
      driver {
        id
        nameMn
        vehicleType
        level
        profileImageUrl
      }
    }
    koreaTeamStages {
      id
      label
      colorTone
      sortOrder
      isActive
      createdAt
      updatedAt
    }
    postTripTasks {
      id
      label
      colorTone
      sortOrder
      isActive
      createdAt
      updatedAt
    }
    lodgings {
      id
      dayIndex
      lodgingNameSnapshot
      roomCount
      accommodation {
        id
        name
        coverImageUrl
        options {
          id
          imageUrls
        }
      }
    }
    latestPublishedConfirmationDocument {
      id
      versionNumber
      status
      publishedAt
      snapshot {
        leaderName
        documentNumber
        destination
        headcountText
        travelPeriodText
        vehicleType
        flightInText
        flightOutText
        pickupText
        dropText
        externalPickupDropText
        specialNote
        rentalItemsText
        eventNames
        remark
        balancePerPersonText
        guideName
        meetingPlace
        travelers {
          name
          gender
          birthCode
          note
        }
        accommodationLines
      }
    }
    createdAt
    updatedAt
  }
`;

/** 투어 리스트 등 테이블·캘린더 요약용 — 견적 라인·일정 스탑·첨부 등 무거운 필드 제외 */
export const CONFIRMED_TRIP_LIST_FRAGMENT = gql`
  fragment ConfirmedTripListFields on ConfirmedTrip {
    id
    userId
    planId
    planVersionId
    status
    confirmedAt
    confirmedByEmployeeId
    assignedVehicle
    accommodationNote
    operationNote
    openChatUrl
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
      regionSet {
        id
        name
      }
      meta {
        leaderName
        documentNumber
        travelStartDate
        travelEndDate
        headcountTotal
        headcountMale
        headcountFemale
        vehicleType
        vehicleAssignments {
          vehicleType
          count
        }
        specialNote
        includeRentalItems
        rentalItemsText
        remark
        pickupDate
        dropDate
        extraLodgings {
          dayIndex
          lodgingCount
        }
        lodgingSelections {
          dayIndex
          level
          customLodgingNameSnapshot
        }
        externalTransfers {
          direction
          presetCode
          travelDate
          departureTime
          arrivalTime
          departurePlace
          arrivalPlace
          selectedTeamOrderIndexes
        }
        transportGroups {
          orderIndex
          teamName
          headcount
          flightInDate
          flightInTime
          flightOutDate
          flightOutTime
          pickupDate
          pickupTime
          pickupPlaceType
          pickupPlaceCustomText
          dropDate
          dropTime
          dropPlaceType
          dropPlaceCustomText
        }
      }
      planStops {
        rowType
        dateCellText
        destinationCellText
      }
    }
    confirmedByEmployee {
      id
      name
    }
    guideAssignments {
      id
      confirmedTripId
      guideId
      sortOrder
      nameSnapshot
      guide {
        id
        nameKo
        nameMn
        level
        profileImageUrl
      }
    }
    driverAssignments {
      id
      confirmedTripId
      driverId
      sortOrder
      nameSnapshot
      driver {
        id
        nameMn
        vehicleType
        level
        profileImageUrl
      }
    }
    koreaTeamStages {
      id
      label
      colorTone
      sortOrder
      isActive
      createdAt
      updatedAt
    }
    postTripTasks {
      id
      label
      colorTone
      sortOrder
      isActive
      createdAt
      updatedAt
    }
    lodgings {
      id
      dayIndex
      lodgingNameSnapshot
      roomCount
      accommodation {
        id
        name
        coverImageUrl
      }
    }
    createdAt
    updatedAt
  }
`;

const CONFIRMED_TRIPS_QUERY = gql`
  ${CONFIRMED_TRIP_LIST_FRAGMENT}
  query ConfirmedTrips($status: ConfirmedTripStatus) {
    confirmedTrips(status: $status) {
      ...ConfirmedTripListFields
    }
  }
`;

const RENTAL_ITEM_AVAILABILITY_QUERY = gql`
  query RentalItemAvailability($input: RentalItemAvailabilityInput!) {
    rentalItemAvailability(input: $input) {
      item
      label
      total
      used
      available
      conflicts {
        confirmedTripId
        excluded
        leaderName
        travelStartDate
        travelEndDate
      }
    }
  }
`;

const ACTIVE_CONFIRMED_TRIP_BY_PLAN_VERSION_QUERY = gql`
  query ActiveConfirmedTripByPlanVersion($planVersionId: ID!) {
    activeConfirmedTripByPlanVersion(planVersionId: $planVersionId) {
      id
      planVersionId
      status
    }
  }
`;

const ACTIVE_CONFIRMED_TRIP_BY_PLAN_QUERY = gql`
  query ActiveConfirmedTripByPlan($planId: ID!) {
    activeConfirmedTripByPlan(planId: $planId) {
      id
      planVersionId
      status
      planVersion {
        versionNumber
      }
    }
  }
`;

/** 목록 캐시 무효화 시 변수까지 맞춰야 동일 쿼리가 갱신됩니다. */
export const CONFIRMED_TRIPS_ACTIVE_REFETCH = {
  query: CONFIRMED_TRIPS_QUERY,
  variables: { status: 'ACTIVE' as const },
};

export const CONFIRMED_TRIP_QUERY = gql`
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

const KOREA_TEAM_STAGE_OPTIONS_QUERY = gql`
  query ConfirmedTripKoreaTeamStageOptions($activeOnly: Boolean = true) {
    confirmedTripKoreaTeamStageOptions(activeOnly: $activeOnly) {
      id
      label
      colorTone
      sortOrder
      isActive
      createdAt
      updatedAt
    }
  }
`;

const CREATE_KOREA_TEAM_STAGE_OPTION_MUTATION = gql`
  mutation CreateConfirmedTripKoreaTeamStageOption($input: ConfirmedTripKoreaTeamStageOptionCreateInput!) {
    createConfirmedTripKoreaTeamStageOption(input: $input) {
      id
      label
      colorTone
      sortOrder
      isActive
      createdAt
      updatedAt
    }
  }
`;

const POST_TRIP_TASK_OPTIONS_QUERY = gql`
  query ConfirmedTripPostTripTaskOptions($activeOnly: Boolean = true) {
    confirmedTripPostTripTaskOptions(activeOnly: $activeOnly) {
      id
      label
      colorTone
      sortOrder
      isActive
      createdAt
      updatedAt
    }
  }
`;

const CREATE_POST_TRIP_TASK_OPTION_MUTATION = gql`
  mutation CreateConfirmedTripPostTripTaskOption($input: ConfirmedTripPostTripTaskOptionCreateInput!) {
    createConfirmedTripPostTripTaskOption(input: $input) {
      id
      label
      colorTone
      sortOrder
      isActive
      createdAt
      updatedAt
    }
  }
`;

export function useConfirmedTrips(status?: 'ACTIVE' | 'CANCELLED') {
  const { data, loading, refetch } = useQuery<{ confirmedTrips: ConfirmedTripRow[] }>(
    CONFIRMED_TRIPS_QUERY,
    {
      variables: { status },
      fetchPolicy: 'cache-first',
      nextFetchPolicy: 'cache-first',
    },
  );
  return { trips: data?.confirmedTrips ?? [], loading, refetch };
}

export function useRentalItemAvailability(input: {
  travelStartDate?: string | null;
  travelEndDate?: string | null;
  excludeConfirmedTripId?: string | null;
  excludePlanId?: string | null;
}) {
  const hasDateRange = Boolean(input.travelStartDate && input.travelEndDate);
  const { data, loading, error, refetch } = useQuery<{
    rentalItemAvailability: RentalItemAvailabilityRow[];
  }>(RENTAL_ITEM_AVAILABILITY_QUERY, {
    variables: {
      input: {
        travelStartDate: input.travelStartDate,
        travelEndDate: input.travelEndDate,
        excludeConfirmedTripId: input.excludeConfirmedTripId ?? null,
        excludePlanId: input.excludePlanId ?? null,
      },
    },
    skip: !hasDateRange,
    fetchPolicy: 'cache-and-network',
  });

  return {
    availability: data?.rentalItemAvailability ?? [],
    loading,
    error,
    refetch,
  };
}

export function useActiveConfirmedTripByPlanVersion(planVersionId: string | undefined) {
  const { data, loading, error, refetch } = useQuery<{
    activeConfirmedTripByPlanVersion: Pick<ConfirmedTripRow, 'id' | 'planVersionId' | 'status'> | null;
  }>(ACTIVE_CONFIRMED_TRIP_BY_PLAN_VERSION_QUERY, {
    variables: { planVersionId: planVersionId ?? '' },
    skip: !planVersionId,
    fetchPolicy: 'cache-and-network',
  });

  return {
    trip: data?.activeConfirmedTripByPlanVersion ?? null,
    loading,
    error,
    refetch,
  };
}

export function useActiveConfirmedTripByPlan(planId: string | undefined) {
  const { data, loading, error, refetch } = useQuery<{
    activeConfirmedTripByPlan: {
      id: string;
      planVersionId: string | null;
      status: 'ACTIVE' | 'CANCELLED';
      planVersion: { versionNumber: number } | null;
    } | null;
  }>(ACTIVE_CONFIRMED_TRIP_BY_PLAN_QUERY, {
    variables: { planId: planId ?? '' },
    skip: !planId,
    fetchPolicy: 'cache-and-network',
  });

  return {
    trip: data?.activeConfirmedTripByPlan ?? null,
    loading,
    error,
    refetch,
  };
}

export function useConfirmedTripKoreaTeamStageOptions(activeOnly = true) {
  const { data, loading, refetch } = useQuery<{
    confirmedTripKoreaTeamStageOptions: ConfirmedTripKoreaTeamStageOptionRow[];
  }>(KOREA_TEAM_STAGE_OPTIONS_QUERY, {
    variables: { activeOnly },
    fetchPolicy: 'cache-and-network',
  });
  return { options: data?.confirmedTripKoreaTeamStageOptions ?? [], loading, refetch };
}

export function useCreateConfirmedTripKoreaTeamStageOption() {
  const [mutate, { loading }] = useMutation<{
    createConfirmedTripKoreaTeamStageOption: ConfirmedTripKoreaTeamStageOptionRow;
  }>(CREATE_KOREA_TEAM_STAGE_OPTION_MUTATION);

  return {
    loading,
    createOption: async (label: string): Promise<ConfirmedTripKoreaTeamStageOptionRow> => {
      const result = await mutate({
        variables: { input: { label } },
        refetchQueries: [{ query: KOREA_TEAM_STAGE_OPTIONS_QUERY, variables: { activeOnly: true } }],
      });
      if (!result.data?.createConfirmedTripKoreaTeamStageOption) {
        throw new Error('Failed to create korea team stage option');
      }
      return result.data.createConfirmedTripKoreaTeamStageOption;
    },
  };
}

export function useConfirmedTripPostTripTaskOptions(activeOnly = true) {
  const { data, loading, refetch } = useQuery<{
    confirmedTripPostTripTaskOptions: ConfirmedTripPostTripTaskOptionRow[];
  }>(POST_TRIP_TASK_OPTIONS_QUERY, {
    variables: { activeOnly },
    fetchPolicy: 'cache-and-network',
  });
  return { options: data?.confirmedTripPostTripTaskOptions ?? [], loading, refetch };
}

export function useCreateConfirmedTripPostTripTaskOption() {
  const [mutate, { loading }] = useMutation<{
    createConfirmedTripPostTripTaskOption: ConfirmedTripPostTripTaskOptionRow;
  }>(CREATE_POST_TRIP_TASK_OPTION_MUTATION);

  return {
    loading,
    createOption: async (label: string): Promise<ConfirmedTripPostTripTaskOptionRow> => {
      const result = await mutate({
        variables: { input: { label } },
        refetchQueries: [{ query: POST_TRIP_TASK_OPTIONS_QUERY, variables: { activeOnly: true } }],
      });
      if (!result.data?.createConfirmedTripPostTripTaskOption) {
        throw new Error('Failed to create post-trip task option');
      }
      return result.data.createConfirmedTripPostTripTaskOption;
    },
  };
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
        refetchQueries: [CONFIRMED_TRIPS_ACTIVE_REFETCH],
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

  type GuideAssignmentUpdateInput = {
    guideId: string;
    sortOrder?: number;
    nameSnapshot?: string | null;
  };

  type DriverAssignmentUpdateInput = {
    driverId: string;
    sortOrder?: number;
    nameSnapshot?: string | null;
  };

  type UpdateConfirmedTripInput = {
    guideAssignments?: GuideAssignmentUpdateInput[];
    driverAssignments?: DriverAssignmentUpdateInput[];
    koreaTeamStageOptionIds?: string[];
    postTripTaskOptionIds?: string[];
    assignedVehicle?: string | null;
    accommodationNote?: string | null;
    operationNote?: string | null;
    openChatUrl?: string | null;
    status?: 'ACTIVE' | 'CANCELLED';
    camelDollPurchased?: boolean;
    pickupDate?: string | null;
    dropDate?: string | null;
    planVersionId?: string;
    travelStart?: string | null;
    travelEnd?: string | null;
    destination?: string | null;
    paxCount?: number | null;
    rentalGear?: boolean;
    rentalDrone?: boolean;
    rentalStarlink?: boolean;
    rentalPowerbank?: boolean;
    isRecruitingOpen?: boolean;
    depositAmountKrw?: number | null;
    balanceAmountKrw?: number | null;
    totalAmountKrw?: number | null;
    securityDepositAmountKrw?: number | null;
    groupTotalAmountKrw?: number | null;
    confirmedAt?: string;
  };

  return {
    loading,
    updateConfirmedTrip: async (id: string, input: UpdateConfirmedTripInput): Promise<ConfirmedTripRow> => {
      const result = await mutate({
        variables: { id, input },
        refetchQueries: [CONFIRMED_TRIPS_ACTIVE_REFETCH, { query: CONFIRMED_TRIP_QUERY, variables: { id } }],
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
        refetchQueries: [CONFIRMED_TRIPS_ACTIVE_REFETCH, { query: CONFIRMED_TRIP_QUERY, variables: { id } }],
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
        refetchQueries: [CONFIRMED_TRIPS_ACTIVE_REFETCH],
      });
      if (!result.data?.createConfirmedTrip) {
        throw new Error('Failed to create confirmed trip');
      }
      return result.data.createConfirmedTrip;
    },
  };
}

/** 배정 rows를 sortOrder 기준으로 정렬한 복사본 */
export function sortTripAssignments<T extends { sortOrder: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
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
  return trip.planVersion?.regionSet.name ?? trip.plan?.regionSet.name ?? trip.destination ?? '-';
}

export function getTripPickupDate(trip: ConfirmedTripRow): string | null {
  return trip.planVersion?.meta?.pickupDate ?? trip.pickupDate ?? null;
}

export function getTripDropDate(trip: ConfirmedTripRow): string | null {
  return trip.planVersion?.meta?.dropDate ?? trip.dropDate ?? null;
}

/** 견적 메타의 실투어 외 픽드랍(여러 건). 플랜 미연결 시 빈 배열. */
export function getTripExternalTransfers(trip: ConfirmedTripRow): ExternalTransfer[] {
  return trip.planVersion?.meta?.externalTransfers ?? [];
}

/** `externalTransfers.selectedTeamOrderIndexes` 해석용 팀 배열 */
export function getTripTransportGroupsForExternalTransfers(trip: ConfirmedTripRow): ExternalTransferTeamLike[] {
  return (trip.planVersion?.meta?.transportGroups ?? []).map((group) => ({
    orderIndex: group.orderIndex,
    teamName: group.teamName,
    headcount: group.headcount,
    flightInDate: group.flightInDate,
    flightInTime: group.flightInTime,
    flightOutDate: group.flightOutDate,
    flightOutTime: group.flightOutTime,
    pickupDate: group.pickupDate,
    pickupTime: group.pickupTime,
    dropDate: group.dropDate,
    dropTime: group.dropTime,
  }));
}
