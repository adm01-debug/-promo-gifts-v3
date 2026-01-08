import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuoteTemplates } from '@/hooks/useQuoteTemplates';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import React from 'react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

describe('useQuoteTemplates', () => {
  it('should return templates state and functions', () => {
    const { result } = renderHook(() => useQuoteTemplates(), { wrapper: createWrapper() });
    
    expect(result.current).toBeDefined();
    expect(result.current.templates).toBeDefined();
    expect(typeof result.current.loading).toBe('boolean');
    expect(typeof result.current.createTemplate).toBe('function');
  });
});
