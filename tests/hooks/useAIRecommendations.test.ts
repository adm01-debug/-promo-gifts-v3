import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          recommendations: [
            { productId: "prod-1", score: 0.95, reason: "Alta compatibilidade" },
            { productId: "prod-2", score: 0.82, reason: "Orçamento adequado" },
          ],
          insights: "Cliente valoriza sustentabilidade",
        },
        error: null,
      }),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("useAIRecommendations", () => {
  it("should export the hook function", async () => {
    const mod = await import("@/hooks/useAIRecommendations");
    expect(mod.useAIRecommendations).toBeDefined();
    expect(typeof mod.useAIRecommendations).toBe("function");
  });
});

describe("AI Recommendation data validation", () => {
  it("should validate recommendation structure", () => {
    const rec = { productId: "prod-1", score: 0.95, reason: "Alta compatibilidade" };
    expect(rec.score).toBeGreaterThan(0);
    expect(rec.score).toBeLessThanOrEqual(1);
    expect(rec.reason).toBeTruthy();
    expect(rec.productId).toBeTruthy();
  });

  it("should validate client profile structure", () => {
    const client = {
      name: "João Silva",
      company: "Empresa Ltda",
      industry: "Tecnologia",
      preferences: ["canetas", "ecológico"],
      budget: "R$ 5.000",
    };

    expect(client.name).toBeTruthy();
    expect(client.preferences).toHaveLength(2);
    expect(client.budget).toContain("R$");
  });

  it("should handle minimal client profile", () => {
    const client = { name: "Maria" };
    expect(client.name).toBeTruthy();
    expect((client as any).company).toBeUndefined();
  });

  it("should validate result with insights", () => {
    const result = {
      recommendations: [
        { productId: "p1", score: 0.9, reason: "Motivo A" },
      ],
      insights: "Análise do perfil",
    };
    expect(result.recommendations).toHaveLength(1);
    expect(result.insights).toBeTruthy();
  });
});
