import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOrders } from '@/hooks/useOrders';
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

describe('useOrders', () => {
  it('should return orders state and functions', () => {
    const { result } = renderHook(() => useOrders(), { wrapper: createWrapper() });
    
    expect(result.current).toBeDefined();
    expect(result.current.orders).toBeDefined();
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.getOrderById).toBe('function');
  });
});
