
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
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

// Use a shared mock for PresetsBar that we can customize if needed
vi.mock("@/components/filters/PresetsBar", () => ({
  PresetsBar: ({ onApplyPreset, activePresetId }: any) => (
    <div data-testid="presets-bar">
      <button 
        data-testid="apply-preset-btn" 
        onClick={() => onApplyPreset({ ...defaultFilters, search: 'test-query' }, 'preset-123')}
      >
        Apply Preset
      </button>
      <button 
        data-testid="clear-preset-btn" 
        onClick={() => onApplyPreset(defaultFilters, undefined)}
      >
        Clear Preset
      </button>
      <span data-testid="active-preset-id">{activePresetId || 'none'}</span>
    </div>
  ),
}));

describe("CatalogHeader Preset Flow", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("should pass activePresetId correctly to PresetsBar", () => {
    const { rerender } = render(
      <TooltipProvider>
        <CatalogHeader {...mockProps} activePresetId="preset-abc" />
      </TooltipProvider>
    );

    const elements = screen.getAllByTestId("active-preset-id");
    expect(elements.length).toBeGreaterThan(0);
    expect(elements[0]).toHaveTextContent("preset-abc");

    rerender(
      <TooltipProvider>
        <CatalogHeader {...mockProps} activePresetId={undefined} />
      </TooltipProvider>
    );
    const updatedElements = screen.getAllByTestId("active-preset-id");
    expect(updatedElements[0]).toHaveTextContent("none");
  });

  it("should trigger onApplyPreset with correct values when preset button is clicked", async () => {
    render(
      <TooltipProvider>
        <CatalogHeader {...mockProps} />
      </TooltipProvider>
    );

    const applyBtns = screen.getAllByTestId("apply-preset-btn");
    fireEvent.click(applyBtns[0]);

    expect(mockProps.onApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'test-query' }),
      'preset-123'
    );
  });

  it("should maintain consistency between filteredCount and totalEstimate when a preset is active", () => {
    render(
      <TooltipProvider>
        <CatalogHeader 
          {...mockProps} 
          activePresetId="preset-123" 
          activeFiltersCount={1}
          filteredCount={15} 
          totalEstimate={100} 
        />
      </TooltipProvider>
    );

    expect(screen.getByText("15", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/de 100/i)).toBeInTheDocument();
  });

  it("should call onApplyPreset with defaultFilters when clearing a preset", () => {
    render(
      <TooltipProvider>
        <CatalogHeader {...mockProps} activePresetId="preset-123" />
      </TooltipProvider>
    );

    const clearBtns = screen.getAllByTestId("clear-preset-btn");
    fireEvent.click(clearBtns[0]);

    expect(mockProps.onApplyPreset).toHaveBeenCalledWith(defaultFilters, undefined);
  });
});
