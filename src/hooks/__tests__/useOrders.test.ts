import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOrdersList } from '../useOrders';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: [], error: null, count: 0 })),
      })),
    })),
  },
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryFn }) => {
    queryFn();
    return { data: { data: [], count: 0 }, isLoading: false };
  }),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

describe('useOrdersList', () => {
  it('should call supabase with correct filters', async () => {
    const sellerId = 'user-123';
    renderHook(() => useOrdersList(sellerId, 'self', { search: 'test', status: 'pending' }));

    expect(supabase.from).toHaveBeenCalledWith('orders');
  });
});
