import { gql, useMutation, useQuery } from '@apollo/client';
import { consolidateFormattedConfirmationAccommodationLines } from '@tour/validation';
import type {
  ConfirmationBuilderState,
  ConfirmationDocumentRow,
  ConfirmationDraftDefaults,
  ConfirmationTraveler,
} from '../model/types';

const CONFIRMATION_DOCUMENT_SNAPSHOT_FRAGMENT = gql`
  fragment ConfirmationDocumentSnapshotFields on ConfirmationDocumentSnapshot {
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
    appendixPlanStops {
      dateCellText
      destinationCellText
      timeCellText
      scheduleCellText
      lodgingCellText
      mealCellText
      movementIntensityColorOverride
    }
    sourcePlanVersionId
    overallMovementIntensityColorOverride
  }
`;

const CONFIRMATION_DOCUMENT_FRAGMENT = gql`
  ${CONFIRMATION_DOCUMENT_SNAPSHOT_FRAGMENT}
  fragment ConfirmationDocumentFields on ConfirmationDocument {
    id
    confirmedTripId
    planVersionId
    documentNumber
    versionNumber
    status
    publishedAt
    createdAt
    updatedAt
    snapshot {
      ...ConfirmationDocumentSnapshotFields
    }
  }
`;

const CONFIRMATION_DRAFT_DEFAULTS_QUERY = gql`
  ${CONFIRMATION_DOCUMENT_SNAPSHOT_FRAGMENT}
  query ConfirmationDraftDefaults($confirmedTripId: ID!) {
    confirmationDraftDefaults(confirmedTripId: $confirmedTripId) {
      confirmedTripId
      planVersionId
      documentNumber
      snapshot {
        ...ConfirmationDocumentSnapshotFields
      }
    }
  }
`;

const LATEST_CONFIRMATION_DOCUMENT_QUERY = gql`
  ${CONFIRMATION_DOCUMENT_FRAGMENT}
  query LatestConfirmationDocument($confirmedTripId: ID!) {
    latestConfirmationDocument(confirmedTripId: $confirmedTripId) {
      ...ConfirmationDocumentFields
    }
  }
`;

const CONFIRMATION_DOCUMENTS_QUERY = gql`
  ${CONFIRMATION_DOCUMENT_FRAGMENT}
  query ConfirmationDocuments($confirmedTripId: ID!) {
    confirmationDocuments(confirmedTripId: $confirmedTripId) {
      ...ConfirmationDocumentFields
    }
  }
`;

const CONFIRMATION_DOCUMENTS_BY_USER_ID_QUERY = gql`
  ${CONFIRMATION_DOCUMENT_FRAGMENT}
  query ConfirmationDocumentsByUserId($userId: ID!) {
    confirmationDocumentsByUserId(userId: $userId) {
      ...ConfirmationDocumentFields
    }
  }
`;

const CONFIRMATION_DOCUMENT_QUERY = gql`
  ${CONFIRMATION_DOCUMENT_FRAGMENT}
  query ConfirmationDocument($id: ID!) {
    confirmationDocument(id: $id) {
      ...ConfirmationDocumentFields
    }
  }
`;

const LATEST_PUBLISHED_CONFIRMATION_DOCUMENT_QUERY = gql`
  ${CONFIRMATION_DOCUMENT_FRAGMENT}
  query LatestPublishedConfirmationDocument($confirmedTripId: ID!) {
    latestPublishedConfirmationDocument(confirmedTripId: $confirmedTripId) {
      ...ConfirmationDocumentFields
    }
  }
`;

const SAVE_CONFIRMATION_DOCUMENT_MUTATION = gql`
  ${CONFIRMATION_DOCUMENT_FRAGMENT}
  mutation SaveConfirmationDocument($input: SaveConfirmationDocumentInput!) {
    saveConfirmationDocument(input: $input) {
      ...ConfirmationDocumentFields
    }
  }
`;

const DELETE_CONFIRMATION_DOCUMENT_MUTATION = gql`
  mutation DeleteConfirmationDocument($id: ID!) {
    deleteConfirmationDocument(id: $id)
  }
`;

function toConfirmationTravelerInput(traveler: ConfirmationTraveler): ConfirmationTraveler {
  return {
    name: traveler.name,
    gender: traveler.gender ?? null,
    birthCode: traveler.birthCode ?? null,
    note: null,
  };
}

function toConfirmationSnapshotInput(snapshot: ConfirmationBuilderState): ConfirmationBuilderState {
  return {
    leaderName: snapshot.leaderName,
    documentNumber: snapshot.documentNumber ?? null,
    destination: snapshot.destination,
    headcountText: snapshot.headcountText,
    travelPeriodText: snapshot.travelPeriodText,
    vehicleType: snapshot.vehicleType,
    flightInText: snapshot.flightInText,
    flightOutText: snapshot.flightOutText,
    pickupText: snapshot.pickupText,
    dropText: snapshot.dropText,
    externalPickupDropText: snapshot.externalPickupDropText,
    specialNote: snapshot.specialNote,
    rentalItemsText: snapshot.rentalItemsText,
    eventNames: snapshot.eventNames,
    remark: snapshot.remark,
    balancePerPersonText: snapshot.balancePerPersonText,
    guideName: snapshot.guideName,
    meetingPlace: snapshot.meetingPlace,
    travelers: snapshot.travelers.map(toConfirmationTravelerInput),
    accommodationLines: consolidateFormattedConfirmationAccommodationLines(snapshot.accommodationLines),
    appendixPlanStops: snapshot.appendixPlanStops?.length
      ? snapshot.appendixPlanStops.map((row) => ({
          dateCellText: row.dateCellText,
          destinationCellText: row.destinationCellText,
          timeCellText: row.timeCellText,
          scheduleCellText: row.scheduleCellText,
          lodgingCellText: row.lodgingCellText,
          mealCellText: row.mealCellText,
          movementIntensityColorOverride: row.movementIntensityColorOverride ?? null,
        }))
      : undefined,
    sourcePlanVersionId: snapshot.sourcePlanVersionId ?? null,
    overallMovementIntensityColorOverride: snapshot.overallMovementIntensityColorOverride ?? null,
  };
}

