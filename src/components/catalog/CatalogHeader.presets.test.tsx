
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

// Mock PresetsBar to test interaction
vi.mock("@/components/filters/PresetsBar", () => ({
  PresetsBar: ({ onApplyPreset, activePresetId }: any) => (
    <div data-testid="presets-bar">
      <button 
        data-testid="apply-preset-btn" 
        onClick={() => onApplyPreset({ ...defaultFilters, search: 'test-query' }, 'preset-123')}
      >
        Apply Preset
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
  });

  it("should pass activePresetId correctly to PresetsBar", () => {
    const { rerender } = render(
      <TooltipProvider>
        <CatalogHeader {...mockProps} activePresetId="preset-abc" />
      </TooltipProvider>
    );

    // Use getAllByTestId because it exists for both desktop and mobile
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

    // The text "15" is rendered inside a span, try finding by text or searching in container
    expect(screen.getByText("15", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/de 100/i)).toBeInTheDocument();
  });
});
