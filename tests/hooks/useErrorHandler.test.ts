import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: mockToastError, success: vi.fn(), info: vi.fn() },
}));

import { useErrorHandler } from '@/hooks/useErrorHandler';

describe('useErrorHandler', () => {
  beforeEach(() => {
    mockToastError.mockClear();
  });

  it('handleError shows toast with error message', () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => { result.current.handleError(new Error('Something failed')); });
    expect(mockToastError).toHaveBeenCalledWith('Something failed');
  });

  it('handleError uses custom message when provided', () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => { result.current.handleError(new Error('original'), { message: 'Custom msg' }); });
    expect(mockToastError).toHaveBeenCalledWith('Custom msg');
  });

  it('handleError suppresses toast when silent', () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => { result.current.handleError(new Error('silent'), { silent: true }); });
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('handleError calls onError callback', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useErrorHandler());
    const err = new Error('test');
    act(() => { result.current.handleError(err, { onError }); });
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('wrapAsync catches errors automatically', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const safeFn = result.current.wrapAsync(async () => { throw new Error('async fail'); });
    const val = await safeFn();
    expect(val).toBeUndefined();
    expect(mockToastError).toHaveBeenCalledWith('async fail');
  });

  it('wrapAsync returns value on success', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const safeFn = result.current.wrapAsync(async () => 42);
    expect(await safeFn()).toBe(42);
  });

  it('handles non-Error objects gracefully', () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => { result.current.handleError('string error'); });
    expect(mockToastError).toHaveBeenCalledWith('Ocorreu um erro inesperado');
  });
});