export function useConfirmationDraftDefaults(confirmedTripId: string | undefined) {
  const { data, loading, error, refetch } = useQuery<{ confirmationDraftDefaults: ConfirmationDraftDefaults }>(
    CONFIRMATION_DRAFT_DEFAULTS_QUERY,
    {
      variables: { confirmedTripId: confirmedTripId ?? '' },
      skip: !confirmedTripId,
      fetchPolicy: 'network-only',
    },
  );

  return {
    defaults: data?.confirmationDraftDefaults ?? null,
    loading,
    error,
    refetch,
  };
}

export function useLatestConfirmationDocument(confirmedTripId: string | undefined) {
  const { data, loading, error, refetch } = useQuery<{ latestConfirmationDocument: ConfirmationDocumentRow | null }>(
    LATEST_CONFIRMATION_DOCUMENT_QUERY,
    {
      variables: { confirmedTripId: confirmedTripId ?? '' },
      skip: !confirmedTripId,
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    document: data?.latestConfirmationDocument ?? null,
    loading,
    error,
    refetch,
  };
}

export function useConfirmationDocuments(confirmedTripId: string | undefined) {
  const { data, loading, error, refetch } = useQuery<{ confirmationDocuments: ConfirmationDocumentRow[] }>(
    CONFIRMATION_DOCUMENTS_QUERY,
    {
      variables: { confirmedTripId: confirmedTripId ?? '' },
      skip: !confirmedTripId,
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    documents: data?.confirmationDocuments ?? [],
    loading,
    error,
    refetch,
  };
}

export function useConfirmationDocumentsByUserId(userId: string | undefined) {
  const { data, loading, error, refetch } = useQuery<{ confirmationDocumentsByUserId: ConfirmationDocumentRow[] }>(
    CONFIRMATION_DOCUMENTS_BY_USER_ID_QUERY,
    {
      variables: { userId: userId ?? '' },
      skip: !userId,
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    documents: data?.confirmationDocumentsByUserId ?? [],
    loading,
    error,
    refetch,
  };
}

export function useConfirmationDocument(documentId: string | undefined) {
  const { data, loading, error, refetch } = useQuery<{ confirmationDocument: ConfirmationDocumentRow }>(
    CONFIRMATION_DOCUMENT_QUERY,
    {
      variables: { id: documentId ?? '' },
      skip: !documentId,
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    document: data?.confirmationDocument ?? null,
    loading,
    error,
    refetch,
  };
}

export function useLatestPublishedConfirmationDocument(confirmedTripId: string | undefined) {
  const { data, loading, error, refetch } = useQuery<{ latestPublishedConfirmationDocument: ConfirmationDocumentRow | null }>(
    LATEST_PUBLISHED_CONFIRMATION_DOCUMENT_QUERY,
    {
      variables: { confirmedTripId: confirmedTripId ?? '' },
      skip: !confirmedTripId,
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    document: data?.latestPublishedConfirmationDocument ?? null,
    loading,
    error,
    refetch,
  };
}

export function useSaveConfirmationDocument() {
  const [mutate, { loading }] = useMutation<{ saveConfirmationDocument: ConfirmationDocumentRow }>(
    SAVE_CONFIRMATION_DOCUMENT_MUTATION,
  );

  const save = async (confirmedTripId: string, snapshot: ConfirmationBuilderState, publish: boolean) => {
    const result = await mutate({
      variables: {
        input: {
          confirmedTripId,
          snapshot: toConfirmationSnapshotInput(snapshot),
          publish,
        },
      },
    });
    return result.data?.saveConfirmationDocument ?? null;
  };

  return { save, loading };
}

export function useDeleteConfirmationDocument() {
  const [mutate, { loading }] = useMutation<{ deleteConfirmationDocument: boolean }>(
    DELETE_CONFIRMATION_DOCUMENT_MUTATION,
  );

  const deleteDocument = async (id: string, userId: string): Promise<void> => {
    const result = await mutate({
      variables: { id },
      refetchQueries: [{ query: CONFIRMATION_DOCUMENTS_BY_USER_ID_QUERY, variables: { userId } }],
    });
    if (!result.data?.deleteConfirmationDocument) {
      throw new Error('확정서 삭제에 실패했습니다.');
    }
  };

  return { deleteDocument, loading };
}

export { LATEST_PUBLISHED_CONFIRMATION_DOCUMENT_QUERY, CONFIRMATION_DOCUMENT_FRAGMENT };
