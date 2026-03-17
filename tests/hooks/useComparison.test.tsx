import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useComparison } from '@/hooks/useComparison';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useComparison', () => {
  it('should initialize with empty compareIds', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useComparison(), { wrapper });
    
    expect(result.current).toBeDefined();
    expect(result.current.compareIds).toEqual([]);
  });

  it('should add items to comparison', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useComparison(), { wrapper });
    
    act(() => {
      result.current.toggleCompare('product-1');
    });
    
    expect(result.current.compareIds).toContain('product-1');
  });
});
