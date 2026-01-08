import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePriceHistory', () => {
  it('should return query result for product', () => {
    const { result } = renderHook(() => usePriceHistory('test-product-id'), { 
      wrapper: createWrapper() 
    });
    
    expect(result.current).toBeDefined();
    expect(typeof result.current.isLoading).toBe('boolean');
  });
});
