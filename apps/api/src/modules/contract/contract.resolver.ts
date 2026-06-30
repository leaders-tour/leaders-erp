import type { AppContext } from '../../context';
import { requireAdmin, requireStaffOrAbove } from '../../lib/auth-guards';
import {
  analyzeContractSubmissionReview,
  type ContractSubmissionAttentionKind,
  type ContractSubmissionAttentionSeverity,
  parsePassportPhotoUrlsJson,
} from '@tour/validation';
import type { UploadFile } from '../../lib/file-storage/client';
import { ContractPaymentSyncService, ContractSyncService } from './contract-sync.service';
import {
  removeContractSubmissionPassportPhotoManual,
  resyncContractSubmissionPassportPhotoFromSheetManual,
  uploadContractSubmissionPassportPhotoManual,
} from './contract-passport-photo-sync';

interface ContractDocumentStatusesArgs {
  documentNumbers: string[];
}

interface ContractDocumentNumberArgs {
  documentNumber: string;
}

interface ContractDocumentReviewItemsArgs {
  statuses?: Array<'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVER_SUBMITTED' | 'NEEDS_REVIEW'>;
  keyword?: string;
  limit?: number;
  visibility?: 'VISIBLE' | 'HIDDEN';
}

interface ContractMatchPlanVersionCandidatesArgs {
  keyword: string;
  limit?: number;
}

interface ContractSyncRunsArgs {
  sourceId?: string;
  limit?: number;
}

interface SyncContractSubmissionsArgs {
  sourceId: string;
}

interface ContractPaymentStatusesArgs {
  documentNumbers: string[];
}

interface ContractPaymentSyncRunsArgs {
  sourceId?: string;
  limit?: number;
}

interface SyncContractPaymentsArgs {
  sourceId: string;
}

interface MatchContractDocumentArgs {
  input: {
    documentNumber: string;
    planVersionId: string;
    note?: string | null;
  };
}

interface UnmatchContractDocumentArgs {
  input: {
    documentNumber: string;
  };
}

interface ExcludeContractSubmissionFromCountArgs {
  input: {
    submissionId: string;
    reason?: string | null;
  };
}

interface RestoreContractSubmissionToCountArgs {
  input: {
    submissionId: string;
  };
}

interface TrashContractDocumentReviewArgs {
  input: {
    documentNumber: string;
    reason?: string | null;
  };
}

interface RestoreContractDocumentReviewArgs {
  input: {
    documentNumber: string;
  };
}

interface ContractPaymentReviewReceiptsArgs {
  keyword?: string;
  reasons?: string[];
  limit?: number;
  visibility?: 'VISIBLE' | 'HIDDEN';
}

interface TrashContractPaymentReceiptReviewArgs {
  input: {
    receiptId: string;
    reason?: string | null;
  };
}

interface RestoreContractPaymentReceiptReviewArgs {
  input: {
    receiptId: string;
  };
}

interface MatchContractPaymentReceiptArgs {
  input: {
    receiptId: string;
    documentNumber: string;
  };
}

interface UnmatchContractPaymentReceiptArgs {
  input: {
    receiptId: string;
  };
}

interface ManualContractPaymentReceiptsArgs {
  documentNumber?: string;
  limit?: number;
}

interface CreateManualContractPaymentReceiptArgs {
  input: {
    documentNumber: string;
    payerName?: string | null;
    amountKrw: number;
    receivedAt?: string | null;
    memo?: string | null;
  };
}

interface UpdateManualContractPaymentReceiptArgs {
  input: {
    receiptId: string;
    documentNumber?: string;
    payerName?: string | null;
    amountKrw?: number;
    receivedAt?: string | null;
    memo?: string | null;
  };
}

interface DeleteManualContractPaymentReceiptArgs {
  input: {
    receiptId: string;
  };
}

interface ResetContractPaymentReceiptAutoMatchArgs {
  input: {
    receiptId: string;
  };
}

function effectiveMatchedPlanVersionId(parent: {
  manualMatchedPlanVersionId?: string | null;
  matchedPlanVersionId?: string | null;
}): string | null {
  return parent.manualMatchedPlanVersionId ?? parent.matchedPlanVersionId ?? null;
}

