import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useFollowUpReminders } from '@/hooks/useFollowUpReminders';
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

describe('useFollowUpReminders', () => {
  it('should initialize with empty reminders', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useFollowUpReminders(), { wrapper });
    
    expect(result.current).toBeDefined();
    expect(result.current.reminders).toEqual([]);
  });
});
