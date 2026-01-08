import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '@/hooks/useErrorHandler';

describe('useErrorHandler', () => {
  it('should initialize with no error', () => {
    const { result } = renderHook(() => useErrorHandler({ showToast: false }));
    
    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('should handle error', () => {
    const { result } = renderHook(() => useErrorHandler({ showToast: false }));
    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.isError).toBe(true);
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useErrorHandler({ showToast: false }));

    act(() => {
      result.current.handleError(new Error('Test'));
    });
    
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
  });
});