function toGraphqlAttentionKind(kind: ContractSubmissionAttentionKind): string {
  switch (kind) {
    case 'special_note':
      return 'SPECIAL_NOTE';
    case 'consultation':
      return 'CONSULTATION';
    case 'declined_consent':
      return 'DECLINED_CONSENT';
    case 'activity_opt_out':
      return 'ACTIVITY_OPT_OUT';
    case 'incomplete':
      return 'INCOMPLETE';
  }
}

function toGraphqlAttentionSeverity(severity: ContractSubmissionAttentionSeverity): string {
  return severity === 'high' ? 'HIGH' : 'MEDIUM';
}

function contractSubmissionReviewSummary(parent: {
  rawJson?: unknown;
  travelerGender?: string | null;
  travelerBirthCode?: string | null;
  travelerNote?: string | null;
}) {
  const summary = analyzeContractSubmissionReview({
    rawJson: parent.rawJson,
    travelerGender: parent.travelerGender,
    travelerBirthCode: parent.travelerBirthCode,
    travelerNote: parent.travelerNote,
  });

  return {
    hasAttentionItems: summary.hasAttentionItems,
    attentionItems: summary.attentionItems.map((item) => ({
      kind: toGraphqlAttentionKind(item.kind),
      severity: toGraphqlAttentionSeverity(item.severity),
      label: item.label,
      detail: item.detail,
      sourceHeader: item.sourceHeader,
    })),
    formResponses: summary.formResponses,
  };
}

