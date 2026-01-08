import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProductAnalytics } from '@/hooks/useProductAnalytics';
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

describe('useProductAnalytics', () => {
  it('should return analytics functions', () => {
    const { result } = renderHook(() => useProductAnalytics(), { wrapper: createWrapper() });
    
    expect(result.current).toBeDefined();
    expect(typeof result.current.trackProductView).toBe('function');
    expect(typeof result.current.trackSearch).toBe('function');
  });
});
