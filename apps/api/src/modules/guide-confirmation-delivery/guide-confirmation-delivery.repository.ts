import type {
  GuideConfirmationDeliveryAction,
  GuideConfirmationDeliveryStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';

export class GuideConfirmationDeliveryRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  enqueueMany(
    items: Array<{
      confirmationDocumentId: string;
      authUserId: string;
      action: GuideConfirmationDeliveryAction;
      versionNumber: number;
      idempotencyKey: string;
    }>,
  ) {
    if (items.length === 0) {
      return Promise.resolve({ count: 0 });
    }

    return this.prisma.guideConfirmationDeliveryOutbox.createMany({
      data: items.map((item) => ({
        confirmationDocumentId: item.confirmationDocumentId,
        authUserId: item.authUserId,
        action: item.action,
        versionNumber: item.versionNumber,
        idempotencyKey: item.idempotencyKey,
        status: 'PENDING' satisfies GuideConfirmationDeliveryStatus,
      })),
      skipDuplicates: true,
    });
  }

  async claimPending(limit: number) {
    const rows = await this.prisma.guideConfirmationDeliveryOutbox.findMany({
      where: {
        status: 'PENDING',
        nextAttemptAt: { lte: new Date() },
      },
      orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });

    if (rows.length === 0) {
      return [];
    }

    await this.prisma.guideConfirmationDeliveryOutbox.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: { status: 'PROCESSING' },
    });

    return rows;
  }

  markSucceeded(id: string) {
    return this.prisma.guideConfirmationDeliveryOutbox.update({
      where: { id },
      data: {
        status: 'SUCCEEDED',
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  markFailed(id: string, errorMessage: string, attempts: number) {
    const backoffMinutes = Math.min(60, Math.pow(2, Math.min(attempts, 6)));
    const nextAttemptAt = new Date(Date.now() + backoffMinutes * 60_000);

    return this.prisma.guideConfirmationDeliveryOutbox.update({
      where: { id },
      data: {
        status: attempts >= 8 ? 'FAILED' : 'PENDING',
        attempts,
        lastError: errorMessage.slice(0, 4000),
        nextAttemptAt,
      },
    });
  }
}
