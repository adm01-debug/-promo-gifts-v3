import { renderHook, act } from '@testing-library/react';
import { useSellerCartsPage } from '../useSellerCartsPage';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { useSellerCartContext } from '@/contexts/SellerCartContext';

// Mocks
vi.mock('@/contexts/SellerCartContext', () => ({
  useSellerCartContext: vi.fn(),
}));

vi.mock('@/hooks/useCartTemplates', () => ({
  useCartTemplates: vi.fn(() => ({
    templates: [],
    saveTemplate: { mutate: vi.fn() },
    deleteTemplate: { mutate: vi.fn() },
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/' }),
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('useSellerCartsPage Logic - Sorting', () => {
  const mockItems = [
    { id: '1', product_name: 'Produto B', product_price: 100, quantity: 2, sort_order: 1 },
    { id: '2', product_name: 'Produto A', product_price: 50, quantity: 10, sort_order: 0 },
    { id: '3', product_name: 'Produto C', product_price: 200, quantity: 1, sort_order: 2 },
  ];

  const mockActiveCart = {
    id: 'cart-1',
    company_name: 'Empresa Teste',
    items: mockItems,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSellerCartContext as any).mockReturnValue({
      carts: [mockActiveCart],
      activeCart: mockActiveCart,
      activeCartId: 'cart-1',
      isLoading: false,
      totalItems: 3,
      setActiveCartId: vi.fn(),
      updateItemSortOrder: vi.fn(),
    });
  });

  it('should sort items manually by default (following sort_order)', () => {
    const { result } = renderHook(() => useSellerCartsPage(), { wrapper });
    
    expect(result.current.sortedItems[0].id).toBe('2'); // sort_order 0
    expect(result.current.sortedItems[1].id).toBe('1'); // sort_order 1
    expect(result.current.sortedItems[2].id).toBe('3'); // sort_order 2
  });

  it('should sort items by price descending', () => {
    const { result } = renderHook(() => useSellerCartsPage(), { wrapper });
    
    act(() => {
      result.current.setItemsSortBy('price-desc');
    });

    expect(result.current.sortedItems[0].id).toBe('3'); // 200
    expect(result.current.sortedItems[1].id).toBe('1'); // 100
    expect(result.current.sortedItems[2].id).toBe('2'); // 50
  });

  it('should sort items by quantity ascending', () => {
    const { result } = renderHook(() => useSellerCartsPage(), { wrapper });
    
    act(() => {
      result.current.setItemsSortBy('qty-asc');
    });

    expect(result.current.sortedItems[0].id).toBe('3'); // 1
    expect(result.current.sortedItems[1].id).toBe('1'); // 2
    expect(result.current.sortedItems[2].id).toBe('2'); // 10
  });

  it('should sort items by total price descending', () => {
    const { result } = renderHook(() => useSellerCartsPage(), { wrapper });
    
    act(() => {
      result.current.setItemsSortBy('total-desc');
    });

    // 1: 100 * 2 = 200
    // 2: 50 * 10 = 500
    // 3: 200 * 1 = 200
    expect(result.current.sortedItems[0].id).toBe('2'); // 500
    // Orders of 1 and 3 depend on stability, but they both have 200
    expect(['1', '3']).toContain(result.current.sortedItems[1].id);
    expect(['1', '3']).toContain(result.current.sortedItems[2].id);
  });
});
