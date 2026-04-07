import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: { access_token: "test-token" } },
        }),
    },
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { useAIRecommendations } from "@/hooks/useAIRecommendations";

describe("useAIRecommendations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");
  });

  const mockClient = { name: "Acme Corp", industry: "Tecnologia" };
  const mockProducts = [
    { id: "1", name: "Caneta", category: "Escritório" },
    { id: "2", name: "Mochila", category: "Bags" },
  ];

  const mockResult = {
    recommendations: [{ productId: "1", score: 0.95, reason: "Ideal para tech" }],
    insights: "Cliente tech prefere itens premium",
  };

  it("returns recommendations on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    const { result } = renderHook(() => useAIRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations(mockClient, mockProducts);
    });

    expect(result.current.recommendations).toHaveLength(1);
    expect(result.current.recommendations[0].productId).toBe("1");
    expect(result.current.insights).toContain("tech");
    expect(result.current.error).toBeNull();
  });

  it("uses cache on repeated identical requests", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    const { result } = renderHook(() => useAIRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations(mockClient, mockProducts);
    });
    await act(async () => {
      await result.current.fetchRecommendations(mockClient, mockProducts);
    });

    // fetch should only be called once (second call uses cache)
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.recommendations).toHaveLength(1);
  });

  it("handles 429 rate limit without retry", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429, text: () => Promise.resolve("") });

    const { result } = renderHook(() => useAIRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations(mockClient, mockProducts);
    });

    expect(result.current.error).toContain("Limite");
    expect(result.current.data).toBeNull();
    // Should not retry on 429
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("handles 402 credits exhausted", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 402, text: () => Promise.resolve("") });

    const { result } = renderHook(() => useAIRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations(mockClient, mockProducts);
    });

    expect(result.current.error).toContain("Créditos");
  });

  it("validates empty client name", async () => {
    const { result } = renderHook(() => useAIRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations({ name: "" }, mockProducts);
    });

    expect(result.current.error).toContain("obrigatório");
  });

  it("validates empty products list", async () => {
    const { result } = renderHook(() => useAIRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations(mockClient, []);
    });

    expect(result.current.error).toContain("produto");
  });

  it("resets state and aborts correctly", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("err") });

    const { result } = renderHook(() => useAIRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations(mockClient, mockProducts);
    });

    expect(result.current.error).not.toBeNull();

    act(() => result.current.reset());

    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it("clearCache forces new fetch", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    const { result } = renderHook(() => useAIRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations(mockClient, mockProducts);
    });

    act(() => result.current.clearCache());

    await act(async () => {
      await result.current.fetchRecommendations(mockClient, mockProducts);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
