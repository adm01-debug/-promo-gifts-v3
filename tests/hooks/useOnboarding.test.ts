import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOnboarding, ONBOARDING_STEPS } from '@/hooks/useOnboarding';
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

describe('useOnboarding', () => {
  it('should export ONBOARDING_STEPS', () => {
    expect(ONBOARDING_STEPS).toBeDefined();
    expect(Array.isArray(ONBOARDING_STEPS)).toBe(true);
  });

  it('should return onboarding state', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper: createWrapper() });
    
    expect(result.current).toBeDefined();
    expect(typeof result.current.showTour).toBe('boolean');
    expect(typeof result.current.currentStep).toBe('number');
  });
});
