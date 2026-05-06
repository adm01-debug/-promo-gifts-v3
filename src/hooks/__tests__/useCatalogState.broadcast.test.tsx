import { renderHook, act } from '@testing-library/react';
import { useCatalogState } from '../useCatalogState';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// Mocks
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('../components/filters/FilterPanel', () => ({
  defaultFilters: {
    colors: [],
    colorGroups: [],
    colorVariations: [],
    colorNuances: [],
    categories: [],
    suppliers: [],
    publicoAlvo: [],
    datasComemorativas: [],
    endomarketing: [],
    ramosAtividade: [],
    segmentosAtividade: [],
    materialGroups: [],
    materialTypes: [],
    materiais: [],
    priceRange: [0, 500],
    inStock: false,
    isKit: false,
    featured: false,
    gender: [],
  },
}));

vi.mock('../contexts/ProductsContext', () => ({
  useProductsContext: () => ({ registerProducts: vi.fn() }),
}));

vi.mock('../hooks/useFavoriteQuickAdd', () => ({
  useFavoriteQuickAdd: () => ({ isAdding: false, quickAdd: vi.fn() }),
}));

vi.mock('../hooks/usePromoSalesRanking', () => ({
  usePromoSalesRanking: () => ({ data: new Map() }),
}));

vi.mock('../hooks/useSupplierSalesRanking', () => ({
  useSupplierSalesRanking: () => ({ data: new Map() }),
}));

vi.mock('../hooks/useProductsLightweight', () => ({
  useProductsCatalog: () => ({
    data: { pages: [] },
    isLoading: false,
    isFetching: false,
    hasNextPage: false,
    fetchNextPage: vi.fn().mockResolvedValue({}),
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useSearch', () => ({
  useSearch: () => ({
    suggestions: [],
    quickSuggestions: [],
    history: [],
    addToHistory: vi.fn(),
    clearHistory: vi.fn(),
  }),
}));

vi.mock('../hooks/useCatalogRealStats', () => ({
  useCatalogRealStats: () => ({ data: null }),
}));

vi.mock('../hooks/useCatalogFiltering', () => ({
  useCatalogFiltering: () => [],
}));

vi.mock('../hooks/useColorEnrichment', () => ({
  useColorEnrichment: () => ({ data: new Map() }),
}));

vi.mock('../hooks/useProductsByMaterial', () => ({
  useProductsByMaterial: () => ({ productIds: [], hasFilter: false, isLoading: false }),
}));

vi.mock('../hooks/useProductsByCategory', () => ({
  useProductsByCategory: () => ({ productIds: [], hasFilter: false, isLoading: false }),
}));

vi.mock('../hooks/useExternalCategoriesQuery', () => ({
  useExternalCategoriesQuery: () => ({ data: [] }),
}));

vi.mock('../hooks/useProductFuzzySearch', () => ({
  useProductFuzzySearch: () => ({ results: [], hasSearch: false }),
}));

vi.mock('../stores/useFavoritesStore', () => ({
  useFavoritesStore: () => ({ isFavorite: vi.fn(), toggleFavorite: vi.fn(), favoriteCount: 0 }),
}));

vi.mock('../stores/useComparisonStore', () => ({
  useComparisonStore: () => ({ isInCompare: vi.fn(), toggleCompare: vi.fn(), canAddMore: true }),
}));

// Mock do BroadcastChannel global
const instances: any[] = [];
const postMessageMock = vi.fn();
const closeMock = vi.fn();

class MockBroadcastChannel {
  name: string;
  onmessage: any = null;
  constructor(name: string) {
    this.name = name;
    instances.push(this);
  }
  postMessage = postMessageMock;
  close = closeMock;
}

global.BroadcastChannel = MockBroadcastChannel as any;

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

describe('useCatalogState - BroadcastChannel Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    instances.length = 0;
  });

  it('deve atualizar o estado quando receber PRESET_APPLIED via BroadcastChannel', async () => {
    const { result } = renderHook(() => useCatalogState(), { wrapper });

    // Encontrar a instância que tem o onmessage definido (provavelmente a segunda, pois useCatalogState abre 2)
    // Uma no setFiltersWithPreset (local/fémeral) e outra no useEffect (permanente)
    const activeInstance = instances.find((inst) => inst.onmessage !== null);

    expect(activeInstance).toBeDefined();

    const mockPresetId = 'test-preset-123';
    const mockFilters = {
      colors: [],
      colorGroups: [],
      colorVariations: [],
      colorNuances: [],
      categories: [1],
      suppliers: [],
      publicoAlvo: [],
      datasComemorativas: [],
      endomarketing: [],
      ramosAtividade: [],
      segmentosAtividade: [],
      materialGroups: [],
      materialTypes: [],
      materiais: [],
      priceRange: [0, 500] as [number, number],
      inStock: true,
      isKit: false,
      featured: false,
      gender: [],
    };

    await act(async () => {
      activeInstance.onmessage({
        data: {
          type: 'PRESET_APPLIED',
          presetId: mockPresetId,
          filters: mockFilters,
        },
      });
    });

    expect(result.current.activePresetId).toBe(mockPresetId);
    expect(result.current.filters.inStock).toBe(true);
  });

  it('deve enviar mensagem para o BroadcastChannel ao aplicar um preset manualmente', () => {
    const { result } = renderHook(() => useCatalogState(), { wrapper });

    const mockFilters = { ...result.current.filters, inStock: true };
    const mockPresetId = 'manual-preset';

    act(() => {
      result.current.setFiltersWithPreset(mockFilters, mockPresetId);
    });

    expect(postMessageMock).toHaveBeenCalledWith({
      type: 'PRESET_APPLIED',
      presetId: mockPresetId,
      filters: mockFilters,
    });
  });
});
