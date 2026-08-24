interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs?: number;
  onRetry?: (error: unknown, retryAttempt: number, delayMs: number) => void;
}

export async function retry<T>(
  operation: () => Promise<T>,
  { maxRetries, initialDelayMs, maxDelayMs = 30_000, onRetry }: RetryOptions,
): Promise<T> {
  for (let retryAttempt = 0; retryAttempt <= maxRetries; retryAttempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      if (retryAttempt >= maxRetries) {
        throw error;
      }

      const nextAttempt = retryAttempt + 1;
      const delayMs = Math.min(initialDelayMs * 2 ** retryAttempt, maxDelayMs);
      onRetry?.(error, nextAttempt, delayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Retry loop completed unexpectedly');
}
