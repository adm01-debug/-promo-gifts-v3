/**
 * Render tests for Index page (667 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import React from "react";

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

vi.mock("@/hooks/useProducts", () => ({
  useProducts: vi.fn().mockReturnValue({
    products: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/contexts/ProductsContext", () => ({
  useProductsContext: vi.fn().mockReturnValue({ products: [], loading: false }),
}));

vi.mock("@/contexts/FavoritesContext", () => ({
  useFavoritesContext: vi.fn().mockReturnValue({
    favorites: [], isFavorite: vi.fn().mockReturnValue(false), toggleFavorite: vi.fn(),
  }),
}));

vi.mock("@/contexts/ComparisonContext", () => ({
  useComparisonContext: vi.fn().mockReturnValue({
    items: [], addItem: vi.fn(), removeItem: vi.fn(), isInComparison: vi.fn().mockReturnValue(false),
  }),
}));

vi.mock("@/hooks/useSearch", () => ({
  useSearch: vi.fn().mockReturnValue({ results: [], loading: false, search: vi.fn() }),
}));

vi.mock("@/hooks/useProductsByMaterial", () => ({
  useProductsByMaterial: vi.fn().mockReturnValue({ products: [], loading: false }),
}));

vi.mock("@/hooks/useProductFuzzySearch", () => ({
  useProductFuzzySearch: vi.fn().mockReturnValue({ search: vi.fn(), results: [] }),
}));

vi.mock("@/components/filters/FilterPanel", () => ({
  FilterPanel: () => <div data-testid="filter-panel" />,
  defaultFilters: {
    search: "", colorGroups: [], colorVariations: [], colorNuances: [],
    colors: [], categories: [], suppliers: [], publicoAlvo: [],
    datasComemorativas: [], endomarketing: [], ramosAtividade: [],
    segmentosAtividade: [], materialGroups: [], materialTypes: [],
    materiais: [], techniques: [], tags: [],
    priceRange: [0, 9999], minStock: 0, inStock: false,
    isKit: false, featured: false, isNew: false,
    hasPersonalization: false, hasCommercialPackaging: false, sortBy: "name",
  },
}));

vi.mock("@/components/products/ProductGrid", () => ({
  ProductGrid: () => <div data-testid="product-grid" />,
}));

vi.mock("@/components/products/ProductList", () => ({
  ProductList: () => <div data-testid="product-list" />,
}));

vi.mock("@/components/products/ColumnSelector", () => ({
  getDefaultColumns: vi.fn().mockReturnValue(4),
}));

vi.mock("@/components/products/LayoutPopover", () => ({
  LayoutPopover: () => <div />,
}));

vi.mock("@/components/products/StatsPopover", () => ({
  StatsPopover: () => <div />,
}));

vi.mock("@/components/products/ProductCardSkeleton", () => ({
  ProductGridSkeleton: () => <div />,
}));

vi.mock("@/components/products/ProductListItemSkeleton", () => ({
  ProductListSkeleton: () => <div />,
}));

vi.mock("@/components/search", () => ({
  SmartSearchInput: () => <input data-testid="search-input" />,
}));

vi.mock("@/components/common/EmptyState", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

vi.mock("@/components/compare/FloatingCompareBar", () => ({
  FloatingCompareBar: () => null,
}));

vi.mock("@/components/products/RecentlyViewedPopover", () => ({
  RecentlyViewedPopover: () => null,
}));

vi.mock("@/components/common/ContextualTooltips", () => ({
  InfoTooltip: () => null,
}));

vi.mock("@/data/mockData", () => ({
  CATEGORIES: [],
  SUPPLIERS: [],
}));

describe("Index Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: Index } = await import("@/pages/Index");
    renderWithProviders(<Index />);
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });
});
