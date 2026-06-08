import { gql, useMutation, useQuery } from '@apollo/client';
import { useMemo } from 'react';

export type ContractSubmissionSourceType = 'GOOGLE_SHEET' | 'INTERNAL_FORM';
export type ContractDocumentStatusValue =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVER_SUBMITTED'
  | 'NEEDS_REVIEW';
export type ContractSyncRunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';
export type ContractPaymentSourceType = 'GOOGLE_SHEET';
export type ContractPaymentStatusValue = 'NOT_STARTED' | 'PARTIAL' | 'COMPLETED' | 'OVERPAID' | 'NEEDS_REVIEW';
export type ContractPaymentSyncRunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface ContractSubmissionSourceRow {
  id: string;
  type: ContractSubmissionSourceType;
  name: string;
  isActive: boolean;
  sheetId: string | null;
  sheetGid: string | null;
  headerRow: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractDocumentStatusRow {
  id: string;
  documentNumberNorm: string;
  documentNumberRawSample: string | null;
  expectedCount: number | null;
  submittedCount: number;
  status: ContractDocumentStatusValue;
  needsReviewReason: string | null;
  firstSubmittedAt: string | null;
  lastSubmittedAt: string | null;
  matchedPlanVersionId: string | null;
  matchedConfirmedTripId: string | null;
  computedAt: string;
  updatedAt: string;
}

export interface ContractSyncRunRow {
  id: string;
  sourceId: string;
  status: ContractSyncRunStatus;
  startedAt: string;
  finishedAt: string | null;
  fetchedRows: number;
  upsertedRows: number;
  skippedRows: number;
  errorMessage: string | null;
}

export interface ContractPaymentSourceRow {
  id: string;
  type: ContractPaymentSourceType;
  name: string;
  isActive: boolean;
  sheetId: string | null;
  sheetGid: string | null;
  headerRow: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractPaymentStatusRow {
  id: string;
  documentNumberNorm: string;
  requiredAmountKrw: number | null;
  receivedAmountKrw: number;
  status: ContractPaymentStatusValue;
  needsReviewReason: string | null;
  matchedPlanVersionId: string | null;
  computedAt: string;
  updatedAt: string;
}

export interface ContractPaymentSyncRunRow {
  id: string;
  sourceId: string;
  status: ContractPaymentSyncRunStatus;
  startedAt: string;
  finishedAt: string | null;
  fetchedRows: number;
  upsertedRows: number;
  skippedRows: number;
  matchedRows: number;
  reviewRows: number;
  errorMessage: string | null;
}

const CONTRACT_SUBMISSION_SOURCES_QUERY = gql`
  query ContractSubmissionSources {
    contractSubmissionSources {
      id
      type
      name
      isActive
      sheetId
      sheetGid
      headerRow
      createdAt
      updatedAt
    }
  }
`;

const CONTRACT_DOCUMENT_STATUSES_QUERY = gql`
  query ContractDocumentStatuses($documentNumbers: [String!]!) {
    contractDocumentStatuses(documentNumbers: $documentNumbers) {
      id
      documentNumberNorm
      documentNumberRawSample
      expectedCount
      submittedCount
      status
      needsReviewReason
      firstSubmittedAt
      lastSubmittedAt
      matchedPlanVersionId
      matchedConfirmedTripId
      computedAt
      updatedAt
    }
  }
`;

const CONTRACT_SYNC_RUNS_QUERY = gql`
  query ContractSyncRuns($sourceId: ID, $limit: Int = 20) {
    contractSyncRuns(sourceId: $sourceId, limit: $limit) {
      id
      sourceId
      status
      startedAt
      finishedAt
      fetchedRows
      upsertedRows
      skippedRows
      errorMessage
    }
  }
`;

const SYNC_CONTRACT_SUBMISSIONS_MUTATION = gql`
  mutation SyncContractSubmissions($sourceId: ID!) {
    syncContractSubmissions(sourceId: $sourceId) {
      id
      sourceId
      status
      startedAt
      finishedAt
      fetchedRows
      upsertedRows
      skippedRows
      errorMessage
    }
  }
`;

const CONTRACT_PAYMENT_SOURCES_QUERY = gql`
  query ContractPaymentSources {
    contractPaymentSources {
      id
      type
      name
      isActive
      sheetId
      sheetGid
      headerRow
      createdAt
      updatedAt
    }
  }
`;

const CONTRACT_PAYMENT_STATUSES_QUERY = gql`
  query ContractPaymentStatuses($documentNumbers: [String!]!) {
    contractPaymentStatuses(documentNumbers: $documentNumbers) {
      id
      documentNumberNorm
      requiredAmountKrw
      receivedAmountKrw
      status
      needsReviewReason
      matchedPlanVersionId
      computedAt
      updatedAt
    }
  }
`;

const CONTRACT_PAYMENT_SYNC_RUNS_QUERY = gql`
  query ContractPaymentSyncRuns($sourceId: ID, $limit: Int = 20) {
    contractPaymentSyncRuns(sourceId: $sourceId, limit: $limit) {
      id
      sourceId
      status
      startedAt
      finishedAt
      fetchedRows
      upsertedRows
      skippedRows
      matchedRows
      reviewRows
      errorMessage
    }
  }
`;

const SYNC_CONTRACT_PAYMENTS_MUTATION = gql`
  mutation SyncContractPayments($sourceId: ID!) {
    syncContractPayments(sourceId: $sourceId) {
      id
      sourceId
      status
      startedAt
      finishedAt
      fetchedRows
      upsertedRows
      skippedRows
      matchedRows
      reviewRows
      errorMessage
    }
  }
`;

export function useContractSubmissionSources() {
  const { data, loading, refetch } = useQuery<{ contractSubmissionSources: ContractSubmissionSourceRow[] }>(
    CONTRACT_SUBMISSION_SOURCES_QUERY,
  );
  return { sources: data?.contractSubmissionSources ?? [], loading, refetch };
}

export function useContractDocumentStatuses(documentNumbers: string[]) {
  const normalizedInput = useMemo(() => documentNumbers.map((item) => item.trim()).filter(Boolean), [documentNumbers]);
  const { data, loading, refetch } = useQuery<{ contractDocumentStatuses: ContractDocumentStatusRow[] }>(
    CONTRACT_DOCUMENT_STATUSES_QUERY,
    {
      variables: { documentNumbers: normalizedInput },
      skip: normalizedInput.length === 0,
    },
  );
  return { statuses: data?.contractDocumentStatuses ?? [], loading, refetch };
}

export function useContractSyncRuns(sourceId?: string, limit = 20) {
  const { data, loading, refetch } = useQuery<{ contractSyncRuns: ContractSyncRunRow[] }>(
    CONTRACT_SYNC_RUNS_QUERY,
    { variables: { sourceId, limit } },
  );
  return { runs: data?.contractSyncRuns ?? [], loading, refetch };
}

export function useSyncContractSubmissions() {
  const [mutate, { loading }] = useMutation<{ syncContractSubmissions: ContractSyncRunRow }>(
    SYNC_CONTRACT_SUBMISSIONS_MUTATION,
  );
  return {
    loading,
    syncContractSubmissions: async (sourceId: string): Promise<ContractSyncRunRow> => {
      const result = await mutate({
        variables: { sourceId },
        refetchQueries: [
          { query: CONTRACT_SYNC_RUNS_QUERY, variables: { sourceId, limit: 20 } },
        ],
      });
      if (!result.data?.syncContractSubmissions) {
        throw new Error('Failed to sync contract submissions');
      }
      return result.data.syncContractSubmissions;
    },
  };
}

export function useContractPaymentSources() {
  const { data, loading, refetch } = useQuery<{ contractPaymentSources: ContractPaymentSourceRow[] }>(
    CONTRACT_PAYMENT_SOURCES_QUERY,
  );
  return { sources: data?.contractPaymentSources ?? [], loading, refetch };
}

export function useContractPaymentStatuses(documentNumbers: string[]) {
  const normalizedInput = useMemo(() => documentNumbers.map((item) => item.trim()).filter(Boolean), [documentNumbers]);
  const { data, loading, refetch } = useQuery<{ contractPaymentStatuses: ContractPaymentStatusRow[] }>(
    CONTRACT_PAYMENT_STATUSES_QUERY,
    {
      variables: { documentNumbers: normalizedInput },
      skip: normalizedInput.length === 0,
    },
  );
  return { statuses: data?.contractPaymentStatuses ?? [], loading, refetch };
}

export function useContractPaymentSyncRuns(sourceId?: string, limit = 20) {
  const { data, loading, refetch } = useQuery<{ contractPaymentSyncRuns: ContractPaymentSyncRunRow[] }>(
    CONTRACT_PAYMENT_SYNC_RUNS_QUERY,
    { variables: { sourceId, limit } },
  );
  return { runs: data?.contractPaymentSyncRuns ?? [], loading, refetch };
}

export function useSyncContractPayments() {
  const [mutate, { loading }] = useMutation<{ syncContractPayments: ContractPaymentSyncRunRow }>(
    SYNC_CONTRACT_PAYMENTS_MUTATION,
  );
  return {
    loading,
    syncContractPayments: async (sourceId: string): Promise<ContractPaymentSyncRunRow> => {
      const result = await mutate({
        variables: { sourceId },
        refetchQueries: [
          { query: CONTRACT_PAYMENT_SYNC_RUNS_QUERY, variables: { sourceId, limit: 20 } },
        ],
      });
      if (!result.data?.syncContractPayments) {
        throw new Error('Failed to sync contract payments');
      }
      return result.data.syncContractPayments;
    },
  };
}
