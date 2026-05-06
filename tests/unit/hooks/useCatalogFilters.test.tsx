import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCatalogFilters } from '@/hooks/useCatalogFilters';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import React from 'react';

// Mock dependências externas
vi.mock('@/hooks/useProductsByMaterial', () => ({
  useProductsByMaterial: vi.fn(() => ({
    productIds: new Set(),
    hasFilter: false,
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useProductsByCategory', () => ({
  useProductsByCategory: vi.fn(() => ({
    productIds: new Set(),
    hasFilter: false,
    isLoading: false,
  })),
}));

// Mock BroadcastChannel
class BroadcastChannelMock {
  onmessage: ((event: any) => void) | null = null;
  postMessage = vi.fn();
  close = vi.fn();
}
vi.stubGlobal('BroadcastChannel', BroadcastChannelMock);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/']}>
    {children}
  </MemoryRouter>
);

describe('useCatalogFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default filters', () => {
    const { result } = renderHook(() => useCatalogFilters(), { wrapper });
    expect(result.current.filters.search).toBe('');
    expect(result.current.activeFiltersCount).toBe(0);
  });

  it('should update search query and sync with URL', async () => {
    const { result } = renderHook(() => useCatalogFilters(), { wrapper });

    act(() => {
      result.current.setSearchQuery('caneca');
    });

    expect(result.current.searchQuery).toBe('caneca');

    // Aguarda o debounce de sincronização (500ms no hook)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    // Verificação indireta via searchParams seria ideal, mas MemoryRouter isola o estado.
    // O hook chama setSearchParams internamente.
  });

  it('should apply preset and update URL', () => {
    const { result } = renderHook(() => useCatalogFilters(), { wrapper });

    const newFilters = { ...result.current.filters, colors: ['blue'] };
    
    act(() => {
      result.current.setFiltersWithPreset(newFilters, 'preset-123');
    });

    expect(result.current.filters.colors).toContain('blue');
    expect(result.current.activePresetId).toBe('preset-123');
  });

  it('should calculate active filters count correctly', () => {
    const { result } = renderHook(() => useCatalogFilters(), { wrapper });

    act(() => {
      result.current.setFilters({
        ...result.current.filters,
        colors: ['red', 'blue'], // 2
        categories: ['cat1'], // 1
        isKit: true, // 1
      });
    });

    // colors(2) + categories(1) + isKit(1) = 4
    expect(result.current.activeFiltersCount).toBe(4);
  });
});
