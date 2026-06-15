import { gql, useMutation, useQuery } from '@apollo/client';
import { useMemo } from 'react';

export type ContractSubmissionSourceType = 'GOOGLE_SHEET' | 'INTERNAL_FORM';
export type ContractDocumentStatusValue =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVER_SUBMITTED'
  | 'NEEDS_REVIEW';
export type ContractDocumentReviewVisibility = 'VISIBLE' | 'HIDDEN';
export type ContractSyncRunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';
export type ContractPaymentSourceType = 'GOOGLE_SHEET' | 'MANUAL';
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
  manualMatchedPlanVersionId: string | null;
  manualMatchedByEmployeeId: string | null;
  manualMatchedAt: string | null;
  manualMatchNote: string | null;
  reviewTrashedAt: string | null;
  reviewTrashedByEmployeeId: string | null;
  reviewTrashReason: string | null;
  reviewTrashRestoredAt: string | null;
  effectiveMatchedPlanVersionId: string | null;
  effectiveMatchedPlanId: string | null;
  computedAt: string;
  updatedAt: string;
}

export interface ContractMatchedPlanSummaryRow {
  planVersionId: string;
  planId: string;
  planTitle: string;
  versionNumber: number;
  userId: string;
  userName: string;
  documentNumber: string;
  leaderName: string;
  headcountTotal: number;
  travelStartDate: string;
  travelEndDate: string;
  isManualMatch: boolean;
}

export interface ContractDocumentReviewItemRow {
  statusRow: ContractDocumentStatusRow;
  submissions: ContractSubmissionRow[];
  matchedPlanSummary: ContractMatchedPlanSummaryRow | null;
}

export interface ContractDocumentReviewTabCountsRow {
  needsReview: number;
  overSubmitted: number;
  inProgress: number;
  completed: number;
  all: number;
  trashed: number;
}

export interface ContractMatchPlanVersionCandidateRow {
  planVersionId: string;
  planId: string;
  planTitle: string;
  versionNumber: number;
  userId: string;
  userName: string;
  documentNumber: string;
  leaderName: string;
  headcountTotal: number;
  travelStartDate: string;
  travelEndDate: string;
  isCurrent: boolean;
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

export interface ContractSubmissionRow {
  id: string;
  source: ContractSubmissionSourceRow;
  sourceRowNumber: number | null;
  submittedAt: string | null;
  documentNumberRaw: string | null;
  documentNumberNorm: string | null;
  travelerName: string | null;
  travelerPhone: string | null;
  leaderName: string | null;
  representativeType: string | null;
  totalCompanionCount: number | null;
  receivedStatus: string | null;
  excludedFromContractCount: boolean;
  excludedAt: string | null;
  exclusionReason: string | null;
  importedAt: string;
  updatedAt: string;
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

export type ContractPaymentReceiptMatchMode = 'AUTO' | 'MANUAL_MATCH' | 'MANUAL_HOLD';

export interface ContractPaymentReceiptRow {
  id: string;
  source: ContractPaymentSourceRow;
  sourceRowNumber: number | null;
  receivedAt: string | null;
  payerNameRaw: string | null;
  amountKrw: number | null;
  matchedDocumentNumberNorm: string | null;
  needsReviewReason: string | null;
  memo: string | null;
  paymentMatchMode: ContractPaymentReceiptMatchMode;
  manualMatchedByEmployeeId: string | null;
  manualMatchedAt: string | null;
  reviewTrashedAt: string | null;
  reviewTrashedByEmployeeId: string | null;
  reviewTrashReason: string | null;
  importedAt: string;
  updatedAt: string;
}

export interface ContractPaymentReviewTeamPaymentReferenceRow {
  teamName: string;
  headcount: number;
  depositAmountKrw: number;
  securityAmountKrw: number;
  securityLabel: string;
  requiredReferenceKrw: number;
  requiredTotalKrw: number;
}

export interface ContractPaymentReviewMemberDepositRow {
  name: string;
  receivedAmountKrw: number;
  requiredReferenceAmountKrw: number | null;
}

export interface ContractPaymentReviewDocumentCandidateRow {
  documentNumber: string;
  representativeName: string;
  teamMemberNames: string[];
  teamPaymentReferences: ContractPaymentReviewTeamPaymentReferenceRow[];
  memberDeposits: ContractPaymentReviewMemberDepositRow[];
  requiredTotalKrw: number | null;
  receivedTotalKrw: number;
  remainingTotalKrw: number | null;
}

export interface ContractPaymentReviewReceiptItemRow {
  receipt: ContractPaymentReceiptRow;
  candidateDocumentNumbers: ContractPaymentReviewDocumentCandidateRow[];
}

export interface ContractPaymentReviewTabCountsRow {
  ambiguousPayerName: number;
  nameMismatch: number;
  trashed: number;
  all: number;
}

export type ContractPaymentReviewVisibility = 'VISIBLE' | 'HIDDEN';

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
      manualMatchedPlanVersionId
      manualMatchedByEmployeeId
      manualMatchedAt
      manualMatchNote
      effectiveMatchedPlanVersionId
      computedAt
      updatedAt
    }
  }
