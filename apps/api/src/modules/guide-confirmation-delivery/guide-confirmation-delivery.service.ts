import type { PrismaClient } from '@prisma/client';
import {
  confirmationDocumentSnapshotSchema,
  type ConfirmationDocumentSnapshotInput,
} from '@tour/validation';
import {
  getConfirmationPdfRenderBaseUrl,
  renderConfirmationDocumentPdf,
} from '../../lib/pdf/confirmation-pdf';
import { getSupabaseAdminClient } from '../../lib/supabase';
import { confirmedTripInclude } from '../confirmed-trip/confirmed-trip.repository';
import { GuideConfirmationDeliveryRepository } from './guide-confirmation-delivery.repository';
import {
  buildGuideConfirmationPdfStoragePath,
  buildGuideConfirmationSummary,
} from './guide-confirmation-delivery.utils';

const DEFAULT_WEB_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];
const GUIDE_CONFIRMATION_PDFS_BUCKET = 'guide-confirmation-pdfs';
const GUIDE_CONFIRMATION_TABLE = 'guide_confirmation_documents';

function getPdfRenderBaseUrl(): string {
  const configured = process.env.WEB_ORIGIN?.trim();
  const origins = configured
    ? configured.split(',').map((origin) => origin.trim()).filter(Boolean)
    : DEFAULT_WEB_ORIGINS;
  return getConfirmationPdfRenderBaseUrl(origins);
}

type LinkedGuideRecipient = {
  guideId: string;
  authUserId: string;
};

