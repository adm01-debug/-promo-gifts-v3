import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRewardsStore } from '@/hooks/useRewardsStore';
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

describe('useRewardsStore', () => {
  it('should return rewards store state', () => {
    const { result } = renderHook(() => useRewardsStore(), { wrapper: createWrapper() });
    
    expect(result.current).toBeDefined();
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.ownsReward).toBe('function');
  });
});