`;

const CONTRACT_DOCUMENT_REVIEW_ITEMS_QUERY = gql`
  query ContractDocumentReviewItems(
    $statuses: [ContractDocumentStatusValue!]
    $keyword: String
    $limit: Int = 100
    $visibility: ContractDocumentReviewVisibility = VISIBLE
  ) {
    contractDocumentReviewItems(statuses: $statuses, keyword: $keyword, limit: $limit, visibility: $visibility) {
      statusRow {
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
        manualMatchedPlanVersionId
        manualMatchedByEmployeeId
        manualMatchedAt
        manualMatchNote
        reviewTrashedAt
        reviewTrashedByEmployeeId
        reviewTrashReason
        reviewTrashRestoredAt
        effectiveMatchedPlanVersionId
        effectiveMatchedPlanId
        computedAt
        updatedAt
      }
      matchedPlanSummary {
        planVersionId
        planId
        planTitle
        versionNumber
        userId
        userName
        documentNumber
        leaderName
        headcountTotal
        travelStartDate
        travelEndDate
        isManualMatch
      }
      submissions {
        id
        sourceRowNumber
        submittedAt
        documentNumberRaw
        documentNumberNorm
        travelerName
        travelerPhone
        leaderName
        representativeType
        totalCompanionCount
        receivedStatus
        excludedFromContractCount
        excludedAt
        exclusionReason
        importedAt
        updatedAt
        source {
          id
          type
          name
        }
      }
    }
  }
`;

const CONTRACT_DOCUMENT_REVIEW_TAB_COUNTS_QUERY = gql`
  query ContractDocumentReviewTabCounts {
    contractDocumentReviewTabCounts {
      needsReview
      overSubmitted
      inProgress
      completed
      all
      trashed
    }
  }
`;

const TRASH_CONTRACT_DOCUMENT_REVIEW_MUTATION = gql`
  mutation TrashContractDocumentReview($input: TrashContractDocumentReviewInput!) {
    trashContractDocumentReview(input: $input) {
      id
      documentNumberNorm
      status
      reviewTrashedAt
      reviewTrashReason
    }
  }
`;

const RESTORE_CONTRACT_DOCUMENT_REVIEW_MUTATION = gql`
  mutation RestoreContractDocumentReview($input: RestoreContractDocumentReviewInput!) {
    restoreContractDocumentReview(input: $input) {
      id
      documentNumberNorm
      status
      reviewTrashedAt
      reviewTrashRestoredAt
    }
  }
`;

const EXCLUDE_CONTRACT_SUBMISSION_FROM_COUNT_MUTATION = gql`
  mutation ExcludeContractSubmissionFromCount($input: ExcludeContractSubmissionFromCountInput!) {
    excludeContractSubmissionFromCount(input: $input) {
      id
      excludedFromContractCount
      excludedAt
      exclusionReason
    }
  }
`;

const RESTORE_CONTRACT_SUBMISSION_TO_COUNT_MUTATION = gql`
  mutation RestoreContractSubmissionToCount($input: RestoreContractSubmissionToCountInput!) {
    restoreContractSubmissionToCount(input: $input) {
      id
      excludedFromContractCount
      excludedAt
      exclusionReason
    }
  }
