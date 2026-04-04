import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

vi.mock("@/hooks/useVideoVariantLinks", () => ({
  useVideoVariantLinks: () => ({
    data: [
      {
        id: "link-1",
        product_id: "PROD-001",
        variant_id: "VAR-001",
        variant_name: "Azul Royal",
        variant_color_hex: "#0000FF",
        video_id: "https://youtube.com/watch?v=abc123",
        supplier_code: "SUP-01",
        created_at: "2024-06-15T10:00:00Z",
      },
    ],
    isLoading: false,
    createLink: { mutate: vi.fn(), isPending: false },
    deleteLink: { mutate: vi.fn() },
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

describe("AdminVideoVariantsPage", () => {
  it("renders the page title", async () => {
    const { default: Page } = await import("@/pages/admin/AdminVideoVariantsPage");
    renderWithProviders(<Page />);
    expect(screen.getByText("Vídeos por Variante")).toBeInTheDocument();
  });

  it("renders page description", async () => {
    const { default: Page } = await import("@/pages/admin/AdminVideoVariantsPage");
    renderWithProviders(<Page />);
    expect(screen.getByText("Gerencie a associação de vídeos com variantes de produtos")).toBeInTheDocument();
  });

  it("renders Novo Vínculo button", async () => {
    const { default: Page } = await import("@/pages/admin/AdminVideoVariantsPage");
    renderWithProviders(<Page />);
    expect(screen.getByText("Novo Vínculo")).toBeInTheDocument();
  });

  it("renders table headers", async () => {
    const { default: Page } = await import("@/pages/admin/AdminVideoVariantsPage");
    renderWithProviders(<Page />);
    expect(screen.getByText("Produto")).toBeInTheDocument();
    expect(screen.getByText("Variante")).toBeInTheDocument();
    expect(screen.getByText("Cor")).toBeInTheDocument();
    expect(screen.getByText("Vídeo")).toBeInTheDocument();
    expect(screen.getByText("Fornecedor")).toBeInTheDocument();
  });

  it("renders video link data", async () => {
    const { default: Page } = await import("@/pages/admin/AdminVideoVariantsPage");
    renderWithProviders(<Page />);
    expect(screen.getByText("PROD-001")).toBeInTheDocument();
    expect(screen.getByText("Azul Royal")).toBeInTheDocument();
    expect(screen.getByText("SUP-01")).toBeInTheDocument();
  });

  it("renders filter input", async () => {
    const { default: Page } = await import("@/pages/admin/AdminVideoVariantsPage");
    renderWithProviders(<Page />);
    expect(screen.getByPlaceholderText("Filtrar por produto ou variante...")).toBeInTheDocument();
  });

  it("renders link count in card title", async () => {
    const { default: Page } = await import("@/pages/admin/AdminVideoVariantsPage");
    renderWithProviders(<Page />);
    expect(screen.getByText("Vínculos (1)")).toBeInTheDocument();
  });
});
