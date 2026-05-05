import { describe, it, expect } from 'vitest';
import { useNovelties, useNoveltyStats, useNoveltiesWithDetails } from '../src/hooks/useNovelties';
import { MOCK_NOVELTIES, MOCK_STATS } from '../src/hooks/useNoveltiesMocks';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Setup QueryClient for testing
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useNovelties Hook (Mocks)', () => {
  it('useNovelties returns mock data structure when USE_MOCKS is active', async () => {
    const { result } = renderHook(() => useNovelties({ limit: 5 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });
    expect(result.current.data?.length).toBeLessThanOrEqual(5);
    expect(result.current.data?.[0]).toHaveProperty('product_name');
  });

  it('useNoveltiesWithDetails returns exact MOCK_NOVELTIES', async () => {
    const { result } = renderHook(() => useNoveltiesWithDetails(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_NOVELTIES);
  });

  it('useNoveltyStats returns MOCK_STATS structure', async () => {
    const { result } = renderHook(() => useNoveltyStats(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_STATS);
  });
});

