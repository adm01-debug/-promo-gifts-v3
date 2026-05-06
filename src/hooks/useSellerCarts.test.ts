import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSellerCarts } from './useSellerCarts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };
  return {
    supabase: {
      from: vi.fn(() => mockQuery),
    },
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        staleTime: 0,
        gcTime: 0
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useSellerCarts', () => {
  const mockUserId = 'user-123';
  const mockCarts = [
    { id: 'cart-1', seller_id: mockUserId, company_name: 'Company A', updated_at: new Date().toISOString() },
  ];
  const mockItems = [
    { id: 'item-1', cart_id: 'cart-1', product_name: 'Product A', product_price: 10, quantity: 2 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: mockUserId } });
  });

  it('should fetch carts and items correctly', async () => {
    const fromMock = supabase.from as any;
    const mockQuery = fromMock();
    
    mockQuery.select.mockImplementation(function(this: any) {
      // In useSellerCarts, it first calls .from("seller_carts").select("*")
      // Then .from("seller_cart_items").select("*")
      return this;
    });

    fromMock.mockImplementation((table: string) => {
      const q = { ...mockQuery };
      if (table === 'seller_carts') {
        q.select = vi.fn().mockResolvedValue({ data: mockCarts, error: null });
      } else if (table === 'seller_cart_items') {
        q.select = vi.fn().mockResolvedValue({ data: mockItems, error: null });
      }
      return q;
    });

    const { result } = renderHook(() => useSellerCarts(), { wrapper: createWrapper() });

    // Wait for the query to settle
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });
    
    expect(result.current.carts.length).toBe(1);
    expect(result.current.carts[0].company_name).toBe('Company A');
    expect(result.current.carts[0].items.length).toBe(1);
  });

  it('should calculate total items correctly', async () => {
     const fromMock = supabase.from as any;
     fromMock.mockImplementation((table: string) => {
      const q = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      if (table === 'seller_carts') {
        q.select = vi.fn().mockResolvedValue({ data: mockCarts, error: null });
      } else if (table === 'seller_cart_items') {
        q.select = vi.fn().mockResolvedValue({ data: mockItems, error: null });
      }
      return q;
    });

    const { result } = renderHook(() => useSellerCarts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.totalItems).toBe(1));
  });

  it('should enforce the limit of 3 carts', async () => {
    const manyCarts = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const fromMock = supabase.from as any;
    fromMock.mockImplementation((table: string) => ({
        select: vi.fn().mockImplementation(() => {
          if (table === 'seller_carts') return Promise.resolve({ data: manyCarts, error: null });
          return Promise.resolve({ data: [], error: null });
        }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
    }));

    const { result } = renderHook(() => useSellerCarts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.canCreateCart).toBe(false));
  });
});
