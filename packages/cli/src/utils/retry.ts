const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Check if it's a rate-limit error (HTTP 429) or server error (5xx)
      const isRetryable = isRetryableError(err);

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed');
}

function isRetryableError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const status = (err as Record<string, unknown>).status as number | undefined;
    if (status === 429 || (status && status >= 500)) {
      return true;
    }
    const code = (err as Record<string, unknown>).code as string | undefined;
    if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED') {
      return true;
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
