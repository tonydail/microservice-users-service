import { describe, expect, it, vi } from 'vitest';
import { retry } from '../../../src/utils/retry';

describe('retry', () => {
  it('retries failed operations with exponential backoff', async () => {
    vi.useFakeTimers();
    const error = new Error('temporarily unavailable');
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('connected');
    const onRetry = vi.fn();

    const resultPromise = retry(operation, {
      maxRetries: 2,
      initialDelayMs: 100,
      onRetry,
    });

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toBe('connected');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenNthCalledWith(1, error, 1, 100);
    expect(onRetry).toHaveBeenNthCalledWith(2, error, 2, 200);
    vi.useRealTimers();
  });

  it('rejects with the last error after retries are exhausted', async () => {
    const error = new Error('still unavailable');
    const operation = vi.fn<() => Promise<void>>().mockRejectedValue(error);

    await expect(
      retry(operation, {
        maxRetries: 2,
        initialDelayMs: 0,
      }),
    ).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(3);
  });
});
