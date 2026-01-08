import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCollections } from '@/hooks/useCollections';
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

describe('useCollections', () => {
  it('should initialize with empty collections', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCollections(), { wrapper });
    
    expect(result.current).toBeDefined();
    expect(result.current.collections).toBeDefined();
    expect(Array.isArray(result.current.collections)).toBe(true);
  });
});