`;

const CONTRACT_MATCH_PLAN_VERSION_CANDIDATES_QUERY = gql`
  query ContractMatchPlanVersionCandidates($keyword: String!, $limit: Int = 20) {
    contractMatchPlanVersionCandidates(keyword: $keyword, limit: $limit) {
      planVersionId
      planId
      planTitle
      versionNumber
      userId
      userName
      documentNumber
      leaderName
      headcountTotal
      travelStartDate
      travelEndDate
      isCurrent
    }
  }
`;

const MATCH_CONTRACT_DOCUMENT_MUTATION = gql`
  mutation MatchContractDocument($input: MatchContractDocumentInput!) {
    matchContractDocument(input: $input) {
      id
      documentNumberNorm
      status
      needsReviewReason
      matchedPlanVersionId
      manualMatchedPlanVersionId
      effectiveMatchedPlanVersionId
      manualMatchedAt
      manualMatchNote
    }
  }
`;

const UNMATCH_CONTRACT_DOCUMENT_MUTATION = gql`
  mutation UnmatchContractDocument($input: UnmatchContractDocumentInput!) {
    unmatchContractDocument(input: $input) {
      id
      documentNumberNorm
      status
      needsReviewReason
      matchedPlanVersionId
      manualMatchedPlanVersionId
      effectiveMatchedPlanVersionId
      manualMatchedAt
      manualMatchNote
    }
  }
