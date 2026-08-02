import type { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import {
  confirmationDocumentSnapshotSchema,
  saveConfirmationDocumentSchema,
  type ConfirmationDocumentSnapshotInput,
  type SaveConfirmationDocumentInput,
  saveConfirmationDocumentMemoSchema,
  type SaveConfirmationDocumentMemoInput,
} from '@tour/validation';
import type { CurrentEmployee } from '../../context';
import { DomainError, createValidationError } from '../../lib/errors';
import { ContractSyncService } from '../contract/contract-sync.service';
import { confirmedTripInclude } from '../confirmed-trip/confirmed-trip.repository';
import { buildConfirmationDraftDefaults } from './confirmation-document.defaults';
import { ConfirmationDocumentRepository } from './confirmation-document.repository';
import { GuideConfirmationDeliveryService } from '../guide-confirmation-delivery/guide-confirmation-delivery.service';

export class ConfirmationDocumentService {
  private readonly repository: ConfirmationDocumentRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new ConfirmationDocumentRepository(prisma);
  }

  async getById(id: string) {
    const document = await this.repository.findById(id);
    if (!document) {
      throw new DomainError('NOT_FOUND', 'Confirmation document not found');
    }
    return this.toGraphql(document);
  }

  async getLatestPublished(confirmedTripId: string) {
    const document = await this.repository.findLatestPublishedByConfirmedTripId(confirmedTripId);
    return document ? this.toGraphql(document) : null;
  }

  async getLatest(confirmedTripId: string) {
    const document = await this.repository.findLatestByConfirmedTripId(confirmedTripId);
    return document ? this.toGraphql(document) : null;
  }

  async list(confirmedTripId: string) {
    const documents = await this.repository.listByConfirmedTripId(confirmedTripId);
    return documents.map((document) => this.toGraphql(document));
  }

  async listByUserId(userId: string) {
    const documents = await this.repository.listByUserId(userId);
    return documents.map((document) => this.toGraphql(document));
  }

  async getDraftDefaults(confirmedTripId: string) {
    const trip = await this.loadConfirmedTrip(confirmedTripId);
    const documentNumber = trip.planVersion?.meta?.documentNumber ?? null;
    const contractSubmissions = documentNumber
      ? await new ContractSyncService(this.prisma).listSubmissions(documentNumber)
      : [];
    const snapshot = buildConfirmationDraftDefaults({
      confirmedTrip: {
        assignedVehicle: trip.assignedVehicle,
        destination: trip.destination,
        plan: trip.plan ? { regionSet: trip.plan.regionSet } : null,
        balanceAmountKrw: trip.balanceAmountKrw,
        guideAssignments: trip.guideAssignments,
        lodgings: trip.lodgings,
        planVersion: trip.planVersion
          ? {
              id: trip.planVersion.id,
              totalDays: trip.planVersion.totalDays,
              regionSet: trip.planVersion.regionSet,
              meta: trip.planVersion.meta,
              pricing: trip.planVersion.pricing,
              planVersionEvents: await this.prisma.planVersionEvent.findMany({
                where: { planVersionId: trip.planVersion.id },
                include: { event: true },
                orderBy: { createdAt: 'asc' },
              }),
            }
          : null,
      },
      contractSubmissions,
    });

    return {
      confirmedTripId,
      planVersionId: trip.planVersionId,
      documentNumber,
      snapshot,
    };
  }

  async save(input: SaveConfirmationDocumentInput, employee: CurrentEmployee) {
    const parsed = saveConfirmationDocumentSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid confirmation document input', parsed.error);
    }

    const snapshotParsed = confirmationDocumentSnapshotSchema.safeParse(parsed.data.snapshot);
    if (!snapshotParsed.success) {
      throw createValidationError('Invalid confirmation document snapshot', snapshotParsed.error);
    }

    const trip = await this.loadConfirmedTrip(parsed.data.confirmedTripId);
    if (trip.status !== 'ACTIVE') {
      throw new DomainError('VALIDATION_FAILED', 'ACTIVE 확정 여행만 확정서를 저장할 수 있습니다.');
    }

    const snapshot = snapshotParsed.data;
    const publish = parsed.data.publish === true;
    const renderAppendixData = publish ? (parsed.data.renderAppendixData ?? null) : undefined;
    const existingDraft = publish ? null : await this.repository.findLatestDraftByConfirmedTripId(trip.id);

    if (existingDraft && !publish) {
      const planVersionIdToConnect =
        snapshot.sourcePlanVersionId ?? existingDraft.planVersionId ?? trip.planVersionId;
      const updated = await this.repository.update(existingDraft.id, {
        snapshot,
        documentNumber: snapshot.documentNumber ?? null,
        ...(planVersionIdToConnect
          ? { planVersion: { connect: { id: planVersionIdToConnect } } }
          : { planVersion: { disconnect: true } }),
        updatedByEmployee: { connect: { id: employee.id } },
      });
      return this.toGraphql(updated);
    }

    const archivedDocumentIds =
      publish
        ? (
            await this.repository.listPublishedExceptTrip(trip.id)
          ).map((document) => document.id)
        : [];

    const versionNumber = await this.repository.getNextVersionNumber(trip.id);
    const planVersionIdToConnect = snapshot.sourcePlanVersionId ?? trip.planVersionId;
    const created = await this.repository.create({
      confirmedTrip: { connect: { id: trip.id } },
      ...(planVersionIdToConnect ? { planVersion: { connect: { id: planVersionIdToConnect } } } : {}),
      documentNumber: snapshot.documentNumber ?? null,
      versionNumber,
      status: publish ? 'PUBLISHED' : 'DRAFT',
      snapshot,
      ...(publish
        ? { renderAppendixData: (renderAppendixData ?? null) as Prisma.InputJsonValue }
        : {}),
      publishedAt: publish ? new Date() : null,
      ...(publish ? { publishedByEmployee: { connect: { id: employee.id } } } : {}),
      createdByEmployee: { connect: { id: employee.id } },
      updatedByEmployee: { connect: { id: employee.id } },
    });

    if (publish) {
      await this.repository.archivePublished(trip.id, created.id);
      const deliveryService = new GuideConfirmationDeliveryService(this.prisma);
      for (const archivedDocumentId of archivedDocumentIds) {
        await deliveryService.enqueueRevokeForDocument(archivedDocumentId);
      }
      await deliveryService.enqueuePublishForDocument(created.id);
    }

    return this.toGraphql(created);
  }

  async delete(id: string) {
    const document = await this.repository.findById(id);
    if (!document) {
      throw new DomainError('NOT_FOUND', 'Confirmation document not found');
    }
    await this.repository.delete(id);
    return true;
  }

  async saveMemo(input: SaveConfirmationDocumentMemoInput, employee: CurrentEmployee) {
    const parsed = saveConfirmationDocumentMemoSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid confirmation document memo input', parsed.error);
    }

    const document = await this.repository.findById(parsed.data.confirmationDocumentId);
    if (!document) {
      throw new DomainError('NOT_FOUND', 'Confirmation document not found');
    }

    if (parsed.data.content.length === 0) {
      await this.repository.deleteMemo(parsed.data.confirmationDocumentId);
    } else {
      await this.repository.upsertMemo(parsed.data.confirmationDocumentId, parsed.data.content, employee.id);
    }

    const updated = await this.repository.findById(parsed.data.confirmationDocumentId);
    if (!updated) {
      throw new DomainError('NOT_FOUND', 'Confirmation document not found');
    }

    return this.toGraphql(updated);
  }

  private async loadConfirmedTrip(confirmedTripId: string) {
    const trip = await this.prisma.confirmedTrip.findUnique({
      where: { id: confirmedTripId },
      include: {
        ...confirmedTripInclude,
        planVersion: {
          include: {
            meta: { include: { transportGroups: { orderBy: { orderIndex: 'asc' } } } },
            pricing: true,
            regionSet: true,
          },
        },
      },
    });
    if (!trip) {
      throw new DomainError('NOT_FOUND', 'Confirmed trip not found');
    }
    return trip;
  }

  private toGraphql(document: {
    id: string;
    confirmedTripId: string;
    planVersionId: string | null;
    documentNumber: string | null;
    versionNumber: number;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    snapshot: unknown;
    publishedAt: Date | null;
    publishedByEmployeeId: string | null;
    createdByEmployeeId: string | null;
    updatedByEmployeeId: string | null;
    createdAt: Date;
    updatedAt: Date;
    publishedByEmployee: { id: string; name: string } | null;
    createdByEmployee: { id: string; name: string } | null;
    updatedByEmployee: { id: string; name: string } | null;
    memo: {
      content: string;
      updatedByEmployeeId: string | null;
      createdAt: Date;
      updatedAt: Date;
      updatedByEmployee: { id: string; name: string } | null;
    } | null;
  }) {
    const snapshot = confirmationDocumentSnapshotSchema.parse(document.snapshot);
    return {
      ...document,
      snapshot,
      memo: document.memo
        ? {
            content: document.memo.content,
            updatedByEmployeeId: document.memo.updatedByEmployeeId,
            createdAt: document.memo.createdAt,
            updatedAt: document.memo.updatedAt,
            updatedByEmployee: document.memo.updatedByEmployee,
          }
        : null,
    };
  }
}

export type { ConfirmationDocumentSnapshotInput };
