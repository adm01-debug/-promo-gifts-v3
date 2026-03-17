import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useExpertConversations } from '@/hooks/useExpertConversations';
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

describe('useExpertConversations', () => {
  it('initializes with empty conversations', () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useExpertConversations(), { wrapper });
    
    expect(result.current).toBeDefined();
    expect(result.current.conversations).toEqual([]);
  });
});
