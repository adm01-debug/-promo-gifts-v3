import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSellerCarts } from './useSellerCarts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    })),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
    fromMock.mockImplementation((table: string) => {
      const query: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      if (table === 'seller_carts') {
        query.select.mockResolvedValue({ data: mockCarts, error: null });
      } else if (table === 'seller_cart_items') {
        query.select.mockResolvedValue({ data: mockItems, error: null });
      }
      return query;
    });

    const { result } = renderHook(() => useSellerCarts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.carts.length).toBe(1));
    
    expect(result.current.carts[0].company_name).toBe('Company A');
    expect(result.current.carts[0].items.length).toBe(1);
    expect(result.current.carts[0].items[0].product_name).toBe('Product A');
  });

  it('should handle empty carts list', async () => {
    const fromMock = supabase.from as any;
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    const { result } = renderHook(() => useSellerCarts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.carts).toEqual([]);
  });

  it('should calculate total items correctly', async () => {
     const fromMock = supabase.from as any;
     fromMock.mockImplementation((table: string) => {
      const query: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      if (table === 'seller_carts') {
        query.select.mockResolvedValue({ data: mockCarts, error: null });
      } else if (table === 'seller_cart_items') {
        query.select.mockResolvedValue({ data: mockItems, error: null });
      }
      return query;
    });

    const { result } = renderHook(() => useSellerCarts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.totalItems).toBe(1));
  });

  it('should enforce the limit of 3 carts', async () => {
    const manyCarts = [
        { id: '1' }, { id: '2' }, { id: '3' }
    ];
    const fromMock = supabase.from as any;
    fromMock.mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: table === 'seller_carts' ? manyCarts : [], error: null }),
    }));

    const { result } = renderHook(() => useSellerCarts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.canCreateCart).toBe(false));
  });
});
