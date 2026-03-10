import type { CafeLeadStatus, OutboundDeliveryStatus, OutboundChannel, OutreachReviewStatus } from '@prisma/client';
import type { AppContext } from '../../context';
import { requireEmployee } from '../../lib/auth-guards';
import { OutreachService } from './outreach.service';
import { getArtifactPath, getMetadataContact, mapNeeds } from './outreach.mapper';
import type { CafeLeadFilterDto, OutreachDraftEditDto } from './outreach.types';

interface IdArgs {
  id: string;
}

interface CafeLeadFilterArgs {
  filter?: CafeLeadFilterDto;
}

interface OutreachDraftArgs {
  cafeLeadId: string;
}

interface ActiveOnlyArgs {
  activeOnly?: boolean;
}

interface EditDraftArgs {
  draftId: string;
  input: OutreachDraftEditDto;
}

interface SkipLeadArgs {
  id: string;
  reason?: string | null;
}

export const outreachResolver = {
  Query: {
    cafeSources: (_parent: unknown, args: ActiveOnlyArgs, ctx: AppContext) =>
      new OutreachService(ctx.prisma).listSources(args.activeOnly ?? true),
    cafeLeads: (_parent: unknown, args: CafeLeadFilterArgs, ctx: AppContext) =>
      new OutreachService(ctx.prisma).listLeads(args.filter ?? {}),
    cafeLead: (_parent: unknown, args: IdArgs, ctx: AppContext) => new OutreachService(ctx.prisma).getLead(args.id),
    outreachDrafts: (_parent: unknown, args: OutreachDraftArgs, ctx: AppContext) =>
      new OutreachService(ctx.prisma).listDrafts(args.cafeLeadId),
    outboundMessages: (_parent: unknown, args: OutreachDraftArgs, ctx: AppContext) =>
      new OutreachService(ctx.prisma).listOutboundMessages(args.cafeLeadId),
  },
  Mutation: {
    approveOutreachDraft: (_parent: unknown, args: { draftId: string }, ctx: AppContext) => {
      const employee = requireEmployee(ctx);
      return new OutreachService(ctx.prisma).approveDraft(args.draftId, employee.id);
    },
    editOutreachDraftAndApprove: (_parent: unknown, args: EditDraftArgs, ctx: AppContext) => {
      const employee = requireEmployee(ctx);
      return new OutreachService(ctx.prisma).editDraftAndApprove(args.draftId, args.input, employee.id);
    },
    holdCafeLead: (_parent: unknown, args: IdArgs, ctx: AppContext) => new OutreachService(ctx.prisma).holdLead(args.id),
    skipCafeLead: (_parent: unknown, args: SkipLeadArgs, ctx: AppContext) =>
      new OutreachService(ctx.prisma).skipLead(args.id, args.reason),
    regenerateOutreachDraft: (_parent: unknown, args: { cafeLeadId: string }, ctx: AppContext) =>
      new OutreachService(ctx.prisma).regenerateDraft(args.cafeLeadId),
  },
  CafeLead: {
    source: async (parent: { cafeSource?: unknown; cafeSourceId: string }, _args: unknown, ctx: AppContext) =>
      parent.cafeSource ??
      ctx.prisma.cafeSource.findUnique({
        where: { id: parent.cafeSourceId },
      }),
    parsedNeeds: (parent: { parsedNeedsJson?: unknown }) => mapNeeds(parent.parsedNeedsJson as never),
    contactKakaoId: (parent: { rawMetadataJson?: unknown }) => getMetadataContact(parent.rawMetadataJson as never, 'kakaoId'),
    artifactHtmlPath: (parent: { rawMetadataJson?: unknown }) => getArtifactPath(parent.rawMetadataJson as never, 'htmlPath'),
    artifactScreenshotPath: (parent: { rawMetadataJson?: unknown }) => getArtifactPath(parent.rawMetadataJson as never, 'screenshotPath'),
    drafts: (parent: { id: string }, _args: unknown, ctx: AppContext) => new OutreachService(ctx.prisma).listDrafts(parent.id),
    latestDraft: async (parent: { id: string }, _args: unknown, ctx: AppContext) =>
      ctx.prisma.outreachDraft.findFirst({
        where: { cafeLeadId: parent.id },
        include: { reviewer: true },
        orderBy: { version: 'desc' },
      }),
    outboundMessages: (parent: { id: string }, _args: unknown, ctx: AppContext) =>
      new OutreachService(ctx.prisma).listOutboundMessages(parent.id),
    isSuppressed: (parent: { contactEmail?: string | null }, _args: unknown, ctx: AppContext) =>
      new OutreachService(ctx.prisma).isSuppressed(parent.contactEmail),
  },
  OutreachDraft: {
    reviewer: (parent: { reviewer?: unknown }) => parent.reviewer ?? null,
  },
  CafeLeadNeeds: {
    travelerType: (parent: { travelerType: string }) => parent.travelerType,
  },
};

export type OutreachResolverEnums = CafeLeadStatus | OutreachReviewStatus | OutboundDeliveryStatus | OutboundChannel;
