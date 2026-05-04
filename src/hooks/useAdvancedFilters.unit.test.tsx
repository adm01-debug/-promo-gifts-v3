import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdvancedFilters } from './useAdvancedFilters';
import * as useExternalDatabaseModule from './useExternalDatabase';
import { defaultAdvancedFilters } from '@/constants/filters';

// Mocking useExternalDatabase and specific hooks
vi.mock('./useExternalDatabase', async () => {
  const actual = await vi.importActual('./useExternalDatabase');
  return {
    ...actual,
    useExternalCategories: vi.fn(),
    useExternalTechniques: vi.fn(),
    useExternalSuppliers: vi.fn(),
    useExternalDatabase: vi.fn(),
  };
});

describe('useAdvancedFilters', () => {
  const mockFetchAll = vi.fn().mockResolvedValue({ success: true });
  
  const mockCategories = [
    { id: '1', name: 'Escrita', slug: 'escrita', level: 0, is_active: true },
    { id: '2', name: 'Canetas', parent_id: '1', slug: 'canetas', level: 1, is_active: true },
  ];

  const mockTechniques = [
    { id: 't1', name: 'Silk', code: 'SK', estimated_days: 5, min_quantity: 10, is_active: true },
  ];

  const mockSuppliers = [
    { id: 's1', name: 'Supplier A', code: 'SUPA', lead_time_days: 10 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock setup for all database hooks
    (useExternalDatabaseModule.useExternalCategories as any).mockReturnValue({
      data: mockCategories,
      fetchAll: mockFetchAll,
      isLoading: false,
    });
    (useExternalDatabaseModule.useExternalTechniques as any).mockReturnValue({
      data: mockTechniques,
      fetchAll: mockFetchAll,
      isLoading: false,
    });
    (useExternalDatabaseModule.useExternalSuppliers as any).mockReturnValue({
      data: mockSuppliers,
      fetchAll: mockFetchAll,
      isLoading: false,
    });
    (useExternalDatabaseModule.useExternalDatabase as any).mockReturnValue({
      data: [],
      fetchAll: mockFetchAll,
      isLoading: false,
    });
  });

  it('initializes with default filters', () => {
    const { result } = renderHook(() => useAdvancedFilters());
    expect(result.current.filters).toEqual(defaultAdvancedFilters);
  });

  it('calls fetchAll on mount for all filter options', async () => {
    renderHook(() => useAdvancedFilters());
    
    await waitFor(() => {
      expect(mockFetchAll).toHaveBeenCalled();
    });
  });

  it('updates a single filter correctly', () => {
    const { result } = renderHook(() => useAdvancedFilters());
    
    act(() => {
      result.current.updateFilter('search', 'test search');
    });
    
    expect(result.current.filters.search).toBe('test search');
    expect(result.current.activeFiltersCount).toBe(1);
  });

  it('toggles an array filter item', () => {
    const { result } = renderHook(() => useAdvancedFilters());
    
    act(() => {
      result.current.toggleArrayFilter('categories', '1');
    });
    expect(result.current.filters.categories).toContain('1');
    
    act(() => {
      result.current.toggleArrayFilter('categories', '1');
    });
    expect(result.current.filters.categories).not.toContain('1');
  });

  it('resets all filters to default', () => {
    const { result } = renderHook(() => useAdvancedFilters());
    
    act(() => {
      result.current.updateFilter('search', 'dirty');
      result.current.toggleArrayFilter('colors', 'red');
    });
    
    expect(result.current.activeFiltersCount).toBe(2);
    
    act(() => {
      result.current.resetFilters();
    });
    
    expect(result.current.filters).toEqual(defaultAdvancedFilters);
    expect(result.current.activeFiltersCount).toBe(0);
  });

  it('builds category tree correctly from flat data', () => {
    const { result } = renderHook(() => useAdvancedFilters());
    
    expect(result.current.categoryTree).toHaveLength(1);
    expect(result.current.categoryTree[0].name).toBe('Escrita');
    expect(result.current.categoryTree[0].children).toHaveLength(1);
    expect(result.current.categoryTree[0].children?.[0].name).toBe('Canetas');
  });

  it('correctly calculates active filters count for ranges', () => {
    const { result } = renderHook(() => useAdvancedFilters());
    
    act(() => {
      result.current.updateFilter('priceRange', [10, 500]);
    });
    
    expect(result.current.activeFiltersCount).toBe(1);
  });

  it('detects active filters in a group', () => {
    const { result } = renderHook(() => useAdvancedFilters());
    
    expect(result.current.hasActiveFiltersInGroup(['categories', 'suppliers'])).toBe(false);
    
    act(() => {
      result.current.toggleArrayFilter('categories', '1');
    });
    
    expect(result.current.hasActiveFiltersInGroup(['categories', 'suppliers'])).toBe(true);
    expect(result.current.hasActiveFiltersInGroup(['colors'])).toBe(false);
  });
});
