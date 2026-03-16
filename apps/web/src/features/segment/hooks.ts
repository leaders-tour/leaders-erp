import { gql } from '@apollo/client';
import { useCrudResource } from '../../lib/crud';

const LIST = gql`
  query Segments {
    segments {
      id
      regionId
      regionName
      fromLocationId
      toLocationId
      averageDistanceKm
      averageTravelHours
      isLongDistance
      scheduleTimeBlocks {
        id
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

export interface SegmentFormInput {
  regionId: string;
  fromLocationId: string;
  toLocationId: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  timeSlots: SegmentTimeSlotFormInput[];
}

export interface SegmentTimeSlotFormInput {
  startTime: string;
  activities: string[];
}

export interface SegmentRow {
  id: string;
  regionId: string;
  regionName: string;
  fromLocationId: string;
  toLocationId: string;
  averageDistanceKm: number;
  averageTravelHours: number;
  isLongDistance: boolean;
  scheduleTimeBlocks: Array<{
    id: string;
    startTime: string;
    orderIndex: number;
    activities: Array<{
      id: string;
      description: string;
      orderIndex: number;
    }>;
  }>;
}

export function useSegmentCrud() {
  return useCrudResource<SegmentRow, SegmentFormInput, SegmentFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: { listKey: 'segments', createKey: 'createSegment', updateKey: 'updateSegment', removeKey: 'deleteSegment' },
    toCreateVariables: (input) => ({ input }),
    toUpdateVariables: (id, input) => ({ id, input }),
  });
}