`;

const CONTRACT_SUBMISSIONS_QUERY = gql`
  query ContractSubmissions($documentNumber: String!) {
    contractSubmissions(documentNumber: $documentNumber) {
      id
      sourceRowNumber
      submittedAt
      documentNumberRaw
      documentNumberNorm
      travelerName
      travelerPhone
      leaderName
      representativeType
      totalCompanionCount
      receivedStatus
      importedAt
      updatedAt
      source {
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

const CONTRACT_PAYMENT_RECEIPTS_QUERY = gql`
  query ContractPaymentReceipts($documentNumber: String!) {
    contractPaymentReceipts(documentNumber: $documentNumber) {
      id
      sourceRowNumber
      receivedAt
      payerNameRaw
      amountKrw
      matchedDocumentNumberNorm
      needsReviewReason
      memo
      paymentMatchMode
      manualMatchedByEmployeeId
      manualMatchedAt
      importedAt
      updatedAt
      source {
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

const CONTRACT_PAYMENT_REVIEW_RECEIPTS_QUERY = gql`
  query ContractPaymentReviewReceipts(
    $keyword: String
    $reasons: [String!]
    $limit: Int
    $visibility: ContractDocumentReviewVisibility
  ) {
    contractPaymentReviewReceipts(
      keyword: $keyword
      reasons: $reasons
      limit: $limit
      visibility: $visibility
    ) {
      candidateDocumentNumbers {
        documentNumber
        representativeName
        teamMemberNames
        teamPaymentReferences {
          teamName
          headcount
          depositAmountKrw
          securityAmountKrw
          securityLabel
          requiredReferenceKrw
          requiredTotalKrw
        }
        memberDeposits {
          name
          receivedAmountKrw
          requiredReferenceAmountKrw
        }
        requiredTotalKrw
        receivedTotalKrw
        remainingTotalKrw
      }
      receipt {
        id
        sourceRowNumber
        receivedAt
        payerNameRaw
        amountKrw
        matchedDocumentNumberNorm
        needsReviewReason
        paymentMatchMode
        manualMatchedByEmployeeId
        manualMatchedAt
        reviewTrashedAt
        reviewTrashedByEmployeeId
        reviewTrashReason
        importedAt
        updatedAt
        source {
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
    }
  }
`;

const CONTRACT_PAYMENT_REVIEW_TAB_COUNT_QUERY = gql`
  query ContractPaymentReviewTabCount {
    contractPaymentReviewTabCount
  }
`;

const CONTRACT_PAYMENT_REVIEW_TAB_COUNTS_QUERY = gql`
  query ContractPaymentReviewTabCounts {
    contractPaymentReviewTabCounts {
      ambiguousPayerName
      nameMismatch
      trashed
      all
    }
  }
`;

const CONTRACT_PAYMENT_RECEIPT_FIELDS = `
  id
  sourceRowNumber
  receivedAt
  payerNameRaw
  amountKrw
  matchedDocumentNumberNorm
  needsReviewReason
  memo
  paymentMatchMode
  manualMatchedByEmployeeId
  manualMatchedAt
  reviewTrashedAt
  reviewTrashedByEmployeeId
  reviewTrashReason
  importedAt
  updatedAt
`;

const MATCH_CONTRACT_PAYMENT_RECEIPT_MUTATION = gql`
  mutation MatchContractPaymentReceipt($input: MatchContractPaymentReceiptInput!) {
    matchContractPaymentReceipt(input: $input) {
      ${CONTRACT_PAYMENT_RECEIPT_FIELDS}
    }
  }
`;

const UNMATCH_CONTRACT_PAYMENT_RECEIPT_MUTATION = gql`
  mutation UnmatchContractPaymentReceipt($input: UnmatchContractPaymentReceiptInput!) {
    unmatchContractPaymentReceipt(input: $input) {
      ${CONTRACT_PAYMENT_RECEIPT_FIELDS}
    }
  }
`;

const RESTORE_CONTRACT_PAYMENT_RECEIPT_REVIEW_MUTATION = gql`
  mutation RestoreContractPaymentReceiptReview($input: RestoreContractPaymentReceiptReviewInput!) {
    restoreContractPaymentReceiptReview(input: $input) {
      ${CONTRACT_PAYMENT_RECEIPT_FIELDS}
    }
  }
`;

const TRASH_CONTRACT_PAYMENT_RECEIPT_REVIEW_MUTATION = gql`
  mutation TrashContractPaymentReceiptReview($input: TrashContractPaymentReceiptReviewInput!) {
    trashContractPaymentReceiptReview(input: $input) {
      ${CONTRACT_PAYMENT_RECEIPT_FIELDS}
    }
  }
`;

const RESET_CONTRACT_PAYMENT_RECEIPT_AUTO_MATCH_MUTATION = gql`
  mutation ResetContractPaymentReceiptAutoMatch($input: ResetContractPaymentReceiptAutoMatchInput!) {
    resetContractPaymentReceiptAutoMatch(input: $input) {
      ${CONTRACT_PAYMENT_RECEIPT_FIELDS}
    }
  }
`;

const MANUAL_CONTRACT_PAYMENT_RECEIPTS_QUERY = gql`
  query ManualContractPaymentReceipts($documentNumber: String, $limit: Int = 50) {
    manualContractPaymentReceipts(documentNumber: $documentNumber, limit: $limit) {
      id
      sourceRowNumber
      receivedAt
      payerNameRaw
      amountKrw
      matchedDocumentNumberNorm
      needsReviewReason
      memo
      paymentMatchMode
      manualMatchedByEmployeeId
      manualMatchedAt
      importedAt
      updatedAt
      source {
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
  }
`;

const CREATE_MANUAL_CONTRACT_PAYMENT_RECEIPT_MUTATION = gql`
  mutation CreateManualContractPaymentReceipt($input: CreateManualContractPaymentReceiptInput!) {
    createManualContractPaymentReceipt(input: $input) {
      id
      sourceRowNumber
      receivedAt
      payerNameRaw
      amountKrw
      matchedDocumentNumberNorm
      needsReviewReason
      memo
      paymentMatchMode
      manualMatchedByEmployeeId
      manualMatchedAt
      importedAt
      updatedAt
      source {
        id
        type
        name
      }
    }
  }
`;

const UPDATE_MANUAL_CONTRACT_PAYMENT_RECEIPT_MUTATION = gql`
  mutation UpdateManualContractPaymentReceipt($input: UpdateManualContractPaymentReceiptInput!) {
    updateManualContractPaymentReceipt(input: $input) {
      id
      sourceRowNumber
      receivedAt
      payerNameRaw
      amountKrw
      matchedDocumentNumberNorm
      needsReviewReason
      memo
      paymentMatchMode
      manualMatchedByEmployeeId
      manualMatchedAt
      importedAt
      updatedAt
      source {
        id
        type
        name
      }
    }
  }
`;

const DELETE_MANUAL_CONTRACT_PAYMENT_RECEIPT_MUTATION = gql`
  mutation DeleteManualContractPaymentReceipt($input: DeleteManualContractPaymentReceiptInput!) {
    deleteManualContractPaymentReceipt(input: $input)
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

export function useContractSubmissions(documentNumber: string | null | undefined) {
  const normalizedInput = useMemo(() => documentNumber?.trim() ?? '', [documentNumber]);
  const { data, loading } = useQuery<{ contractSubmissions: ContractSubmissionRow[] }>(
    CONTRACT_SUBMISSIONS_QUERY,
    {
      variables: { documentNumber: normalizedInput },
      skip: normalizedInput.length === 0,
    },
  );
  return { submissions: data?.contractSubmissions ?? [], loading };
}

export function useContractDocumentReviewItems(
  statuses?: ContractDocumentStatusValue[],
  keyword?: string,
  limit = 100,
  visibility: ContractDocumentReviewVisibility = 'VISIBLE',
) {
  const normalizedKeyword = keyword?.trim() ?? '';
  const { data, loading, refetch } = useQuery<{ contractDocumentReviewItems: ContractDocumentReviewItemRow[] }>(
    CONTRACT_DOCUMENT_REVIEW_ITEMS_QUERY,
    {
      variables: {
        statuses: statuses?.length ? statuses : undefined,
        keyword: normalizedKeyword || undefined,
        limit,
        visibility,
      },
    },
  );
  return { items: data?.contractDocumentReviewItems ?? [], loading, refetch };
}

export function useContractDocumentReviewTabCounts() {
  const { data, loading, refetch } = useQuery<{ contractDocumentReviewTabCounts: ContractDocumentReviewTabCountsRow }>(
    CONTRACT_DOCUMENT_REVIEW_TAB_COUNTS_QUERY,
  );
  return {
    counts: data?.contractDocumentReviewTabCounts ?? null,
    loading,
    refetch,
  };
}

export function useContractMatchPlanVersionCandidates(keyword: string, limit = 20) {
  const normalizedKeyword = keyword.trim();
  const { data, loading } = useQuery<{ contractMatchPlanVersionCandidates: ContractMatchPlanVersionCandidateRow[] }>(
    CONTRACT_MATCH_PLAN_VERSION_CANDIDATES_QUERY,
    {
      variables: { keyword: normalizedKeyword, limit },
      skip: normalizedKeyword.length === 0,
    },
  );
  return { candidates: data?.contractMatchPlanVersionCandidates ?? [], loading };
}

export function useMatchContractDocument() {
  const [mutate, { loading }] = useMutation<{ matchContractDocument: ContractDocumentStatusRow }>(
    MATCH_CONTRACT_DOCUMENT_MUTATION,
  );
  return {
    loading,
    matchContractDocument: async (input: { documentNumber: string; planVersionId: string; note?: string | null }) => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: CONTRACT_DOCUMENT_REVIEW_ITEMS_QUERY }],
      });
      if (!result.data?.matchContractDocument) {
        throw new Error('Failed to match contract document');
      }
      return result.data.matchContractDocument;
    },
  };
}

export function useUnmatchContractDocument() {
  const [mutate, { loading }] = useMutation<{ unmatchContractDocument: ContractDocumentStatusRow }>(
    UNMATCH_CONTRACT_DOCUMENT_MUTATION,
  );
  return {
    loading,
    unmatchContractDocument: async (documentNumber: string) => {
      const result = await mutate({
        variables: { input: { documentNumber } },
        refetchQueries: [{ query: CONTRACT_DOCUMENT_REVIEW_ITEMS_QUERY }],
      });
      if (!result.data?.unmatchContractDocument) {
        throw new Error('Failed to unmatch contract document');
      }
      return result.data.unmatchContractDocument;
    },
  };
}

export function useExcludeContractSubmissionFromCount() {
  const [mutate, { loading }] = useMutation<{ excludeContractSubmissionFromCount: ContractSubmissionRow }>(
    EXCLUDE_CONTRACT_SUBMISSION_FROM_COUNT_MUTATION,
  );
  return {
    loading,
    excludeContractSubmissionFromCount: async (input: { submissionId: string; reason?: string | null }) => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: CONTRACT_DOCUMENT_REVIEW_ITEMS_QUERY }],
      });
      if (!result.data?.excludeContractSubmissionFromCount) {
        throw new Error('Failed to exclude contract submission from count');
      }
      return result.data.excludeContractSubmissionFromCount;
    },
  };
}

