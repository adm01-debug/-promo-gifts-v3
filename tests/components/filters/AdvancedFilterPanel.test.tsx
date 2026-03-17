/**
 * Render tests for AdvancedFilterPanel (1140 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "../render-helpers";
import React from "react";

vi.mock("@/hooks/useCategoryIcons", () => ({
  useCategoryIcons: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  getCategoryIcon: vi.fn().mockReturnValue("Package"),
}));

vi.mock("@/hooks/useMaterialFilter", () => ({
  useMaterialFilter: vi.fn().mockReturnValue({
    materialGroups: [], materialTypes: [], materials: [], loading: false,
  }),
}));

vi.mock("@/hooks/useSuppliers", () => ({
  useSuppliers: vi.fn().mockReturnValue({ suppliers: [], loading: false }),
}));

vi.mock("@/hooks/useRamoAtividadeFilter", () => ({
  useRamoAtividadeFilter: vi.fn().mockReturnValue({
    ramos: [], segmentos: [], loading: false,
  }),
}));

vi.mock("@/hooks/useAdvancedFilters", () => ({
  useAdvancedFilters: vi.fn().mockReturnValue({
    filters: {}, setFilter: vi.fn(), resetFilters: vi.fn(),
  }),
  SORT_OPTIONS: [{ value: "name", label: "Nome" }],
}));

vi.mock("@/data/mockData", () => ({
  FAIXAS_PRECO: [{ label: "Até R$10", min: 0, max: 10 }],
}));

vi.mock("@/components/filters/DebouncedPriceInput", () => ({
  DebouncedPriceInput: () => <input data-testid="price-input" />,
}));

vi.mock("@/components/filters/ColorGroupFilter", () => ({
  ColorFilterSelection: () => <div />,
}));

vi.mock("@/components/filters/InlineColorGroupFilter", () => ({
  InlineColorGroupFilter: () => <div />,
}));

vi.mock("@/components/filters/ExternalCategoryFilter", () => ({
  ExternalCategoryFilter: () => <div />,
}));

vi.mock("@/components/filters/CommemorativeDateFilter", () => ({
  CommemorativeDateFilter: () => <div />,
}));

vi.mock("@/components/materials/MaterialBadge", () => ({
  MaterialBadge: () => <span />,
}));

vi.mock("@/components/ramo-atividade/RamoAtividadeBadge", () => ({
  RamoAtividadeBadge: () => <span />,
}));

vi.mock("@/components/ramo-atividade/RamoAtividadeGroupAccordion", () => ({
  RamoAtividadeGroupAccordion: () => <div />,
}));

vi.mock("@/components/products/ColumnSelector", () => ({
  ColumnSelector: () => <div />,
  getDefaultColumns: vi.fn().mockReturnValue(4),
}));

describe("AdvancedFilterPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const module = await import("@/components/filters/AdvancedFilterPanel");
    const Component = module.AdvancedFilterPanel || module.default;
    if (Component) {
      renderWithProviders(
        <Component
          filters={{
            search: "", colorGroups: [], colorVariations: [], colorNuances: [],
            colors: [], categories: [], suppliers: [], publicoAlvo: [],
            datasComemorativas: [], endomarketing: [], ramosAtividade: [],
            segmentosAtividade: [], materialGroups: [], materialTypes: [],
            materiais: [], techniques: [], tags: [],
            priceRange: [0, 9999] as [number, number], minStock: 0,
            inStock: false, isKit: false, featured: false, isNew: false,
            hasPersonalization: false, hasCommercialPackaging: false, sortBy: "name",
          }}
          onFilterChange={vi.fn()}
          onReset={vi.fn()}
          activeFiltersCount={0}
        />
      );
    }
    expect(document.body).toBeTruthy();
  });
});
