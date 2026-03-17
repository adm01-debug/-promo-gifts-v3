import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useBIMetrics } from '@/hooks/useBIMetrics';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useBIMetrics', () => {
  it('initializes with correct state', () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useBIMetrics(), { wrapper });
    
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
  });
});