export function useRestoreContractSubmissionToCount() {
  const [mutate, { loading }] = useMutation<{ restoreContractSubmissionToCount: ContractSubmissionRow }>(
    RESTORE_CONTRACT_SUBMISSION_TO_COUNT_MUTATION,
  );
  return {
    loading,
    restoreContractSubmissionToCount: async (submissionId: string) => {
      const result = await mutate({
        variables: { input: { submissionId } },
        refetchQueries: [{ query: CONTRACT_DOCUMENT_REVIEW_ITEMS_QUERY }],
      });
      if (!result.data?.restoreContractSubmissionToCount) {
        throw new Error('Failed to restore contract submission to count');
      }
      return result.data.restoreContractSubmissionToCount;
    },
  };
}

export function useTrashContractDocumentReview() {
  const [mutate, { loading }] = useMutation<{ trashContractDocumentReview: ContractDocumentStatusRow }>(
    TRASH_CONTRACT_DOCUMENT_REVIEW_MUTATION,
  );
  return {
    loading,
    trashContractDocumentReview: async (input: { documentNumber: string; reason?: string | null }) => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [
          { query: CONTRACT_DOCUMENT_REVIEW_ITEMS_QUERY },
          { query: CONTRACT_DOCUMENT_REVIEW_TAB_COUNTS_QUERY },
        ],
      });
      if (!result.data?.trashContractDocumentReview) {
        throw new Error('Failed to trash contract document review item');
      }
      return result.data.trashContractDocumentReview;
    },
  };
}

