import { gql, useApolloClient, useQuery } from '@apollo/client';
import type { MealOption } from '../../generated/graphql';
import type { FacilityAvailability } from '../location/hooks';

const LIST = gql`
  query Connections {
    segments {
      id
      regionId
      regionName
      fromLocationId
      toLocationId
      defaultVersionId
      averageDistanceKm
      averageTravelHours
      isLongDistance
      scheduleTimeBlocks {
        id
        variant
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      earlyScheduleTimeBlocks {
        id
        variant
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      extendScheduleTimeBlocks {
        id
        variant
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      earlyExtendScheduleTimeBlocks {
        id
        variant
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      versions {
        id
        segmentId
        name
        averageDistanceKm
        averageTravelHours
        isLongDistance
        kind
        startDate
        endDate
        flightOutTimeBand
        lodgingOverride {
          isUnspecified
          name
          hasElectricity
          hasShower
          hasInternet
        }
        mealsOverride {
          breakfast
          lunch
          dinner
        }
        sortOrder
        isDefault
        scheduleTimeBlocks {
          id
          variant
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        earlyScheduleTimeBlocks {
          id
          variant
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        extendScheduleTimeBlocks {
          id
          variant
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        earlyExtendScheduleTimeBlocks {
          id
          variant
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
      }
    }
    multiDayBlockConnections {
      id
      regionId
      regionName
      fromMultiDayBlockId
      toLocationId
      defaultVersionId
      averageDistanceKm
      averageTravelHours
      isLongDistance
      fromMultiDayBlock {
        id
        title
      }
      scheduleTimeBlocks {
        id
        variant
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      earlyScheduleTimeBlocks {
        id
        variant
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      extendScheduleTimeBlocks {
        id
        variant
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      earlyExtendScheduleTimeBlocks {
        id
        variant
        startTime
        orderIndex
        activities {
          id
          description
          orderIndex
        }
      }
      versions {
        id
        multiDayBlockConnectionId
        name
        averageDistanceKm
        averageTravelHours
        isLongDistance
        sortOrder
        isDefault
        scheduleTimeBlocks {
          id
          variant
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        earlyScheduleTimeBlocks {
          id
          variant
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        extendScheduleTimeBlocks {
          id
          variant
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
        earlyExtendScheduleTimeBlocks {
          id
          variant
          startTime
          orderIndex
          activities {
            id
            description
            orderIndex
          }
        }
      }
    }
  }
`;

const CREATE = gql`
  mutation CreateSegment($input: SegmentCreateInput!) {
    createSegment(input: $input) {
      id
    }
  }
`;

const CREATE_BULK = gql`
  mutation CreateSegmentsBulk($input: SegmentBulkCreateInput!) {
    createSegmentsBulk(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateSegment($id: ID!, $input: SegmentUpdateInput!) {
    updateSegment(id: $id, input: $input) {
      id
    }
  }
`;

const UPDATE_WITH_ADDITIONAL = gql`
  mutation UpdateSegmentWithAdditionalFroms($id: ID!, $input: SegmentUpdateWithAdditionalFromsInput!) {
    updateSegmentWithAdditionalFroms(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeleteSegment($id: ID!) {
    deleteSegment(id: $id)
  }
`;

const CREATE_BLOCK_CONNECTION = gql`
  mutation CreateMultiDayBlockConnection($input: MultiDayBlockConnectionCreateInput!) {
    createMultiDayBlockConnection(input: $input) {
      id
    }
  }
`;

const CREATE_BLOCK_CONNECTION_BULK = gql`
  mutation CreateMultiDayBlockConnectionsBulk($input: MultiDayBlockConnectionBulkCreateInput!) {
    createMultiDayBlockConnectionsBulk(input: $input) {
      id
    }
  }
`;

const UPDATE_BLOCK_CONNECTION = gql`
  mutation UpdateMultiDayBlockConnection($id: ID!, $input: MultiDayBlockConnectionUpdateInput!) {
    updateMultiDayBlockConnection(id: $id, input: $input) {
      id
    }
  }
`;

