import pino from 'pino';

export function createLogger(bindings: Record<string, string>) {
  return pino({
    level: process.env.LOG_LEVEL?.trim() || 'info',
    base: bindings,
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