export function useRestoreContractDocumentReview() {
  const [mutate, { loading }] = useMutation<{ restoreContractDocumentReview: ContractDocumentStatusRow }>(
    RESTORE_CONTRACT_DOCUMENT_REVIEW_MUTATION,
  );
  return {
    loading,
    restoreContractDocumentReview: async (documentNumber: string) => {
      const result = await mutate({
        variables: { input: { documentNumber } },
        refetchQueries: [
          { query: CONTRACT_DOCUMENT_REVIEW_ITEMS_QUERY },
          { query: CONTRACT_DOCUMENT_REVIEW_TAB_COUNTS_QUERY },
        ],
      });
      if (!result.data?.restoreContractDocumentReview) {
        throw new Error('Failed to restore contract document review item');
      }
      return result.data.restoreContractDocumentReview;
    },
  };
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

export function useContractPaymentReceipts(documentNumber: string | null | undefined) {
  const normalizedInput = useMemo(() => documentNumber?.trim() ?? '', [documentNumber]);
  const { data, loading, refetch } = useQuery<{ contractPaymentReceipts: ContractPaymentReceiptRow[] }>(
    CONTRACT_PAYMENT_RECEIPTS_QUERY,
    {
      variables: { documentNumber: normalizedInput },
      skip: normalizedInput.length === 0,
    },
  );
  return { receipts: data?.contractPaymentReceipts ?? [], loading, refetch };
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

export function useContractPaymentReviewReceipts(
  keyword?: string,
  reasons?: string[],
  limit?: number,
  visibility: ContractPaymentReviewVisibility = 'VISIBLE',
) {
  const normalizedKeyword = keyword?.trim() ?? '';
  const normalizedReasons = useMemo(
    () => Array.from(new Set((reasons ?? []).map((reason) => reason.trim()).filter(Boolean))),
    [reasons],
  );
  const { data, loading, refetch } = useQuery<{ contractPaymentReviewReceipts: ContractPaymentReviewReceiptItemRow[] }>(
    CONTRACT_PAYMENT_REVIEW_RECEIPTS_QUERY,
    {
      variables: {
        keyword: normalizedKeyword || undefined,
        reasons: normalizedReasons.length > 0 ? normalizedReasons : undefined,
        visibility,
        ...(limit != null ? { limit } : {}),
      },
    },
  );
  return { items: data?.contractPaymentReviewReceipts ?? [], loading, refetch };
}

export function useContractPaymentReviewTabCount() {
  const { data, loading, refetch } = useQuery<{ contractPaymentReviewTabCount: number }>(
    CONTRACT_PAYMENT_REVIEW_TAB_COUNT_QUERY,
  );
  return {
    count: data?.contractPaymentReviewTabCount ?? null,
    loading,
    refetch,
  };
}

export function useContractPaymentReviewTabCounts() {
  const { data, loading, refetch } = useQuery<{ contractPaymentReviewTabCounts: ContractPaymentReviewTabCountsRow }>(
    CONTRACT_PAYMENT_REVIEW_TAB_COUNTS_QUERY,
  );
  return {
    counts: data?.contractPaymentReviewTabCounts ?? null,
    loading,
    refetch,
  };
}

export function useMatchContractPaymentReceipt() {
  const [mutate, { loading }] = useMutation<{ matchContractPaymentReceipt: ContractPaymentReceiptRow }>(
    MATCH_CONTRACT_PAYMENT_RECEIPT_MUTATION,
  );
  return {
    loading,
    matchContractPaymentReceipt: async (input: { receiptId: string; documentNumber: string }) => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [
          { query: CONTRACT_PAYMENT_REVIEW_RECEIPTS_QUERY },
          { query: CONTRACT_PAYMENT_REVIEW_TAB_COUNT_QUERY },
          { query: CONTRACT_PAYMENT_REVIEW_TAB_COUNTS_QUERY },
          'ContractPaymentReceipts',
        ],
      });
      if (!result.data?.matchContractPaymentReceipt) {
        throw new Error('Failed to match contract payment receipt');
      }
      return result.data.matchContractPaymentReceipt;
    },
  };
}

