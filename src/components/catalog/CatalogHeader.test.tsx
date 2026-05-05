
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CatalogHeader } from "./CatalogHeader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { defaultFilters } from "@/components/filters/FilterPanel";

// Mock sub-components
vi.mock("@/components/search", () => ({
  SmartSearchInput: () => <div data-testid="smart-search" />,
}));

vi.mock("@/components/products/RecentlyViewedPopover", () => ({
  RecentlyViewedPopover: () => <div data-testid="recently-viewed" />,
}));

vi.mock("@/components/search/SearchHistoryPopover", () => ({
  SearchHistoryPopover: () => <div data-testid="search-history" />,
}));

vi.mock("@/components/filters/PresetsBar", () => ({
  PresetsBar: ({ onApplyPreset }: any) => (
    <button data-testid="apply-preset-btn" onClick={() => onApplyPreset({ ...defaultFilters, search: 'preset-search' }, 'preset-1')}>
      Apply Preset
    </button>
  ),
}));

describe("CatalogHeader", () => {
  const mockProps = {
    shouldShowCatalogSkeleton: false,
    totalEstimate: 100,
    filteredCount: 50,
    hasNextPage: false,
    onSelect: vi.fn(),
    searchQuery: "",
    onReset: vi.fn(),
    activeFiltersCount: 0,
    filters: defaultFilters,
    onApplyPreset: vi.fn(),
    activePresetId: undefined,
  };

  it("renders the header with product count and active filters", () => {
    render(
      <TooltipProvider>
        <CatalogHeader {...mockProps} activeFiltersCount={1} />
      </TooltipProvider>
    );

    expect(screen.getByText(/Catálogo de Produtos/i)).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText(/de 100/i)).toBeInTheDocument();
  });

  it("calls onApplyPreset when a preset is selected in PresetsBar", () => {
    render(
      <TooltipProvider>
        <CatalogHeader {...mockProps} />
      </TooltipProvider>
    );

    const applyBtn = screen.getAllByTestId("apply-preset-btn")[0]; // Desktop version
    fireEvent.click(applyBtn);

    expect(mockProps.onApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'preset-search' }),
      'preset-1'
    );
  });

  it("shows home button when filters are active and calls onReset", () => {
    render(
      <TooltipProvider>
        <CatalogHeader {...mockProps} activeFiltersCount={1} />
      </TooltipProvider>
    );

    const homeBtn = screen.getByLabelText(/Voltar ao início/i);
    fireEvent.click(homeBtn);

    expect(mockProps.onReset).toHaveBeenCalled();
  });
});
