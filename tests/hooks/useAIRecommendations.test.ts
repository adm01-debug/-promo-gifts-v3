import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAIRecommendations } from '@/hooks/useAIRecommendations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAIRecommendations', () => {
  it('should initialize with correct state', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAIRecommendations(), { wrapper });
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(typeof result.current.getRecommendations).toBe('function');
  });
});