export function useUnmatchContractPaymentReceipt() {
  const [mutate, { loading }] = useMutation<{ unmatchContractPaymentReceipt: ContractPaymentReceiptRow }>(
    UNMATCH_CONTRACT_PAYMENT_RECEIPT_MUTATION,
  );
  return {
    loading,
    unmatchContractPaymentReceipt: async (receiptId: string) => {
      const result = await mutate({
        variables: { input: { receiptId } },
        refetchQueries: [
          { query: CONTRACT_PAYMENT_REVIEW_RECEIPTS_QUERY },
          { query: CONTRACT_PAYMENT_REVIEW_TAB_COUNT_QUERY },
          { query: CONTRACT_PAYMENT_REVIEW_TAB_COUNTS_QUERY },
          'ContractPaymentReceipts',
        ],
      });
      if (!result.data?.unmatchContractPaymentReceipt) {
        throw new Error('Failed to unmatch contract payment receipt');
      }
      return result.data.unmatchContractPaymentReceipt;
    },
  };
}

export function useResetContractPaymentReceiptAutoMatch() {
  const [mutate, { loading }] = useMutation<{ resetContractPaymentReceiptAutoMatch: ContractPaymentReceiptRow }>(
    RESET_CONTRACT_PAYMENT_RECEIPT_AUTO_MATCH_MUTATION,
  );
  return {
    loading,
    resetContractPaymentReceiptAutoMatch: async (receiptId: string) => {
      const result = await mutate({
        variables: { input: { receiptId } },
        refetchQueries: [
          { query: CONTRACT_PAYMENT_REVIEW_RECEIPTS_QUERY },
          { query: CONTRACT_PAYMENT_REVIEW_TAB_COUNT_QUERY },
          { query: CONTRACT_PAYMENT_REVIEW_TAB_COUNTS_QUERY },
          'ContractPaymentReceipts',
        ],
      });
      if (!result.data?.resetContractPaymentReceiptAutoMatch) {
        throw new Error('Failed to reset contract payment receipt auto match');
      }
      return result.data.resetContractPaymentReceiptAutoMatch;
    },
  };
}

export function useTrashContractPaymentReceiptReview() {
  const [mutate, { loading }] = useMutation<{ trashContractPaymentReceiptReview: ContractPaymentReceiptRow }>(
    TRASH_CONTRACT_PAYMENT_RECEIPT_REVIEW_MUTATION,
  );
  return {
    loading,
    trashContractPaymentReceiptReview: async (input: { receiptId: string; reason?: string | null }) => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [
          { query: CONTRACT_PAYMENT_REVIEW_RECEIPTS_QUERY },
          { query: CONTRACT_PAYMENT_REVIEW_TAB_COUNT_QUERY },
          { query: CONTRACT_PAYMENT_REVIEW_TAB_COUNTS_QUERY },
          'ContractPaymentReceipts',
        ],
      });
      if (!result.data?.trashContractPaymentReceiptReview) {
        throw new Error('Failed to trash contract payment receipt review');
      }
      return result.data.trashContractPaymentReceiptReview;
    },
  };
}

