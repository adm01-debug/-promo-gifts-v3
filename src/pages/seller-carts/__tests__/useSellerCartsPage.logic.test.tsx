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

  it('should call updateItemSortOrder correctly on handleDragEnd', () => {
    const updateItemSortOrder = vi.fn();
    (useSellerCartContext as any).mockReturnValue({
      carts: [mockActiveCart],
      activeCart: mockActiveCart,
      activeCartId: 'cart-1',
      isLoading: false,
      totalItems: 3,
      updateItemSortOrder,
    });

    const { result } = renderHook(() => useSellerCartsPage(), { wrapper });
    
    // Simulate drag: move "Produto B" (id: 1) to after "Produto C" (id: 3)
    // mockItems order by sort_order: [2 (0), 1 (1), 3 (2)]
    // Moving 1 to index of 3.
    
    act(() => {
      result.current.handleDragEnd({
        active: { id: '1' },
        over: { id: '3' },
      } as any);
    });

    expect(updateItemSortOrder).toHaveBeenCalled();
    const calls = updateItemSortOrder.mock.calls[0][0];
    
    // The expected new order should be [2, 3, 1]
    expect(calls[0]).toEqual({ id: '2', sort_order: 0 });
    expect(calls[1]).toEqual({ id: '3', sort_order: 1 });
    expect(calls[2]).toEqual({ id: '1', sort_order: 2 });
  });

  it('should prevent drag and drop if sortBy is not manual', () => {
    const updateItemSortOrder = vi.fn();
    (useSellerCartContext as any).mockReturnValue({
      carts: [mockActiveCart],
      activeCart: mockActiveCart,
      activeCartId: 'cart-1',
      isLoading: false,
      totalItems: 3,
      updateItemSortOrder,
    });

    const { result } = renderHook(() => useSellerCartsPage(), { wrapper });
    
    act(() => {
      result.current.setItemsSortBy('price-desc');
    });

    act(() => {
      result.current.handleDragEnd({
        active: { id: '1' },
        over: { id: '3' },
      } as any);
    });

    expect(updateItemSortOrder).not.toHaveBeenCalled();
  });
});

describe('useSellerCartsPage Logic - Filtering & Persistence', () => {
  const mockCarts = [
    {
      id: 'cart-1',
      company_name: 'Coca-Cola',
      items: [{ id: 'i1', product_name: 'Soda' }],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'cart-2',
      company_name: 'Pepsi',
      items: [{ id: 'i2', product_name: 'Cola' }],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useSellerCartContext as any).mockReturnValue({
      carts: mockCarts,
      activeCart: mockCarts[0],
      activeCartId: 'cart-1',
      isLoading: false,
      totalItems: 2,
      setActiveCartId: vi.fn(),
    });
  });

  it('should maintain searchTerm when activeCartId changes', () => {
    const { result, rerender } = renderHook(() => useSellerCartsPage(), { wrapper });
    
    act(() => {
      result.current.setSearchTerm('test-search');
    });

    expect(result.current.searchTerm).toBe('test-search');

    // Simulate change in activeCartId from external source (e.g. context)
    (useSellerCartContext as any).mockReturnValue({
      carts: mockCarts,
      activeCart: mockCarts[1],
      activeCartId: 'cart-2',
      isLoading: false,
      totalItems: 2,
      setActiveCartId: vi.fn(),
    });

    rerender();

    expect(result.current.searchTerm).toBe('test-search');
  });

  it('should correctly filter carts based on global search', () => {
    const { result } = renderHook(() => useSellerCartsPage(), { wrapper });
    
    act(() => {
      result.current.setSearchTerm('Pepsi');
    });

    expect(result.current.filteredCarts).toHaveLength(1);
    expect(result.current.filteredCarts[0].company_name).toBe('Pepsi');

    act(() => {
      result.current.setSearchTerm('Soda'); // search by item name
    });

    expect(result.current.filteredCarts).toHaveLength(1);
    expect(result.current.filteredCarts[0].company_name).toBe('Coca-Cola');
  });

  it('should clear all filters correctly', () => {
    const { result } = renderHook(() => useSellerCartsPage(), { wrapper });
    
    act(() => {
      result.current.setSearchTerm('Nike');
      result.current.setCompanyFilter('Some Company');
      result.current.setItemsSortBy('price-desc');
    });

    act(() => {
      result.current.handleClearFilters();
    });

    expect(result.current.searchTerm).toBe('');
    expect(result.current.companyFilter).toBe('all');
  });
});

describe('useSellerCartsPage Logic - Mass Actions', () => {
  const mockItems = [
    { id: '1', product_name: 'Item 1', product_price: 10, quantity: 1 },
    { id: '2', product_name: 'Item 2', product_price: 20, quantity: 2 },
  ];

  const mockActiveCart = {
    id: 'cart-1',
    company_name: 'Test Co',
    items: mockItems,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call removeItem for each selected item on handleBulkRemove', () => {
    const removeItem = vi.fn();
    (useSellerCartContext as any).mockReturnValue({
      carts: [mockActiveCart],
      activeCart: mockActiveCart,
      activeCartId: 'cart-1',
      removeItem,
    });

    const { result } = renderHook(() => useSellerCartsPage(), { wrapper });

    act(() => {
      result.current.toggleItemSelection('1');
      result.current.toggleItemSelection('2');
    });

    act(() => {
      result.current.handleBulkRemove();
    });

    expect(removeItem).toHaveBeenCalledTimes(2);
    expect(removeItem).toHaveBeenCalledWith('1');
    expect(removeItem).toHaveBeenCalledWith('2');
    expect(result.current.selectedItemIds.size).toBe(0); // selection cleared
  });

  it('should call updateItemNotes for each selected item on handleBulkUpdateNotes', () => {
    const updateItemNotes = vi.fn();
    (useSellerCartContext as any).mockReturnValue({
      carts: [mockActiveCart],
      activeCart: mockActiveCart,
      activeCartId: 'cart-1',
      updateItemNotes,
    });

    const { result } = renderHook(() => useSellerCartsPage(), { wrapper });

    act(() => {
      result.current.toggleItemSelection('1');
    });

    act(() => {
      result.current.handleBulkUpdateNotes('Nova nota');
    });

    expect(updateItemNotes).toHaveBeenCalledWith('1', 'Nova nota');
    expect(result.current.selectedItemIds.size).toBe(0);
  });
});



