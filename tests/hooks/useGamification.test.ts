import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGamification } from '@/hooks/useGamification';
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

describe('useGamification', () => {
  it('should initialize correctly', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGamification(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.userStats).toBeDefined();
  });
});
