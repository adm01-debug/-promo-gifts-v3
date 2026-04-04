import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

vi.mock("@/hooks/useAIRecommendations", () => ({
  useAIRecommendations: () => ({
    recommendations: null,
    isLoading: false,
    error: null,
    getRecommendations: vi.fn(),
    clearRecommendations: vi.fn(),
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("AIRecommendationsWidget", () => {
  it("renders the widget title", async () => {
    const { AIRecommendationsWidget } = await import("@/components/ai/AIRecommendationsWidget");
    renderWithProviders(
      <AIRecommendationsWidget
        products={[{ id: "p1", name: "Caneta", category: "Escritório" }]}
      />
    );
    expect(screen.getByText("Recomendações IA")).toBeInTheDocument();
  });

  it("renders input fields", async () => {
    const { AIRecommendationsWidget } = await import("@/components/ai/AIRecommendationsWidget");
    renderWithProviders(
      <AIRecommendationsWidget
        products={[{ id: "p1", name: "Caneta", category: "Escritório" }]}
      />
    );
    expect(screen.getByPlaceholderText("João Silva")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Empresa Ltda")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tecnologia")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("R$ 5.000")).toBeInTheDocument();
  });

  it("renders generate button with product count", async () => {
    const { AIRecommendationsWidget } = await import("@/components/ai/AIRecommendationsWidget");
    renderWithProviders(
      <AIRecommendationsWidget
        products={[
          { id: "p1", name: "Caneta", category: "Escritório" },
          { id: "p2", name: "Mochila", category: "Bolsas" },
        ]}
      />
    );
    expect(screen.getByText(/Gerar Recomendações \(2 produtos\)/)).toBeInTheDocument();
  });

  it("renders disabled button when no products", async () => {
    const { AIRecommendationsWidget } = await import("@/components/ai/AIRecommendationsWidget");
    renderWithProviders(<AIRecommendationsWidget products={[]} />);
    const btn = screen.getByText(/Gerar Recomendações \(0 produtos\)/);
    expect(btn.closest("button")).toBeDisabled();
  });
});

describe("AIRecommendationsWidget with results", () => {
  it("renders recommendations when available", async () => {
    vi.doMock("@/hooks/useAIRecommendations", () => ({
      useAIRecommendations: () => ({
        recommendations: {
          recommendations: [
            { productId: "p1", score: 0.95, reason: "Perfeito para o segmento" },
          ],
          insights: "Cliente tech-savvy",
        },
        isLoading: false,
        error: null,
        getRecommendations: vi.fn(),
        clearRecommendations: vi.fn(),
      }),
    }));

    const { AIRecommendationsWidget } = await import("@/components/ai/AIRecommendationsWidget");
    renderWithProviders(
      <AIRecommendationsWidget
        products={[{ id: "p1", name: "Caneta Smart", category: "Tech" }]}
      />
    );
    expect(screen.getByText("Cliente tech-savvy")).toBeInTheDocument();
    expect(screen.getByText("Perfeito para o segmento")).toBeInTheDocument();
  });
});
