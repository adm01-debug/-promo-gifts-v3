
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFilterPresets } from "./FilterPresets";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("useFilterPresets Hook", () => {
  const mockUser = { id: "user-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
  });

  it("fetches presets on mount", async () => {
    const mockData = [
      { id: "1", name: "Preset 1", filters: {}, context: "catalog", is_default: false, created_at: "", updated_at: "" }
    ];

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { result } = renderHook(() => useFilterPresets("catalog"));

    await waitFor(() => {
      expect(result.current.presets).toHaveLength(1);
      expect(result.current.presets[0].name).toBe("Preset 1");
    });
  });

  it("saves a new preset correctly", async () => {
    const newPreset = { name: "New", filters: { search: "test" } as any };
    const savedData = { ...newPreset, id: "new-id", context: "catalog", is_default: false, created_at: "", updated_at: "" };

    (supabase.from as any).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: savedData, error: null }),
    });

    const { result } = renderHook(() => useFilterPresets("catalog"));

    let created;
    await waitFor(async () => {
      created = await result.current.savePreset(newPreset);
    });

    expect(created?.id).toBe("new-id");
    expect(supabase.from).toHaveBeenCalledWith("saved_filters");
  });

  it("handles fetch errors gracefully", async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error("Fetch failed") }),
    });

    const { result } = renderHook(() => useFilterPresets("catalog"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.presets).toHaveLength(0);
    });
    // Error logged to console but hook shouldn't crash
  });

  it("handles save errors with toast", async () => {
    (supabase.from as any).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("Save failed") }),
    });

    const { result } = renderHook(() => useFilterPresets("catalog"));

    const success = await result.current.savePreset({ name: "Fail", filters: {} as any });
    
    expect(success).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("Erro ao salvar preset");
  });
});