const UPDATE_BLOCK_CONNECTION_WITH_ADDITIONAL = gql`
  mutation UpdateMultiDayBlockConnectionWithAdditionalFroms(
    $id: ID!
    $input: MultiDayBlockConnectionUpdateWithAdditionalFromsInput!
  ) {
    updateMultiDayBlockConnectionWithAdditionalFroms(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE_BLOCK_CONNECTION = gql`
  mutation DeleteMultiDayBlockConnection($id: ID!) {
    deleteMultiDayBlockConnection(id: $id)
  }
`;

export type ConnectionSourceType = 'LOCATION' | 'MULTI_DAY_BLOCK';
export type FlightTimeBandValue = 'EVENING_18_21';
export type SegmentVersionKindValue = 'DEFAULT' | 'SEASON' | 'FLIGHT';

export interface SegmentVersionLodgingOverrideFormInput {
  isUnspecified: boolean;
  name: string;
  hasElectricity: FacilityAvailability;
  hasShower: FacilityAvailability;
  hasInternet: FacilityAvailability;
}

export interface SegmentVersionMealsOverrideFormInput {
  breakfast: MealOption | null;
  lunch: MealOption | null;
  dinner: MealOption | null;
}

export interface SegmentFormInput {
  sourceType: ConnectionSourceType;
  regionId?: string;
  fromLocationId?: string;
  fromMultiDayBlockId?: string;
  toLocationId: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  timeSlots: SegmentTimeSlotFormInput[];
  earlyTimeSlots?: SegmentTimeSlotFormInput[];
  extendTimeSlots?: SegmentTimeSlotFormInput[];
  earlyExtendTimeSlots?: SegmentTimeSlotFormInput[];
  versions?: SegmentVersionFormInput[];
}

export interface SegmentBulkFormInput {
  sourceType: ConnectionSourceType;
  regionId?: string;
  fromLocationIds?: string[];
  fromMultiDayBlockIds?: string[];
  toLocationId: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  timeSlots: SegmentTimeSlotFormInput[];
  earlyTimeSlots?: SegmentTimeSlotFormInput[];
  extendTimeSlots?: SegmentTimeSlotFormInput[];
  earlyExtendTimeSlots?: SegmentTimeSlotFormInput[];
  versions?: SegmentVersionFormInput[];
}

export interface SegmentTimeSlotFormInput {
  startTime: string;
  activities: string[];
}

export interface SegmentVersionFormInput {
  id?: string;
  name: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  kind: SegmentVersionKindValue;
  startDate?: string;
  endDate?: string;
  flightOutTimeBand?: FlightTimeBandValue;
  lodgingOverride?: SegmentVersionLodgingOverrideFormInput;
  mealsOverride?: SegmentVersionMealsOverrideFormInput;
  timeSlots: SegmentTimeSlotFormInput[];
  earlyTimeSlots?: SegmentTimeSlotFormInput[];
  extendTimeSlots?: SegmentTimeSlotFormInput[];
  earlyExtendTimeSlots?: SegmentTimeSlotFormInput[];
  isDefault?: boolean;
}

/**
 * `MultiDayBlockConnectionVersionInput`는 구간(LOCATION)용 세그먼트 버전 필드(`kind` 등)를 받지 않습니다.
 * 뮤테이션 variables에 `SegmentVersionFormInput[]`을 그대로 넣으면 GraphQL validation 오류가 납니다.
 */
function toMultiDayBlockConnectionVersionInputs(versions: SegmentVersionFormInput[]) {
  return versions.map((v) => ({
    ...(v.id ? { id: v.id } : {}),
    name: v.name,
    averageDistanceKm: v.averageDistanceKm,
    averageTravelHours: v.averageTravelHours,
    isLongDistance: v.isLongDistance,
    timeSlots: v.timeSlots,
    ...(v.earlyTimeSlots ? { earlyTimeSlots: v.earlyTimeSlots } : {}),
    ...(v.extendTimeSlots ? { extendTimeSlots: v.extendTimeSlots } : {}),
    ...(v.earlyExtendTimeSlots ? { earlyExtendTimeSlots: v.earlyExtendTimeSlots } : {}),
    ...(v.isDefault !== undefined ? { isDefault: v.isDefault } : {}),
  }));
}

export interface SegmentRow {
  id: string;
  sourceType: ConnectionSourceType;
  regionId: string;
  regionName: string;
  fromLocationId?: string;
  fromMultiDayBlockId?: string;
  fromMultiDayBlockTitle?: string;
  toLocationId: string;
  defaultVersionId?: string | null;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  scheduleTimeBlocks: Array<{
    id: string;
    variant: 'basic' | 'early' | 'extend' | 'earlyExtend';
    startTime: string;
    orderIndex: number;
    activities: Array<{
      id: string;
      description: string;
      orderIndex: number;
    }>;
  }>;
  earlyScheduleTimeBlocks: Array<{
    id: string;
    variant: 'basic' | 'early' | 'extend' | 'earlyExtend';
    startTime: string;
    orderIndex: number;
    activities: Array<{
      id: string;
      description: string;
      orderIndex: number;
    }>;
  }>;
  extendScheduleTimeBlocks: Array<{
    id: string;
    variant: 'basic' | 'early' | 'extend' | 'earlyExtend';
    startTime: string;
    orderIndex: number;
    activities: Array<{
      id: string;
      description: string;
      orderIndex: number;
    }>;
  }>;
  earlyExtendScheduleTimeBlocks: Array<{
    id: string;
    variant: 'basic' | 'early' | 'extend' | 'earlyExtend';
    startTime: string;
    orderIndex: number;
    activities: Array<{
      id: string;
      description: string;
      orderIndex: number;
    }>;
  }>;
  versions: Array<{
    id: string;
    segmentId: string;
    name: string;
    averageDistanceKm: number;
    averageTravelHours: number;
    isLongDistance: boolean;
    kind: SegmentVersionKindValue;
    startDate?: string | null;
    endDate?: string | null;
    flightOutTimeBand?: FlightTimeBandValue | null;
    lodgingOverride?: SegmentVersionLodgingOverrideFormInput | null;
    mealsOverride?: SegmentVersionMealsOverrideFormInput | null;
    sortOrder: number;
    isDefault: boolean;
    scheduleTimeBlocks: Array<{
      id: string;
      variant: 'basic' | 'early' | 'extend' | 'earlyExtend';
      startTime: string;
      orderIndex: number;
      activities: Array<{
        id: string;
        description: string;
        orderIndex: number;
      }>;
    }>;
    earlyScheduleTimeBlocks: Array<{
      id: string;
      variant: 'basic' | 'early' | 'extend' | 'earlyExtend';
      startTime: string;
      orderIndex: number;
      activities: Array<{
        id: string;
        description: string;
        orderIndex: number;
      }>;
    }>;
    extendScheduleTimeBlocks: Array<{
      id: string;
      variant: 'basic' | 'early' | 'extend' | 'earlyExtend';
      startTime: string;
      orderIndex: number;
      activities: Array<{
        id: string;
        description: string;
        orderIndex: number;
      }>;
    }>;
    earlyExtendScheduleTimeBlocks: Array<{
      id: string;
      variant: 'basic' | 'early' | 'extend' | 'earlyExtend';
      startTime: string;
      orderIndex: number;
      activities: Array<{
        id: string;
        description: string;
        orderIndex: number;
      }>;
    }>;
  }>;
}

export function useSegmentCrud() {
  const client = useApolloClient();
  const { data, loading, error, refetch } = useQuery<{
    segments: Array<Omit<SegmentRow, 'sourceType'>>;
    multiDayBlockConnections: Array<{
      id: string;
      regionId: string;
      regionName: string;
      fromMultiDayBlockId: string;
      fromMultiDayBlock: { id: string; title: string };
      toLocationId: string;
      defaultVersionId?: string | null;
      averageDistanceKm: number;
      averageTravelHours: number;
      isLongDistance: boolean;
      scheduleTimeBlocks: SegmentRow['scheduleTimeBlocks'];
      earlyScheduleTimeBlocks: SegmentRow['earlyScheduleTimeBlocks'];
      extendScheduleTimeBlocks: SegmentRow['extendScheduleTimeBlocks'];
      earlyExtendScheduleTimeBlocks: SegmentRow['earlyExtendScheduleTimeBlocks'];
      versions: Array<{
        id: string;
        multiDayBlockConnectionId: string;
        name: string;
        averageDistanceKm: number;
        averageTravelHours: number;
        isLongDistance: boolean;
        sortOrder: number;
        isDefault: boolean;
        scheduleTimeBlocks: SegmentRow['versions'][number]['scheduleTimeBlocks'];
        earlyScheduleTimeBlocks: SegmentRow['versions'][number]['earlyScheduleTimeBlocks'];
        extendScheduleTimeBlocks: SegmentRow['versions'][number]['extendScheduleTimeBlocks'];
        earlyExtendScheduleTimeBlocks: SegmentRow['versions'][number]['earlyExtendScheduleTimeBlocks'];
      }>;
    }>;
  }>(LIST);

  const segmentRows = (data?.segments ?? []).map((row) => ({
    ...row,
    sourceType: 'LOCATION' as const,
  }));
  const blockConnectionRows: SegmentRow[] = (data?.multiDayBlockConnections ?? []).map((row) => ({
    id: row.id,
    sourceType: 'MULTI_DAY_BLOCK',
    regionId: row.regionId,
    regionName: row.regionName,
    fromLocationId: undefined,
    fromMultiDayBlockId: row.fromMultiDayBlockId,
    fromMultiDayBlockTitle: row.fromMultiDayBlock.title,
    toLocationId: row.toLocationId,
    defaultVersionId: row.defaultVersionId,
    averageDistanceKm: row.averageDistanceKm,
    averageTravelHours: row.averageTravelHours,
    isLongDistance: row.isLongDistance,
    scheduleTimeBlocks: row.scheduleTimeBlocks,
    earlyScheduleTimeBlocks: row.earlyScheduleTimeBlocks,
    extendScheduleTimeBlocks: row.extendScheduleTimeBlocks,
    earlyExtendScheduleTimeBlocks: row.earlyExtendScheduleTimeBlocks,
    versions: row.versions.map((version) => ({
      id: version.id,
      segmentId: version.multiDayBlockConnectionId,
      name: version.name,
      averageDistanceKm: version.averageDistanceKm,
      averageTravelHours: version.averageTravelHours,
      isLongDistance: version.isLongDistance,
      kind: 'DEFAULT',
      startDate: null,
      endDate: null,
      sortOrder: version.sortOrder,
      isDefault: version.isDefault,
      scheduleTimeBlocks: version.scheduleTimeBlocks,
      earlyScheduleTimeBlocks: version.earlyScheduleTimeBlocks,
      extendScheduleTimeBlocks: version.extendScheduleTimeBlocks,
      earlyExtendScheduleTimeBlocks: version.earlyExtendScheduleTimeBlocks,
    })),
  }));

  const rows = [...segmentRows, ...blockConnectionRows];
  const rowById = new Map(rows.map((row) => [row.id, row]));

  async function createRow(input: SegmentFormInput): Promise<void> {
    if (input.sourceType === 'MULTI_DAY_BLOCK') {
      await client.mutate({
        mutation: CREATE_BLOCK_CONNECTION,
        variables: {
          input: {
            fromMultiDayBlockId: input.fromMultiDayBlockId,
            toLocationId: input.toLocationId,
            averageDistanceKm: input.averageDistanceKm,
            averageTravelHours: input.averageTravelHours,
            isLongDistance: input.isLongDistance,
            timeSlots: input.timeSlots,
            ...(input.earlyTimeSlots ? { earlyTimeSlots: input.earlyTimeSlots } : {}),
            ...(input.extendTimeSlots ? { extendTimeSlots: input.extendTimeSlots } : {}),
            ...(input.earlyExtendTimeSlots ? { earlyExtendTimeSlots: input.earlyExtendTimeSlots } : {}),
            ...(input.versions ? { versions: toMultiDayBlockConnectionVersionInputs(input.versions) } : {}),
          },
        },
      });
    } else {
      await client.mutate({
        mutation: CREATE,
        variables: {
          input: {
            regionId: input.regionId,
            fromLocationId: input.fromLocationId,
            toLocationId: input.toLocationId,
            averageDistanceKm: input.averageDistanceKm,
            averageTravelHours: input.averageTravelHours,
            isLongDistance: input.isLongDistance,
            timeSlots: input.timeSlots,
            ...(input.earlyTimeSlots ? { earlyTimeSlots: input.earlyTimeSlots } : {}),
            ...(input.extendTimeSlots ? { extendTimeSlots: input.extendTimeSlots } : {}),
            ...(input.versions ? { versions: input.versions } : {}),
          },
        },
      });
    }
    await refetch();
  }

  async function createRowsBulk(input: SegmentBulkFormInput): Promise<void> {
    if (input.sourceType === 'MULTI_DAY_BLOCK') {
      await client.mutate({
        mutation: CREATE_BLOCK_CONNECTION_BULK,
        variables: {
          input: {
            fromMultiDayBlockIds: input.fromMultiDayBlockIds ?? [],
            toLocationId: input.toLocationId,
            averageDistanceKm: input.averageDistanceKm,
            averageTravelHours: input.averageTravelHours,
            isLongDistance: input.isLongDistance,
            timeSlots: input.timeSlots,
            ...(input.earlyTimeSlots ? { earlyTimeSlots: input.earlyTimeSlots } : {}),
            ...(input.extendTimeSlots ? { extendTimeSlots: input.extendTimeSlots } : {}),
            ...(input.earlyExtendTimeSlots ? { earlyExtendTimeSlots: input.earlyExtendTimeSlots } : {}),
            ...(input.versions ? { versions: toMultiDayBlockConnectionVersionInputs(input.versions) } : {}),
          },
        },
      });
    } else {
      await client.mutate({
        mutation: CREATE_BULK,
        variables: {
          input: {
            regionId: input.regionId,
            fromLocationIds: input.fromLocationIds ?? [],
            toLocationId: input.toLocationId,
            averageDistanceKm: input.averageDistanceKm,
            averageTravelHours: input.averageTravelHours,
            isLongDistance: input.isLongDistance,
            timeSlots: input.timeSlots,
            ...(input.earlyTimeSlots ? { earlyTimeSlots: input.earlyTimeSlots } : {}),
            ...(input.extendTimeSlots ? { extendTimeSlots: input.extendTimeSlots } : {}),
            ...(input.versions ? { versions: input.versions } : {}),
          },
        },
      });
    }
    await refetch();
  }

  async function updateRow(id: string, input: SegmentFormInput): Promise<void> {
    const existing = rowById.get(id);
    if (!existing) {
      throw new Error('연결을 찾을 수 없습니다.');
    }

    if (existing.sourceType !== input.sourceType) {
      await createRow(input);
      await deleteRow(id);
      return;
    }

    if (input.sourceType === 'MULTI_DAY_BLOCK') {
      await client.mutate({
        mutation: UPDATE_BLOCK_CONNECTION,
        variables: {
          id,
          input: {
            fromMultiDayBlockId: input.fromMultiDayBlockId,
            toLocationId: input.toLocationId,
            averageDistanceKm: input.averageDistanceKm,
            averageTravelHours: input.averageTravelHours,
            isLongDistance: input.isLongDistance,
            timeSlots: input.timeSlots,
            ...(input.earlyTimeSlots ? { earlyTimeSlots: input.earlyTimeSlots } : {}),
            ...(input.extendTimeSlots ? { extendTimeSlots: input.extendTimeSlots } : {}),
            ...(input.earlyExtendTimeSlots ? { earlyExtendTimeSlots: input.earlyExtendTimeSlots } : {}),
            ...(input.versions ? { versions: toMultiDayBlockConnectionVersionInputs(input.versions) } : {}),
          },
        },
      });
    } else {
      await client.mutate({
        mutation: UPDATE,
        variables: {
          id,
          input: {
            regionId: input.regionId,
            fromLocationId: input.fromLocationId,
            toLocationId: input.toLocationId,
            averageDistanceKm: input.averageDistanceKm,
            averageTravelHours: input.averageTravelHours,
            isLongDistance: input.isLongDistance,
            timeSlots: input.timeSlots,
            ...(input.earlyTimeSlots ? { earlyTimeSlots: input.earlyTimeSlots } : {}),
            ...(input.extendTimeSlots ? { extendTimeSlots: input.extendTimeSlots } : {}),
            ...(input.versions ? { versions: input.versions } : {}),
          },
        },
      });
    }
    await refetch();
  }

  async function updateRowWithAdditionalFroms(
    id: string,
    input: SegmentFormInput,
    options: { additionalFromLocationIds?: string[]; additionalFromMultiDayBlockIds?: string[] },
  ): Promise<void> {
    const existing = rowById.get(id);
    if (!existing) {
      throw new Error('연결을 찾을 수 없습니다.');
    }

    if (existing.sourceType !== input.sourceType) {
      throw new Error('출발지 유형을 바꾸는 경우는 기존 연결 위에서 추가 출발을 할 수 없습니다. 출발지 유형을 유지하거나, 기존 연결을 수동으로 조정하세요.');
    }

    if (input.sourceType === 'MULTI_DAY_BLOCK') {
      const additional = options.additionalFromMultiDayBlockIds ?? [];
      if (additional.length === 0) {
        await updateRow(id, input);
        return;
      }
      await client.mutate({
        mutation: UPDATE_BLOCK_CONNECTION_WITH_ADDITIONAL,
        variables: {
          id,
          input: {
            update: {
              fromMultiDayBlockId: input.fromMultiDayBlockId,
              toLocationId: input.toLocationId,
              averageDistanceKm: input.averageDistanceKm,
              averageTravelHours: input.averageTravelHours,
              isLongDistance: input.isLongDistance,
              timeSlots: input.timeSlots,
              ...(input.earlyTimeSlots ? { earlyTimeSlots: input.earlyTimeSlots } : {}),
              ...(input.extendTimeSlots ? { extendTimeSlots: input.extendTimeSlots } : {}),
              ...(input.earlyExtendTimeSlots ? { earlyExtendTimeSlots: input.earlyExtendTimeSlots } : {}),
              ...(input.versions ? { versions: toMultiDayBlockConnectionVersionInputs(input.versions) } : {}),
            },
            additionalFromMultiDayBlockIds: additional,
          },
        },
      });
    } else {
      const additional = options.additionalFromLocationIds ?? [];
      if (additional.length === 0) {
        await updateRow(id, input);
        return;
      }
      await client.mutate({
        mutation: UPDATE_WITH_ADDITIONAL,
        variables: {
          id,
          input: {
            update: {
              regionId: input.regionId,
              fromLocationId: input.fromLocationId,
              toLocationId: input.toLocationId,
              averageDistanceKm: input.averageDistanceKm,
              averageTravelHours: input.averageTravelHours,
              isLongDistance: input.isLongDistance,
              timeSlots: input.timeSlots,
              ...(input.earlyTimeSlots ? { earlyTimeSlots: input.earlyTimeSlots } : {}),
              ...(input.extendTimeSlots ? { extendTimeSlots: input.extendTimeSlots } : {}),
              ...(input.earlyExtendTimeSlots ? { earlyExtendTimeSlots: input.earlyExtendTimeSlots } : {}),
              ...(input.versions ? { versions: input.versions } : {}),
            },
            additionalFromLocationIds: additional,
          },
        },
      });
    }
    await refetch();
  }

  async function deleteRow(id: string): Promise<void> {
    const existing = rowById.get(id);
    if (!existing) {
      throw new Error('연결을 찾을 수 없습니다.');
    }

    await client.mutate({
      mutation: existing.sourceType === 'MULTI_DAY_BLOCK' ? REMOVE_BLOCK_CONNECTION : REMOVE,
      variables: { id },
    });
    await refetch();
  }

  return {
    rows,
    loading,
    error,
    createRow,
    createRowsBulk,
    updateRow,
    updateRowWithAdditionalFroms,
    deleteRow,
    refetch,
  };
}
