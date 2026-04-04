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

describe("AIRecommendationsWidget - preferences input", () => {
  it("renders preferences input field", async () => {
    const { AIRecommendationsWidget } = await import("@/components/ai/AIRecommendationsWidget");
    renderWithProviders(
      <AIRecommendationsWidget
        products={[{ id: "p1", name: "Caneta", category: "Escritório" }]}
      />
    );
    expect(screen.getByPlaceholderText("canetas, ecológico, premium")).toBeInTheDocument();
  });

  it("renders Nome do Cliente label", async () => {
    const { AIRecommendationsWidget } = await import("@/components/ai/AIRecommendationsWidget");
    renderWithProviders(
      <AIRecommendationsWidget
        products={[{ id: "p1", name: "Caneta", category: "Escritório" }]}
      />
    );
    expect(screen.getByText("Nome do Cliente *")).toBeInTheDocument();
  });
});
