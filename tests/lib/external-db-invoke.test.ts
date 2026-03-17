import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const mockInvoke = vi.fn();
  return {
    supabase: {
      functions: {
        invoke: mockInvoke,
      },
    },
    __mockInvoke: mockInvoke,
  };
});

import { __mockInvoke as mockInvoke } from '@/integrations/supabase/client';
import { invokeWithRetry, extractFunctionErrorMessage } from '@/lib/external-db/invoke';

describe('extractFunctionErrorMessage', () => {
  it('returns message from Error instance', async () => {
    const err = new Error('Something failed');
    expect(await extractFunctionErrorMessage(err)).toBe('Something failed');
  });

  it('returns generic message for non-Error', async () => {
    expect(await extractFunctionErrorMessage('string error')).toBe('Erro ao acessar banco externo');
    expect(await extractFunctionErrorMessage(null)).toBe('Erro ao acessar banco externo');
  });

  it('extracts detailed message from Response context', async () => {
    const responseBody = JSON.stringify({ error: 'DB error', details: 'column missing', hint: 'check schema' });
    const mockResponse = new Response(responseBody, { status: 500 });
    const err = new Error('FunctionsHttpError') as Error & { context: Response };
    err.context = mockResponse;

    const result = await extractFunctionErrorMessage(err);
    expect(result).toContain('DB error');
    expect(result).toContain('column missing');
    expect(result).toContain('check schema');
  });
});

describe('invokeWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data on first success', async () => {
    (mockInvoke as any).mockResolvedValueOnce({ data: { records: [{ id: '1' }] }, error: null });

    const result = await invokeWithRetry({ table: 'products', operation: 'select' });
    expect(result.data).toEqual({ records: [{ id: '1' }] });
    expect(result.error).toBeNull();
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error and succeeds', async () => {
    const retryableError = new Error('503 bad gateway');
    (mockInvoke as any)
      .mockResolvedValueOnce({ data: null, error: retryableError })
      .mockResolvedValueOnce({ data: { records: [] }, error: null });

    const result = await invokeWithRetry({ table: 'products', operation: 'select' }, 2);
    expect(result.data).toEqual({ records: [] });
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable error', async () => {
    const nonRetryableError = new Error('Invalid column "xyz"');
    (mockInvoke as any).mockResolvedValueOnce({ data: null, error: nonRetryableError });

    const result = await invokeWithRetry({ table: 'products', operation: 'select' }, 3);
    expect(result.error).toBe(nonRetryableError);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('exhausts retries and returns error', async () => {
    const retryableError = new Error('Failed to fetch');
    (mockInvoke as any).mockResolvedValue({ data: null, error: retryableError });

    const result = await invokeWithRetry({ table: 'products', operation: 'select' }, 1);
    expect(result.error).toBe(retryableError);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });
});
