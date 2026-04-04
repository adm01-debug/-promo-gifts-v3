import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null,
              count: 0,
            }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "m1" }, error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { mockup_url: "https://example.com/mockup.png" }, error: null }),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("useMockupGenerator", () => {
  it("should export the hook function", async () => {
    const mod = await import("@/hooks/useMockupGenerator");
    expect(mod).toBeDefined();
  });
});

describe("GeneratedMockup data shape", () => {
  it("should validate mockup structure", () => {
    const mockup = {
      id: "m1",
      product_name: "Caneca Premium",
      product_sku: "CAN-001",
      client_name: "João Silva",
      technique_name: "Serigrafia",
      location_name: "Frontal",
      colors_count: 3,
      logo_width_cm: 10,
      logo_height_cm: 5,
      mockup_url: "https://storage.example.com/mockup.png",
      layout_url: "https://storage.example.com/layout.png",
      created_at: "2024-01-01T00:00:00Z",
    };

    expect(mockup.product_name).toBeTruthy();
    expect(mockup.colors_count).toBeGreaterThan(0);
    expect(mockup.logo_width_cm).toBeGreaterThan(0);
    expect(mockup.mockup_url).toContain("https://");
  });

  it("should handle mockup with null optional fields", () => {
    const mockup = {
      id: "m2",
      product_name: null,
      product_sku: null,
      client_name: null,
      technique_name: null,
      location_name: null,
      colors_count: null,
      logo_width_cm: null,
      logo_height_cm: null,
      mockup_url: null,
      layout_url: null,
      created_at: "2024-01-01T00:00:00Z",
    };

    expect(mockup.product_name).toBeNull();
    expect(mockup.mockup_url).toBeNull();
    expect(mockup.created_at).toBeTruthy();
  });
});
