import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuoteVersions } from '@/hooks/useQuoteVersions';
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

describe('useQuoteVersions', () => {
  it('should return versions state for a quote', () => {
    const { result } = renderHook(() => useQuoteVersions('test-quote-id'), { 
      wrapper: createWrapper() 
    });
    
    expect(result.current).toBeDefined();
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.createVersion).toBe('function');
  });
});
