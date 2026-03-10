import type { Prisma, PrismaClient } from '@prisma/client';
import type { CafeLeadFilterDto, OutreachDraftEditDto } from './outreach.types';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export class OutreachRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findSources(activeOnly: boolean) {
    return this.prisma.cafeSource.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  findLeads(filter: CafeLeadFilterDto) {
    const search = filter.search?.trim();

    return this.prisma.cafeLead.findMany({
      where: {
        ...(filter.statuses && filter.statuses.length > 0 ? { status: { in: filter.statuses } } : {}),
        ...(filter.sourceId ? { cafeSourceId: filter.sourceId } : {}),
        ...(filter.hasEmail === true ? { contactEmail: { not: null } } : {}),
        ...(filter.hasEmail === false ? { contactEmail: null } : {}),
        ...(search
          ? {
              OR: [
                { articleId: { contains: search } },
                { title: { contains: search } },
                { authorNickname: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findLeadById(id: string) {
    return this.prisma.cafeLead.findUnique({
      where: { id },
      include: {
        cafeSource: true,
      },
    });
  }

  findDraftsByLeadId(cafeLeadId: string) {
    return this.prisma.outreachDraft.findMany({
      where: { cafeLeadId },
      include: {
        reviewer: true,
      },
      orderBy: [{ version: 'desc' }],
    });
  }

  findLatestDraftByLeadId(cafeLeadId: string) {
    return this.prisma.outreachDraft.findFirst({
      where: { cafeLeadId },
      include: {
        reviewer: true,
      },
      orderBy: [{ version: 'desc' }],
    });
  }

  findOutboundMessagesByLeadId(cafeLeadId: string) {
    return this.prisma.outboundMessage.findMany({
      where: {
        draft: {
          cafeLeadId,
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findDraftById(id: string) {
    return this.prisma.outreachDraft.findUnique({
      where: { id },
      include: {
        cafeLead: true,
        reviewer: true,
      },
    });
  }

  findSuppressionByEmail(email: string) {
    return this.prisma.contactSuppression.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  updateDraft(id: string, data: Partial<OutreachDraftEditDto> & Record<string, unknown>) {
    return this.prisma.outreachDraft.update({
      where: { id },
      data,
      include: {
        reviewer: true,
      },
    });
  }

  updateLead(id: string, data: Record<string, unknown>) {
    return this.prisma.cafeLead.update({
      where: { id },
      data,
      include: {
        cafeSource: true,
      },
    });
  }

  rejectLeadDrafts(cafeLeadId: string) {
    return this.prisma.outreachDraft.updateMany({
      where: {
        cafeLeadId,
        reviewStatus: {
          in: ['PENDING', 'APPROVED'],
        },
      },
      data: {
        reviewStatus: 'REJECTED',
      },
    });
  }
}
