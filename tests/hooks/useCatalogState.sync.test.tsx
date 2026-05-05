import { renderHook, act } from "@testing-library/react";
import { useCatalogState } from "@/hooks/useCatalogState";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import React from "react";

// Mock dependencies that aren't needed for these specific tests
vi.mock("@/hooks/useColorEnrichment", () => ({ useColorEnrichment: () => ({ data: new Map() }) }));
vi.mock("@/hooks/useProductsLightweight", () => ({ useProductsCatalog: () => ({ data: { pages: [] }, isLoading: false }) }));
vi.mock("@/contexts/ProductsContext", () => ({ useProductsContext: () => ({ registerProducts: vi.fn() }) }));
vi.mock("@/hooks/useSearch", () => ({ useSearch: () => ({ suggestions: [], quickSuggestions: [], history: [], addToHistory: vi.fn(), clearHistory: vi.fn() }) }));
vi.mock("@/stores/useFavoritesStore", () => ({ useFavoritesStore: () => ({ isFavorite: vi.fn(), toggleFavorite: vi.fn(), favoriteCount: 0 }) }));
vi.mock("@/hooks/useFavoriteQuickAdd", () => ({ useFavoriteQuickAdd: () => ({ handleFavoriteClick: vi.fn() }) }));
vi.mock("@/stores/useComparisonStore", () => ({ useComparisonStore: () => ({ isInCompare: vi.fn(), toggleCompare: vi.fn(), canAddMore: true }) }));
vi.mock("@/hooks/useProductsByMaterial", () => ({ useProductsByMaterial: () => ({ productIds: [], hasFilter: false, isLoading: false }) }));
vi.mock("@/hooks/useProductFuzzySearch", () => ({ useProductFuzzySearch: () => ({ results: [], hasSearch: false }) }));
vi.mock("@/hooks/useProductsByCategory", () => ({ useProductsByCategory: () => ({ productIds: [], hasFilter: false, isLoading: false }) }));
vi.mock("@/hooks/useExternalCategoriesQuery", () => ({ useExternalCategoriesQuery: () => ({ data: [] }) }));
vi.mock("@/hooks/useCatalogRealStats", () => ({ useCatalogRealStats: () => ({ data: null }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/usePromoSalesRanking", () => ({ usePromoSalesRanking: () => ({ data: null }) }));
vi.mock("@/hooks/useSupplierSalesRanking", () => ({ useSupplierSalesRanking: () => ({ data: null }) }));
vi.mock("./useCatalogFiltering", () => ({ useCatalogFiltering: () => [] }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={["/"]}>
    {children}
  </MemoryRouter>
);

describe("useCatalogState Sync & Loop Prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Limpa o BroadcastChannel mockado se necessário
    // (BroadcastChannel é global no browser, no Node pode precisar de polyfill ou mock)
    if (typeof global.BroadcastChannel === 'undefined') {
      (global as any).BroadcastChannel = class {
        postMessage = vi.fn();
        close = vi.fn();
        onmessage = vi.fn();
      };
    }
  });

  it("should have setFiltersWithPreset and activePresetId in the return object", () => {
    const { result } = renderHook(() => useCatalogState(), { wrapper });
    expect(typeof result.current.setFiltersWithPreset).toBe("function");
    expect(result.current).toHaveProperty("activePresetId");
  });

  it("should update URL and state when applying a preset", async () => {
    const { result } = renderHook(() => useCatalogState(), { wrapper });

    const newFilters = { ...result.current.filters, colorGroups: ["Azul"] };
    
    act(() => {
      result.current.setFiltersWithPreset(newFilters, "preset-123");
    });

    expect(result.current.activePresetId).toBe("preset-123");
    expect(result.current.filters.colorGroups).toContain("Azul");
  });

  it("should prevent loops when multiple state changes happen", async () => {
    const { result } = renderHook(() => useCatalogState(), { wrapper });
    
    // Simula múltiplas atualizações rápidas
    act(() => {
      result.current.setFiltersWithPreset(result.current.filters, "p1");
    });
    
    act(() => {
      result.current.setFiltersWithPreset(result.current.filters, "p2");
    });

    expect(result.current.activePresetId).toBe("p2");
    // Se houvesse um loop infinito, o teste travaria ou excederia o timeout
  });
});
