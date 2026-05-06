import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOrdersList } from '../useOrders';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase with a more robust chainable interface
const mockSupabaseQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  then: vi.fn((cb) => cb({ data: [{ id: '1', order_number: 'ORD-001', status: 'pending' }], error: null, count: 1 })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseQuery),
  },
}));

// Mock auth utilities
vi.mock('@/lib/auth/apply-seller-scope', () => ({
  applySellerScope: vi.fn((q) => q),
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryFn }) => {
    // In actual useQuery, data would be returned after queryFn resolves
    // For this test, we just want to ensure queryFn is called and behaves correctly
    return { data: { data: [{ id: '1', order_number: 'ORD-001' }], count: 1 }, isLoading: false };
  }),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

describe('useOrdersList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call supabase with correct filters and pagination', async () => {
    const sellerId = 'user-123';
    const filters = { search: 'clientA', status: 'shipped', page: 2, pageSize: 10 };
    
    // We need to extract the queryFn from useQuery mock to test its logic
    const { useQuery } = await import('@tanstack/react-query');
    renderHook(() => useOrdersList(sellerId, 'self', filters));

    const queryFn = (useQuery as any).mock.calls[0][0].queryFn;
    await queryFn();

    expect(supabase.from).toHaveBeenCalledWith('orders');
    expect(mockSupabaseQuery.select).toHaveBeenCalled();
    expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('status', 'shipped');
    expect(mockSupabaseQuery.or).toHaveBeenCalledWith(expect.stringContaining('clientA'));
    // Page 2, PageSize 10 -> from 10 to 19
    expect(mockSupabaseQuery.range).toHaveBeenCalledWith(10, 19);
  });

  it('should handle errors gracefully', async () => {
    mockSupabaseQuery.then.mockImplementationOnce((cb) => cb({ data: null, error: { message: 'RLS error' }, count: 0 }));
    
    const sellerId = 'user-123';
    const { useQuery } = await import('@tanstack/react-query');
    renderHook(() => useOrdersList(sellerId, 'self'));

    const queryFn = (useQuery as any).mock.calls[0][0].queryFn;
    
    await expect(queryFn()).rejects.toThrow('RLS error');
  });
});
