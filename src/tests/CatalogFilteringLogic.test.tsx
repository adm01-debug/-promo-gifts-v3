import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCatalogFiltering } from '../hooks/useCatalogFiltering';
import { defaultFilters } from '../components/filters/FilterPanel';
import type { Product } from '../hooks/useProducts';

// Mock simple product data
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Caneta Esferográfica Blue',
    sku: 'CAN-001',
    price: 2.5,
    stock: 100,
    colors: [{ name: 'Azul', hex: '#0000FF', groupSlug: 'azul', group: 'Azul', variationSlug: 'azul-caneta' }],
    supplier: { id: 'supp-1', name: 'Fornecedor A' },
    brand: 'Fornecedor A',
    materials: ['Plástico'],
    category_id: 'cat-1'
  } as any,
  {
    id: '2',
    name: 'Mochila Notebook Premium',
    sku: 'MOC-002',
    price: 150.0,
    stock: 50,
    colors: [{ name: 'Preto', hex: '#000000', groupSlug: 'preto', group: 'Preto' }],
    supplier: { id: 'supp-2', name: 'Fornecedor B' },
    brand: 'Fornecedor B',
    materials: ['Poliéster', 'Nylon'],
    category_id: 'cat-2'
  } as any,
  {
    id: '3',
    name: 'Garrafa Térmica Sport',
    sku: 'GAR-003',
    price: 45.9,
    stock: 0,
    colors: [{ name: 'Rosa', hex: '#FF00FF', groupSlug: 'rosa', group: 'Rosa' }],
    supplier: { id: 'supp-1', name: 'Fornecedor A' },
    brand: 'Fornecedor A',
    materials: ['Metal'],
    category_id: 'cat-3'
  } as any
];

describe('useCatalogFiltering Logic Audit', () => {
  it('should filter by price range correctly', () => {
    const filters = { ...defaultFilters, priceRange: [10, 200] as [number, number] };
    const { result } = renderHook(() => useCatalogFiltering({
      realProducts: mockProducts,
      filters,
      sortBy: 'name',
      hasFuzzySearch: false,
      fuzzySearchResults: [],
      hasMaterialFilter: false,
      materialFilteredProductIds: new Set(),
      isLoadingMaterialFilter: false,
      hasCategoryFilter: false,
      categoryFilteredProductIds: new Set(),
      isLoadingCategoryFilter: false
    }));

    // Should only have Mochila (150) and Garrafa (45.9). Caneta (2.5) excluded.
    expect(result.current.length).toBe(2);
    expect(result.current.map(p => p.id)).toContain('2');
    expect(result.current.map(p => p.id)).toContain('3');
  });

  it('should filter by stock availability', () => {
    const filters = { ...defaultFilters, inStock: true };
    const { result } = renderHook(() => useCatalogFiltering({
      realProducts: mockProducts,
      filters,
      sortBy: 'name',
      hasFuzzySearch: false,
      fuzzySearchResults: [],
      hasMaterialFilter: false,
      materialFilteredProductIds: new Set(),
      isLoadingMaterialFilter: false,
      hasCategoryFilter: false,
      categoryFilteredProductIds: new Set(),
      isLoadingCategoryFilter: false
    }));

    // Should exclude Garrafa (stock 0)
    expect(result.current.length).toBe(2);
    expect(result.current.some(p => p.id === '3')).toBe(false);
  });

  it('should filter by colors using Set lookups', () => {
    const filters = { ...defaultFilters, colorGroups: ['azul'] };
    const { result } = renderHook(() => useCatalogFiltering({
      realProducts: mockProducts,
      filters,
      sortBy: 'name',
      hasFuzzySearch: false,
      fuzzySearchResults: [],
      hasMaterialFilter: false,
      materialFilteredProductIds: new Set(),
      isLoadingMaterialFilter: false,
      hasCategoryFilter: false,
      categoryFilteredProductIds: new Set(),
      isLoadingCategoryFilter: false
    }));

    expect(result.current.length).toBe(1);
    expect(result.current[0].id).toBe('1');
  });

  it('should respect sorting by price ascending', () => {
    const { result } = renderHook(() => useCatalogFiltering({
      realProducts: mockProducts,
      filters: defaultFilters,
      sortBy: 'price-asc',
      hasFuzzySearch: false,
      fuzzySearchResults: [],
      hasMaterialFilter: false,
      materialFilteredProductIds: new Set(),
      isLoadingMaterialFilter: false,
      hasCategoryFilter: false,
      categoryFilteredProductIds: new Set(),
      isLoadingCategoryFilter: false
    }));

    expect(result.current[0].id).toBe('1'); // 2.5
    expect(result.current[1].id).toBe('3'); // 45.9
    expect(result.current[2].id).toBe('2'); // 150.0
  });

  it('should combine multiple filters (price + inStock)', () => {
    const filters = { 
        ...defaultFilters, 
        priceRange: [1, 50] as [number, number],
        inStock: true 
    };
    const { result } = renderHook(() => useCatalogFiltering({
      realProducts: mockProducts,
      filters,
      sortBy: 'name',
      hasFuzzySearch: false,
      fuzzySearchResults: [],
      hasMaterialFilter: false,
      materialFilteredProductIds: new Set(),
      isLoadingMaterialFilter: false,
      hasCategoryFilter: false,
      categoryFilteredProductIds: new Set(),
      isLoadingCategoryFilter: false
    }));

    // Caneta (2.5, inStock) -> OK
    // Mochila (150, too high) -> NO
    // Garrafa (45.9, out of stock) -> NO
    expect(result.current.length).toBe(1);
    expect(result.current[0].id).toBe('1');
  });
});
