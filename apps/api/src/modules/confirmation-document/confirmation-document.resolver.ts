import type { AppContext } from '../../context';
import { requireEmployee } from '../../lib/auth-guards';
import { ConfirmationDocumentService } from './confirmation-document.service';
import type { SaveConfirmationDocumentInput } from '@tour/validation';

interface ConfirmedTripIdArgs {
  confirmedTripId: string;
}

interface IdArgs {
  id: string;
}

interface SaveConfirmationDocumentArgs {
  input: SaveConfirmationDocumentInput;
}

export const confirmationDocumentResolver = {
  Query: {
    confirmationDocument: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new ConfirmationDocumentService(ctx.prisma).getById(args.id),
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
  },
  ConfirmedTrip: {
    latestPublishedConfirmationDocument: (parent: { id: string }, _args: unknown, ctx: AppContext) =>
      new ConfirmationDocumentService(ctx.prisma).getLatestPublished(parent.id),
  },
};
