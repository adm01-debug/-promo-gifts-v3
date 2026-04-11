import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '@/hooks/useErrorHandler';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

describe('useErrorHandler', () => {
  it('handleError shows toast with error message', () => {
    const { toast } = require('sonner');
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError(new Error('Something failed'));
    });
    
    expect(toast.error).toHaveBeenCalledWith('Something failed');
  });

  it('handleError uses custom message when provided', () => {
    const { toast } = require('sonner');
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError(new Error('original'), { message: 'Custom msg' });
    });
    
    expect(toast.error).toHaveBeenCalledWith('Custom msg');
  });

  it('handleError suppresses toast when silent', () => {
    const { toast } = require('sonner');
    toast.error.mockClear();
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError(new Error('silent error'), { silent: true });
    });
    
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('handleError calls onError callback', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useErrorHandler());
    const err = new Error('test');
    
    act(() => {
      result.current.handleError(err, { onError });
    });
    
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('wrapAsync catches errors automatically', async () => {
    const { toast } = require('sonner');
    const { result } = renderHook(() => useErrorHandler());
    
    const failingFn = async () => { throw new Error('async fail'); };
    const safeFn = result.current.wrapAsync(failingFn);
    
    const returnVal = await safeFn();
    expect(returnVal).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith('async fail');
  });

  it('wrapAsync returns value on success', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const successFn = async () => 42;
    const safeFn = result.current.wrapAsync(successFn);
    
    const returnVal = await safeFn();
    expect(returnVal).toBe(42);
  });

  it('handles non-Error objects gracefully', () => {
    const { toast } = require('sonner');
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError('string error');
    });
    
    expect(toast.error).toHaveBeenCalledWith('Ocorreu um erro inesperado');
  });
});
