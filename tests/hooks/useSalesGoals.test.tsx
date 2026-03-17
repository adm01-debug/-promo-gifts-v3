import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSalesGoals } from '@/hooks/useSalesGoals';
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

describe('useSalesGoals', () => {
  it('should return sales goals state and functions', () => {
    const { result } = renderHook(() => useSalesGoals(), { wrapper: createWrapper() });

    expect(result.current).toBeDefined();
    expect(result.current.goals).toBeDefined();
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.createGoal).toBe('function');
    expect(typeof result.current.getProgress).toBe('function');
  });
});