export function useRestoreContractPaymentReceiptReview() {
  const [mutate, { loading }] = useMutation<{ restoreContractPaymentReceiptReview: ContractPaymentReceiptRow }>(
    RESTORE_CONTRACT_PAYMENT_RECEIPT_REVIEW_MUTATION,
  );
  return {
    loading,
    restoreContractPaymentReceiptReview: async (receiptId: string) => {
      const result = await mutate({
        variables: { input: { receiptId } },
        refetchQueries: [
          { query: CONTRACT_PAYMENT_REVIEW_RECEIPTS_QUERY },
          { query: CONTRACT_PAYMENT_REVIEW_TAB_COUNT_QUERY },
          { query: CONTRACT_PAYMENT_REVIEW_TAB_COUNTS_QUERY },
          'ContractPaymentReceipts',
        ],
      });
      if (!result.data?.restoreContractPaymentReceiptReview) {
        throw new Error('Failed to restore contract payment receipt review');
      }
      return result.data.restoreContractPaymentReceiptReview;
    },
  };
}

export function useManualContractPaymentReceipts(documentNumber?: string | null, limit = 50) {
  const normalizedInput = documentNumber?.trim() ?? '';
  const { data, loading, refetch } = useQuery<{ manualContractPaymentReceipts: ContractPaymentReceiptRow[] }>(
    MANUAL_CONTRACT_PAYMENT_RECEIPTS_QUERY,
    {
      variables: {
        documentNumber: normalizedInput || undefined,
        limit,
      },
    },
  );
  return { receipts: data?.manualContractPaymentReceipts ?? [], loading, refetch };
}

export function useCreateManualContractPaymentReceipt() {
  const [mutate, { loading }] = useMutation<{ createManualContractPaymentReceipt: ContractPaymentReceiptRow }>(
    CREATE_MANUAL_CONTRACT_PAYMENT_RECEIPT_MUTATION,
  );
  return {
    loading,
    createManualContractPaymentReceipt: async (input: {
      documentNumber: string;
      payerName?: string | null;
      amountKrw: number;
      receivedAt?: string | null;
      memo?: string | null;
    }) => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [
          { query: MANUAL_CONTRACT_PAYMENT_RECEIPTS_QUERY },
          { query: CONTRACT_PAYMENT_STATUSES_QUERY },
        ],
      });
      if (!result.data?.createManualContractPaymentReceipt) {
        throw new Error('Failed to create manual contract payment receipt');
      }
      return result.data.createManualContractPaymentReceipt;
    },
  };
}

export function useUpdateManualContractPaymentReceipt() {
  const [mutate, { loading }] = useMutation<{ updateManualContractPaymentReceipt: ContractPaymentReceiptRow }>(
    UPDATE_MANUAL_CONTRACT_PAYMENT_RECEIPT_MUTATION,
  );
  return {
    loading,
    updateManualContractPaymentReceipt: async (input: {
      receiptId: string;
      documentNumber?: string;
      payerName?: string | null;
      amountKrw?: number;
      receivedAt?: string | null;
      memo?: string | null;
    }) => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [
          { query: MANUAL_CONTRACT_PAYMENT_RECEIPTS_QUERY },
          { query: CONTRACT_PAYMENT_STATUSES_QUERY },
        ],
      });
      if (!result.data?.updateManualContractPaymentReceipt) {
        throw new Error('Failed to update manual contract payment receipt');
      }
      return result.data.updateManualContractPaymentReceipt;
    },
  };
}

export function useDeleteManualContractPaymentReceipt() {
  const [mutate, { loading }] = useMutation<{ deleteManualContractPaymentReceipt: boolean }>(
    DELETE_MANUAL_CONTRACT_PAYMENT_RECEIPT_MUTATION,
  );
  return {
    loading,
    deleteManualContractPaymentReceipt: async (receiptId: string) => {
      const result = await mutate({
        variables: { input: { receiptId } },
        refetchQueries: [
          { query: MANUAL_CONTRACT_PAYMENT_RECEIPTS_QUERY },
          { query: CONTRACT_PAYMENT_STATUSES_QUERY },
        ],
      });
      if (result.data?.deleteManualContractPaymentReceipt !== true) {
        throw new Error('Failed to delete manual contract payment receipt');
      }
      return true;
    },
  };
}
