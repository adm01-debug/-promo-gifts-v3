
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PresetsBar } from "./PresetsBar";
import { defaultFilters } from "./FilterPanel";
import { useFilterPresets } from "./FilterPresets";
import { toast } from "sonner";

// Mock dependencies
vi.mock("./FilterPresets", () => ({
  useFilterPresets: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockPresets = [
  {
    id: "preset-1",
    name: "Summer Campaign",
    description: "Filters for summer items",
    filters: { ...defaultFilters, search: "summer", categories: ["cat-1"] },
    icon: "☀️",
    color: "#FFD700",
  },
];

describe("PresetsBar", () => {
  const onApplyPreset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useFilterPresets as any).mockReturnValue({
      presets: mockPresets,
      isLoading: false,
      savePreset: vi.fn(),
      updatePreset: vi.fn(),
      deletePreset: vi.fn(),
    });
  });

  it("renders correctly with presets", () => {
    render(
      <TooltipProvider>
        <PresetsBar
          currentFilters={defaultFilters}
          onApplyPreset={onApplyPreset}
          activePresetId={undefined}
        />
      </TooltipProvider>
    );

    const trigger = screen.getByLabelText(/Presets de filtros salvos/i);
    expect(trigger).toBeInTheDocument();
    // Badge showing preset count
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("applies a preset when clicked", async () => {
    render(
      <TooltipProvider>
        <PresetsBar
          currentFilters={defaultFilters}
          onApplyPreset={onApplyPreset}
          activePresetId={undefined}
        />
      </TooltipProvider>
    );

    // Open popover
    fireEvent.click(screen.getByLabelText(/Presets de filtros salvos/i));

    // Wait for popover content
    await waitFor(() => {
      expect(screen.getByText("Summer Campaign")).toBeInTheDocument();
    });

    // Click the preset
    fireEvent.click(screen.getByText("Summer Campaign"));

    expect(onApplyPreset).toHaveBeenCalledWith(mockPresets[0].filters, "preset-1");
    expect(toast.success).toHaveBeenCalledWith('Preset "Summer Campaign" aplicado');
  });

  it("clears a preset when clicking the clear button on an active preset", async () => {
    render(
      <TooltipProvider>
        <PresetsBar
          currentFilters={mockPresets[0].filters}
          onApplyPreset={onApplyPreset}
          activePresetId="preset-1"
        />
      </TooltipProvider>
    );

    // Open popover
    fireEvent.click(screen.getByLabelText(/Presets de filtros salvos/i));

    await waitFor(() => {
      const clearBtn = screen.getByLabelText(/Desativar preset/i);
      fireEvent.click(clearBtn);
    });

    expect(onApplyPreset).toHaveBeenCalledWith(defaultFilters, undefined);
    expect(toast.info).toHaveBeenCalledWith("Preset desativado");
  });

  it("handles errors when applying a preset", async () => {
    onApplyPreset.mockImplementation(() => {
      throw new Error("Failed to apply");
    });

    render(
      <TooltipProvider>
        <PresetsBar
          currentFilters={defaultFilters}
          onApplyPreset={onApplyPreset}
          activePresetId={undefined}
        />
      </TooltipProvider>
    );

    fireEvent.click(screen.getByLabelText(/Presets de filtros salvos/i));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText("Summer Campaign"));
    });

    expect(toast.error).toHaveBeenCalledWith("Falha ao aplicar preset", expect.any(Object));
  });
});
