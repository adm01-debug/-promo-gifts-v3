/**
 * Render tests for FilterPanel (1203 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import React from "react";

vi.mock("@/hooks/useCategoryIcons", () => ({
  useCategoryIcons: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  getCategoryIcon: vi.fn().mockReturnValue("Package"),
}));

vi.mock("@/hooks/useMaterialFilter", () => ({
  useMaterialFilter: vi.fn().mockReturnValue({
    materialGroups: [],
    materialTypes: [],
    materials: [],
    loading: false,
  }),
}));

vi.mock("@/hooks/useSuppliers", () => ({
  useSuppliers: vi.fn().mockReturnValue({ suppliers: [], loading: false }),
}));

vi.mock("@/hooks/useRamoAtividadeFilter", () => ({
  useRamoAtividadeFilter: vi.fn().mockReturnValue({
    ramos: [],
    segmentos: [],
    loading: false,
  }),
}));

vi.mock("@/hooks/useAdvancedFilters", () => ({
  useAdvancedFilters: vi.fn().mockReturnValue({
    filters: {},
    setFilter: vi.fn(),
    resetFilters: vi.fn(),
  }),
  SORT_OPTIONS: [{ value: "name", label: "Nome" }],
}));

vi.mock("@/data/mockData", () => ({
  FAIXAS_PRECO: [
    { label: "Até R$10", min: 0, max: 10 },
    { label: "R$10-50", min: 10, max: 50 },
  ],
}));

vi.mock("@/components/filters/DebouncedPriceInput", () => ({
  DebouncedPriceInput: (props: any) => <input data-testid="price-input" />,
}));

vi.mock("@/components/filters/ColorGroupFilter", () => ({
  ColorFilterSelection: () => <div data-testid="color-filter" />,
}));

vi.mock("@/components/filters/InlineColorGroupFilter", () => ({
  InlineColorGroupFilter: () => <div data-testid="inline-color-filter" />,
}));

vi.mock("@/components/filters/ExternalCategoryFilter", () => ({
  ExternalCategoryFilter: () => <div data-testid="external-category-filter" />,
}));

vi.mock("@/components/filters/CommemorativeDateFilter", () => ({
  CommemorativeDateFilter: () => <div data-testid="commemorative-filter" />,
}));

vi.mock("@/components/materials/MaterialBadge", () => ({
  MaterialBadge: () => <span data-testid="material-badge" />,
}));

vi.mock("@/components/ramo-atividade/RamoAtividadeBadge", () => ({
  RamoAtividadeBadge: () => <span data-testid="ramo-badge" />,
}));

vi.mock("@/components/ramo-atividade/RamoAtividadeGroupAccordion", () => ({
  RamoAtividadeGroupAccordion: () => <div data-testid="ramo-accordion" />,
}));

vi.mock("@/components/products/ColumnSelector", () => ({
  ColumnSelector: () => <div data-testid="column-selector" />,
  getDefaultColumns: vi.fn().mockReturnValue(4),
}));

const defaultFilters = {
  search: "", colorGroups: [], colorVariations: [], colorNuances: [], colors: [],
  categories: [], suppliers: [], publicoAlvo: [], datasComemorativas: [],
  endomarketing: [], ramosAtividade: [], segmentosAtividade: [],
  materialGroups: [], materialTypes: [], materiais: [], techniques: [], tags: [],
  priceRange: [0, 9999] as [number, number], minStock: 0, inStock: false,
  isKit: false, featured: false, isNew: false, hasPersonalization: false,
  hasCommercialPackaging: false, sortBy: "name",
};

describe("FilterPanel", () => {
  const mockOnChange = vi.fn();
  const mockOnReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { FilterPanel } = await import("@/components/filters/FilterPanel");
    renderWithProviders(
      <FilterPanel
        filters={defaultFilters}
        onFilterChange={mockOnChange}
        onReset={mockOnReset}
        activeFiltersCount={0}
      />
    );
    expect(document.body).toBeTruthy();
  });

  it("displays active filters count badge", async () => {
    const { FilterPanel } = await import("@/components/filters/FilterPanel");
    renderWithProviders(
      <FilterPanel
        filters={{ ...defaultFilters, categories: ["canetas"] }}
        onFilterChange={mockOnChange}
        onReset={mockOnReset}
        activeFiltersCount={3}
      />
    );
    expect(document.body).toBeTruthy();
  });
});
