import type { PrismaClient } from '@prisma/client';
import { GuideConfirmationDeliveryService } from './guide-confirmation-delivery.service';

const WORKER_INTERVAL_MS = 30_000;
const WORKER_BATCH_SIZE = 10;

let workerTimer: NodeJS.Timeout | null = null;
let isProcessing = false;

export function startGuideConfirmationDeliveryWorker(prisma: PrismaClient): void {
  if (workerTimer) {
    return;
  }

  const service = new GuideConfirmationDeliveryService(prisma);

  const tick = async () => {
    if (isProcessing) {
      return;
    }

    isProcessing = true;
    try {
      await service.processPendingBatch(WORKER_BATCH_SIZE);
    } catch (error) {
      console.error('[guide-confirmation-delivery] worker tick failed:', error);
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
