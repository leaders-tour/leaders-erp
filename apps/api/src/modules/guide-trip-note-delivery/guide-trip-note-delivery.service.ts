import type { PrismaClient } from '@prisma/client';
import { getSupabaseAdminClient } from '../../lib/supabase';
import { confirmedTripInclude } from '../confirmed-trip/confirmed-trip.repository';
import { GuideTripNoteDeliveryRepository } from './guide-trip-note-delivery.repository';
import { resolveLinkedGuideRecipients } from './guide-trip-note-delivery.utils';

const GUIDE_CONFIRMED_TRIP_NOTES_TABLE = 'guide_confirmed_trip_notes';

export class GuideTripNoteDeliveryService {
  private readonly repository: GuideTripNoteDeliveryRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new GuideTripNoteDeliveryRepository(prisma);
  }

  async enqueueUpsertForNote(noteId: string) {
    const note = await this.prisma.confirmedTripNote.findUnique({
      where: { id: noteId },
      include: {
        confirmedTrip: {
          include: confirmedTripInclude,
        },
      },
    });

    if (!note || note.confirmedTrip.status !== 'ACTIVE') {
      return;
    }

    const recipients = resolveLinkedGuideRecipients(note.confirmedTrip.guideAssignments);
    if (recipients.length === 0) {
      return;
    }

    await this.repository.enqueueMany(
      recipients.map((recipient) => ({
        noteId: note.id,
        confirmedTripId: note.confirmedTripId,
        authUserId: recipient.authUserId,
        action: 'UPSERT' as const,
        idempotencyKey: `${note.id}:upsert:${recipient.authUserId}`,
      })),
    );
  }

  async enqueueRevokeForNote(input: {
    noteId: string;
    confirmedTripId: string;
    authUserIds?: string[];
  }) {
    let authUserIds = input.authUserIds ?? [];

    if (authUserIds.length === 0) {
      authUserIds = await this.listSupabaseRecipientsForNote(input.noteId);
    }

    if (authUserIds.length === 0) {
      return;
    }

    await this.repository.enqueueMany(
      authUserIds.map((authUserId) => ({
        noteId: input.noteId,
        confirmedTripId: input.confirmedTripId,
        authUserId,
        action: 'REVOKE' as const,
        idempotencyKey: `${input.noteId}:revoke:${authUserId}`,
      })),
    );
  }

  async enqueueBackfillForConfirmedTrip(confirmedTripId: string) {
    const notes = await this.prisma.confirmedTripNote.findMany({
      where: { confirmedTripId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const note of notes) {
      await this.enqueueUpsertForNote(note.id);
    }
  }

  async reconcileConfirmedTrip(confirmedTripId: string) {
    const trip = await this.prisma.confirmedTrip.findUnique({
      where: { id: confirmedTripId },
      include: confirmedTripInclude,
    });

    if (!trip) {
      return;
    }

    const notes = await this.prisma.confirmedTripNote.findMany({
      where: { confirmedTripId },
      select: { id: true },
    });

    if (trip.status !== 'ACTIVE') {
      for (const note of notes) {
        await this.enqueueRevokeForNote({
          noteId: note.id,
          confirmedTripId,
        });
      }
      return;
    }

    const currentRecipients = resolveLinkedGuideRecipients(trip.guideAssignments);
    const currentAuthUserIds = new Set(currentRecipients.map((recipient) => recipient.authUserId));

    for (const note of notes) {
      await this.repository.enqueueMany(
        currentRecipients.map((recipient) => ({
          noteId: note.id,
          confirmedTripId,
          authUserId: recipient.authUserId,
          action: 'UPSERT' as const,
          idempotencyKey: `${note.id}:upsert:${recipient.authUserId}:reconcile`,
        })),
      );

      const supabaseRecipients = await this.listSupabaseRecipientsForNote(note.id);
      const revokeTargets = supabaseRecipients.filter((authUserId) => !currentAuthUserIds.has(authUserId));
      if (revokeTargets.length > 0) {
        await this.enqueueRevokeForNote({
          noteId: note.id,
          confirmedTripId,
          authUserIds: revokeTargets,
        });
      }
    }
  }

  async revokeAllForAuthUser(authUserId: string) {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(GUIDE_CONFIRMED_TRIP_NOTES_TABLE)
      .select('note_id, confirmed_trip_id')
      .eq('auth_user_id', authUserId)
      .is('revoked_at', null);

    if (error) {
      throw new Error(`Failed to list guide trip notes for revoke: ${error.message}`);
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      return;
    }

    await this.repository.enqueueMany(
      rows.map((row) => ({
        noteId: String(row.note_id),
        confirmedTripId: String(row.confirmed_trip_id),
        authUserId,
        action: 'REVOKE' as const,
        idempotencyKey: `${row.note_id}:revoke:${authUserId}:unlink`,
      })),
    );
  }

  async processPendingBatch(limit = 10): Promise<number> {
    const rows = await this.repository.claimPending(limit);
    let processed = 0;

    for (const row of rows) {
      try {
        if (row.action === 'UPSERT') {
          await this.processUpsert(row.noteId, row.authUserId);
        } else {
          await this.processRevoke(row.noteId, row.authUserId);
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

  private async listSupabaseRecipientsForNote(noteId: string): Promise<string[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(GUIDE_CONFIRMED_TRIP_NOTES_TABLE)
      .select('auth_user_id')
      .eq('note_id', noteId)
      .is('revoked_at', null);

    if (error) {
      throw new Error(`Failed to list Supabase note recipients: ${error.message}`);
    }

    return [...new Set((data ?? []).map((row) => String(row.auth_user_id)))];
  }

  private async processUpsert(noteId: string, authUserId: string) {
    const note = await this.prisma.confirmedTripNote.findUnique({
      where: { id: noteId },
      include: {
        confirmedTrip: {
          include: confirmedTripInclude,
        },
      },
    });

    if (!note) {
      throw new Error('Confirmed trip note not found');
    }

    if (note.confirmedTrip.status !== 'ACTIVE') {
      throw new Error('Confirmed trip is not active');
    }

    const linkedRecipients = resolveLinkedGuideRecipients(note.confirmedTrip.guideAssignments);
    if (!linkedRecipients.some((recipient) => recipient.authUserId === authUserId)) {
      throw new Error('Guide is no longer assigned to this trip');
    }

    const supabase = getSupabaseAdminClient();
    const upsertResult = await supabase.from(GUIDE_CONFIRMED_TRIP_NOTES_TABLE).upsert(
      {
        auth_user_id: authUserId,
        note_id: note.id,
        confirmed_trip_id: note.confirmedTripId,
        content: note.content,
        author_name: note.createdByName,
        created_at: note.createdAt.toISOString(),
        updated_at: note.updatedAt.toISOString(),
        revoked_at: null,
      },
      { onConflict: 'auth_user_id,note_id' },
    );

    if (upsertResult.error) {
      throw new Error(`Failed to upsert guide trip note: ${upsertResult.error.message}`);
    }
  }

  private async processRevoke(noteId: string, authUserId: string) {
    const supabase = getSupabaseAdminClient();
    const revokeResult = await supabase
      .from(GUIDE_CONFIRMED_TRIP_NOTES_TABLE)
      .update({
        content: '',
        updated_at: new Date().toISOString(),
        revoked_at: new Date().toISOString(),
      })
      .eq('auth_user_id', authUserId)
      .eq('note_id', noteId);

    if (revokeResult.error) {
      throw new Error(`Failed to revoke guide trip note: ${revokeResult.error.message}`);
    }
  }
}
