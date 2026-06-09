import type { AppContext } from '../../context';
import { requireAdmin, requireStaffOrAbove } from '../../lib/auth-guards';
import { ContractPaymentSyncService, ContractSyncService } from './contract-sync.service';

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

function effectiveMatchedPlanVersionId(parent: {
  manualMatchedPlanVersionId?: string | null;
  matchedPlanVersionId?: string | null;
}): string | null {
  return parent.manualMatchedPlanVersionId ?? parent.matchedPlanVersionId ?? null;
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
    contractPaymentSyncRuns: (_parent: unknown, args: ContractPaymentSyncRunsArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractPaymentSyncService(ctx.prisma).listSyncRuns(args.sourceId, args.limit ?? 20);
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
  },
};