export class GuideConfirmationDeliveryService {
  private readonly repository: GuideConfirmationDeliveryRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new GuideConfirmationDeliveryRepository(prisma);
  }

  async enqueuePublishForDocument(confirmationDocumentId: string) {
    const document = await this.prisma.confirmationDocument.findUnique({
      where: { id: confirmationDocumentId },
      include: {
        confirmedTrip: {
          include: confirmedTripInclude,
        },
      },
    });

    if (!document || document.status !== 'PUBLISHED') {
      return;
    }

    const recipients = this.resolveLinkedRecipients(document.confirmedTrip.guideAssignments);
    if (recipients.length === 0) {
      return;
    }

    await this.repository.enqueueMany(
      recipients.map((recipient) => ({
        confirmationDocumentId: document.id,
        authUserId: recipient.authUserId,
        action: 'PUBLISH' as const,
        versionNumber: document.versionNumber,
        idempotencyKey: `${document.id}:publish:${recipient.authUserId}:v${document.versionNumber}`,
      })),
    );
  }

  async enqueueRevokeForDocument(confirmationDocumentId: string) {
    const document = await this.prisma.confirmationDocument.findUnique({
      where: { id: confirmationDocumentId },
      select: {
        id: true,
        versionNumber: true,
        guideConfirmationDeliveries: {
          where: {
            action: 'PUBLISH',
            status: 'SUCCEEDED',
          },
          select: { authUserId: true },
        },
      },
    });

    if (!document) {
      return;
    }

    const authUserIds = [...new Set(document.guideConfirmationDeliveries.map((row) => row.authUserId))];
    if (authUserIds.length === 0) {
      const archivedRecipients = await this.listSupabaseRecipientsForDocument(document.id);
      authUserIds.push(...archivedRecipients);
    }

    if (authUserIds.length === 0) {
      return;
    }

    await this.repository.enqueueMany(
      authUserIds.map((authUserId) => ({
        confirmationDocumentId: document.id,
        authUserId,
        action: 'REVOKE' as const,
        versionNumber: document.versionNumber,
        idempotencyKey: `${document.id}:revoke:${authUserId}:v${document.versionNumber}`,
      })),
    );
  }

  async reconcileConfirmedTrip(confirmedTripId: string) {
    const trip = await this.prisma.confirmedTrip.findUnique({
      where: { id: confirmedTripId },
      include: {
        ...confirmedTripInclude,
        confirmationDocuments: {
          where: { status: 'PUBLISHED' },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!trip) {
      return;
    }

    const latestPublished = trip.confirmationDocuments[0] ?? null;
    const archivedPublished = await this.prisma.confirmationDocument.findMany({
      where: {
        confirmedTripId,
        status: 'ARCHIVED',
      },
      select: { id: true, versionNumber: true },
      orderBy: { versionNumber: 'desc' },
      take: 5,
    });

    for (const archived of archivedPublished) {
      await this.enqueueRevokeForDocument(archived.id);
    }

    if (trip.status !== 'ACTIVE' || !latestPublished) {
      if (latestPublished) {
        await this.enqueueRevokeForDocument(latestPublished.id);
      }
      return;
    }

    const currentRecipients = this.resolveLinkedRecipients(trip.guideAssignments);
    const currentAuthUserIds = new Set(currentRecipients.map((recipient) => recipient.authUserId));

    await this.repository.enqueueMany(
      currentRecipients.map((recipient) => ({
        confirmationDocumentId: latestPublished.id,
        authUserId: recipient.authUserId,
        action: 'PUBLISH' as const,
        versionNumber: latestPublished.versionNumber,
        idempotencyKey: `${latestPublished.id}:publish:${recipient.authUserId}:v${latestPublished.versionNumber}`,
      })),
    );

    const supabaseRecipients = await this.listSupabaseRecipientsForDocument(latestPublished.id);
    const revokeTargets = supabaseRecipients.filter((authUserId) => !currentAuthUserIds.has(authUserId));
    if (revokeTargets.length > 0) {
      await this.repository.enqueueMany(
        revokeTargets.map((authUserId) => ({
          confirmationDocumentId: latestPublished.id,
          authUserId,
          action: 'REVOKE' as const,
          versionNumber: latestPublished.versionNumber,
          idempotencyKey: `${latestPublished.id}:revoke:${authUserId}:v${latestPublished.versionNumber}`,
        })),
      );
    }
  }

  async revokeAllForAuthUser(authUserId: string) {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(GUIDE_CONFIRMATION_TABLE)
      .select('confirmation_document_id, version_number')
      .eq('auth_user_id', authUserId)
      .is('revoked_at', null);

    if (error) {
      throw new Error(`Failed to list guide confirmations for revoke: ${error.message}`);
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      return;
    }

    await this.repository.enqueueMany(
      rows.map((row) => ({
        confirmationDocumentId: String(row.confirmation_document_id),
        authUserId,
        action: 'REVOKE' as const,
        versionNumber: Number(row.version_number),
        idempotencyKey: `${row.confirmation_document_id}:revoke:${authUserId}:unlink`,
      })),
    );
  }

  async processPendingBatch(limit = 10): Promise<number> {
    const rows = await this.repository.claimPending(limit);
    let processed = 0;

    for (const row of rows) {
      try {
        if (row.action === 'PUBLISH') {
          await this.processPublish(row.confirmationDocumentId, row.authUserId);
        } else {
          await this.processRevoke(row.confirmationDocumentId, row.authUserId, row.versionNumber);
        }
        await this.repository.markSucceeded(row.id);
        processed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.repository.markFailed(row.id, message, row.attempts + 1);
      }
    }

    return processed;
  }

  private resolveLinkedRecipients(
    guideAssignments: Array<{
      guide: {
        id: string;
        leaderstepsAuthUserId: string | null;
      };
    }>,
  ): LinkedGuideRecipient[] {
    const recipients: LinkedGuideRecipient[] = [];
    const seen = new Set<string>();

    for (const assignment of guideAssignments) {
      const authUserId = assignment.guide.leaderstepsAuthUserId?.trim();
      if (!authUserId || seen.has(authUserId)) {
        continue;
      }
      seen.add(authUserId);
      recipients.push({
        guideId: assignment.guide.id,
        authUserId,
      });
    }

    return recipients;
  }

  private async listSupabaseRecipientsForDocument(confirmationDocumentId: string): Promise<string[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(GUIDE_CONFIRMATION_TABLE)
      .select('auth_user_id')
      .eq('confirmation_document_id', confirmationDocumentId)
      .is('revoked_at', null);

    if (error) {
      throw new Error(`Failed to list Supabase recipients: ${error.message}`);
    }

    return [...new Set((data ?? []).map((row) => String(row.auth_user_id)))];
  }

  private async processPublish(confirmationDocumentId: string, authUserId: string) {
    const document = await this.prisma.confirmationDocument.findUnique({
      where: { id: confirmationDocumentId },
      include: {
        confirmedTrip: {
          include: confirmedTripInclude,
        },
      },
    });

    if (!document || document.status !== 'PUBLISHED') {
      throw new Error('Published confirmation document not found');
    }

    if (document.confirmedTrip.status !== 'ACTIVE') {
      throw new Error('Confirmed trip is not active');
    }

    const linkedRecipients = this.resolveLinkedRecipients(document.confirmedTrip.guideAssignments);
    if (!linkedRecipients.some((recipient) => recipient.authUserId === authUserId)) {
      throw new Error('Guide is no longer assigned to this trip');
    }

    const snapshot = confirmationDocumentSnapshotSchema.parse(document.snapshot) as ConfirmationDocumentSnapshotInput;
    const summary = buildGuideConfirmationSummary(snapshot);
    const pdfStoragePath = buildGuideConfirmationPdfStoragePath({
      authUserId,
      confirmationDocumentId: document.id,
      versionNumber: document.versionNumber,
    });

    const pdfBuffer = await renderConfirmationDocumentPdf({
      data: {
        snapshot,
        appendixData: (document.renderAppendixData as Record<string, unknown> | null) ?? null,
        isDraft: false,
        appendixIncludeImagePages: false,
      },
      renderBaseUrl: getPdfRenderBaseUrl(),
    });

    const supabase = getSupabaseAdminClient();
    const uploadResult = await supabase.storage
      .from(GUIDE_CONFIRMATION_PDFS_BUCKET)
      .upload(pdfStoragePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadResult.error) {
      throw new Error(`Failed to upload confirmation PDF: ${uploadResult.error.message}`);
    }

    const publishedAt = document.publishedAt?.toISOString() ?? new Date().toISOString();
    const upsertResult = await supabase.from(GUIDE_CONFIRMATION_TABLE).upsert(
      {
        auth_user_id: authUserId,
        confirmation_document_id: document.id,
        confirmed_trip_id: document.confirmedTripId,
        version_number: document.versionNumber,
        document_number: document.documentNumber,
        destination: snapshot.destination,
        travel_period_text: snapshot.travelPeriodText,
        leader_name: snapshot.leaderName,
        guide_name: snapshot.guideName,
        summary_json: summary,
        pdf_storage_path: pdfStoragePath,
        published_at: publishedAt,
        updated_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: 'auth_user_id,confirmation_document_id' },
    );

    if (upsertResult.error) {
      throw new Error(`Failed to upsert guide confirmation metadata: ${upsertResult.error.message}`);
    }
  }

  private async processRevoke(confirmationDocumentId: string, authUserId: string, versionNumber: number) {
    const supabase = getSupabaseAdminClient();
    const pdfStoragePath = buildGuideConfirmationPdfStoragePath({
      authUserId,
      confirmationDocumentId,
      versionNumber,
    });

    const removeResult = await supabase.storage.from(GUIDE_CONFIRMATION_PDFS_BUCKET).remove([pdfStoragePath]);
    if (removeResult.error) {
      throw new Error(`Failed to remove confirmation PDF: ${removeResult.error.message}`);
    }

    const revokeResult = await supabase
      .from(GUIDE_CONFIRMATION_TABLE)
      .update({
        summary_json: {},
        pdf_storage_path: null,
        updated_at: new Date().toISOString(),
        revoked_at: new Date().toISOString(),
      })
      .eq('auth_user_id', authUserId)
      .eq('confirmation_document_id', confirmationDocumentId);

    if (revokeResult.error) {
      throw new Error(`Failed to revoke guide confirmation metadata: ${revokeResult.error.message}`);
    }
  }
}
