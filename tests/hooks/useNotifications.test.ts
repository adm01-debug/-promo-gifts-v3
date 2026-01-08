import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNotifications } from '@/hooks/useNotifications';
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

describe('useNotifications', () => {
  it('should initialize with empty notifications', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });
    
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });
});
