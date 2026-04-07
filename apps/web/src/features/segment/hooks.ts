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

const UPDATE = gql`
  mutation UpdateSegment($id: ID!, $input: SegmentUpdateInput!) {
    updateSegment(id: $id, input: $input) {
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

const UPDATE_BLOCK_CONNECTION = gql`
  mutation UpdateMultiDayBlockConnection($id: ID!, $input: MultiDayBlockConnectionUpdateInput!) {
    updateMultiDayBlockConnection(id: $id, input: $input) {
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
            ...(input.versions ? { versions: input.versions } : {}),
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
            ...(input.versions ? { versions: input.versions } : {}),
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
    updateRow,
    deleteRow,
    refetch,
  };
}
