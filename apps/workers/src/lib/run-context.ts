import { randomUUID } from 'node:crypto';
import { createLogger } from './logger';

export function createRunContext(worker: string) {
  const runId = `${worker}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  const logger = createLogger({ worker, runId });

  return {
    runId,
    logger,
  };
}
