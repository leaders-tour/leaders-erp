import { sleep } from './sleep';

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: {
    retries: number;
    delayMs: number;
    onRetry?: (error: unknown, attempt: number) => void;
  },
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= options.retries) {
        break;
      }

      options.onRetry?.(error, attempt);
      await sleep(options.delayMs * attempt);
    }
  }

  throw lastError;
}
