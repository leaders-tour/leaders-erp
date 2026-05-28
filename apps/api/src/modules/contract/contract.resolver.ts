import type { AppContext } from '../../context';
import { requireAdmin, requireStaffOrAbove } from '../../lib/auth-guards';
import { ContractSyncService } from './contract-sync.service';

interface ContractDocumentStatusesArgs {
  documentNumbers: string[];
}

interface ContractSyncRunsArgs {
  sourceId?: string;
  limit?: number;
}

interface SyncContractSubmissionsArgs {
  sourceId: string;
}

export const contractResolver = {
  Query: {
    contractSubmissionSources: (_parent: unknown, _args: unknown, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractSyncService(ctx.prisma).listSources();
    },
    contractDocumentStatuses: (_parent: unknown, args: ContractDocumentStatusesArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractSyncService(ctx.prisma).listStatuses(args.documentNumbers);
    },
    contractSyncRuns: (_parent: unknown, args: ContractSyncRunsArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new ContractSyncService(ctx.prisma).listSyncRuns(args.sourceId, args.limit ?? 20);
    },
  },
  Mutation: {
    syncContractSubmissions: (_parent: unknown, args: SyncContractSubmissionsArgs, ctx: AppContext) => {
      requireAdmin(ctx);
      return new ContractSyncService(ctx.prisma).syncGoogleSheetSource(args.sourceId);
    },
  },
};
