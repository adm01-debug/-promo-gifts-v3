import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePrefetch } from '@/hooks/usePrefetch';
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

describe('usePrefetch', () => {
  it('should return prefetch functions', () => {
    const { result } = renderHook(() => usePrefetch(), { wrapper: createWrapper() });
    
    expect(result.current.prefetchProduct).toBeDefined();
    expect(result.current.prefetchQuote).toBeDefined();
    expect(result.current.prefetchClient).toBeDefined();
  });
});
});
