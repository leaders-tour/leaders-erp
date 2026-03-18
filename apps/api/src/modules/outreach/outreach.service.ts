import { CafeLeadStatus, OutreachReviewStatus, type PrismaClient } from '@prisma/client';
import { outreachDraftEditSchema } from '@tour/validation';
import { createValidationError, DomainError } from '../../lib/errors';
import { OutreachRepository } from './outreach.repository';
import type { CafeLeadFilterDto, OutreachDraftEditDto } from './outreach.types';

export class OutreachService {
  private readonly repository: OutreachRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new OutreachRepository(prisma);
  }

  listSources(activeOnly = true) {
    return this.repository.findSources(activeOnly);
  }

  listLeads(filter: CafeLeadFilterDto) {
    return this.repository.findLeads(filter);
  }

  getLead(id: string) {
    return this.repository.findLeadById(id);
  }

  listDrafts(cafeLeadId: string) {
    return this.repository.findDraftsByLeadId(cafeLeadId);
  }

  listOutboundMessages(cafeLeadId: string) {
    return this.repository.findOutboundMessagesByLeadId(cafeLeadId);
  }

  async isSuppressed(email: string | null | undefined) {
    if (!email) {
      return false;
    }

    const suppression = await this.repository.findSuppressionByEmail(email);
    return Boolean(suppression?.isActive);
  }

  private async getApprovedDraftOrThrow(draftId: string) {
    const draft = await this.repository.findDraftById(draftId);
    if (!draft) {
      throw new DomainError('NOT_FOUND', 'Draft not found');
    }

    if (!draft.cafeLead.contactEmail) {
      throw new DomainError('VALIDATION_FAILED', 'Lead does not have a contact email');
    }

    if (await this.isSuppressed(draft.cafeLead.contactEmail)) {
      throw new DomainError('VALIDATION_FAILED', 'Lead email is suppressed');
    }

    return draft;
  }

  async approveDraft(draftId: string, reviewerId: string) {
    const draft = await this.getApprovedDraftOrThrow(draftId);

    return this.prisma.$transaction(async (tx) => {
      await tx.outreachDraft.update({
        where: { id: draft.id },
        data: {
          reviewStatus: OutreachReviewStatus.APPROVED,
          reviewerId,
          reviewedAt: new Date(),
        },
      });

      await tx.cafeLead.update({
        where: { id: draft.cafeLeadId },
        data: {
          status: CafeLeadStatus.APPROVED,
          failReason: null,
        },
      });

      return tx.outreachDraft.findUnique({
        where: { id: draft.id },
        include: { reviewer: true },
      });
    });
  }

  async editDraftAndApprove(draftId: string, input: OutreachDraftEditDto, reviewerId: string) {
    const parsed = outreachDraftEditSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid outreach draft input', parsed.error);
    }

    await this.getApprovedDraftOrThrow(draftId);

    return this.prisma.$transaction(async (tx) => {
      await tx.outreachDraft.update({
        where: { id: draftId },
        data: {
          subject: parsed.data.subject,
          previewText: parsed.data.previewText ?? null,
          bodyText: parsed.data.bodyText,
          bodyHtml: parsed.data.bodyHtml,
          reviewStatus: OutreachReviewStatus.APPROVED,
          reviewerId,
          reviewedAt: new Date(),
        },
      });

      const draft = await tx.outreachDraft.findUnique({
        where: { id: draftId },
        select: { cafeLeadId: true },
      });
      if (!draft) {
        throw new DomainError('NOT_FOUND', 'Draft not found');
      }

      await tx.cafeLead.update({
        where: { id: draft.cafeLeadId },
        data: {
          status: CafeLeadStatus.APPROVED,
          failReason: null,
        },
      });

      return tx.outreachDraft.findUnique({
        where: { id: draftId },
        include: { reviewer: true },
      });
    });
  }

  async holdLead(id: string) {
    const lead = await this.repository.findLeadById(id);
    if (!lead) {
      throw new DomainError('NOT_FOUND', 'Lead not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cafeLead.update({
        where: { id },
        data: {
          status: CafeLeadStatus.DRAFTED,
        },
      });

      await tx.outreachDraft.updateMany({
        where: {
          cafeLeadId: id,
          reviewStatus: OutreachReviewStatus.APPROVED,
        },
        data: {
          reviewStatus: OutreachReviewStatus.PENDING,
          reviewerId: null,
          reviewedAt: null,
        },
      });
    });

    return this.repository.findLeadById(id);
  }

  async skipLead(id: string, reason?: string | null) {
    const lead = await this.repository.findLeadById(id);
    if (!lead) {
      throw new DomainError('NOT_FOUND', 'Lead not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.outreachDraft.updateMany({
        where: {
          cafeLeadId: id,
          reviewStatus: {
            in: [OutreachReviewStatus.PENDING, OutreachReviewStatus.APPROVED],
          },
        },
        data: {
          reviewStatus: OutreachReviewStatus.REJECTED,
        },
      });

      await tx.cafeLead.update({
        where: { id },
        data: {
          status: CafeLeadStatus.SKIPPED,
          failReason: reason?.trim() || '관리자 제외',
        },
      });
    });

    return this.repository.findLeadById(id);
  }

  async regenerateDraft(cafeLeadId: string) {
    const lead = await this.repository.findLeadById(cafeLeadId);
    if (!lead) {
      throw new DomainError('NOT_FOUND', 'Lead not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.outreachDraft.updateMany({
        where: {
          cafeLeadId,
          reviewStatus: {
            in: [OutreachReviewStatus.PENDING, OutreachReviewStatus.APPROVED],
          },
        },
        data: {
          reviewStatus: OutreachReviewStatus.REJECTED,
        },
      });

      await tx.cafeLead.update({
        where: { id: cafeLeadId },
        data: {
          status: CafeLeadStatus.PARSED,
          failReason: null,
        },
      });
    });

    return this.repository.findLeadById(cafeLeadId);
  }
}
