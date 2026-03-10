import { gql, useMutation, useQuery } from '@apollo/client';

export interface CafeLeadNeedsRow {
  departureDate: string | null;
  returnDate: string | null;
  durationNights: number | null;
  durationDays: number | null;
  travelerCount: number | null;
  travelerType: 'family' | 'couple' | 'friends' | 'solo' | 'unknown';
  destinations: string[];
  budget: string | null;
  interests: string[];
  specialRequests: string[];
  urgency: string | null;
  leadScore: number | null;
}

export interface OutreachDraftRow {
  id: string;
  cafeLeadId: string;
  version: number;
  subject: string;
  previewText: string | null;
  bodyText: string;
  bodyHtml: string;
  promptVersion: string;
  modelName: string;
  qualityScore: number | null;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EDITED';
  reviewerId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutboundMessageRow {
  id: string;
  draftId: string;
  channel: 'EMAIL';
  toEmail: string;
  deliveryStatus: 'QUEUED' | 'SENT' | 'FAILED' | 'BOUNCED';
  provider: string | null;
  providerMessageId: string | null;
  failReason: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CafeLeadRow {
  id: string;
  articleId: string;
  articleUrl: string;
  title: string;
  authorNickname: string | null;
  postedAt: string | null;
  postedAtRaw: string | null;
  views: number | null;
  commentCount: number | null;
  rawHtml: string | null;
  rawText: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactKakaoId: string | null;
  leadScore: number | null;
  status: 'DISCOVERED' | 'FETCHED' | 'PARSED' | 'DRAFTED' | 'APPROVED' | 'SENT' | 'SKIPPED' | 'FAILED';
  failReason: string | null;
  artifactHtmlPath: string | null;
  artifactScreenshotPath: string | null;
  isSuppressed: boolean;
  parsedNeeds: CafeLeadNeedsRow | null;
  latestDraft: OutreachDraftRow | null;
  drafts: OutreachDraftRow[];
  outboundMessages: OutboundMessageRow[];
}

const CAFE_LEADS_QUERY = gql`
  query CafeLeads($filter: CafeLeadFilterInput) {
    cafeLeads(filter: $filter) {
      id
      articleId
      title
      articleUrl
      authorNickname
      postedAt
      postedAtRaw
      leadScore
      status
      contactEmail
      isSuppressed
      latestDraft {
        id
        version
        subject
        reviewStatus
      }
    }
  }
`;

const CAFE_LEAD_QUERY = gql`
  query CafeLead($id: ID!) {
    cafeLead(id: $id) {
      id
      articleId
      articleUrl
      title
      authorNickname
      postedAt
      postedAtRaw
      views
      commentCount
      rawHtml
      rawText
      contactEmail
      contactPhone
      contactKakaoId
      leadScore
      status
      failReason
      artifactHtmlPath
      artifactScreenshotPath
      isSuppressed
      parsedNeeds {
        departureDate
        returnDate
        durationNights
        durationDays
        travelerCount
        travelerType
        destinations
        budget
        interests
        specialRequests
        urgency
        leadScore
      }
      latestDraft {
        id
        cafeLeadId
        version
        subject
        previewText
        bodyText
        bodyHtml
        promptVersion
        modelName
        qualityScore
        reviewStatus
        reviewerId
        reviewedAt
        createdAt
        updatedAt
      }
      drafts {
        id
        cafeLeadId
        version
        subject
        previewText
        bodyText
        bodyHtml
        promptVersion
        modelName
        qualityScore
        reviewStatus
        reviewerId
        reviewedAt
        createdAt
        updatedAt
      }
      outboundMessages {
        id
        draftId
        channel
        toEmail
        deliveryStatus
        provider
        providerMessageId
        failReason
        sentAt
        createdAt
        updatedAt
      }
    }
  }
`;

const APPROVE_DRAFT_MUTATION = gql`
  mutation ApproveOutreachDraft($draftId: ID!) {
    approveOutreachDraft(draftId: $draftId) {
      id
      reviewStatus
    }
  }
`;

const EDIT_AND_APPROVE_DRAFT_MUTATION = gql`
  mutation EditOutreachDraftAndApprove($draftId: ID!, $input: OutreachDraftEditInput!) {
    editOutreachDraftAndApprove(draftId: $draftId, input: $input) {
      id
      reviewStatus
    }
  }
`;

const HOLD_LEAD_MUTATION = gql`
  mutation HoldCafeLead($id: ID!) {
    holdCafeLead(id: $id) {
      id
      status
    }
  }
`;

const SKIP_LEAD_MUTATION = gql`
  mutation SkipCafeLead($id: ID!, $reason: String) {
    skipCafeLead(id: $id, reason: $reason) {
      id
      status
    }
  }
`;

const REGENERATE_DRAFT_MUTATION = gql`
  mutation RegenerateOutreachDraft($cafeLeadId: ID!) {
    regenerateOutreachDraft(cafeLeadId: $cafeLeadId) {
      id
      status
    }
  }
`;

export function useCafeLeads(filter: { search?: string; statuses?: string[]; hasEmail?: boolean }) {
  const { data, loading, refetch } = useQuery<{ cafeLeads: CafeLeadRow[] }>(CAFE_LEADS_QUERY, {
    variables: {
      filter: {
        search: filter.search || undefined,
        statuses: filter.statuses && filter.statuses.length > 0 ? filter.statuses : undefined,
        hasEmail: filter.hasEmail,
      },
    },
  });

  return { leads: data?.cafeLeads ?? [], loading, refetch };
}

export function useCafeLead(id: string) {
  const { data, loading, refetch } = useQuery<{ cafeLead: CafeLeadRow | null }>(CAFE_LEAD_QUERY, {
    variables: { id },
    skip: !id,
  });

  return { lead: data?.cafeLead ?? null, loading, refetch };
}

export function useApproveOutreachDraft() {
  const [mutate, { loading }] = useMutation(APPROVE_DRAFT_MUTATION);

  return {
    loading,
    approveDraft: async (draftId: string) => {
      await mutate({ variables: { draftId } });
    },
  };
}

export function useEditAndApproveOutreachDraft() {
  const [mutate, { loading }] = useMutation(EDIT_AND_APPROVE_DRAFT_MUTATION);

  return {
    loading,
    editAndApproveDraft: async (
      draftId: string,
      input: { subject: string; previewText: string; bodyText: string; bodyHtml: string },
    ) => {
      await mutate({
        variables: {
          draftId,
          input: {
            subject: input.subject,
            previewText: input.previewText || null,
            bodyText: input.bodyText,
            bodyHtml: input.bodyHtml,
          },
        },
      });
    },
  };
}

export function useHoldCafeLead() {
  const [mutate, { loading }] = useMutation(HOLD_LEAD_MUTATION);

  return {
    loading,
    holdLead: async (id: string) => {
      await mutate({ variables: { id } });
    },
  };
}

export function useSkipCafeLead() {
  const [mutate, { loading }] = useMutation(SKIP_LEAD_MUTATION);

  return {
    loading,
    skipLead: async (id: string, reason?: string) => {
      await mutate({ variables: { id, reason } });
    },
  };
}

export function useRegenerateOutreachDraft() {
  const [mutate, { loading }] = useMutation(REGENERATE_DRAFT_MUTATION);

  return {
    loading,
    regenerateDraft: async (cafeLeadId: string) => {
      await mutate({ variables: { cafeLeadId } });
    },
  };
}
