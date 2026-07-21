import type { AppContext } from '../../context';
import { requireEmployee } from '../../lib/auth-guards';
import { ConfirmationDocumentService } from './confirmation-document.service';
import type { SaveConfirmationDocumentInput, SaveConfirmationDocumentMemoInput } from '@tour/validation';

interface ConfirmedTripIdArgs {
  confirmedTripId: string;
}

interface UserIdArgs {
  userId: string;
}

interface IdArgs {
  id: string;
}

interface SaveConfirmationDocumentArgs {
  input: SaveConfirmationDocumentInput;
}

interface SaveConfirmationDocumentMemoArgs {
  input: SaveConfirmationDocumentMemoInput;
}

export const confirmationDocumentResolver = {
  Query: {
    confirmationDocument: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new ConfirmationDocumentService(ctx.prisma).getById(args.id),
    confirmationDocuments: (_parent: unknown, args: ConfirmedTripIdArgs, ctx: AppContext) =>
      new ConfirmationDocumentService(ctx.prisma).list(args.confirmedTripId),
    confirmationDocumentsByUserId: (_parent: unknown, args: UserIdArgs, ctx: AppContext) =>
      new ConfirmationDocumentService(ctx.prisma).listByUserId(args.userId),
    latestConfirmationDocument: (_parent: unknown, args: ConfirmedTripIdArgs, ctx: AppContext) =>
      new ConfirmationDocumentService(ctx.prisma).getLatest(args.confirmedTripId),
    latestPublishedConfirmationDocument: (_parent: unknown, args: ConfirmedTripIdArgs, ctx: AppContext) =>
      new ConfirmationDocumentService(ctx.prisma).getLatestPublished(args.confirmedTripId),
    confirmationDraftDefaults: (_parent: unknown, args: ConfirmedTripIdArgs, ctx: AppContext) =>
      new ConfirmationDocumentService(ctx.prisma).getDraftDefaults(args.confirmedTripId),
  },
  Mutation: {
    saveConfirmationDocument: (_parent: unknown, args: SaveConfirmationDocumentArgs, ctx: AppContext) =>
      new ConfirmationDocumentService(ctx.prisma).save(args.input, requireEmployee(ctx)),
    saveConfirmationDocumentMemo: (_parent: unknown, args: SaveConfirmationDocumentMemoArgs, ctx: AppContext) =>
      new ConfirmationDocumentService(ctx.prisma).saveMemo(args.input, requireEmployee(ctx)),
    deleteConfirmationDocument: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new ConfirmationDocumentService(ctx.prisma).delete(args.id),
  },
  ConfirmedTrip: {
    latestPublishedConfirmationDocument: (parent: { id: string }, _args: unknown, ctx: AppContext) =>
      new ConfirmationDocumentService(ctx.prisma).getLatestPublished(parent.id),
  },
};
