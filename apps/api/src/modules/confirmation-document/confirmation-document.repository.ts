import type { Prisma, PrismaClient } from '@prisma/client';
import type { ConfirmationDocumentStatus } from '@prisma/client';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export const confirmationDocumentInclude = {
  confirmedTrip: {
    select: {
      id: true,
      userId: true,
      planVersionId: true,
      status: true,
    },
  },
  planVersion: {
    select: {
      id: true,
      versionNumber: true,
    },
  },
  publishedByEmployee: true,
  createdByEmployee: true,
  updatedByEmployee: true,
  memo: {
    include: {
      updatedByEmployee: true,
    },
  },
} satisfies Prisma.ConfirmationDocumentInclude;

export class ConfirmationDocumentRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findById(id: string) {
    return this.prisma.confirmationDocument.findUnique({
      where: { id },
      include: confirmationDocumentInclude,
    });
  }

  findLatestByConfirmedTripId(confirmedTripId: string, status?: ConfirmationDocumentStatus) {
    return this.prisma.confirmationDocument.findFirst({
      where: {
        confirmedTripId,
        ...(status ? { status } : {}),
      },
      include: confirmationDocumentInclude,
      orderBy: [{ versionNumber: 'desc' }],
    });
  }

  findLatestPublishedByConfirmedTripId(confirmedTripId: string) {
    return this.findLatestByConfirmedTripId(confirmedTripId, 'PUBLISHED');
  }

  findLatestDraftByConfirmedTripId(confirmedTripId: string) {
    return this.findLatestByConfirmedTripId(confirmedTripId, 'DRAFT');
  }

  listByConfirmedTripId(confirmedTripId: string) {
    return this.prisma.confirmationDocument.findMany({
      where: { confirmedTripId },
      include: confirmationDocumentInclude,
      orderBy: [{ versionNumber: 'desc' }],
    });
  }

  listByUserId(userId: string) {
    return this.prisma.confirmationDocument.findMany({
      where: {
        confirmedTrip: {
          userId,
          status: 'ACTIVE',
        },
      },
      include: confirmationDocumentInclude,
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  getNextVersionNumber(confirmedTripId: string) {
    return this.prisma.confirmationDocument
      .aggregate({
        where: { confirmedTripId },
        _max: { versionNumber: true },
      })
      .then((result) => (result._max.versionNumber ?? 0) + 1);
  }

  create(data: Prisma.ConfirmationDocumentCreateInput) {
    return this.prisma.confirmationDocument.create({
      data,
      include: confirmationDocumentInclude,
    });
  }

  update(id: string, data: Prisma.ConfirmationDocumentUpdateInput) {
    return this.prisma.confirmationDocument.update({
      where: { id },
      data,
      include: confirmationDocumentInclude,
    });
  }

  archivePublished(confirmedTripId: string, excludeId?: string) {
    return this.prisma.confirmationDocument.updateMany({
      where: {
        confirmedTripId,
        status: 'PUBLISHED',
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      data: { status: 'ARCHIVED' },
    });
  }

  listPublishedExceptTrip(confirmedTripId: string) {
    return this.prisma.confirmationDocument.findMany({
      where: {
        confirmedTripId,
        status: 'PUBLISHED',
      },
      select: { id: true },
    });
  }

  delete(id: string) {
    return this.prisma.confirmationDocument.delete({
      where: { id },
    });
  }

  deleteMemo(confirmationDocumentId: string) {
    return this.prisma.confirmationDocumentMemo.deleteMany({
      where: { confirmationDocumentId },
    });
  }

  upsertMemo(confirmationDocumentId: string, content: string, updatedByEmployeeId: string) {
    return this.prisma.confirmationDocumentMemo.upsert({
      where: { confirmationDocumentId },
      create: {
        confirmationDocumentId,
        content,
        updatedByEmployeeId,
      },
      update: {
        content,
        updatedByEmployeeId,
      },
    });
  }
}
