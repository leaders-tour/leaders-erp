import { gql, useMutation, useQuery } from '@apollo/client';
import type {
  ConfirmationBuilderState,
  ConfirmationDocumentRow,
  ConfirmationDraftDefaults,
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
          snapshot,
          publish,
        },
      },
    });
    return result.data?.saveConfirmationDocument ?? null;
  };

  return { save, loading };
}

export { LATEST_PUBLISHED_CONFIRMATION_DOCUMENT_QUERY, CONFIRMATION_DOCUMENT_FRAGMENT };
