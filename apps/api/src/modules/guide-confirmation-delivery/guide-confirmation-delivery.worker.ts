import type { PrismaClient } from '@prisma/client';
import { GuideConfirmationDeliveryService } from './guide-confirmation-delivery.service';
import { GuideTripNoteDeliveryService } from '../guide-trip-note-delivery/guide-trip-note-delivery.service';

const WORKER_INTERVAL_MS = 30_000;
const WORKER_BATCH_SIZE = 10;

let workerTimer: NodeJS.Timeout | null = null;
let isProcessing = false;

export function startGuideConfirmationDeliveryWorker(prisma: PrismaClient): void {
  if (workerTimer) {
    return;
  }

  const confirmationService = new GuideConfirmationDeliveryService(prisma);
  const tripNoteService = new GuideTripNoteDeliveryService(prisma);

  const tick = async () => {
    if (isProcessing) {
      return;
    }

    isProcessing = true;
    try {
      try {
        await confirmationService.processPendingBatch(WORKER_BATCH_SIZE);
      } catch (error) {
        console.error('[guide-confirmation-delivery] worker tick failed:', error);
      }
      try {
        await tripNoteService.processPendingBatch(WORKER_BATCH_SIZE);
      } catch (error) {
        console.error('[guide-trip-note-delivery] worker tick failed:', error);
      }
    } finally {
      isProcessing = false;
    }
  };

  void tick();
  workerTimer = setInterval(() => {
    void tick();
  }, WORKER_INTERVAL_MS);
}

export function stopGuideConfirmationDeliveryWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
}