export const contractResolver = {
  ContractDocumentStatus: {
    effectiveMatchedPlanVersionId: (parent: {
      manualMatchedPlanVersionId?: string | null;
      matchedPlanVersionId?: string | null;
      effectiveMatchedPlanVersionId?: string | null;
    }) => parent.effectiveMatchedPlanVersionId ?? effectiveMatchedPlanVersionId(parent),
    effectiveMatchedPlanId: async (
      parent: {
        manualMatchedPlanVersionId?: string | null;
        matchedPlanVersionId?: string | null;
        effectiveMatchedPlanVersionId?: string | null;
        effectiveMatchedPlanId?: string | null;
      },
      _args: unknown,
      ctx: AppContext,
    ) => {
      if ('effectiveMatchedPlanId' in parent) {
        return parent.effectiveMatchedPlanId ?? null;
      }
      const versionId = parent.effectiveMatchedPlanVersionId ?? effectiveMatchedPlanVersionId(parent);
      if (!versionId) {
        return null;
      }
      const version = await ctx.prisma.planVersion.findUnique({
        where: { id: versionId },
        select: { planId: true },
      });
      return version?.planId ?? null;
    },
  },
  ContractDocumentReviewItem: {
    statusRow: (parent: { statusRow: unknown }) => parent.statusRow,
    submissions: (parent: { submissions: unknown[] }) => parent.submissions,
    matchedPlanSummary: (parent: { matchedPlanSummary?: unknown }) => parent.matchedPlanSummary ?? null,
  },
  ContractSubmission: {
    passportPhotoUrls: (parent: { passportPhotoUrls?: unknown }) =>
      parsePassportPhotoUrlsJson(parent.passportPhotoUrls),
    passportPhotoSourceMode: (parent: { passportPhotoSourceMode?: string | null }) =>
      parent.passportPhotoSourceMode === 'MANUAL' ? 'MANUAL' : 'AUTO',
    reviewSummary: (parent: {
      rawJson?: unknown;
      travelerGender?: string | null;
      travelerBirthCode?: string | null;
      travelerNote?: string | null;
    }) => contractSubmissionReviewSummary(parent),
  },
  ContractPaymentReviewReceiptItem: {
    receipt: (parent: { receipt: unknown }) => parent.receipt,
    candidateDocumentNumbers: (parent: {
      candidateDocumentNumbers: Array<{
        documentNumber: string;
        representativeName: string;
        teamMemberNames: string[];
        teamPaymentReferences: Array<{
          teamName: string;
          headcount: number;
          depositAmountKrw: number;
          securityAmountKrw: number;
          securityLabel: string;
          requiredReferenceKrw: number;
          requiredTotalKrw: number;
        }>;
        memberDeposits: Array<{
          name: string;
          receivedAmountKrw: number;
          requiredReferenceAmountKrw: number | null;
        }>;
        requiredTotalKrw: number | null;
        receivedTotalKrw: number;
        remainingTotalKrw: number | null;
      }>;
    }) => parent.candidateDocumentNumbers,
  },
  Query: {
    contractSubmissionSources: (_parent: unknown, _args: unknown, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractSyncService(ctx.prisma).listSources();
    },
    contractDocumentStatuses: (_parent: unknown, args: ContractDocumentStatusesArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractSyncService(ctx.prisma).listStatuses(args.documentNumbers);
    },
    contractDocumentReviewItems: (_parent: unknown, args: ContractDocumentReviewItemsArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractSyncService(ctx.prisma).listReviewItems(args);
    },
    contractDocumentReviewTabCounts: (_parent: unknown, _args: unknown, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractSyncService(ctx.prisma).getReviewTabCounts();
    },
    contractMatchPlanVersionCandidates: (_parent: unknown, args: ContractMatchPlanVersionCandidatesArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractSyncService(ctx.prisma).searchPlanVersionCandidates(args.keyword, args.limit ?? 20);
    },
    contractSubmissions: (_parent: unknown, args: ContractDocumentNumberArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractSyncService(ctx.prisma).listSubmissions(args.documentNumber);
    },
    contractSyncRuns: (_parent: unknown, args: ContractSyncRunsArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractSyncService(ctx.prisma).listSyncRuns(args.sourceId, args.limit ?? 20);
    },
    contractPaymentSources: (_parent: unknown, _args: unknown, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).listSources();
    },
    contractPaymentStatuses: (_parent: unknown, args: ContractPaymentStatusesArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).listStatuses(args.documentNumbers);
    },
    contractPaymentReceipts: (_parent: unknown, args: ContractDocumentNumberArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).listReceipts(args.documentNumber);
    },
    contractPaymentReviewReceipts: (_parent: unknown, args: ContractPaymentReviewReceiptsArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).listReviewReceipts(args);
    },
    contractPaymentReviewTabCount: (_parent: unknown, _args: unknown, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).getReviewTabCount();
    },
    contractPaymentReviewTabCounts: (_parent: unknown, _args: unknown, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).getPaymentReviewTabCounts();
    },
    contractPaymentSyncRuns: (_parent: unknown, args: ContractPaymentSyncRunsArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).listSyncRuns(args.sourceId, args.limit ?? 20);
    },
    manualContractPaymentReceipts: (_parent: unknown, args: ManualContractPaymentReceiptsArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).listManualContractPaymentReceipts(
        args.documentNumber,
        args.limit ?? 50,
      );
    },
  },
  Mutation: {
    syncContractSubmissions: (_parent: unknown, args: SyncContractSubmissionsArgs, ctx: AppContext) => {
      requireAdmin(ctx);
      return new ContractSyncService(ctx.prisma).syncGoogleSheetSource(args.sourceId);
    },
    syncContractPayments: (_parent: unknown, args: SyncContractPaymentsArgs, ctx: AppContext) => {
      requireAdmin(ctx);
      return new ContractPaymentSyncService(ctx.prisma).syncGoogleSheetSource(args.sourceId);
    },
    matchContractDocument: (_parent: unknown, args: MatchContractDocumentArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      if (!ctx.employee) {
        throw new Error('Unauthorized');
      }
      return new ContractSyncService(ctx.prisma).matchContractDocument(args.input, ctx.employee.id);
    },
    unmatchContractDocument: (_parent: unknown, args: UnmatchContractDocumentArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractSyncService(ctx.prisma).unmatchContractDocument(args.input);
    },
    excludeContractSubmissionFromCount: (_parent: unknown, args: ExcludeContractSubmissionFromCountArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      if (!ctx.employee) {
        throw new Error('Unauthorized');
      }
      return new ContractSyncService(ctx.prisma).excludeContractSubmissionFromCount(args.input, ctx.employee.id);
    },
    restoreContractSubmissionToCount: (_parent: unknown, args: RestoreContractSubmissionToCountArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractSyncService(ctx.prisma).restoreContractSubmissionToCount(args.input);
    },
    trashContractDocumentReview: (_parent: unknown, args: TrashContractDocumentReviewArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      if (!ctx.employee) {
        throw new Error('Unauthorized');
      }
      return new ContractSyncService(ctx.prisma).trashContractDocumentReview(args.input, ctx.employee.id);
    },
    restoreContractDocumentReview: (_parent: unknown, args: RestoreContractDocumentReviewArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractSyncService(ctx.prisma).restoreContractDocumentReview(args.input);
    },
    matchContractPaymentReceipt: (_parent: unknown, args: MatchContractPaymentReceiptArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      if (!ctx.employee) {
        throw new Error('Unauthorized');
      }
      return new ContractPaymentSyncService(ctx.prisma).matchContractPaymentReceipt(args.input, ctx.employee.id);
    },
    unmatchContractPaymentReceipt: (_parent: unknown, args: UnmatchContractPaymentReceiptArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      if (!ctx.employee) {
        throw new Error('Unauthorized');
      }
      return new ContractPaymentSyncService(ctx.prisma).unmatchContractPaymentReceipt(args.input, ctx.employee.id);
    },
    createManualContractPaymentReceipt: (_parent: unknown, args: CreateManualContractPaymentReceiptArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).createManualContractPaymentReceipt(args.input);
    },
    updateManualContractPaymentReceipt: (_parent: unknown, args: UpdateManualContractPaymentReceiptArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).updateManualContractPaymentReceipt(args.input);
    },
    deleteManualContractPaymentReceipt: (_parent: unknown, args: DeleteManualContractPaymentReceiptArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).deleteManualContractPaymentReceipt(args.input);
    },
    resetContractPaymentReceiptAutoMatch: (_parent: unknown, args: ResetContractPaymentReceiptAutoMatchArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).resetContractPaymentReceiptAutoMatch(args.input);
    },
    trashContractPaymentReceiptReview: (_parent: unknown, args: TrashContractPaymentReceiptReviewArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      if (!ctx.employee) {
        throw new Error('Unauthorized');
      }
      return new ContractPaymentSyncService(ctx.prisma).trashContractPaymentReceiptReview(args.input, ctx.employee.id);
    },
    restoreContractPaymentReceiptReview: (_parent: unknown, args: RestoreContractPaymentReceiptReviewArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).restoreContractPaymentReceiptReview(args.input);
    },
    uploadContractSubmissionPassportPhoto: (
      _parent: unknown,
      args: { submissionId: string; image: UploadFile | Promise<UploadFile> },
      ctx: AppContext,
    ) => {
      requireStaffOrAbove(ctx);
      if (!ctx.employee) {
        throw new Error('Unauthorized');
      }
      return uploadContractSubmissionPassportPhotoManual(
        ctx.prisma,
        args.submissionId,
        args.image,
        ctx.employee.id,
      );
    },
    removeContractSubmissionPassportPhoto: (
      _parent: unknown,
      args: { submissionId: string; imageUrl?: string | null },
      ctx: AppContext,
    ) => {
      requireStaffOrAbove(ctx);
      if (!ctx.employee) {
        throw new Error('Unauthorized');
      }
      return removeContractSubmissionPassportPhotoManual(
        ctx.prisma,
        { submissionId: args.submissionId, imageUrl: args.imageUrl ?? null },
        ctx.employee.id,
      );
    },
    resyncContractSubmissionPassportPhotoFromSheet: (
      _parent: unknown,
      args: { submissionId: string },
      ctx: AppContext,
    ) => {
      requireStaffOrAbove(ctx);
      return resyncContractSubmissionPassportPhotoFromSheetManual(ctx.prisma, {
        submissionId: args.submissionId,
      });
    },
  },
};
